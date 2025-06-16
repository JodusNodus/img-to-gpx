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
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [overlayContrast, setOverlayContrast] = useState(1.7);
  const [referencePoints, setReferencePoints] = useState<ReferencePoint[]>([
    // {
    //   imagePoint: [157, 880],
    //   mapPoint: [51.20782967751098, 3.226942466625933],
    //   name: "Point 1",
    //   color: "#EF4444",
    // },
    // {
    //   imagePoint: [1322, 392],
    //   mapPoint: [51.531857513789234, 4.462019513445795],
    //   name: "Point 2",
    //   color: "#3B82F6",
    // },
  ]);

  // Handle image selection
  const handleImageSelect = (file: File) => {
    setFormData((prev) => ({ ...prev, image: file }));
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setCurrentStep(3);
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
  };

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Handle transition to map view
  const handleProjectImage = () => {
    if (
      referencePoints.length === 2 &&
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
              overlayOpacity={overlayOpacity}
              overlayContrast={overlayContrast}
              onOpacityChange={setOverlayOpacity}
              onContrastChange={setOverlayContrast}
            />
          )}
          {currentStep === 5 && imagePreview && (
            <ImagePreview imageUrl={imagePreview} />
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
                    referencePoints.length !== 2 ||
                    referencePoints.some((p) => p.mapPoint === null)
                  }
                  className={`px-6 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    referencePoints.length !== 2 ||
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
