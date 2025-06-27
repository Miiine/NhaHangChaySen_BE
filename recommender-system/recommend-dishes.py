import sys
import pandas as pd
from sqlalchemy import create_engine
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os
import json

# Cấu hình kết nối MySQL sử dụng SQLAlchemy
host = os.getenv('DB_HOST')
database = os.getenv('DB_NAME')
username = os.getenv('DB_USER')
password = os.getenv('DB_PASS')

# Tạo kết nối SQLAlchemy
engine = create_engine(f'mysql+pymysql://{username}:{password}@{host}/{database}')

# Cấu hình đầu ra với encoding UTF-8 để tránh lỗi UnicodeEncodeError
sys.stdout.reconfigure(encoding='utf-8')

# Lấy tham số 'maMonAn' từ dòng lệnh
dishId = int(sys.argv[1])  # Lấy tham số đầu vào từ dòng lệnh


# Truy vấn dữ liệu từ MySQL
query = """
    SELECT m.*, l.tenLoai
    FROM MONAN AS m
    LEFT JOIN LOAIMONAN AS l
    ON m.maLoai = l.maLoai
"""

# Đọc dữ liệu vào DataFrame
df_monAn = pd.read_sql(query, engine)

# Kết hợp các cột tenLoai, tenMonAn và moTa thành một chuỗi
def combineFeatures(row):
    return str(row['tenLoai']) + " " + str(row['tenMonAn']) + " " + str(row['moTa'])

df_monAn['combinedFeatures'] = df_monAn.apply(combineFeatures, axis=1)

# Chuyển đổi dữ liệu thành vector với TF_IDF
tf = TfidfVectorizer()
tfMatrix = tf.fit_transform(df_monAn['combinedFeatures'])

# Tính toán độ tương đồng cosine
similar = cosine_similarity(tfMatrix)

number = 8

# Hàm lấy tên và mã của các sản phẩm tương tự
def lay_ten_va_ma(idx, similarity_score):
    return {
        'maMonAn': int(df_monAn[df_monAn.index == idx]['maMonAn'].values[0]),
        'tenMonAn': df_monAn[df_monAn.index == idx]['tenMonAn'].values[0],
        'similarityScore': similarity_score
    }

# Tìm vị trí (index) của món ăn trong DataFrame
indexDish = df_monAn[df_monAn['maMonAn'] == dishId].index[0]

# Tạo danh sách các món ăn tương tự
similarDish = list(enumerate(similar[indexDish]))

# Sắp xếp các món ăn tương tự theo độ tương đồng giảm dần
sortedSimilarDish = sorted(similarDish, key=lambda x: x[1], reverse=True)

# Lấy 8 món ăn tương tự nhất cho món ăn có 'maMonAn' = dishId
ket_qua = []
for i in range(1, number + 1):
    similarity_score = sortedSimilarDish[i][1]  # Lấy độ tương đồng
    ket_qua.append(lay_ten_va_ma(sortedSimilarDish[i][0], similarity_score))

# Tạo dữ liệu trả về
data = {'Mon an goi y': ket_qua}
# print(data)
print(json.dumps(data))
