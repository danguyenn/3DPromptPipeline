from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from txt_to_3d import txt_gen_3d
from images_to_image import images_gen_image
from threeD_to_images import render_views
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

@app.route('/txtgen3d', methods=['POST'])
def txtgen3d():
    text = request.json.get('text')
    artstyle = request.json.get('artstyle')
    save_path = request.json.get('save_path')

    try:
        txt_gen_3d(text, artstyle, save_path)
        if (os.access(save_path + "/refined_model.glb", os.F_OK)) and (os.access(save_path + "/draft_model.glb", os.F_OK)):
            return jsonify(status="success", message="Rendering complete.")
        return jsonify(status="fail", message="Rendering failed.")
    except Exception as e:
        return jsonify(status="error", message=str(e)), 500
    
@app.route('/remixgen3d', methods=['POST'])
def remixgen3d():
    glb_path = request.json.get('glb_path')
    images_output = request.json.get('images_output')

    text = request.json.get('text')
    image_dir = request.json.get('image_dir')
    save_path = request.json.get('save_path')

    

    try:
        #create images from 3d model
        render_views(glb_path, images_output)
        #generate chatgpt image from the images
        images_gen_image(text, image_dir, save_path)

        #generate 3d model from chatgpt image


        txt_gen_3d(text, artstyle, save_path)
        if (os.access(save_path + "/refined_model.glb", os.F_OK)) and (os.access(save_path + "/draft_model.glb", os.F_OK)):
            return jsonify(status="success", message="Rendering complete.")
        return jsonify(status="fail", message="Rendering failed.")
    except Exception as e:
        return jsonify(status="error", message=str(e)), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
