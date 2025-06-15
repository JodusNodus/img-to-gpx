import cv2
import numpy as np
from skimage import feature
import svgwrite
import argparse
from pathlib import Path

def preprocess_image(image_path):
    # Read the image
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    # Convert to HSV for better color segmentation
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    return img, hsv

def analyze_colors(hsv):
    # Reshape the image to be a list of pixels
    pixels = hsv.reshape(-1, 3)
    
    # Calculate mean and standard deviation for each channel
    mean = np.mean(pixels, axis=0)
    std = np.std(pixels, axis=0)
    
    print(f"Color analysis:")
    print(f"Hue: mean={mean[0]:.1f}, std={std[0]:.1f}")
    print(f"Saturation: mean={mean[1]:.1f}, std={std[1]:.1f}")
    print(f"Value: mean={mean[2]:.1f}, std={std[2]:.1f}")
    
    return mean, std

def remove_border(mask, margin=20):
    # Create a copy of the mask
    result = mask.copy()
    
    # Create a border mask
    border_mask = np.ones_like(mask)
    border_mask[margin:-margin, margin:-margin] = 0
    
    # Remove border pixels
    result[border_mask == 1] = 0
    
    # Additional border cleaning
    kernel = np.ones((5,5), np.uint8)
    result = cv2.morphologyEx(result, cv2.MORPH_OPEN, kernel)
    
    return result

def bbox_touches_all_edges(x, y, w, h, width, height, tol=5):
    return (
        x <= tol and
        y <= tol and
        x + w >= width - tol and
        y + h >= height - tol
    )

def is_large_rectangle(contour, width, height, area_thresh=0.05, aspect_thresh=0.7):
    # Area threshold: fraction of image area
    img_area = width * height
    area = cv2.contourArea(contour)
    if area < area_thresh * img_area:
        return False
    # Rectangle check
    approx = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
    if len(approx) == 4:
        x, y, w, h = cv2.boundingRect(approx)
        aspect = min(w, h) / max(w, h)
        if aspect > aspect_thresh:
            return True
    return False

def contour_color_stddev(hsv, contour):
    mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
    cv2.drawContours(mask, [contour], -1, 255, -1)
    pixels = hsv[mask == 255]
    if len(pixels) == 0:
        return 9999  # Arbitrarily high stddev if no pixels
    std = np.std(pixels, axis=0)
    return np.mean(std)  # Mean stddev across HSV channels

def detect_path(img, hsv):
    # Analyze colors first
    mean, std = analyze_colors(hsv)
    
    # Use a wider blue-specific HSV range for the mask
    lower_bound = np.array([90, 30, 30])
    upper_bound = np.array([150, 255, 255])
    print(f"Using wide blue HSV mask: lower={lower_bound}, upper={upper_bound}")
    mask = cv2.inRange(hsv, lower_bound, upper_bound)
    
    # Remove border from mask
    mask = remove_border(mask, margin=20)
    
    # Save debug image
    cv2.imwrite('debug_mask.png', mask)
    
    # Apply morphological operations to clean up the mask
    kernel = np.ones((3,3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # Additional dilation to connect nearby components
    mask = cv2.dilate(mask, kernel, iterations=2)
    
    # Save debug image after morphological operations
    cv2.imwrite('debug_mask_cleaned.png', mask)
    
    # Find contours in the mask
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    print(f"Found {len(contours)} initial contours")
    
    # Save debug image with all contours (before filtering)
    debug_all_contours = img.copy()
    cv2.drawContours(debug_all_contours, contours, -1, (0, 0, 255), 2)  # Red for all
    cv2.imwrite('debug_all_contours.png', debug_all_contours)
    
    # Filter contours by area and thickness, and find the longest one
    longest_contour = None
    max_length = 0
    
    # Remove border and large rectangles
    filtered = []
    for i, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        if area < 30:
            print(f"Contour {i}: Skipped (too small)")
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        if bbox_touches_all_edges(x, y, w, h, img.shape[1], img.shape[0], tol=5):
            print(f"Contour {i}: Skipped (border bbox)")
            continue
        if is_large_rectangle(cnt, img.shape[1], img.shape[0], area_thresh=0.05, aspect_thresh=0.7):
            print(f"Contour {i}: Skipped (large rectangle/box)")
            continue
        mask_contour = np.zeros_like(mask)
        cv2.drawContours(mask_contour, [cnt], -1, 255, -1)
        dist_transform = cv2.distanceTransform(mask_contour, cv2.DIST_L2, 5)
        thickness = np.max(dist_transform) * 2
        if not (1 <= thickness <= 50):
            print(f"Contour {i}: Skipped (thickness {thickness:.1f})")
            continue
        color_std = contour_color_stddev(hsv, cnt)
        print(f"Contour {i}: color_std={color_std:.2f}")
        if color_std > 10:  # Threshold for color uniformity (tune as needed)
            print(f"Contour {i}: Skipped (color stddev {color_std:.2f})")
            continue
        print(f"Contour {i}: Kept (area={area:.1f}, bbox=({x},{y},{w},{h}), thickness={thickness:.1f}, color_std={color_std:.2f})")
        filtered.append(cnt)
    
    print(f"Filtered to {len(filtered)} contours (no border/boxes, uniform color)")
    
    # Select the longest
    longest_contour = None
    max_length = 0
    
    for cnt in filtered:
        length = cv2.arcLength(cnt, True)
        if length > max_length:
            max_length = length
            longest_contour = cnt
    
    filtered_contours = [longest_contour] if longest_contour is not None else []
    print(f"Selected contour length: {max_length:.1f}")
    
    # Create debug visualization
    debug_img = img.copy()
    cv2.drawContours(debug_img, filtered_contours, -1, (0, 255, 0), 2)
    cv2.imwrite('debug_contours.png', debug_img)
    
    return filtered_contours

def simplify_contours(contours):
    simplified_contours = []
    for cnt in contours:
        # More lenient simplification
        epsilon = 0.003 * cv2.arcLength(cnt, True)  # Increased epsilon for smoother paths
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        simplified_contours.append(approx)
    return simplified_contours

def create_svg(contours, output_path, width, height):
    # Create SVG drawing
    dwg = svgwrite.Drawing(output_path, size=(width, height))
    
    # Add each contour as a path
    for contour in contours:
        if len(contour) > 1:  # Only process contours with more than one point
            # Convert contour points to SVG path format
            points = []
            for point in contour:
                x, y = point[0]
                points.append(f"{x},{y}")
            
            # Create path data
            path_data = f"M {' L '.join(points)}"
            
            # Add path to SVG
            dwg.add(dwg.path(
                d=path_data,
                stroke='black',
                stroke_width=2,
                fill='none'
            ))
    
    # Save the SVG
    dwg.save()

def main():
    parser = argparse.ArgumentParser(description='Convert image to vector line drawing')
    parser.add_argument('input', type=str, help='Input image path')
    parser.add_argument('--output', type=str, help='Output SVG path (default: input_name.svg)')
    parser.add_argument('--min-area', type=int, default=30, help='Minimum contour area to consider (default: 30)')
    parser.add_argument('--min-thickness', type=float, default=1, help='Minimum path thickness (default: 1)')
    parser.add_argument('--max-thickness', type=float, default=50, help='Maximum path thickness (default: 50)')
    parser.add_argument('--border-margin', type=int, default=20, help='Margin from border to remove (default: 20)')
    
    args = parser.parse_args()
    
    # Set default output path if not provided
    if args.output is None:
        input_path = Path(args.input)
        args.output = str(input_path.with_suffix('.svg'))
    
    # Process the image
    try:
        # Read and preprocess
        img, hsv = preprocess_image(args.input)
        
        # Detect path
        contours = detect_path(img, hsv)
        
        # Simplify contours
        simplified_contours = simplify_contours(contours)
        
        # Get image dimensions
        height, width = img.shape[:2]
        
        # Create SVG
        create_svg(simplified_contours, args.output, width, height)
        
        print(f"Successfully created vector drawing at: {args.output}")
        print("Debug images have been saved:")
        print("- debug_mask.png: Initial color mask")
        print("- debug_mask_cleaned.png: Mask after cleaning")
        print("- debug_all_contours.png: All detected contours")
        print("- debug_contours.png: Filtered contours")
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")

if __name__ == "__main__":
    main() 
