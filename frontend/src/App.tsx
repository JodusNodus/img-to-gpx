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

function App() {
  const [formData, setFormData] = useState<FormData>({
    image: null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [points, setPoints] = useState<Points | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        image: file,
      }));
      // Create preview URL
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setFormData((prev) => ({
        ...prev,
        image: null,
      }));
      setImagePreview(null);
    }
  };

  const handleImageClick = async (e: MouseEvent<HTMLImageElement>) => {
    const img = imageRef.current;
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

    // Generate line for the new point
    if (formData.image) {
      setError(null);
      setPoints(null);
      setLoading(true);

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
      } finally {
        setLoading(false);
      }
    }
  };

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
          Image to Line Converter
        </h1>

        <form className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-gray-700/50 mb-8 flex flex-col gap-6">
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

          {imagePreview && (
            <div className="my-6 text-center">
              <div className="inline-block relative">
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Preview"
                  onClick={handleImageClick}
                  title="Click to select start point"
                  className="max-w-full max-h-[1200px] rounded-lg shadow-xl border border-gray-700/50 cursor-crosshair hover:border-indigo-500/50 transition-all duration-200"
                />
                {points && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full max-w-full max-h-[1200px] rounded-lg"
                  />
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !formData.image}
            className="w-full sm:w-auto px-8 py-3 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              "Convert to Line"
            )}
          </button>

          {error && (
            <p className="text-red-400 text-sm font-medium text-center">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default App;
