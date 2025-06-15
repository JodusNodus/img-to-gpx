import { useState, useRef, useEffect } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- Types ---
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
  image: File;
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
}

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

interface MapProps {
  points: Points;
  onBack: () => void;
}

function Map({ points, onBack }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!mapRef.current || !points) return;
    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([0, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapInstanceRef.current);
    }
    const map = mapInstanceRef.current;
    // Set up image overlay
    const image = imageRef.current;
    if (!image) return;
    // Function to update image position
    const updateImage = () => {
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Wait for image to load to get natural dimensions
      if (image.naturalWidth === 0) {
        image.onload = updateImage;
        return;
      }
      // Calculate scale to fit the image while maintaining aspect ratio
      const scaleX = rect.width / image.naturalWidth;
      const scaleY = rect.height / image.naturalHeight;
      const scale = Math.min(scaleX, scaleY);
      // Calculate centering offset
      const offsetX = (rect.width - image.naturalWidth * scale) / 2;
      const offsetY = (rect.height - image.naturalHeight * scale) / 2;
      image.style.width = `${image.naturalWidth * scale}px`;
      image.style.height = `${image.naturalHeight * scale}px`;
      image.style.left = `${offsetX}px`;
      image.style.top = `${offsetY}px`;
    };
    // Update image position when map moves
    map.on("move", updateImage);
    map.on("zoom", updateImage);
    map.on("resize", updateImage);
    // Initial update
    updateImage();
    // Cleanup
    return () => {
      map.off("move", updateImage);
      map.off("zoom", updateImage);
      map.off("resize", updateImage);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [points]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">Step 3: Map View</h2>
      <div className="h-[600px] rounded-lg overflow-hidden border border-gray-700/50 relative">
        <div ref={mapRef} className="w-full h-full" />
        <img
          ref={imageRef}
          src={URL.createObjectURL(points.image)}
          alt="Overlay"
          className="absolute pointer-events-none opacity-50"
          style={{ zIndex: 1000 }}
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

  // Handle image selection
  const handleImageSelect = (file: File) => {
    setFormData((prev) => ({ ...prev, image: file }));
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setCurrentStep(2);
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
            />
          )}
          {currentStep === 3 && points && (
            <Map
              points={{ ...points, image: formData.image! }}
              onBack={() => setCurrentStep(2)}
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
              {currentStep === 2 && (
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!points}
                  className={`px-6 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    !points ? "opacity-50 cursor-not-allowed" : ""
                  }`}
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
