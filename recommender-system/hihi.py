import mysql.connector
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask (__name__)
CORS(app)

#Cấu hình kết nối MySQL:
host = 'localhost'
database = 'xaydungwebsitedatbanvadatmonthongminhchonhahangchaysen'
username = 'root'
password = '123456'

#Kết nối đến MySQL
try:
    conn = mysql.connector.connect(
        host=host,
        database=database,
        user=username,
        password=password,
        charset='utf8mb4'
    )

    #Thực hiện truy vấn
    query = """
        SELECT m.*, l.tenLoai
        FROM MONAN AS m
        LEFT JOIN LOAIMONAN AS l
        ON m.maLoai = l.maLoai
    """

    df_monAn = pd.read_sql(query, conn)
    print(df_monAn.head())

except mysql.connector.Error as e:
    print(f'Error: {e}')
finally:
    if conn.is_connected():
        conn.close()

#Kết hợp tenLoai, tenMonAn và moTa
features = ['tenLoai', 'tenMonAn', 'moTa']

def combineFeatures(row):
    return str(row['tenLoai']) + " " + str(row['tenMonAn']) + " " + str(row['moTa'])

df_monAn['combinedFeatures'] = df_monAn.apply(combineFeatures, axis=1)
print(df_monAn['combinedFeatures'].head())

#Chuyển đổi dữ liệu thành vector với TF_IDF
tf = TfidfVectorizer()
tfMatrix = tf.fit_transform(df_monAn['combinedFeatures'])

#Tính toán độ tương đồng cosine
similar = cosine_similarity(tfMatrix)

number = 8

#Định nghĩa route '/api' với phương thức GET
@app.route('/api/recommend-dishes', methods=['GET'])
def get_data(): 
    ket_qua = []
    dishId = request.args.get('maMonAn')
    dishId = int(dishId)
    
    if dishId not in df_monAn['maMonAn'].values:
        return jsonify({'Loi': 'maMonAn khong hop le'})
    
    indexDish = df_monAn[df_monAn['maMonAn'] == dishId].index[0]

    similarDish = list(enumerate(similar[indexDish]))

    print(similarDish)

    #Sắp xếp các sản phẩm tương tự
    sortedSimilarDish = sorted(similarDish, key=lambda x: x[1], reverse=True)

    print(sortedSimilarDish)

    # Hàm lấy tên và mã của các sản phẩm tương tự
    def lay_ten_va_ma(idx, similarity_score):
        return {
            'maMonAn': int(df_monAn[df_monAn.index == idx]['maMonAn'].values[0]),
            'tenMonAn': df_monAn[df_monAn.index == idx]['tenMonAn'].values[0],
            'similarityScore': similarity_score
        }
    #In ra 8 sản phẩm tương tự nhất:
    for i in range(1, number + 1):
        similarity_score = sortedSimilarDish[i][1]  # Lấy độ tương đồng
        print(lay_ten_va_ma(sortedSimilarDish[i][0], similarity_score))
        ket_qua.append(lay_ten_va_ma(sortedSimilarDish[i][0], similarity_score))

    data = {'Mon an goi y': ket_qua}
    return jsonify(data)

if __name__ == '__main__':
    app.run(port=5555)

#http://localhost:5555/api/recommend-dishes?maMonAn=3