import { useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

function App() {
  const [image, setImage] = useState<File | null>(null);
  const [startX, setStartX] = useState(509);
  const [startY, setStartY] = useState(358);
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSvg(null);
    if (!image) {
      setError("Please upload a PNG image.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("image", image);
    formData.append("start_x", String(startX));
    formData.append("start_y", String(startY));
    try {
      const res = await fetch("http://localhost:5131/api/svg", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Unknown error");
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
          <input
            type="file"
            accept="image/png"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </div>
        <div>
          <label>
            Start X:
            <input
              type="number"
              value={startX}
              onChange={(e) => setStartX(Number(e.target.value))}
              min={0}
              required
            />
          </label>
          <label style={{ marginLeft: 16 }}>
            Start Y:
            <input
              type="number"
              value={startY}
              onChange={(e) => setStartY(Number(e.target.value))}
              min={0}
              required
            />
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Generate SVG"}
        </button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
      {svg && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2>Result SVG</h2>
          <div
            style={{ border: "1px solid #ccc", background: "#fff", padding: 8 }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <a
            href={`data:image/svg+xml,${encodeURIComponent(svg)}`}
            download="output.svg"
            style={{ marginTop: 12, display: "inline-block" }}
          >
            Download SVG
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
