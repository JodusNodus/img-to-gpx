import { useState, useEffect } from "react";
import { ImageUpload } from "./components/ImageUpload";
import { ReferencePoints } from "./components/ReferencePoints";
import { MapProjection } from "./components/MapProjection";
import type { FormData, ReferencePoint } from "./types";
import { ImagePreview } from "./components/ImagePreview";

function App() {
  const [formData, setFormData] = useState<FormData>({ image: null });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [referencePoints, setReferencePoints] = useState<ReferencePoint[]>([
    {
      imagePoint: [523, 259],
      mapPoint: [51.358227550693904, 6.047986412007442],
      name: "Point 1",
      color: "#EF4444",
    },
    {
      imagePoint: [143, 395],
      mapPoint: [51.298082837311874, 5.783131713983317],
      name: "Point 2",
      color: "#3B82F6",
    },
    {
      imagePoint: [431, 214],
      mapPoint: [51.37742225411848, 5.98429497446329],
      name: "Point 3",
      color: "#22C55E",
    },
  ]);

  // Handle image selection
  const handleImageSelect = (file: File) => {
    setFormData((prev) => ({ ...prev, image: file }));
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setCurrentStep(2); // Move to line selection step
  };

  // Reset to upload step
  const resetToUpload = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setFormData({ image: null });
    setImagePreview(null);
    setError(null);
    setCurrentStep(1);
    setPoints([]);
    setReferencePoints([]);
  };

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Handle image click in ImagePreview
  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!formData.image) return;

    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);

    console.log("Click coordinates:", { x, y, actualX, actualY });

    // Create form data
    const formDataToSend = new FormData();
    formDataToSend.append("image", formData.image);
    formDataToSend.append("start_x", actualX.toString());
    formDataToSend.append("start_y", actualY.toString());

    try {
      const response = await fetch("http://localhost:5131/api/points", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate points");
      }

      const data = await response.json();
      console.log("Received points data:", data);
      setPoints(data.points);
    } catch (error) {
      console.error("Error generating points:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  // Handle transition to map view
  const handleProjectImage = () => {
    if (
      referencePoints.length === 3 &&
      referencePoints.every((p) => p.mapPoint !== null)
    ) {
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
          {currentStep === 2 && imagePreview && (
            <ImagePreview
              imageUrl={imagePreview}
              points={
                points.length > 0
                  ? {
                      points,
                      normalized_points: points,
                      width: 0,
                      height: 0,
                      bounds: {
                        min_x: 0,
                        min_y: 0,
                        max_x: 0,
                        max_y: 0,
                      },
                      image: formData.image!,
                    }
                  : null
              }
              onImageClick={handleImageClick}
            />
          )}
          {currentStep === 3 && imagePreview && (
            <ReferencePoints
              imageUrl={imagePreview}
              referencePoints={referencePoints}
              onReferencePointsChange={setReferencePoints}
            />
          )}
          {currentStep === 4 && formData.image && (
            <MapProjection
              image={formData.image}
              referencePoints={referencePoints}
              points={points}
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
              {currentStep === 2 && points.length > 0 && (
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Next
                </button>
              )}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
