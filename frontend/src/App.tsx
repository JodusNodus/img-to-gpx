import { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import { ImageUpload } from "./components/ImageUpload";
import { ImagePreview } from "./components/ImagePreview";
import { ReferencePoints } from "./components/ReferencePoints";
import { MapProjection } from "./components/MapProjection";
import type { FormData, Points, ReferencePoint } from "./types";

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
    setCurrentStep(3);
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

  // Handle transition to map view
  const handleProjectImage = () => {
    if (
      referencePoints.length === 3 &&
      referencePoints.every((p) => p.mapPoint !== null)
    ) {
      // Create points object for the Map component
      const imagePoints = referencePoints.map((p) => p.imagePoint);
      const mapPoints = referencePoints.map((p) => p.mapPoint!);

      // Calculate bounds
      const minX = Math.min(...mapPoints.map((p) => p[0]));
      const maxX = Math.max(...mapPoints.map((p) => p[0]));
      const minY = Math.min(...mapPoints.map((p) => p[1]));
      const maxY = Math.max(...mapPoints.map((p) => p[1]));

      setPoints({
        points: imagePoints,
        normalized_points: mapPoints,
        width: 0, // These will be set by the backend
        height: 0,
        bounds: {
          min_x: minX,
          min_y: minY,
          max_x: maxX,
          max_y: maxY,
        },
        image: formData.image!,
      });

      setCurrentStep(4);
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
            />
          )}
          {currentStep === 4 && points && (
            <MapProjection
              points={points}
              referencePoints={referencePoints}
              overlayOpacity={overlayOpacity}
              overlayContrast={overlayContrast}
              onOpacityChange={setOverlayOpacity}
              onContrastChange={setOverlayContrast}
            />
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
                  onClick={handleProjectImage}
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
                  Next
                </button>
              )}
              {currentStep === 4 && (
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Next
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
