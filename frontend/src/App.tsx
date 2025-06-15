import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import "./App.css";

interface FormData {
  image: File | null;
  startX: number;
  startY: number;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    image: null,
    startX: 509,
    startY: 358,
  });
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSvg(null);

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
      const res = await fetch("http://localhost:5131/api/svg", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || "Unknown error");
      } else {
        const svgText = await res.text();
        setSvg(svgText);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Image to GPX Converter</h1>

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
          {loading ? "Processing..." : "Generate SVG"}
        </button>

        {error && <p className="error-message">{error}</p>}
      </form>

      {svg && (
        <div className="card">
          <h2>Result SVG</h2>
          <div
            className="svg-preview"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <a
            href={`data:image/svg+xml,${encodeURIComponent(svg)}`}
            download="output.svg"
            className="download-link"
          >
            Download SVG
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
