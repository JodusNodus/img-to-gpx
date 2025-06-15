from typing import Tuple, List
import cv2
import numpy as np
import svgwrite
import argparse
from pathlib import Path
from skimage.morphology import skeletonize

# Constants
DEFAULT_MARGIN = 20
DEFAULT_EDGE_TOLERANCE = 5
DEFAULT_AREA_THRESHOLD = 0.05
DEFAULT_ASPECT_THRESHOLD = 0.7
DEFAULT_SIMPLIFICATION_EPSILON = 0.003

def preprocess_image(image_path: Path) -> Tuple[np.ndarray, np.ndarray]:
    """Read image and convert to HSV."""
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    return img, hsv

def detect_path(img: np.ndarray, hsv: np.ndarray, 
                start_x: int, start_y: int) -> List[np.ndarray]:
    """Find path starting from given point."""
    start_point = (start_x, start_y)
    
    # Get colors at start point
    bgr_at_point = img[start_point[1], start_point[0]]
    hsv_at_point = hsv[start_point[1], start_point[0]]
    
    # Create color masks
    h, s, v = map(int, hsv_at_point)
    hsv_lower = np.array([
        max(0, h-10),
        max(0, s-30),
        max(0, v-30)
    ])
    hsv_upper = np.array([
        min(179, h+10),
        min(255, s+30),
        min(255, v+30)
    ])
    
    b, g, r = map(int, bgr_at_point)
    bgr_lower = np.array([
        max(0, b-20),
        max(0, g-20),
        max(0, r-20)
    ])
    bgr_upper = np.array([
        min(255, b+20),
        min(255, g+20),
        min(255, r+20)
    ])
    
    # Apply masks and skeletonize
    hsv_mask = cv2.inRange(hsv, hsv_lower, hsv_upper)
    bgr_mask = cv2.inRange(img, bgr_lower, bgr_upper)
    mask = cv2.bitwise_or(hsv_mask, bgr_mask)
    skeleton = skeletonize(mask > 0)
    
    # Find contours
    contours, _ = cv2.findContours(skeleton.astype(np.uint8), 
                                 cv2.RETR_EXTERNAL, 
                                 cv2.CHAIN_APPROX_SIMPLE)
    
    # Find contour closest to start point
    if contours:
        best_contour = None
        min_distance = float('inf')
        
        for contour in contours:
            contour_mask = np.zeros_like(skeleton, dtype=np.uint8)
            cv2.drawContours(contour_mask, [contour], -1, (255,), 1)
            
            y_indices, x_indices = np.where(contour_mask > 0)
            if len(x_indices) > 0:
                distances = np.sqrt((x_indices - start_x)**2 + (y_indices - start_y)**2)
                min_dist = np.min(distances)
                
                if min_dist < min_distance:
                    min_distance = min_dist
                    best_contour = contour
        
        if best_contour is not None:
            contours = [best_contour]
    
    # Save debug image
    debug_img = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    cv2.drawContours(debug_img, contours, -1, (0, 255, 0), 2)
    cv2.circle(debug_img, (start_x, start_y), 5, (0, 0, 255), -1)
    cv2.imwrite('debug_mask_initial.png', debug_img)
    
    return list(contours)

def simplify_contours(contours: List[np.ndarray]) -> List[np.ndarray]:
    """Reduce number of points in contours."""
    simplified_contours = []
    for cnt in contours:
        epsilon = DEFAULT_SIMPLIFICATION_EPSILON * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        simplified_contours.append(approx)
    return simplified_contours

def create_svg(contours: List[np.ndarray], output_path: str, 
               width: int, height: int) -> None:
    """Convert contours to SVG."""
    dwg = svgwrite.Drawing(output_path, size=(width, height))
    
    for contour in contours:
        if len(contour) > 1:
            # Get min coordinates to zero the output
            points = contour.reshape(-1, 2)
            min_x = np.min(points[:, 0])
            min_y = np.min(points[:, 1])
            
            # Create path with zeroed coordinates
            points = [f"{point[0][0]-min_x},{point[0][1]-min_y}" for point in contour]
            path_data = f"M {' L '.join(points)}"
            
            dwg.add(dwg.path(
                d=path_data,
                stroke='black',
                stroke_width=2,
                fill='none'
            ))
    
    dwg.save()

def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Convert image to vector line drawing')
    parser.add_argument('input', type=str, help='Input image path')
    parser.add_argument('--start-x', type=int, required=True, help='X coordinate of a known point on the line')
    parser.add_argument('--start-y', type=int, required=True, help='Y coordinate of a known point on the line')
    args = parser.parse_args()
    
    try:
        img, hsv = preprocess_image(Path(args.input))
        contours = detect_path(img, hsv, args.start_x, args.start_y)
        height, width = img.shape[:2]
        create_svg(contours, 'output.svg', width, height)
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")

if __name__ == "__main__":
    main() 
