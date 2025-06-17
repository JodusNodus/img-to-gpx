import { useState, useRef } from "react";
import type { MouseEvent } from "react";
import { Map } from "./Map";
import type { ReferencePoint } from "../types";

interface ReferencePointsProps {
  imageUrl: string;
  referencePoints: ReferencePoint[];
  onReferencePointsChange: (points: ReferencePoint[]) => void;
}

// Define colors for points
const POINT_COLORS = [
  { name: "Red", color: "#EF4444" },
  { name: "Blue", color: "#3B82F6" },
  { name: "Green", color: "#22C55E" },
];

export function ReferencePoints({
  imageUrl,
  referencePoints,
  onReferencePointsChange,
}: ReferencePointsProps) {
  const [searchError, setSearchError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handle click on map for reference points
  const handleMapClick = (lat: number, lng: number) => {
    const newPoints = [...referencePoints];
    const activeIndex = newPoints.findIndex((p) => p.mapPoint === null);
    if (activeIndex !== -1) {
      newPoints[activeIndex] = {
        ...newPoints[activeIndex],
        mapPoint: [lat, lng],
      };
      onReferencePointsChange(newPoints);
    }
  };

  // Handle map search
  const handleMapSearch = async (query: string) => {
    setSearchError(null);
    if (!query.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setSearchError(null);
      } else {
        setSearchError("Location not found.");
      }
    } catch {
      setSearchError("Error searching for location.");
    }
  };

  // Handle click on image for reference points
  const handleReferenceImageClick = (e: MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);

    if (referencePoints.length < 3) {
      const newPointIndex = referencePoints.length;
      onReferencePointsChange([
        ...referencePoints,
        {
          imagePoint: [actualX, actualY],
          mapPoint: null,
          name: `Point ${newPointIndex + 1}`,
          color: POINT_COLORS[newPointIndex].color,
        },
      ]);
    }
  };

  // Handle image load
  const handleImageLoad = () => {
    if (imageRef.current) {
      console.log("Image loaded:", {
        natural: [
          imageRef.current.naturalWidth,
          imageRef.current.naturalHeight,
        ],
        display: [imageRef.current.width, imageRef.current.height],
      });
      setImageLoaded(true);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">
        Step 3: Set Reference Points
      </h2>
      <div className="text-sm text-gray-400 mb-4">
        Click on the image to set reference points, then click on the map to set
        their corresponding locations. You need to set exactly 3 points for
        better accuracy.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative h-[600px] rounded-lg overflow-hidden border border-gray-700/50">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Reference"
            className="w-full h-auto cursor-crosshair"
            onClick={handleReferenceImageClick}
            onLoad={handleImageLoad}
          />
          {imageLoaded &&
            referencePoints.map((point, index) => {
              if (!imageRef.current) return null;
              const rect = imageRef.current.getBoundingClientRect();

              // Calculate the scale
              const scale = rect.width / imageRef.current.naturalWidth;

              // Calculate the point position
              const pointX = point.imagePoint[0] * scale;
              const pointY = point.imagePoint[1] * scale;

              return (
                <div
                  key={index}
                  className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-lg"
                  style={{
                    left: `${pointX}px`,
                    top: `${pointY}px`,
                    backgroundColor: point.color || POINT_COLORS[index].color,
                  }}
                />
              );
            })}
        </div>
        <div className="h-[600px] rounded-lg overflow-hidden border border-gray-700/50">
          <Map
            onMapClick={handleMapClick}
            onSearch={handleMapSearch}
            searchError={searchError}
            referencePoints={referencePoints}
          />
        </div>
      </div>
    </div>
  );
}
