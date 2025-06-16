import React, { useRef } from "react";

const ReferenceImage: React.FC = () => {
  const imageRef = useRef<HTMLImageElement>(null);
  const referencePoints: ReferencePoint[] = [];

  const handleReferenceImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate the actual image dimensions and scaling
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const actualWidth = imageRef.current.naturalWidth;
    const actualHeight = imageRef.current.naturalHeight;

    // Calculate scaling factors
    const scaleX = actualWidth / displayWidth;
    const scaleY = actualHeight / displayHeight;

    // Convert click coordinates to actual image coordinates
    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);

    // Create new reference point
    const newPoint: ReferencePoint = {
      imagePoint: [actualX, actualY],
      mapPoint: null,
      name: `Point ${referencePoints.length + 1}`,
      color: getRandomColor(),
    };

    onReferencePointsChange([...referencePoints, newPoint]);
  };

  return (
    <img
      ref={imageRef}
      src="path_to_your_image.jpg"
      alt="Reference Image"
      onClick={handleReferenceImageClick}
    />
  );
};

export default ReferenceImage;
