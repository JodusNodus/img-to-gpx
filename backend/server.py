from flask import Flask, send_from_directory, request, jsonify, Response
from flask_cors import CORS
import os
import tempfile
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent))
from img_to_line import preprocess_image, detect_path, create_svg
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='../frontend/dist')
CORS(app)

@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/svg', methods=['OPTIONS'])
def handle_options():
    response = Response()
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'POST')
    return response

@app.route('/api/svg', methods=['POST'])
def generate_svg():
    if 'image' not in request.files:
        response = jsonify({'error': 'No image uploaded'}), 400
        response[0].headers.add('Access-Control-Allow-Origin', '*')
        return response
    image_file = request.files['image']
    start_x = request.form.get('start_x', type=int)
    start_y = request.form.get('start_y', type=int)
    if start_x is None or start_y is None:
        response = jsonify({'error': 'Missing start_x or start_y'}), 400
        response[0].headers.add('Access-Control-Allow-Origin', '*')
        return response

    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
        image_file.save(tmp.name)
        tmp_path = Path(tmp.name)

    try:
        img, hsv = preprocess_image(tmp_path)
        contours = detect_path(img, hsv, start_x, start_y)
        height, width = img.shape[:2]
        output_path = tmp_path.with_suffix('.svg')
        os.makedirs(output_path.parent, exist_ok=True)
        create_svg(contours, str(output_path), width, height)
        with open(output_path, 'r') as f:
            svg_string = f.read()
        logger.info(f"SVG generated: {output_path}")
        response = Response(svg_string, mimetype='image/svg+xml')
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    except Exception as e:
        response = jsonify({'error': str(e)}), 500
        response[0].headers.add('Access-Control-Allow-Origin', '*')
        return response
    finally:
        os.remove(tmp_path)
        if os.path.exists(output_path):
            os.remove(output_path)

if __name__ == '__main__':
    app.run(debug=True, port=5131) 
