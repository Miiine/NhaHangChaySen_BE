import mysql.connector
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import NMF

import numpy as np

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='123456',
    database = 'XayDungWebsiteDatBanVaDatMonThongMinhChoNhaHangChaySen',
    charset='utf8mb4'
)

query_favorite_dishes = """
    SELECT maTaiKhoan, maMonAn
    FROM MONAN_YEUTHICH;
"""

query_ratings = """
    SELECT maTaiKhoan, maMonAn, soSao
    FROM DANHGIA;
"""

query_search_history = """
    SELECT maTaiKhoan, tuKhoa
    FROM LICHSU_TIMKIEM;
"""

query_dishes_names = """
    SELECT maMonAn, tenMonAn FROM MONAN;
"""

query_users = """
    SELECT maTaiKhoan FROM TAIKHOAN;
"""

# Thực thi các truy vấn và chuyển đổi kết quả thành DataFrame
favorite_dishes_df = pd.read_sql(query_favorite_dishes, conn)
ratings_df = pd.read_sql(query_ratings, conn)
search_history_df = pd.read_sql(query_search_history, conn)
mon_an_names_df = pd.read_sql(query_dishes_names, conn)
users_df = pd.read_sql(query_users, conn)

#Đóng kết nối
conn.close()

#--------------------------------------------------------------------------------------------------------------------

#Tạo một chuỗi từ khóa cho mỗi tài khoản
user_keywords = search_history_df.groupby('maTaiKhoan')['tuKhoa'].apply(lambda x: ' '.join(x)).reset_index()

#Tính điểm đánh giá trung bình của tài khoản cho món ăn
ratings_df = ratings_df.groupby(['maTaiKhoan', 'maMonAn']).agg({'soSao': 'mean'}).reset_index()

# Lấy danh sách tất cả mã món ăn từ mon_an_names_df
all_item_ids = mon_an_names_df['maMonAn'].unique()

# Lấy danh sách tất cả mã tài khoản từ users_df
all_user_ids = users_df['maTaiKhoan'].unique()


# ----------------------------------------------- Content-Based Filtering -------------------------------------------

# Sử dụng TfidfVectorizer để tính toán TF-IDF cho từ khóa người dùng và tên món ăn
tfidf = TfidfVectorizer()

user_keywords_tfidf = tfidf.fit_transform(user_keywords['tuKhoa'])
monan_tfidf = tfidf.transform(mon_an_names_df['tenMonAn'])

similarity_matrix = cosine_similarity(user_keywords_tfidf, monan_tfidf)

# Lấy danh sách tài khoản có dữ liệu trong `search_history`
existing_user_ids = user_keywords['maTaiKhoan'].unique()

# Tạo một ma trận tương đồng mới với kích thước đúng
full_similarity_matrix = np.zeros((len(all_user_ids), similarity_matrix.shape[1]))

# Cập nhật ma trận với độ tương đồng cho người dùng có dữ liệu search history
for idx, user_id in enumerate(existing_user_ids):
    user_index = np.where(all_user_ids == user_id)[0][0]
    full_similarity_matrix[user_index, :] = similarity_matrix[idx, :]

similarity_df = pd.DataFrame(full_similarity_matrix, index=all_user_ids, columns=mon_an_names_df['maMonAn'])

similarity_df = similarity_df.round(2)

# print("Ma trận tương đồng từ khóa người dùng - món ăn:")
# print(similarity_df)

# Chuyển đổi similarity_df thành định dạng "mã tài khoản, mã món ăn, độ tương đồng"
similarity_result = []

# Lặp qua từng hàng và cột trong similarity_df
for user_idx, user_similarities in similarity_df.iterrows():
    for item_idx, similarity in user_similarities.items():
        similarity_result.append([user_idx, item_idx, similarity])

similarity_result_df = pd.DataFrame(similarity_result, columns=['maTaiKhoan', 'maMonAn', 'score'])

print("\nKết quả độ tương đồng từ khóa người dùng - món ăn:")
print(similarity_result_df)

# Chọn tài khoản bất kỳ
# user_id = 11

# if user_id in similarity_df.index:
#     user_similarity = similarity_df.loc[user_id, :]
    
#     # Chuyển thành DataFrame để dễ dàng xử lý và sắp xếp
#     user_similarity_df = user_similarity.reset_index()
#     user_similarity_df.columns = ['maMonAn', 'score']
    
#     # Sắp xếp theo độ tương đồng giảm dần
#     user_similarity_df = user_similarity_df.sort_values(by='score', ascending=False)
    
#     print(f"\nĐộ tương đồng từ khóa của người dùng {user_id} với các món ăn:")
#     print(user_similarity_df)
# else:
#     print(f"Tài khoản {user_id} không tồn tại trong ma trận.")



# ------------------ Unsupervised Collaborative Filtering Based on Matrix Factorization -----------------------

# Tạo ma trận người dùng - món ăn đầy đủ 
user_item_matrix_full = pd.DataFrame(0, index=all_user_ids, columns=all_item_ids)

# Cập nhật ma trận với các giá trị từ ratings_df
for _, row in ratings_df.iterrows():
    user_item_matrix_full.at[row['maTaiKhoan'], row['maMonAn']] = row['soSao']

# print("\nMa trận người dùng - món ăn - điểm đánh giá trung bình:")
# print(user_item_matrix_full)

# Áp dụng NMF (Non-negative Matrix Factorization)
model = NMF(n_components=2, init='random', random_state=42)
W = model.fit_transform(user_item_matrix_full)
H = model.components_

# Dự đoán giá trị
predicted_ratings = np.dot(W, H)

predicted_ratings_df = pd.DataFrame(predicted_ratings, index=user_item_matrix_full.index, columns=user_item_matrix_full.columns)
predicted_ratings_df = predicted_ratings_df / 5  # Đánh giá từ 0 đến 5, chia cho 5 để ra giá trị từ 0 đến 1
predicted_ratings_df = predicted_ratings_df.round(2)

# print("Ma trận dự đoán đánh giá người dùng - món ăn:")
# print(predicted_ratings_df)

# Chuyển đổi dữ liệu dự đoán thành định dạng "mã tài khoản, mã món ăn, dự đoán đánh giá"
predicted_result = []

# Lặp qua từng hàng và cột trong predicted_ratings_df
for user_idx, user_ratings in predicted_ratings_df.iterrows():
    for item_idx, rating in user_ratings.items():
        predicted_result.append([all_user_ids[user_idx-1], item_idx, rating])

predicted_result_df = pd.DataFrame(predicted_result, columns=['maTaiKhoan', 'maMonAn', 'score'])

print("\nKết quả dự đoán đánh giá người dùng - món ăn:")
print(predicted_result_df)

# # Chọn tài khoản bất kỳ
# user_id = 11

# if user_id in predicted_ratings_df.index:
#     user_predicted_ratings = predicted_ratings_df.loc[user_id, :]
    
#     # Chuyển thành DataFrame để dễ dàng xử lý và sắp xếp
#     user_predicted_ratings_df = user_predicted_ratings.reset_index()
#     user_predicted_ratings_df.columns = ['maMonAn', 'predicted_score']
    
#     # Sắp xếp theo độ đánh giá dự đoán giảm dần
#     user_predicted_ratings_df = user_predicted_ratings_df.sort_values(by='predicted_score', ascending=False)
    
#     print(f"\nDự đoán đánh giá của người dùng {user_id} với các món ăn:")
#     print(user_predicted_ratings_df)
# else:
#     print(f"Tài khoản {user_id} không tồn tại trong ma trận dự đoán.")


#------------------------------User-based Collaborative Filtering--------------------------------------------------

# Tạo ma trận người dùng - món ăn
user_food_matrix_full = pd.DataFrame(0, index=all_user_ids, columns=all_item_ids)

# Cập nhật ma trận với các giá trị từ favorite_dishes_df
for _, row in favorite_dishes_df.iterrows():
    user_food_matrix_full.at[row['maTaiKhoan'], row['maMonAn']] = 1

# print("\nMa trận người dùng - món ăn - yêu thích:")
# print(user_food_matrix_full)
# print(user_food_matrix_full.shape)

# Tính toán cosine similarity giữa các người dùng
user_similarity = cosine_similarity(user_food_matrix_full)

user_similarity_df = pd.DataFrame(user_similarity, index=user_food_matrix_full.index, columns=user_food_matrix_full.index)
user_similarity_df = user_similarity_df.fillna(0) # Thay thế NaN bằng 0

# print("\nMa trận tương đồng giữa người dùng - người dùng:")
# print(user_similarity_df)
# print(user_similarity_df.shape)

# Hàm gợi ý món ăn cho tất cả người dùng
def suggest_food_for_all_users(user_similarity_df, user_food_matrix_full, all_user_ids, all_item_ids):
    # Tạo một DataFrame rỗng để chứa các gợi ý
    recommendations = pd.DataFrame(0, index=all_user_ids, columns=all_item_ids)

    # Lặp qua tất cả người dùng
    for user_id in all_user_ids:
        # Lấy độ tương đồng của người dùng hiện tại với các người dùng khác
        similar_users = user_similarity_df[user_id].sort_values(ascending=False)[1:]  # Bỏ qua User 1
        similar_users = similar_users.head(5)

        recommended_foods = []

        for similar_user, similarity in similar_users.items():
            # Lấy món ăn mà User tương tự đã thích, nhưng User hiện tại chưa thử
            liked_foods = user_food_matrix_full.loc[similar_user]
            for food, liked in liked_foods.items():
                if liked == 1 and user_food_matrix_full.loc[user_id, food] == 0:  # Nếu User chưa thử món này
                    recommended_foods.append((food, similarity))

        # Sắp xếp các món ăn theo độ tương đồng
        recommended_foods = sorted(recommended_foods, key=lambda x: x[1], reverse=True)

        # Cập nhật vào DataFrame với giá trị 1 cho các món ăn được gợi ý
        for food, similarity in recommended_foods:
            recommendations.at[user_id, food] = 1

    return recommendations

# Gọi hàm gợi ý món ăn cho tất cả người dùng
recommendations_df = suggest_food_for_all_users(user_similarity_df, user_food_matrix_full, all_user_ids, all_item_ids)

# print("\n Ma trần gợi ý món ăn yêu thích cho tất cả người dùng:")
# print(recommendations_df)


# Chuyển đổi recommendations_df thành định dạng "mã tài khoản, mã món ăn, gợi ý yêu thích"
recommendations_result = []

# Lặp qua từng hàng và cột trong recommendations_df
for user_idx, user_recommendations in recommendations_df.iterrows():
    for item_idx, recommended in user_recommendations.items():
        recommendations_result.append([user_idx, item_idx, recommended])

# Chuyển thành DataFrame và in ra
recommendations_result_df = pd.DataFrame(recommendations_result, columns=['maTaiKhoan', 'maMonAn', 'score'])

# In kết quả
print("\nKết quả gợi người dùng - món ăn yêu thích:")
print(recommendations_result_df)

# # Chọn tài khoản bất kỳ
# user_id = 11

# if user_id in recommendations_df.index:
#     user_recommendations = recommendations_df.loc[user_id, :]
    
#     # Chuyển thành DataFrame để dễ dàng xử lý và sắp xếp
#     user_recommendations_df = user_recommendations.reset_index()
#     user_recommendations_df.columns = ['maMonAn', 'recommended']
    
#     # Sắp xếp các món ăn theo giá trị 'recommended' giảm dần
#     user_recommendations_df = user_recommendations_df.sort_values(by='recommended', ascending=False)
    
#     print(f"\nGợi ý món ăn yêu thích cho người dùng {user_id}:")
#     print(user_recommendations_df)
# else:
#     print(f"Tài khoản {user_id} không tồn tại trong ma trận gợi ý.")

print("heheheeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")


#----------------------------------------------Kết hợp 3 kết quả------------------------------------------------------

# Gộp 3 DataFrame vào một DataFrame
merged_df = pd.concat([similarity_result_df, recommendations_result_df, predicted_result_df], axis=0, ignore_index=True)

print("\nKết quả gộp 3 DataFrame:")
print(merged_df)

# Tính trung bình cộng của các cột 'score' cho các cặp (maTaiKhoan, maMonAn)
merged_df_avg = merged_df.groupby(['maTaiKhoan', 'maMonAn'], as_index=False)['score'].mean()

print("\nKết quả gộp 3 DataFrame và tính trung bình cộng:")
print(merged_df_avg)

# Giả sử muốn lọc ra dữ liệu của tài khoản có maTaiKhoan = 11
user_id = 11

user_data = merged_df_avg[merged_df_avg['maTaiKhoan'] == user_id]

# Sắp xếp kết quả theo giá trị 'score' giảm dần
user_data_sorted = user_data.sort_values(by='score', ascending=False)

# Ghép với DataFrame tên món ăn (mon_an_names_df) để lấy tên món ăn
user_data_sorted_with_names = pd.merge(user_data_sorted, mon_an_names_df, on='maMonAn', how='left')

# In kết quả đã lọc, sắp xếp và thêm tên món ăn
print(f"\nKết quả cho tài khoản maTaiKhoan = {user_id}:")
print(user_data_sorted_with_names[['maTaiKhoan', 'maMonAn', 'tenMonAn', 'score']])
print(user_data_sorted_with_names.shape)

