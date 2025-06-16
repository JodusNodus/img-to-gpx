import { useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ReferencePoint } from "../types";

interface MapProjectionProps {
  image: File;
  referencePoints: ReferencePoint[];
  overlayOpacity: number;
  overlayContrast: number;
  onOpacityChange: (value: number) => void;
  onContrastChange: (value: number) => void;
}

export function MapProjection({
  image,
  referencePoints,
  overlayOpacity,
  overlayContrast,
  onOpacityChange,
  onContrastChange,
}: MapProjectionProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);

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

  // Update overlay when points or opacity/contrast change
  useEffect(() => {
    if (!mapInstanceRef.current || !image || !referencePoints) return;

    // Remove existing overlay
    if (imageOverlayRef.current) {
      imageOverlayRef.current.remove();
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

      // Create image overlay
      const imageUrl = URL.createObjectURL(image);
      const overlay = L.imageOverlay(
        imageUrl,
        [
          [topLeftLat, topLeftLng],
          [bottomRightLat, bottomRightLng],
        ],
        {
          opacity: overlayOpacity,
        }
      ).addTo(mapInstanceRef.current!);

      // Apply contrast using CSS filter
      const imgElement = overlay.getElement();
      if (imgElement) {
        imgElement.style.filter = `contrast(${overlayContrast})`;
      }

      imageOverlayRef.current = overlay;

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
        URL.revokeObjectURL(imageUrl);
      };
    };
  }, [image, referencePoints, overlayOpacity, overlayContrast]);

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
