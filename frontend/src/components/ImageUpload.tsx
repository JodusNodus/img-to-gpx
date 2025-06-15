import type { ChangeEvent } from "react";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
}

export function ImageUpload({ onImageSelect }: ImageUploadProps) {
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
