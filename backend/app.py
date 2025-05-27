from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from txt_to_3d import txt_gen_3d
from images_to_image import images_gen_image
from vista_3d_to_images import render_views_with_pyvista
from image_to_3d import image_gen_3d
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
    image_output = request.json.get('image_output')

    threeD_output = request.json.get('threeD_output')

    try:
        #create images from 3d model
        render_views_with_pyvista(glb_path, images_output)
        if not (os.access(images_output + "/top.png", os.F_OK)):
            return jsonify(status="fail", message="Creating images from 3d model failed.")

        #generate chatgpt image from the images
        images_gen_image(text + "Output only one image with a front view", images_output, image_output)
        if not (os.access(image_output + "/remixed_image.png", os.F_OK)):
            return jsonify(status="fail", message="Creating image from text and images failed.")
        
        #generate 3d model from chatgpt image
        image_gen_3d(image_output + "/remixed_image.png", threeD_output)
        if not (os.access(threeD_output + "/remixed_draft_model.glb", os.F_OK)):
            return jsonify(status="fail", message="Creating image from text and images failed.")

        return jsonify(status="success", message="Rendering complete.")
    except Exception as e:
        return jsonify(status="error", message=str(e)), 500
    
@app.route('/models/<filename>')
def serve_model(filename):
    try:
        file_path = os.path.join(os.getcwd(), '3d_files', filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=False)
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
