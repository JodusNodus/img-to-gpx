import { useState, useRef, useEffect } from "react";
import type { FormEvent, ChangeEvent, MouseEvent } from "react";
import "./App.css";

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
    startX: 509,
    startY: 358,
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
    <div className="container">
      <h1>Image to Line Converter</h1>

      <form className="card" onSubmit={handleSubmit}>
        <div>
          <input type="file" accept="image/png" onChange={handleImageChange} />
        </div>

        {imagePreview && (
          <div className="image-preview">
            <img
              ref={imageRef}
              src={imagePreview}
              alt="Preview"
              onClick={handleImageClick}
              title="Click to select start coordinates"
            />
          </div>
        )}

        <div className="coordinates-container">
          <div className="coordinate-inputs">
            <label>
              Start X:
              <input
                type="number"
                name="startX"
                value={formData.startX}
                onChange={handleCoordinateChange}
                min={0}
                required
              />
            </label>
            <label>
              Start Y:
              <input
                type="number"
                name="startY"
                value={formData.startY}
                onChange={handleCoordinateChange}
                min={0}
                required
              />
            </label>
          </div>

          {selectedColor && (
            <div className="color-info">
              <div
                className="color-preview"
                style={{ backgroundColor: selectedColor.hex }}
              />
              <div className="color-values">
                <span>HEX: {selectedColor.hex}</span>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Generate Line"}
        </button>

        {error && <p className="error-message">{error}</p>}
      </form>

      {points && (
        <div className="card">
          <h2>Result</h2>
          <div className="canvas-container">
            <canvas ref={canvasRef} />
          </div>
        </div>
      )}

      {/* Hidden canvas for color detection */}
      <canvas ref={colorCanvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;
