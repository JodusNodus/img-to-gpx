import requests
import logging
import os
from datetime import datetime
from typing import List, Tuple

# Configure logging
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

# Use a single log file that gets overwritten
log_file = os.path.join(log_dir, "line_snapper.log")

# Configure logging to write to both file and console
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, mode='w'),  # 'w' mode overwrites the file
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class LineSnapper:
    def __init__(self, valhalla_url: str = "http://localhost:8002"):
        """Initialize the line snapper with Valhalla HTTP API URL.
        
        Args:
            valhalla_url: URL of the Valhalla HTTP API service
        """
        self.valhalla_url = valhalla_url
        logger.info(f"Initialized LineSnapper with Valhalla URL: {valhalla_url}")
        logger.info(f"Log file: {log_file}")

    def snap_points(self, points: List[Tuple[float, float]], radius: float = 10) -> List[Tuple[float, float]]:
        """Snap a list of points to the road network.
        
        Args:
            points: List of (latitude, longitude) tuples
            radius: Search radius in meters for finding nearby roads
            
        Returns:
            List of snapped (latitude, longitude) tuples
        """
        # Increase search radius to 100 meters
        search_radius = 100
        
        # Create a trace route request
        request = {
            "shape": [{"lat": lat, "lon": lon} for lat, lon in points],
            "costing": "pedestrian",
            "shape_match": "map_snap",
            "search_radius": search_radius,
            "gps_accuracy": 10.0,
            "break": "distance",
            "break_distance": 100,
            "interpolation_distance": 1,
            "format": "osrm",
            "trace_options": {
                "turn_penalty_factor": 500,
                "search_radius": search_radius,
                "gps_accuracy": 10.0,
                "sigma_z": 4.07,
                "beta": 3,
                "max_route_distance_factor": 3,
                "max_route_time_factor": 3
            },
            "directions_options": {
                "units": "kilometers"
            }
        }
        
        logger.info(f"Sending request to Valhalla with {len(points)} points")
        logger.info(f"First point: {points[0] if points else 'No points'}")
        logger.info(f"Last point: {points[-1] if points else 'No points'}")
        logger.debug(f"Request payload: {request}")
        
        try:
            # Get the snapped locations using trace_attributes endpoint
            response = requests.post(f"{self.valhalla_url}/trace_attributes", json=request)
            response.raise_for_status()
            result = response.json()
            
            logger.debug(f"Valhalla response: {result}")
            
            if result and "shape" in result:
                # Decode the polyline shape
                matched_points = self._decode_polyline(result["shape"])
                logger.info(f"Successfully matched {len(matched_points)} points")
                
                # Log comparison of first and last points
                if points and matched_points:
                    logger.info("First point comparison:")
                    logger.info(f"Original: ({points[0][0]:.6f}, {points[0][1]:.6f})")
                    logger.info(f"Matched:  ({matched_points[0][0]:.6f}, {matched_points[0][1]:.6f})")
                    logger.info("Last point comparison:")
                    logger.info(f"Original: ({points[-1][0]:.6f}, {points[-1][1]:.6f})")
                    logger.info(f"Matched:  ({matched_points[-1][0]:.6f}, {matched_points[-1][1]:.6f})")
                
                return matched_points
            else:
                logger.warning("No shape found in Valhalla response, returning original points")
                logger.warning(f"Response content: {result}")
                return points
        except Exception as e:
            logger.error(f"Error snapping points: {str(e)}", exc_info=True)
            # If request fails, return original points
            return points

    def _decode_polyline(self, encoded: str) -> List[Tuple[float, float]]:
        """Decode a Google-style polyline string into a list of lat/lon tuples."""
        # Initialize variables
        index = 0
        lat = 0
        lng = 0
        points = []
        
        while index < len(encoded):
            # Decode latitude
            shift = 0
            result = 0
            while True:
                byte = ord(encoded[index]) - 63
                index += 1
                result |= (byte & 0x1F) << shift
                shift += 5
                if not byte >= 0x20:
                    break
            lat += (~(result >> 1) if (result & 1) else (result >> 1))
            
            # Decode longitude
            shift = 0
            result = 0
            while True:
                byte = ord(encoded[index]) - 63
                index += 1
                result |= (byte & 0x1F) << shift
                shift += 5
                if not byte >= 0x20:
                    break
            lng += (~(result >> 1) if (result & 1) else (result >> 1))
            
            # Convert to actual lat/lon values (divide by 1e5)
            # Note: Valhalla uses 1e6 for polyline encoding
            points.append((lat * 1e-6, lng * 1e-6))
        
        return points
