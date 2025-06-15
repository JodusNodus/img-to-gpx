import { useState, useRef, useEffect, useMemo } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- Types ---
interface FormData {
  image: File | null;
}

interface ReferencePoint {
  imagePoint: [number, number];
  mapPoint: [number, number] | null;
  name: string;
}

interface Points {
  points: [number, number][];
  normalized_points: [number, number][];
  width: number;
  height: number;
  bounds: {
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
  };
  image: File;
}

/* Temporarily disabled for development
interface ImagePreviewProps {
  imageUrl: string;
  points: Points | null;
  onImageClick: (e: MouseEvent<HTMLImageElement>) => void;
}
*/

interface ImagePreviewProps {
  imageUrl: string;
  points: Points | null;
  onImageClick: (e: MouseEvent<HTMLImageElement>) => void;
}

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
}

function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">
        Step 1: Upload Image
      </h2>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Upload PNG Image
        </label>
        <input
          type="file"
          accept="image/png"
          onChange={handleImageChange}
          className="w-full p-3 rounded-lg bg-gray-900/50 border border-gray-700/50 text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600/50 file:text-indigo-200 hover:file:bg-indigo-600/70 cursor-pointer transition-colors"
        />
      </div>
    </div>
  );
}

/* Temporarily disabled for development
function ImagePreview({ imageUrl, points, onImageClick }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (points && canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = imageRef.current;
      if (!ctx) return;
      // Set canvas size to match the displayed image size
      const rect = img.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Calculate scale factors
      const scaleX = rect.width / img.naturalWidth;
      const scaleY = rect.height / img.naturalHeight;
      // Draw points
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 3;
      if (points.points.length > 0) {
        const [startX, startY] = points.points[0];
        ctx.moveTo(startX * scaleX, startY * scaleY);
        for (let i = 1; i < points.points.length; i++) {
          const [x, y] = points.points[i];
          ctx.lineTo(x * scaleX, y * scaleY);
        }
      }
      ctx.stroke();
    }
  }, [points]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">
        Step 2: Select Line
      </h2>
      <div className="text-sm text-gray-400 mb-4">
        Click on the image to generate a line. Click multiple times to try
        different starting points.
      </div>
      <div className="my-6 text-center">
        <div className="inline-block relative">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Preview"
            onClick={onImageClick}
            title="Click to select start point"
            className="max-w-full max-h-[1200px] rounded-lg shadow-xl border border-gray-700/50 cursor-crosshair hover:border-indigo-500/50 transition-all duration-200"
            style={{ pointerEvents: "auto" }}
          />
          {points && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full max-w-full max-h-[1200px] rounded-lg"
              style={{ pointerEvents: "none" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
*/

function ImagePreview({ imageUrl, points, onImageClick }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (points && canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = imageRef.current;
      if (!ctx) return;
      // Set canvas size to match the displayed image size
      const rect = img.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Calculate scale factors
      const scaleX = rect.width / img.naturalWidth;
      const scaleY = rect.height / img.naturalHeight;
      // Draw points
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 3;
      if (points.points.length > 0) {
        const [startX, startY] = points.points[0];
        ctx.moveTo(startX * scaleX, startY * scaleY);
        for (let i = 1; i < points.points.length; i++) {
          const [x, y] = points.points[i];
          ctx.lineTo(x * scaleX, y * scaleY);
        }
      }
      ctx.stroke();
    }
  }, [points]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">
        Step 5: Select Line
      </h2>
      <div className="text-sm text-gray-400 mb-4">
        Click on the image to generate a line. Click multiple times to try
        different starting points.
      </div>
      <div className="my-6 text-center">
        <div className="inline-block relative">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Preview"
            onClick={onImageClick}
            title="Click to select start point"
            className="max-w-full max-h-[1200px] rounded-lg shadow-xl border border-gray-700/50 cursor-crosshair hover:border-indigo-500/50 transition-all duration-200"
            style={{ pointerEvents: "auto" }}
          />
          {points && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full max-w-full max-h-[1200px] rounded-lg"
              style={{ pointerEvents: "none" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface ReferencePointsProps {
  imageUrl: string;
  referencePoints: ReferencePoint[];
  onImageClick: (e: MouseEvent<HTMLImageElement>) => void;
  onMapClick: (lat: number, lng: number) => void;
  onSearch: (query: string) => Promise<void>;
  searchError: string | null;
  setCurrentStep: (step: number) => void;
}

function ReferencePoints({
  imageUrl,
  referencePoints,
  onImageClick,
  onMapClick,
  onSearch,
  searchError,
  setCurrentStep,
}: ReferencePointsProps) {
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

  // Check if all points are matched
  const allPointsMatched =
    referencePoints.length === 3 &&
    referencePoints.every((point) => point.mapPoint !== null);

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

      {allPointsMatched && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setCurrentStep(4)}
            className="px-6 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            Project Image on Map
          </button>
        </div>
      )}
    </div>
  );
}

interface MapProps {
  points: Points;
  overlayOpacity: number;
  overlayContrast: number;
}

function Map({ points, overlayOpacity, overlayContrast }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState("");

  // Memoize the object URL for the image
  const imageUrl = useMemo(() => {
    if (!points.image) return "";
    const url = URL.createObjectURL(points.image);
    return url;
  }, [points.image]);

  // Revoke the object URL on cleanup
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // Only initialize the map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = L.map(mapRef.current).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstanceRef.current);
  }, []);

  // Calculate image bounds and create overlay when points change
  useEffect(() => {
    if (!mapInstanceRef.current || !points || !imageRef.current) return;

    // Get the reference points from the points object
    const refPoints = points.points.map((point, index) => ({
      image: point,
      map: points.normalized_points[index],
    }));

    // Calculate the bounds of the image on the map
    const bounds = L.latLngBounds(refPoints.map((p) => p.map));

    // Create or update the image overlay
    if (imageRef.current) {
      const imageOverlay = L.imageOverlay(imageUrl, bounds, {
        opacity: overlayOpacity,
        interactive: false,
      }).addTo(mapInstanceRef.current);

      // Fit the map to show the entire image
      mapInstanceRef.current.fitBounds(bounds);

      // Cleanup
      return () => {
        imageOverlay.remove();
      };
    }
  }, [points, imageUrl, overlayOpacity]);

  // Update overlay style when contrast changes
  useEffect(() => {
    if (!imageRef.current) return;
    imageRef.current.style.filter = `contrast(${overlayContrast})`;
  }, [overlayContrast]);

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    if (!search.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          search
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(
            [parseFloat(lat), parseFloat(lon)],
            10
          );
        }
      } else {
        setSearchError("Location not found.");
      }
    } catch {
      setSearchError("Error searching for location.");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">Step 4: Map View</h2>
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
      <div className="h-[600px] rounded-lg overflow-hidden border border-gray-700/50 relative">
        <div ref={mapRef} className="w-full h-full" />
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Overlay"
          style={{
            display: "none", // Hide the original image as we're using Leaflet's imageOverlay
            filter: `contrast(${overlayContrast})`,
          }}
        />
      </div>
    </div>
  );
}

// --- Main App ---
function App() {
  const [formData, setFormData] = useState<FormData>({ image: null });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [points, setPoints] = useState<Points | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [overlayContrast, setOverlayContrast] = useState(1.7);
  const [referencePoints, setReferencePoints] = useState<ReferencePoint[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Handle image selection
  const handleImageSelect = (file: File) => {
    setFormData((prev) => ({ ...prev, image: file }));
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setCurrentStep(3); // Changed from 2 to 3 to skip the line pick step
  };

  // Handle click on image to generate line
  const handleImageClick = async (e: MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);
    if (formData.image) {
      setError(null);
      const data = new FormData();
      data.append("image", formData.image);
      data.append("start_x", String(actualX));
      data.append("start_y", String(actualY));
      try {
        const res = await fetch("http://localhost:5131/api/points", {
          method: "POST",
          body: data,
        });
        if (!res.ok) {
          const errorData = await res.json();
          setError(errorData.error || "Unknown error");
        } else {
          const pointsData = await res.json();
          setPoints(pointsData);
        }
      } catch {
        setError("Network error");
      }
    }
  };

  // Reset to upload step
  const resetToUpload = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setFormData({ image: null });
    setImagePreview(null);
    setPoints(null);
    setError(null);
    setCurrentStep(1);
  };

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Handle click on map for reference points
  const handleMapClick = (lat: number, lng: number) => {
    setReferencePoints((prevPoints) => {
      const newPoints = [...prevPoints];
      const activeIndex = newPoints.findIndex((p) => p.mapPoint === null);
      if (activeIndex !== -1) {
        newPoints[activeIndex] = {
          ...newPoints[activeIndex],
          mapPoint: [lat, lng],
        };
      }
      return newPoints;
    });
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
      setReferencePoints([
        ...referencePoints,
        {
          imagePoint: [actualX, actualY],
          mapPoint: null,
          name: `Point ${referencePoints.length + 1}`,
        },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-8xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-12 text-center text-gray-100">
          Image to GPX Converter
        </h1>
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-gray-700/50 mb-8">
          {currentStep === 1 && (
            <ImageUpload onImageSelect={handleImageSelect} />
          )}
          {currentStep === 3 && imagePreview && (
            <ReferencePoints
              imageUrl={imagePreview}
              referencePoints={referencePoints}
              onImageClick={handleReferenceImageClick}
              onMapClick={handleMapClick}
              onSearch={handleMapSearch}
              searchError={searchError}
              setCurrentStep={setCurrentStep}
            />
          )}
          {currentStep === 4 && points && (
            <>
              <Map
                points={{ ...points, image: formData.image! }}
                overlayOpacity={overlayOpacity}
                overlayContrast={overlayContrast}
              />
              <div className="flex flex-col md:flex-row gap-6 mt-6 items-center justify-between">
                <div className="flex flex-col gap-2 w-full md:w-1/2">
                  <label
                    htmlFor="opacity-slider"
                    className="text-sm text-gray-300"
                  >
                    Overlay Opacity: {overlayOpacity.toFixed(2)}
                  </label>
                  <input
                    id="opacity-slider"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-2 w-full md:w-1/2">
                  <label
                    htmlFor="contrast-slider"
                    className="text-sm text-gray-300"
                  >
                    Overlay Contrast: {overlayContrast.toFixed(2)}
                  </label>
                  <input
                    id="contrast-slider"
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.01}
                    value={overlayContrast}
                    onChange={(e) => setOverlayContrast(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            </>
          )}
          {currentStep === 5 && imagePreview && (
            <ImagePreview
              imageUrl={imagePreview}
              points={points}
              onImageClick={handleImageClick}
            />
          )}
          {error && (
            <p className="text-red-400 text-sm font-medium text-center mt-4">
              {error}
            </p>
          )}
          {currentStep > 1 && (
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={resetToUpload}
                className="px-6 py-2 bg-gray-700/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Upload New Image
              </button>
              {currentStep === 3 && (
                <button
                  onClick={() => setCurrentStep(4)}
                  disabled={
                    referencePoints.length !== 3 ||
                    referencePoints.some((p) => p.mapPoint === null)
                  }
                  className={`px-6 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    referencePoints.length !== 3 ||
                    referencePoints.some((p) => p.mapPoint === null)
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  Next Step
                </button>
              )}
              {currentStep === 4 && (
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Next Step
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
