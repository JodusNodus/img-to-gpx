import { useState, useRef, useEffect } from "react";
import type { FormEvent, ChangeEvent, MouseEvent } from "react";

interface FormData {
  image: File | null;
  startX: number;
  startY: number;
}

interface Points {
  points: [number, number][];
  width: number;
  height: number;
}

interface Color {
  r: number;
  g: number;
  b: number;
  hex: string;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    image: null,
    startX: 0,
    startY: 0,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [points, setPoints] = useState<Points | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const colorCanvasRef = useRef<HTMLCanvasElement>(null);

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

  const getColorAtPoint = (
    img: HTMLImageElement,
    x: number,
    y: number
  ): Color => {
    const canvas = colorCanvasRef.current;
    if (!canvas) return { r: 0, g: 0, b: 0, hex: "#000000" };

    const ctx = canvas.getContext("2d");
    if (!ctx) return { r: 0, g: 0, b: 0, hex: "#000000" };

    // Set canvas size to match image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Get pixel data
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];

    // Convert to hex
    const hex =
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("");

    return { r, g, b, hex };
  };

  const handleImageClick = (e: MouseEvent<HTMLImageElement>) => {
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

    // Get color at clicked point
    const color = getColorAtPoint(img, actualX, actualY);
    setSelectedColor(color);

    setFormData((prev) => ({
      ...prev,
      startX: actualX,
      startY: actualY,
    }));
  };

  const handleCoordinateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPoints(null);

    if (!formData.image) {
      setError("Please upload a PNG image.");
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append("image", formData.image);
    data.append("start_x", String(formData.startX));
    data.append("start_y", String(formData.startY));

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
  };

  useEffect(() => {
    if (points && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size
      canvas.width = points.width;
      canvas.height = points.height;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw points
      ctx.beginPath();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;

      if (points.points.length > 0) {
        const [startX, startY] = points.points[0];
        ctx.moveTo(startX, startY);

        for (let i = 1; i < points.points.length; i++) {
          const [x, y] = points.points[i];
          ctx.lineTo(x, y);
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

        <form
          className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-gray-700/50 mb-8 flex flex-col gap-6"
          onSubmit={handleSubmit}
        >
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
            <div className="my-6 text-center relative">
              <img
                ref={imageRef}
                src={imagePreview}
                alt="Preview"
                onClick={handleImageClick}
                title="Click to select start coordinates"
                className="max-w-full max-h-[1200px] rounded-lg shadow-xl border border-gray-700/50 cursor-crosshair hover:border-indigo-500/50 transition-all duration-200"
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-6 items-center justify-center my-4">
            <div className="flex gap-6 items-center">
              <label className="flex items-center gap-3 text-gray-300">
                <span className="text-sm font-medium">Start X:</span>
                <input
                  type="number"
                  name="startX"
                  value={formData.startX}
                  onChange={handleCoordinateChange}
                  min={0}
                  required
                  className="w-24 p-2 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </label>
              <label className="flex items-center gap-3 text-gray-300">
                <span className="text-sm font-medium">Start Y:</span>
                <input
                  type="number"
                  name="startY"
                  value={formData.startY}
                  onChange={handleCoordinateChange}
                  min={0}
                  required
                  className="w-24 p-2 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </label>
            </div>

            {selectedColor && (
              <div className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <div
                  className="w-10 h-10 rounded-lg border border-gray-700/50 shadow-lg"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <div className="flex flex-col gap-1 text-gray-300 text-sm">
                  <span className="font-medium">
                    RGB: {selectedColor.r}, {selectedColor.g}, {selectedColor.b}
                  </span>
                  <span className="font-medium">HEX: {selectedColor.hex}</span>
                </div>
              </div>
            )}
          </div>

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

        {points && (
          <div className="mt-8 text-center">
            <div className="inline-block p-4 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50">
              <canvas
                ref={canvasRef}
                className="max-w-full rounded-lg border border-gray-700/50 bg-gray-900/50"
              />
            </div>
          </div>
        )}

        <canvas ref={colorCanvasRef} className="hidden" />
      </div>
    </div>
  );
}

export default App;
