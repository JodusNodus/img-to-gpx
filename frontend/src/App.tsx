import { useState, useRef, useEffect } from "react";
import type { FormEvent, ChangeEvent } from "react";
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

function App() {
  const [formData, setFormData] = useState<FormData>({
    image: null,
    startX: 509,
    startY: 358,
  });
  const [points, setPoints] = useState<Points | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      image: e.target.files?.[0] || null,
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
      ctx.strokeStyle = "black";
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

  return (
    <div className="container">
      <h1>Image to Line Converter</h1>

      <form className="card" onSubmit={handleSubmit}>
        <div>
          <input type="file" accept="image/png" onChange={handleImageChange} />
        </div>

        <div>
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
    </div>
  );
}

export default App;
