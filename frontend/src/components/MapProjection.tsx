import { useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Points, ReferencePoint } from "../types";

interface MapProjectionProps {
  points: Points;
  referencePoints: ReferencePoint[];
  overlayOpacity: number;
  overlayContrast: number;
  onOpacityChange: (value: number) => void;
  onContrastChange: (value: number) => void;
}

export function MapProjection({
  points,
  referencePoints,
  overlayOpacity,
  overlayContrast,
  onOpacityChange,
  onContrastChange,
}: MapProjectionProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const markerRefs = useRef<L.Marker[]>([]);

  // Marker colors
  const colors = ["bg-red-500", "bg-blue-500", "bg-green-500"];

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

  // Add colored markers for reference points
  useEffect(() => {
    if (!mapInstanceRef.current || !referencePoints) return;
    // Remove old markers
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];
    // Add new markers
    referencePoints.forEach((point, idx) => {
      if (!point.mapPoint) return;
      const [lat, lng] = point.mapPoint;
      const colorClass = colors[idx] || "bg-gray-500";
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "custom-marker",
          html: `<div class='w-3 h-3 rounded-full border border-white ${colorClass}'></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
      });
      marker.addTo(mapInstanceRef.current!);
      markerRefs.current.push(marker);
    });
    // Cleanup
    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
    };
  }, [referencePoints]);

  // Update image overlay when points or opacity/contrast change
  useEffect(() => {
    if (!mapInstanceRef.current || !points || !referencePoints) return;

    // Remove existing overlay
    if (imageOverlayRef.current) {
      imageOverlayRef.current.remove();
    }

    // Get the image dimensions
    const img = new Image();
    img.src = URL.createObjectURL(points.image);

    img.onload = () => {
      // Get all reference points that have both image and map coordinates
      const validPoints = referencePoints.filter((p) => p.mapPoint);
      if (validPoints.length === 0) return;

      // Calculate the scale factor based on the first two points
      const p1 = validPoints[0];
      const p2 = validPoints[1];

      // Calculate image distance
      const dx = p1.imagePoint[0] - p2.imagePoint[0];
      const dy = p1.imagePoint[1] - p2.imagePoint[1];
      const imageDist = Math.sqrt(dx * dx + dy * dy);

      // Calculate map distance
      const mapDist = mapInstanceRef.current!.distance(
        [p1.mapPoint![0], p1.mapPoint![1]],
        [p2.mapPoint![0], p2.mapPoint![1]]
      );

      // Calculate scale factor
      const scaleFactor = mapDist / imageDist;

      // Calculate the bounds using the first point as reference
      const refPoint = validPoints[0];
      const refLat = refPoint.mapPoint![0];
      const refLng = refPoint.mapPoint![1];
      const refX = refPoint.imagePoint[0];
      const refY = refPoint.imagePoint[1];

      // Convert image coordinates to map coordinates
      const latScale = 111320; // meters per degree at equator
      const lngScale = 111320 * Math.cos((refLat * Math.PI) / 180);

      // Calculate the bounds
      const bounds = L.latLngBounds([
        [
          refLat - (refY * scaleFactor) / latScale,
          refLng - (refX * scaleFactor) / lngScale,
        ],
        [
          refLat + ((img.height - refY) * scaleFactor) / latScale,
          refLng + ((img.width - refX) * scaleFactor) / lngScale,
        ],
      ]);

      // Create image overlay
      const imageUrl = URL.createObjectURL(points.image);
      imageOverlayRef.current = L.imageOverlay(imageUrl, bounds, {
        opacity: overlayOpacity,
      }).addTo(mapInstanceRef.current!);

      // Fit map to bounds
      mapInstanceRef.current!.fitBounds(bounds);

      // Cleanup
      return () => {
        if (imageOverlayRef.current) {
          imageOverlayRef.current.remove();
          imageOverlayRef.current = null;
        }
        URL.revokeObjectURL(imageUrl);
      };
    };
  }, [points, referencePoints, overlayOpacity]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">
        Step 4: Map Projection
      </h2>
      <div className="text-sm text-gray-400 mb-4">
        The image has been projected onto the map based on your reference
        points. You can adjust the opacity and contrast of the overlay using the
        sliders below.
      </div>
      <div className="h-[600px] rounded-lg overflow-hidden border border-gray-700/50">
        <div ref={mapRef} className="w-full h-full" />
      </div>
      <div className="flex flex-col md:flex-row gap-6 mt-6 items-center justify-between">
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label htmlFor="opacity-slider" className="text-sm text-gray-300">
            Overlay Opacity: {overlayOpacity.toFixed(2)}
          </label>
          <input
            id="opacity-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={overlayOpacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label htmlFor="contrast-slider" className="text-sm text-gray-300">
            Overlay Contrast: {overlayContrast.toFixed(2)}
          </label>
          <input
            id="contrast-slider"
            type="range"
            min={0.5}
            max={3}
            step={0.01}
            value={overlayContrast}
            onChange={(e) => onContrastChange(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
