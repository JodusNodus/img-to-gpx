from typing import Tuple, List
import cv2
import numpy as np
from pathlib import Path
from skimage.morphology import skeletonize
import logging
import tempfile
import networkx as nx

logger = logging.getLogger(__name__)

def preprocess_image(image_path: Path) -> Tuple[np.ndarray, np.ndarray]:
    """Read image and convert to HSV."""
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    return img, hsv

def skeleton_to_graph(skeleton: np.ndarray) -> nx.Graph:
    """
    Convert a skeletonized binary image to a graph.
    Each white pixel is a node, edges connect 8-connected neighbors.
    """
    G = nx.Graph()
    h, w = skeleton.shape
    for y in range(h):
        for x in range(w):
            if skeleton[y, x]:
                node = (x, y)
                for dx in [-1, 0, 1]:
                    for dy in [-1, 0, 1]:
                        if dx == 0 and dy == 0:
                            continue
                        nx_, ny_ = x + dx, y + dy
                        if 0 <= nx_ < w and 0 <= ny_ < h and skeleton[ny_, nx_]:
                            neighbor = (nx_, ny_)
                            G.add_edge(node, neighbor)
    return G

def region_grow(img: np.ndarray, seed: tuple, color_thresh: int = 30) -> np.ndarray:
    """
    Perform region growing from the seed point based on color similarity.
    Args:
        img: Input BGR image
        seed: (x, y) starting point
        color_thresh: Maximum color distance for region growing
    Returns:
        mask: Binary mask of the grown region
    """
    h, w, _ = img.shape
    mask = np.zeros((h, w), np.uint8)
    visited = np.zeros((h, w), np.bool_)
    # Ensure seed is a tuple (x, y)
    if not (isinstance(seed, tuple) and len(seed) == 2):
        raise ValueError("Seed must be a tuple (x, y)")
    x0, y0 = seed
    stack = [(x0, y0)]
    seed_color = img[y0, x0].astype(np.int32)
    
    while stack:
        x, y = stack.pop()
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        if visited[y, x]:
            continue
        visited[y, x] = True
        color = img[y, x].astype(np.int32)
        if np.linalg.norm(color - seed_color) <= color_thresh:
            mask[y, x] = 255
            # Add 8-connected neighbors
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx != 0 or dy != 0:
                        stack.append((x + dx, y + dy))
    return mask

def find_longest_path(G: nx.Graph) -> list:
    """
    Find the longest simple path in the graph using all pairs shortest path.
    """
    if len(G.nodes) == 0:
        return []
    # Only use nodes that are tuples of length 2
    tuple_nodes = [n for n in G.nodes if isinstance(n, tuple) and len(n) == 2]
    # Find all endpoints (nodes with degree 1) among tuple nodes
    endpoints = [n for n in tuple_nodes if G.degree[n] == 1]
    max_path = []
    for i in range(len(endpoints)):
        for j in range(i+1, len(endpoints)):
            try:
                path = nx.shortest_path(G, endpoints[i], endpoints[j])
                if isinstance(path, list) and len(path) > len(max_path):
                    max_path = path
            except nx.NetworkXNoPath:
                continue
    return max_path

def detect_path(img: np.ndarray, hsv: np.ndarray, 
                start_x: int, start_y: int) -> List[np.ndarray]:
    """Find path starting from given point using region growing and graph-based extraction."""
    start_point = (start_x, start_y)
    
    # Use region growing to extract the route
    mask = region_grow(img, start_point, color_thresh=30)
    
    # Skeletonize the mask
    skeleton = skeletonize(mask > 0)
    
    # Convert skeleton to graph
    G = skeleton_to_graph(skeleton)
    
    # Find the longest path in the graph
    path = find_longest_path(G)

    # Filter out any non-tuple elements robustly
    filtered_path = []
    for p in path:
        if isinstance(p, tuple) and len(p) == 2 and all(isinstance(coord, int) for coord in p):
            filtered_path.append([p[0], p[1]])
        else:
            logger.warning(f"Non-tuple or invalid path element encountered: {p}")

    if filtered_path:
        contour = np.array(filtered_path, dtype=np.int32).reshape(-1, 1, 2)
        contours = [contour]
    else:
        contours = []
    
    # Save debug image
    debug_img = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    cv2.polylines(debug_img, contours, False, (0, 255, 0), 2)
    cv2.circle(debug_img, (start_x, start_y), 5, (0, 0, 255), -1)
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
        debug_path = Path(tmp.name)
        cv2.imwrite(str(debug_path), debug_img)
        logger.info(f"Debug image saved: {debug_path}")
    
    return contours

def simplify_contour(contour: np.ndarray, epsilon: float = 0.05) -> np.ndarray:
    """
    Simplify a contour using the Douglas-Peucker algorithm.
    
    Args:
        contour: The input contour to simplify
        epsilon: Approximation accuracy. Higher values result in more simplification.
                Value is relative to the contour perimeter.
    
    Returns:
        Simplified contour
    """
    perimeter = cv2.arcLength(contour, True)
    epsilon = epsilon * perimeter
    simplified = cv2.approxPolyDP(contour, epsilon, True)
    return simplified
