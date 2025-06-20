import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ReferencePoint } from "../types";

// Helper: Compute affine transform parameters from 3 point pairs (direct solution)
function computeAffineTransform(imgPts: number[][], mapPts: number[][]) {
  // imgPts: [[x1, y1], [x2, y2], [x3, y3]]
  // mapPts: [[X1, Y1], [X2, Y2], [X3, Y3]]
  const [[x1, y1], [x2, y2], [x3, y3]] = imgPts;
  const [[X1, Y1], [X2, Y2], [X3, Y3]] = mapPts;
  // Solve for affine parameters: X = a*x + b*y + c, Y = d*x + e*y + f
  // Set up the system: [ [x1 y1 1 0 0 0], [0 0 0 x1 y1 1], ... ]
  const A = [
    [x1, y1, 1, 0, 0, 0],
    [0, 0, 0, x1, y1, 1],
    [x2, y2, 1, 0, 0, 0],
    [0, 0, 0, x2, y2, 1],
    [x3, y3, 1, 0, 0, 0],
    [0, 0, 0, x3, y3, 1],
  ];
  const B = [X1, Y1, X2, Y2, X3, Y3];
  // Solve Ax = B
  // Use Cramer's rule for 3 points (6x6)
  // We'll use numeric.js if available, otherwise a simple pseudo-inverse
  // For 3 points, we can use a direct solution
  function solve(A: number[][], B: number[]) {
    // Use Gaussian elimination (for small 6x6 system)
    const m = A.map((row) => row.slice());
    const b = B.slice();
    for (let i = 0; i < 6; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < 6; k++) {
        if (Math.abs(m[k][i]) > Math.abs(m[maxRow][i])) maxRow = k;
      }
      // Swap rows
      [m[i], m[maxRow]] = [m[maxRow], m[i]];
      [b[i], b[maxRow]] = [b[maxRow], b[i]];
      // Eliminate
      for (let k = i + 1; k < 6; k++) {
        const c = m[k][i] / m[i][i];
        for (let j = i; j < 6; j++) m[k][j] -= c * m[i][j];
        b[k] -= c * b[i];
      }
    }
    // Back substitution
    const x = Array(6).fill(0);
    for (let i = 5; i >= 0; i--) {
      let sum = b[i];
      for (let j = i + 1; j < 6; j++) sum -= m[i][j] * x[j];
      x[i] = sum / m[i][i];
    }
    return x;
  }
  return solve(A, B);
}

function applyAffineTransform(x: number, y: number, params: number[]) {
  const [a, b, c, d, e, f] = params;
  const X = a * x + b * y + c;
  const Y = d * x + e * y + f;
  return [X, Y];
}

interface MapProjectionProps {
  image: File;
  referencePoints: ReferencePoint[];
  points: [number, number][];
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
  const snappedPolylineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
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
    if (snappedPolylineRef.current) {
      snappedPolylineRef.current.remove();
      snappedPolylineRef.current = null;
    }

    // Get the image dimensions
    const img = new Image();
    img.src = URL.createObjectURL(image);

    img.onload = () => {
      // Get all reference points that have both image and map coordinates
      const validPoints = referencePoints.filter((p) => p.mapPoint);
      if (validPoints.length < 2) return;

      // Prepare arrays for axis-aligned calculation
      const imgPts = validPoints.map((p) => p.imagePoint);
      const mapPts = validPoints.map((p) => [p.mapPoint![1], p.mapPoint![0]]); // [lng, lat]

      // 1. Affine transform (if 3+ points)
      let affineMapPoints: [number, number][] = [];
      let affineParams: number[] = [];
      if (validPoints.length >= 3) {
        affineParams = computeAffineTransform(
          imgPts.slice(0, 3),
          mapPts.slice(0, 3)
        );
        affineMapPoints = points.map(([x, y]) => {
          const [lng, lat] = applyAffineTransform(x, y, affineParams);
          return [lat, lng] as [number, number];
        });
      }

      // Calculate the projected image corners using affine transform
      const topLeft = applyAffineTransform(0, 0, affineParams);
      const bottomRight = applyAffineTransform(
        img.width,
        img.height,
        affineParams
      );

      // Create image overlay if showOverlay is true
      const imageUrl = URL.createObjectURL(image);
      if (showOverlay) {
        const overlay = L.imageOverlay(imageUrl, [
          [topLeft[1], topLeft[0]],
          [bottomRight[1], bottomRight[0]],
        ]).addTo(mapInstanceRef.current!);
        imageOverlayRef.current = overlay;
      }

      // Fit map to bounds
      mapInstanceRef.current!.fitBounds([
        [topLeft[1], topLeft[0]],
        [bottomRight[1], bottomRight[0]],
      ]);

      // Draw affine (red, dashed)
      if (affineMapPoints.length > 0) {
        const polyline = L.polyline(affineMapPoints, {
          color: "red",
          weight: 2,
          opacity: 0.8,
          dashArray: "6, 6",
        }).addTo(mapInstanceRef.current!);
        polylineRef.current = polyline;
      }

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
    if (validPoints.length < 2) return;

    // Prepare arrays for axis-aligned calculation
    const imgPts = validPoints.map((p) => p.imagePoint);
    const mapPts = validPoints.map((p) => [p.mapPoint![1], p.mapPoint![0]]); // [lng, lat]

    // 1. Affine transform (if 3+ points)
    let affineMapPoints: [number, number][] = [];
    if (validPoints.length >= 3) {
      const affineParams = computeAffineTransform(
        imgPts.slice(0, 3),
        mapPts.slice(0, 3)
      );
      affineMapPoints = points.map(([x, y]) => {
        const [lng, lat] = applyAffineTransform(x, y, affineParams);
        return [lat, lng] as [number, number];
      });
    }

    // Create polyline
    const polyline = L.polyline(affineMapPoints, {
      color: "red",
      weight: 2,
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

    const startMarker = L.marker(affineMapPoints[0], { icon: startIcon })
      .addTo(mapInstanceRef.current!)
      .bindTooltip("Start", { permanent: true, direction: "top" });

    const endMarker = L.marker(affineMapPoints[affineMapPoints.length - 1], {
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
  }, [points, image, referencePoints]);

  const handleExportGPX = () => {
    if (!mapInstanceRef.current || points.length === 0) return;

    // Get all reference points that have both image and map coordinates
    const validPoints = referencePoints.filter((p) => p.mapPoint);
    if (validPoints.length < 3) return;

    const imgPts = validPoints.map((p) => p.imagePoint);
    const mapPts = validPoints.map((p) => [p.mapPoint![1], p.mapPoint![0]]); // [lng, lat]
    const affineParams = computeAffineTransform(
      imgPts.slice(0, 3),
      mapPts.slice(0, 3)
    );
    const affineMapPoints = points.map(([x, y]) => {
      const [lng, lat] = applyAffineTransform(x, y, affineParams);
      return [lat, lng] as [number, number];
    });

    // Create GPX content
    const gpxContent = createGPXContent(affineMapPoints);

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

  const handleSnapToRoads = async () => {
    if (!polylineRef.current || !mapInstanceRef.current) return;

    try {
      // Get the current points from the polyline
      const path = polylineRef.current.getLatLngs() as L.LatLng[];
      const points = path.map((point: L.LatLng) => ({
        lat: point.lat,
        lng: point.lng,
      }));

      console.log("Sending points to backend:", points);

      const response = await fetch("http://localhost:5131/api/snap-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          points: points.map((p: { lat: number; lng: number }) => [
            p.lat,
            p.lng,
          ]),
          radius: 100, // 100 meter search radius
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received snapped points:", data.points);

      // Create a new polyline for the snapped route
      if (snappedPolylineRef.current) {
        snappedPolylineRef.current.remove();
      }

      const snappedPath = data.points.map(([lat, lng]: [number, number]) => ({
        lat,
        lng,
      }));

      console.log("Original points:", points);
      console.log("Snapped points:", snappedPath);

      snappedPolylineRef.current = L.polyline(snappedPath, {
        color: "blue",
        weight: 2,
        opacity: 1.0,
        dashArray: "10, 2", // Dashed line pattern
      }).addTo(mapInstanceRef.current);
    } catch (error) {
      console.error("Error snapping to roads:", error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">
        Step 4: Map Projection
      </h2>
      <div className="text-sm text-gray-400 mb-4">
        The line has been projected onto the map based on your reference points.
        You can toggle the image overlay to help with alignment.
      </div>
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className="px-4 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          {showOverlay ? "Hide Image" : "Show Image"}
        </button>
        <button
          onClick={handleSnapToRoads}
          disabled={points.length === 0}
          className={`px-4 py-2 bg-blue-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
            points.length === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Snap to Roads
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
      <div className="h-[600px] rounded-lg overflow-hidden border border-gray-700/50">
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
