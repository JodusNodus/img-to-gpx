import { useRef, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface MapProps {
  points: Points;
  overlayOpacity: number;
  overlayContrast: number;
}

export function Map({ points, overlayOpacity, overlayContrast }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState("");

  // Memoize the object URL for the image
  const imageUrl = useMemo(() => {
    if (!points.image) return "";
    const url = URL.createObjectURL(points.image);
    return url;
  }, [points.image]);

  // Revoke the object URL on cleanup
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // Only initialize the map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = L.map(mapRef.current).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstanceRef.current);
  }, []);

  // Calculate image bounds and create overlay when points change
  useEffect(() => {
    if (!mapInstanceRef.current || !points || !imageRef.current) return;

    // Get the reference points from the points object
    const refPoints = points.points.map((point, index) => ({
      image: point,
      map: points.normalized_points[index],
    }));

    // Calculate the bounds of the image on the map
    const bounds = L.latLngBounds(refPoints.map((p) => p.map));

    // Create or update the image overlay
    if (imageRef.current) {
      const imageOverlay = L.imageOverlay(imageUrl, bounds, {
        opacity: overlayOpacity,
        interactive: false,
      }).addTo(mapInstanceRef.current);

      // Fit the map to show the entire image
      mapInstanceRef.current.fitBounds(bounds);

      // Cleanup
      return () => {
        imageOverlay.remove();
      };
    }
  }, [points, imageUrl, overlayOpacity]);

  // Update overlay style when contrast changes
  useEffect(() => {
    if (!imageRef.current) return;
    imageRef.current.style.filter = `contrast(${overlayContrast})`;
  }, [overlayContrast]);

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    if (!search.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          search
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(
            [parseFloat(lat), parseFloat(lon)],
            10
          );
        }
      } else {
        setSearchError("Location not found.");
      }
    } catch {
      setSearchError("Error searching for location.");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-200">Step 4: Map View</h2>
      <form onSubmit={handleSearch} className="flex gap-2 mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a place or address..."
          className="flex-1 px-3 py-2 rounded-lg bg-gray-900/70 border border-gray-700/50 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600/80 text-white rounded-lg font-medium text-base transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          Search
        </button>
      </form>
      {searchError && (
        <div className="text-red-400 text-sm mb-2">{searchError}</div>
      )}
      <div className="h-[600px] rounded-lg overflow-hidden border border-gray-700/50 relative">
        <div ref={mapRef} className="w-full h-full" />
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Overlay"
          style={{
            display: "none", // Hide the original image as we're using Leaflet's imageOverlay
            filter: `contrast(${overlayContrast})`,
          }}
        />
      </div>
    </div>
  );
}
