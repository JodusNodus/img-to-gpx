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

def detect_path(img, hsv):
    # Analyze colors first
    mean, std = analyze_colors(hsv)
    
    # Create a mask for the path color
    # We'll try to detect non-background colors
    # Background is usually the most common color (highest value)
    lower_bound = np.array([
        max(0, mean[0] - 2 * std[0]),  # Hue
        max(0, mean[1] - 2 * std[1]),  # Saturation
        max(0, mean[2] - 2 * std[2])   # Value
    ])
    upper_bound = np.array([
        min(180, mean[0] + 2 * std[0]),  # Hue
        min(255, mean[1] + 2 * std[1]),  # Saturation
        min(255, mean[2] + 2 * std[2])   # Value
    ])
    
    print(f"Color bounds:")
    print(f"Lower: H={lower_bound[0]:.1f}, S={lower_bound[1]:.1f}, V={lower_bound[2]:.1f}")
    print(f"Upper: H={upper_bound[0]:.1f}, S={upper_bound[1]:.1f}, V={upper_bound[2]:.1f}")
    
    # Create initial mask
    mask = cv2.inRange(hsv, lower_bound, upper_bound)
    
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
    
    # Filter contours by area and thickness
    filtered_contours = []
    for i, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        print(f"Contour {i}: Area = {area}")
        
        if area > 30:  # Lowered minimum area threshold
            # Calculate thickness using distance transform
            mask_contour = np.zeros_like(mask)
            cv2.drawContours(mask_contour, [cnt], -1, 255, -1)
            dist_transform = cv2.distanceTransform(mask_contour, cv2.DIST_L2, 5)
            thickness = np.max(dist_transform) * 2
            
            print(f"Contour {i}: Thickness = {thickness}")
            
            # More lenient thickness filtering
            if 1 <= thickness <= 50:  # Increased maximum thickness
                filtered_contours.append(cnt)
    
    print(f"Filtered to {len(filtered_contours)} contours")
    
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
        print("- debug_contours.png: Detected contours")
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")

if __name__ == "__main__":
    main() 
