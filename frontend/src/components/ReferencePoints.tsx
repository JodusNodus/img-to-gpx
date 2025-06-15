import { useRef, useEffect, useState } from "react";
import type { MouseEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ReferencePoint {
  imagePoint: [number, number];
  mapPoint: [number, number] | null;
  name: string;
}

interface ReferencePointsProps {
  imageUrl: string;
  referencePoints: ReferencePoint[];
  onImageClick: (e: MouseEvent<HTMLImageElement>) => void;
  onMapClick: (lat: number, lng: number) => void;
  onSearch: (query: string) => Promise<void>;
  searchError: string | null;
}

export function ReferencePoints({
  imageUrl,
  referencePoints,
  onImageClick,
  onMapClick,
  onSearch,
  searchError,
}: ReferencePointsProps) {
  console.log("referencePoints", referencePoints);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [search, setSearch] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<"image" | "map">("image");
  const [pendingMapClick, setPendingMapClick] = useState<
    [number, number] | null
  >(null);

  // Define colors for points
  const colors = [
    { name: "Red", class: "bg-red-500" },
    { name: "Blue", class: "bg-blue-500" },
    { name: "Green", class: "bg-green-500" },
  ];

  // Initialize map only once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map instance
    mapInstanceRef.current = L.map(mapRef.current).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstanceRef.current);

    // Add click handler
    mapInstanceRef.current.on("click", (e) => {
      if (phase === "map") {
        setPendingMapClick([e.latlng.lat, e.latlng.lng]);
      }
    });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [phase]);

  // Update markers when reference points change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    // Add new markers for each point that has a location
    referencePoints.forEach((point, index) => {
      if (point.mapPoint) {
        const [lat, lng] = point.mapPoint;
        const colorClass = colors[index].class;
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "custom-marker",
            html: `<div class="w-6 h-6 rounded-full border-2 border-white ${colorClass}"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        });

        // Add click handler to marker
        marker.on("click", () => {
          setPendingMapClick([lat, lng]);
          // Find the index of this point
          const pointIndex = referencePoints.findIndex(
            (p) => p.mapPoint && p.mapPoint[0] === lat && p.mapPoint[1] === lng
          );
          if (pointIndex !== -1) {
            // Remove the old point
            const newPoints = [...referencePoints];
            newPoints[pointIndex] = {
              ...newPoints[pointIndex],
              mapPoint: null,
            };
            onMapClick(lat, lng); // This will update the points
          }
        });

        marker.addTo(mapInstanceRef.current!);
      }
    });

    // Add pending marker if exists
    if (pendingMapClick) {
      const [lat, lng] = pendingMapClick;
      L.marker([lat, lng], {
        icon: L.divIcon({
          className: "custom-marker",
          html: `<div class="w-6 h-6 rounded-full border-2 border-white bg-yellow-500"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(mapInstanceRef.current!);
    }
  }, [referencePoints, pendingMapClick, colors]);

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim() || !mapInstanceRef.current) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          search
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        mapInstanceRef.current.setView([parseFloat(lat), parseFloat(lon)], 10);
      }
      onSearch(search);
    } catch {
      onSearch(search);
    }
  };

  // Move to map phase when all points are selected
  useEffect(() => {
    if (phase === "image" && referencePoints.length === 3) {
      setPhase("map");
    }
  }, [referencePoints.length, phase]);

  // Handle point selection
  const handlePointSelect = (colorIndex: number) => {
    if (pendingMapClick) {
      const newPoints = [...referencePoints];
      newPoints[colorIndex] = {
        ...newPoints[colorIndex],
        mapPoint: pendingMapClick,
      };
      onMapClick(pendingMapClick[0], pendingMapClick[1]);
      setPendingMapClick(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">
        Step 3: Select Reference Points
      </h2>
      <div className="text-sm text-gray-400 mb-4">
        {phase === "image"
          ? referencePoints.length < 3
            ? `Click on the image to select point ${
                referencePoints.length + 1
              } of 3`
            : "All points selected! Now set their locations on the map."
          : pendingMapClick
          ? "Select which point to place at this location"
          : "Click on the map where you want to place a point"}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">Image</h3>
          <div className="relative">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Reference"
              onClick={phase === "image" ? onImageClick : undefined}
              className={`max-w-full rounded-lg shadow-xl border border-gray-700/50 ${
                phase === "image"
                  ? "cursor-crosshair hover:border-indigo-500/50"
                  : ""
              } transition-all duration-200`}
            />
            {referencePoints.map((point, index) => {
              if (!imageRef.current) return null;
              const rect = imageRef.current.getBoundingClientRect();
              const scaleX = rect.width / imageRef.current.naturalWidth;
              const scaleY = rect.height / imageRef.current.naturalHeight;
              const displayX = point.imagePoint[0] * scaleX;
              const displayY = point.imagePoint[1] * scaleY;
              const colorClass = colors[index].class;

              return (
                <div
                  key={index}
                  className={`absolute w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 ${colorClass}`}
                  style={{
                    left: `${displayX}px`,
                    top: `${displayY}px`,
                  }}
                />
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">Map</h3>
          <form onSubmit={handleSearch} className="flex gap-2 mb-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a place or address..."
              className="flex-1 px-3 py-2 rounded-lg bg-gray-900/70 border border-gray-700/50 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              Search
            </button>
          </form>
          {searchError && (
            <div className="text-red-400 text-sm mb-2">{searchError}</div>
          )}
          <div className="h-[400px] rounded-lg overflow-hidden border border-gray-700/50">
            <div ref={mapRef} className="w-full h-full" />
          </div>
        </div>
      </div>

      {pendingMapClick && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-200">
            Select Point Color
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {colors.map((color, index) => (
              <button
                key={color.name}
                onClick={() => handlePointSelect(index)}
                className={`p-4 rounded-lg transition-all duration-200 ${
                  referencePoints[index]?.mapPoint !== null
                    ? "bg-gray-700/50 text-gray-400"
                    : "bg-gray-800/50 hover:bg-gray-700/50 hover:scale-105"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${color.class}`} />
                  <span className="text-sm font-medium text-gray-300">
                    {referencePoints[index]?.mapPoint
                      ? "Click to move this point"
                      : "Click to place this point"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!pendingMapClick && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-200">
            Reference Points
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {referencePoints.map((point, index) => (
              <div key={index} className="bg-gray-800/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      point.mapPoint !== null
                        ? colors[index].class
                        : "bg-gray-500"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-300">
                    {colors[index].name} Point
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {point.mapPoint ? (
                    <>
                      Location: {point.mapPoint[0].toFixed(6)},{" "}
                      {point.mapPoint[1].toFixed(6)}
                    </>
                  ) : (
                    "No location set"
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
