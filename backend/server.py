from flask import Flask, send_from_directory, request, jsonify, Response
from flask_cors import CORS
import os
import tempfile
from pathlib import Path
import sys
from typing import Tuple, Union, Any
sys.path.append(str(Path(__file__).parent))
from img_to_line import preprocess_image, detect_path, create_svg
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure static folder exists
STATIC_FOLDER = Path(__file__).parent.parent / 'frontend' / 'dist'
if not STATIC_FOLDER.exists():
    logger.error(f"Static folder not found at {STATIC_FOLDER}")
    logger.error("Please run 'npm run build' in the frontend directory first")
    raise RuntimeError(
        f"Static folder not found at {STATIC_FOLDER}. "
        "This usually means the frontend hasn't been built yet. "
        "Please run 'npm run build' in the frontend directory."
    )

app = Flask(__name__, static_folder=str(STATIC_FOLDER))

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173"],  # Vite dev server
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

def create_response(data: Any, status_code: int = 200) -> Tuple[Response, int]:
    """Create a standardized response with proper CORS headers."""
    if isinstance(data, str):
        response = Response(data, mimetype='image/svg+xml')
    else:
        response = jsonify(data)
    return response, status_code

@app.route('/')
def serve_frontend() -> Response:
    """Serve the frontend index.html file."""
    return send_from_directory(str(STATIC_FOLDER), 'index.html')

@app.route('/<path:path>')
def serve_static(path: str) -> Response:
    """Serve static files from the frontend dist directory."""
    return send_from_directory(str(STATIC_FOLDER), path)

@app.route('/api/svg', methods=['POST'])
def generate_svg() -> Tuple[Response, int]:
    """Generate SVG from uploaded image."""
    if 'image' not in request.files:
        return create_response({'error': 'No image uploaded'}, 400)
    
    image_file = request.files['image']
    start_x = request.form.get('start_x', type=int)
    start_y = request.form.get('start_y', type=int)
    
    if start_x is None or start_y is None:
        return create_response({'error': 'Missing start_x or start_y'}, 400)

    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
        image_file.save(tmp.name)
        tmp_path = Path(tmp.name)

    output_path = None
    try:
        img, hsv = preprocess_image(tmp_path)
        contours = detect_path(img, hsv, start_x, start_y)
        height, width = img.shape[:2]
        output_path = tmp_path.with_suffix('.svg')
        os.makedirs(output_path.parent, exist_ok=True)
        create_svg(contours, str(output_path), width, height)
        
        with open(output_path, 'r') as f:
            svg_string = f.read()
        
        logger.info(f"SVG generated successfully: {output_path}")
        return create_response(svg_string)
        
    except Exception as e:
        logger.error(f"Error generating SVG: {str(e)}", exc_info=True)
        return create_response({'error': str(e)}, 500)
        
    finally:
        # Cleanup temporary files
        try:
            os.remove(tmp_path)
            if output_path and output_path.exists():
                os.remove(output_path)
        except Exception as e:
            logger.warning(f"Error cleaning up temporary files: {str(e)}")

if __name__ == '__main__':
    app.run(debug=True, port=5131) 
