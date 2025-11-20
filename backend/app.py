from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from txt_to_3d import txt_gen_3d
from images_to_image import images_gen_image
from vista_3d_to_images import render_views_with_pyvista
from image_to_3d import image_gen_3d
from werkzeug.utils import secure_filename
from openai import OpenAI
import uuid, os
import io

app = Flask(__name__, static_folder="../frontend", static_url_path="/")
CORS(app)

# OpenAI client - requires OPENAI_API_KEY in the environment
client = OpenAI()
DEBUG_AUDIO_DIR = "/tmp/debug_audio"
os.makedirs(DEBUG_AUDIO_DIR, exist_ok=True)

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/chat", methods=["POST"])
def chat():
    user_msg = request.json.get("message")
    response = f"Echo: {user_msg}"
    return jsonify(reply=response)


@app.route("/txtgen3d", methods=["POST"])
def txtgen3d_route():
    text = request.json.get("text")
    artstyle = request.json.get("artstyle")
    save_path = request.json.get("save_path")

    try:
        txt_gen_3d(text, artstyle, save_path)
        refined_path = os.path.join(save_path, "refined_model.glb")
        draft_path = os.path.join(save_path, "draft_model.glb")

        if os.path.exists(refined_path) and os.path.exists(draft_path):
            return jsonify(status="success", message="Rendering complete.")
        return jsonify(status="fail", message="Rendering failed.")
    except Exception as e:
        print("txtgen3d error:", e)
        return jsonify(status="error", message=str(e)), 500


@app.route("/remixgen3d", methods=["POST"])
def remixgen3d_route():
    glb_path = request.json.get("glb_path")
    images_output = request.json.get("images_output")
    text = request.json.get("text")
    image_output = request.json.get("image_output")
    threeD_output = request.json.get("threeD_output")

    try:
        # 1) create images from 3D model
        render_views_with_pyvista(glb_path, images_output)
        if not os.path.exists(os.path.join(images_output, "top.png")):
            return jsonify(status="fail", message="Creating images from 3D model failed.")

        # 2) generate image from the views + text
        images_gen_image(
            text + " Output only one image with a front view",
            images_output,
            image_output,
        )
        if not os.path.exists(os.path.join(image_output, "remixed_image.png")):
            return jsonify(status="fail", message="Creating image from text and images failed.")

        # 3) generate 3D model from the remixed image
        image_gen_3d(os.path.join(image_output, "remixed_image.png"), threeD_output)
        if not os.path.exists(os.path.join(threeD_output, "remixed_draft_model.glb")):
            return jsonify(status="fail", message="Creating 3D model from remixed image failed.")

        return jsonify(status="success", message="Rendering complete.")
    except Exception as e:
        print("remixgen3d error:", e)
        return jsonify(status="error", message=str(e)), 500


@app.route("/models/<filename>")
def serve_model(filename):
    try:
        base_dir = os.path.join(os.getcwd(), "3d_files")
        file_path = os.path.join(base_dir, filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=False)
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        print("serve_model error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/upload", methods=["POST"])
def upload_glb():
    if "file" not in request.files:
        return jsonify(status="fail", message="No file provided"), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify(status="fail", message="Empty filename"), 400

    filename = secure_filename(file.filename)
    save_dir = os.path.join(os.getcwd(), "3d_files")
    os.makedirs(save_dir, exist_ok=True)

    save_path = os.path.join(save_dir, filename)
    file.save(save_path)

    return jsonify(status="success", filename=filename)


@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    Uses OpenAI's gpt-4o-transcribe model to turn uploaded audio into text.
    Frontend sends FormData with a 'file' field (audio blob).
    """
    if "file" not in request.files:
        return jsonify(status="error", message="No audio file uploaded."), 400

    audio_file = request.files["file"]

    print("Incoming file:")
    print("  filename:", audio_file.filename)
    print("  mimetype:", audio_file.mimetype)

    audio_bytes = audio_file.read()
    size = len(audio_bytes)
    print("  size (bytes):", size)

    if not audio_bytes:
        print("Transcribe: received empty audio.")
        return jsonify(status="error", message="Uploaded audio file is empty."), 400

    # Save a copy so YOU can listen
    debug_id = uuid.uuid4().hex[:8]
    safe_name = audio_file.filename or "speech.webm"
    saved_path = os.path.join(DEBUG_AUDIO_DIR, f"{debug_id}_{safe_name}")
    with open(saved_path, "wb") as f:
        f.write(audio_bytes)

    print("Saved uploaded audio to:", saved_path)

    file_obj = io.BytesIO(audio_bytes)
    file_obj.name = safe_name

    try:
        transcription = client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=file_obj,
            temperature=0,
            language="en",
            # No prompt here on purpose – avoids the model echoing it
        )

        return jsonify(status="success", text=transcription.text)
    except Exception as e:
        print("Transcription error:", e)
        return jsonify(status="error", message=str(e)), 500


if __name__ == "__main__":
    # Flask will listen on port 5000; frontend is served from ../frontend
    app.run(host="0.0.0.0", port=5000)
