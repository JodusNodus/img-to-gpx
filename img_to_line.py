from typing import Tuple, List
import cv2
import numpy as np
import svgwrite
import argparse
from pathlib import Path
from skimage.morphology import skeletonize
from skimage.filters import threshold_otsu

# Constants
DEFAULT_MARGIN = 20
DEFAULT_EDGE_TOLERANCE = 5
DEFAULT_AREA_THRESHOLD = 0.05
DEFAULT_ASPECT_THRESHOLD = 0.7
DEFAULT_SIMPLIFICATION_EPSILON = 0.003

def preprocess_image(image_path: Path) -> Tuple[np.ndarray, np.ndarray]:
    """
    Preprocess an image by reading it and converting to HSV color space.
    
    Args:
        image_path: Path to the input image
        
    Returns:
        Tuple containing the original image and its HSV representation
        
    Raises:
        ValueError: If the image cannot be read
    """
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    return img, hsv

def analyze_colors(hsv: np.ndarray, debug: bool = False) -> Tuple[np.ndarray, np.ndarray]:
    """
    Analyze the color distribution in an HSV image.
    
    Args:
        hsv: HSV image array
        debug: Whether to print debug information
        
    Returns:
        Tuple containing mean and standard deviation of HSV channels
    """
    pixels = hsv.reshape(-1, 3)
    mean = np.mean(pixels, axis=0)
    std = np.std(pixels, axis=0)
    
    if debug:
        print(f"Color analysis:")
        print(f"Hue: mean={mean[0]:.1f}, std={std[0]:.1f}")
        print(f"Saturation: mean={mean[1]:.1f}, std={std[1]:.1f}")
        print(f"Value: mean={mean[2]:.1f}, std={std[2]:.1f}")
    
    return mean, std

def remove_border(mask: np.ndarray, margin: int = DEFAULT_MARGIN) -> np.ndarray:
    """
    Remove border pixels from a binary mask.
    
    Args:
        mask: Binary mask to process
        margin: Width of border to remove
        
    Returns:
        Processed mask with borders removed
    """
    result = mask.copy()
    border_mask = np.ones_like(mask)
    border_mask[margin:-margin, margin:-margin] = 0
    result[border_mask == 1] = 0
    
    kernel = np.ones((5,5), np.uint8)
    result = cv2.morphologyEx(result, cv2.MORPH_OPEN, kernel)
    
    return result

def bbox_touches_all_edges(x: int, y: int, w: int, h: int, 
                          width: int, height: int, 
                          tol: int = DEFAULT_EDGE_TOLERANCE) -> bool:
    """
    Check if a bounding box touches all edges of an image.
    
    Args:
        x, y: Top-left corner coordinates
        w, h: Width and height of the box
        width, height: Image dimensions
        tol: Tolerance for edge detection
        
    Returns:
        True if the box touches all edges, False otherwise
    """
    return (
        x <= tol and
        y <= tol and
        x + w >= width - tol and
        y + h >= height - tol
    )

def is_large_rectangle(contour: np.ndarray, width: int, height: int,
                      area_thresh: float = DEFAULT_AREA_THRESHOLD,
                      aspect_thresh: float = DEFAULT_ASPECT_THRESHOLD) -> bool:
    """
    Check if a contour represents a large rectangle.
    
    Args:
        contour: Contour to check
        width, height: Image dimensions
        area_thresh: Minimum area threshold as fraction of image area
        aspect_thresh: Minimum aspect ratio threshold
        
    Returns:
        True if the contour is a large rectangle, False otherwise
    """
    img_area = width * height
    area = cv2.contourArea(contour)
    if area < area_thresh * img_area:
        return False
        
    approx = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
    if len(approx) == 4:
        x, y, w, h = cv2.boundingRect(approx)
        aspect = min(w, h) / max(w, h)
        if aspect > aspect_thresh:
            return True
    return False

def contour_color_stddev(hsv: np.ndarray, contour: np.ndarray) -> float:
    """
    Calculate the standard deviation of colors within a contour.
    
    Args:
        hsv: HSV image array
        contour: Contour to analyze
        
    Returns:
        Mean standard deviation across HSV channels
    """
    mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
    cv2.drawContours(mask, [contour], -1, 255, -1)
    pixels = hsv[mask == 255]
    if len(pixels) == 0:
        return 9999  # Arbitrarily high stddev if no pixels
    std = np.std(pixels, axis=0)
    return np.mean(std)

def detect_path(img: np.ndarray, hsv: np.ndarray, 
                start_x: int, start_y: int,
                debug: bool = False) -> List[np.ndarray]:
    """
    Detect a path in the image starting from a given point.
    
    Args:
        img: Original image
        hsv: HSV image
        start_x, start_y: Starting point coordinates
        debug: Whether to print debug information
        
    Returns:
        List containing only the contour that connects to the starting point
    """
    mean, std = analyze_colors(hsv, debug)
    start_point = (start_x, start_y)
    
    # Sample colors at starting point
    bgr_at_point = img[start_point[1], start_point[0]]
    hsv_at_point = hsv[start_point[1], start_point[0]]
    
    if debug:
        print(f'BGR at {start_point}: {bgr_at_point}')
        print(f'HSV at {start_point}: {hsv_at_point}')
    
    # Create HSV mask
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
    
    # Create BGR mask
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
    
    # Apply masks
    hsv_mask = cv2.inRange(hsv, hsv_lower, hsv_upper)
    bgr_mask = cv2.inRange(img, bgr_lower, bgr_upper)
    mask = cv2.bitwise_or(hsv_mask, bgr_mask)
    
    # Convert mask to binary
    binary_mask = mask > 0
    
    # Skeletonize the mask
    skeleton = skeletonize(binary_mask)
    
    # Find contours in the skeleton
    contours, _ = cv2.findContours(skeleton.astype(np.uint8), 
                                 cv2.RETR_EXTERNAL, 
                                 cv2.CHAIN_APPROX_SIMPLE)
    
    # Find the contour that contains or is closest to the starting point
    if contours:
        # Create a mask for each contour
        best_contour = None
        min_distance = float('inf')
        
        for contour in contours:
            # Create a mask for this contour
            contour_mask = np.zeros_like(skeleton, dtype=np.uint8)
            cv2.drawContours(contour_mask, [contour], -1, 1, 1)
            
            # Find the closest point on this contour to our start point
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
    if debug:
        debug_img = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
        cv2.drawContours(debug_img, contours, -1, (0, 255, 0), 2)
        # Draw the starting point
        cv2.circle(debug_img, (start_x, start_y), 5, (0, 0, 255), -1)
        cv2.imwrite('debug_mask_initial.png', debug_img)
    
    return contours

def simplify_contours(contours: List[np.ndarray]) -> List[np.ndarray]:
    """
    Simplify contours by reducing the number of points.
    
    Args:
        contours: List of contours to simplify
        
    Returns:
        List of simplified contours
    """
    simplified_contours = []
    for cnt in contours:
        epsilon = DEFAULT_SIMPLIFICATION_EPSILON * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        simplified_contours.append(approx)
    return simplified_contours

def create_svg(contours: List[np.ndarray], output_path: str, 
               width: int, height: int) -> None:
    """
    Create an SVG file from contours.
    
    Args:
        contours: List of contours to convert
        output_path: Path to save the SVG file
        width, height: Dimensions of the output SVG
    """
    dwg = svgwrite.Drawing(output_path, size=(width, height))
    
    for contour in contours:
        if len(contour) > 1:
            points = [f"{point[0][0]},{point[0][1]}" for point in contour]
            path_data = f"M {' L '.join(points)}"
            
            dwg.add(dwg.path(
                d=path_data,
                stroke='black',
                stroke_width=2,
                fill='none'
            ))
    
    dwg.save()

def main() -> None:
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description='Convert image to vector line drawing')
    parser.add_argument('input', type=str, help='Input image path')
    parser.add_argument('--output', type=str, help='Output SVG path (default: input_name.svg)')
    parser.add_argument('--start-x', type=int, required=True, help='X coordinate of a known point on the line')
    parser.add_argument('--start-y', type=int, required=True, help='Y coordinate of a known point on the line')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()

    if args.output is None:
        input_path = Path(args.input)
        args.output = str(input_path.with_suffix('.svg'))
    
    try:
        img, hsv = preprocess_image(Path(args.input))
        contours = detect_path(img, hsv, args.start_x, args.start_y, args.debug)
        height, width = img.shape[:2]
        create_svg(contours, args.output, width, height)
        
        if args.debug:
            print(f"Successfully created vector drawing at: {args.output}")
            print("Debug images have been saved:")
            print("- debug_mask_initial.png: Initial color mask")
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")

if __name__ == "__main__":
    main() 
