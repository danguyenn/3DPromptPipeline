from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='../frontend', static_url_path='/')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_msg = request.json.get('message')
    response = f"Echo: {user_msg}"
    return jsonify(reply=response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
