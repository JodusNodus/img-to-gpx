import { useRef, useEffect } from "react";
import type { MouseEvent } from "react";

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

interface ImagePreviewProps {
  imageUrl: string;
  points: Points | null;
  onImageClick: (e: MouseEvent<HTMLImageElement>) => void;
}

export function ImagePreview({
  imageUrl,
  points,
  onImageClick,
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
        Step 5: Select Line
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
