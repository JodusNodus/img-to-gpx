import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ReferencePoint } from "../types";

interface MapProjectionProps {
  image: File;
  referencePoints: ReferencePoint[];
  points?: [number, number][];
}

function createGPXContent(points: [number, number][]): string {
  const now = new Date().toISOString();
  const trackPoints = points
    .map(
      ([lat, lng]) => `    <trkpt lat="${lat}" lon="${lng}">
      <time>${now}</time>
    </trkpt>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Image to GPX Converter"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>Converted Track</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
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
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [xOffset, setXOffset] = useState(0);
  const [yOffset, setYOffset] = useState(0);

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

  // Initialize map and handle image/reference points changes
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
  }, [image, referencePoints, showOverlay]);

  // Update line position when offsets change
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !image ||
      !referencePoints ||
      points.length === 0
    )
      return;

    // Remove existing polyline and markers
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }

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

    // Transform points from image coordinates to map coordinates
    const mapPoints = points.map(([x, y]) => {
      // Apply offsets to the points
      const adjustedX = x + xOffset;
      const adjustedY = y + yOffset;
      const lat = topLeftLat - adjustedY * scaleFactorY;
      const lng = topLeftLng + adjustedX * scaleFactorX;
      return [lat, lng] as [number, number];
    });

    // Create polyline
    const polyline = L.polyline(mapPoints, {
      color: "red",
      weight: 3,
      opacity: 0.8,
    }).addTo(mapInstanceRef.current!);

    // Create start and end markers
    const startIcon = L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background-color: #22c55e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    const endIcon = L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    const startMarker = L.marker(mapPoints[0], { icon: startIcon })
      .addTo(mapInstanceRef.current!)
      .bindTooltip("Start", { permanent: true, direction: "top" });

    const endMarker = L.marker(mapPoints[mapPoints.length - 1], {
      icon: endIcon,
    })
      .addTo(mapInstanceRef.current!)
      .bindTooltip("End", { permanent: true, direction: "top" });

    polylineRef.current = polyline;
    startMarkerRef.current = startMarker;
    endMarkerRef.current = endMarker;

    // Cleanup
    return () => {
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
        startMarkerRef.current = null;
      }
      if (endMarkerRef.current) {
        endMarkerRef.current.remove();
        endMarkerRef.current = null;
      }
    };
  }, [points, xOffset, yOffset, image, referencePoints]);

  const handleExportGPX = () => {
    if (!mapInstanceRef.current || points.length === 0) return;

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

    // Transform points from image coordinates to map coordinates
    const mapPoints = points.map(([x, y]) => {
      const adjustedX = x + xOffset;
      const adjustedY = y + yOffset;
      const lat = topLeftLat - adjustedY * scaleFactorY;
      const lng = topLeftLng + adjustedX * scaleFactorX;
      return [lat, lng] as [number, number];
    });

    // Create GPX content
    const gpxContent = createGPXContent(mapPoints);

    // Create and download file
    const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "track.gpx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">
        Step 4: Map Projection
      </h2>
      <div className="text-sm text-gray-400 mb-4">
        The line has been projected onto the map based on your reference points.
        You can toggle the image overlay to help with alignment and use the
        sliders to fine-tune the line position.
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="xOffset" className="text-gray-200">
              X Offset:
            </label>
            <input
              type="range"
              id="xOffset"
              min="-100"
              max="100"
              value={xOffset}
              onChange={(e) => setXOffset(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-gray-400 w-12">{xOffset}px</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="yOffset" className="text-gray-200">
              Y Offset:
            </label>
            <input
              type="range"
              id="yOffset"
              min="-100"
              max="100"
              value={yOffset}
              onChange={(e) => setYOffset(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-gray-400 w-12">{yOffset}px</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className="px-4 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {showOverlay ? "Hide Image" : "Show Image"}
          </button>
          <button
            onClick={handleExportGPX}
            disabled={points.length === 0}
            className={`px-4 py-2 bg-green-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 ${
              points.length === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Export GPX
          </button>
        </div>
      </div>
      <div className="h-[600px] rounded-lg overflow-hidden border border-gray-700/50">
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
