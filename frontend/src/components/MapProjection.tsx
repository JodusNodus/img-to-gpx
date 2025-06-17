import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ReferencePoint } from "../types";

interface MapProjectionProps {
  image: File;
  referencePoints: ReferencePoint[];
  points?: [number, number][];
}

export function MapProjection({
  image,
  referencePoints,
  points = [],
}: MapProjectionProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map instance
    mapInstanceRef.current = L.map(mapRef.current).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstanceRef.current);

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update overlay and points when points change
  useEffect(() => {
    if (!mapInstanceRef.current || !image || !referencePoints) return;

    // Remove existing overlay and polyline
    if (imageOverlayRef.current) {
      imageOverlayRef.current.remove();
      imageOverlayRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Get the image dimensions
    const img = new Image();
    img.src = URL.createObjectURL(image);

    img.onload = () => {
      // Get all reference points that have both image and map coordinates
      const validPoints = referencePoints.filter((p) => p.mapPoint);
      if (validPoints.length !== 2) return;

      const p1 = validPoints[0];
      const p2 = validPoints[1];

      // Calculate image distances
      const imageDx = p2.imagePoint[0] - p1.imagePoint[0];
      const imageDy = p2.imagePoint[1] - p1.imagePoint[1];

      // Calculate map distances
      const mapDx = p2.mapPoint![1] - p1.mapPoint![1];
      const mapDy = p2.mapPoint![0] - p1.mapPoint![0];

      // Calculate scale factors
      const scaleFactorX = Math.abs(mapDx / imageDx);
      const scaleFactorY = Math.abs(mapDy / imageDy);

      // Use the first reference point as anchor
      const topLeftLat = p1.mapPoint![0] + p1.imagePoint[1] * scaleFactorY;
      const topLeftLng = p1.mapPoint![1] - p1.imagePoint[0] * scaleFactorX;

      // Calculate the bottom-right corner position
      const bottomRightLat = topLeftLat - img.height * scaleFactorY;
      const bottomRightLng = topLeftLng + img.width * scaleFactorX;

      // Create image overlay if showOverlay is true
      const imageUrl = URL.createObjectURL(image);
      if (showOverlay) {
        const overlay = L.imageOverlay(imageUrl, [
          [topLeftLat, topLeftLng],
          [bottomRightLat, bottomRightLng],
        ]).addTo(mapInstanceRef.current!);

        imageOverlayRef.current = overlay;
      }

      // Transform points from image coordinates to map coordinates
      if (points.length > 0) {
        const mapPoints = points.map(([x, y]) => {
          const lat = topLeftLat - y * scaleFactorY;
          const lng = topLeftLng + x * scaleFactorX;
          return [lat, lng] as [number, number];
        });

        // Create polyline
        const polyline = L.polyline(mapPoints, {
          color: "red",
          weight: 3,
          opacity: 0.8,
        }).addTo(mapInstanceRef.current!);

        polylineRef.current = polyline;
      }

      // Fit map to bounds
      mapInstanceRef.current!.fitBounds([
        [topLeftLat, topLeftLng],
        [bottomRightLat, bottomRightLng],
      ]);

      // Cleanup
      return () => {
        if (imageOverlayRef.current) {
          imageOverlayRef.current.remove();
          imageOverlayRef.current = null;
        }
        if (polylineRef.current) {
          polylineRef.current.remove();
          polylineRef.current = null;
        }
        URL.revokeObjectURL(imageUrl);
      };
    };
  }, [image, referencePoints, points, showOverlay]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">
        Step 4: Map Projection
      </h2>
      <div className="text-sm text-gray-400 mb-4">
        The line has been projected onto the map based on your reference points.
        You can toggle the image overlay to help with alignment.
      </div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className="px-4 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          {showOverlay ? "Hide Image" : "Show Image"}
        </button>
      </div>
      <div className="h-[600px] rounded-lg overflow-hidden border border-gray-700/50">
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
