import { useState, useRef, useEffect } from "react";
import type { ChangeEvent, MouseEvent } from "react";

interface FormData {
  image: File | null;
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

interface ImagePreviewProps {
  imageUrl: string;
  points: Points | null;
  onImageClick: (e: MouseEvent<HTMLImageElement>) => void;
  onNext: () => void;
}

function ImagePreview({
  imageUrl,
  points,
  onImageClick,
  onNext,
}: ImagePreviewProps) {
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

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate scale factors
      const scaleX = rect.width / img.naturalWidth;
      const scaleY = rect.height / img.naturalHeight;

      // Draw points
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)"; // Red with some transparency
      ctx.lineWidth = 3; // Thicker line

      if (points.points.length > 0) {
        const [startX, startY] = points.points[0];
        // Scale the points to match the displayed image size
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
      {points && (
        <div className="flex justify-end">
          <button
            onClick={onNext}
            className="px-6 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Next Step
          </button>
        </div>
      )}
    </div>
  );
}

interface LineGenerationProps {
  points: Points;
  onBack: () => void;
}

function LineGeneration({ points, onBack }: LineGenerationProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">
        Step 3: Line Details
      </h2>
      <div className="p-6 bg-gray-800/50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <p className="font-medium text-gray-300">Points</p>
            <p>{points.points.length}</p>
          </div>
          <div>
            <p className="font-medium text-gray-300">Dimensions</p>
            <p>
              {points.width} × {points.height}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-300">Bounds</p>
            <p>
              X: {points.bounds.min_x} to {points.bounds.max_x}
            </p>
            <p>
              Y: {points.bounds.min_y} to {points.bounds.max_y}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 bg-gray-700/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Back
        </button>
        <button className="px-6 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-gray-900">
          Export Line
        </button>
      </div>
    </div>
  );
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    image: null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [points, setPoints] = useState<Points | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const handleImageSelect = (file: File) => {
    setFormData((prev) => ({
      ...prev,
      image: file,
    }));
    // Create preview URL
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setCurrentStep(2);
  };

  const handleImageClick = async (e: MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img) return;

    // Get click position relative to the image
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate actual image coordinates based on the image's natural size
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);

    console.log("Click coordinates:", { x, y, actualX, actualY });

    // Generate line for the new point
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
          console.log("Received points:", pointsData);
          setPoints(pointsData);
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Network error");
      }
    }
  };

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
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
              points={points}
              onImageClick={handleImageClick}
              onNext={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 3 && points && (
            <LineGeneration points={points} onBack={() => setCurrentStep(2)} />
          )}

          {error && (
            <p className="text-red-400 text-sm font-medium text-center mt-4">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
