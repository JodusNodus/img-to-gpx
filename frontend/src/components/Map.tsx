import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ReferencePoint } from "../types";

interface MapProps {
  onMapClick: (lat: number, lng: number) => void;
  onSearch: (query: string) => Promise<void>;
  searchError: string | null;
  referencePoints?: ReferencePoint[];
}

export function Map({
  onMapClick,
  onSearch,
  searchError,
  referencePoints = [],
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [search, setSearch] = useState("");

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map instance
    mapInstanceRef.current = L.map(mapRef.current).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstanceRef.current);

    // Add click handler
    mapInstanceRef.current.on("click", (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onMapClick]);

  // Update markers when reference points change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current = [];

    // Add new markers for each point that has a location
    referencePoints.forEach((point) => {
      if (point.mapPoint) {
        const [lat, lng] = point.mapPoint;
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "custom-marker",
            html: `<div class='w-3 h-3 rounded-full border border-white' style='background-color: ${point.color}'></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        }).addTo(mapInstanceRef.current!);

        // Add click handler to marker
        marker.on("click", () => {
          onMapClick(lat, lng);
        });

        markersRef.current.push(marker);
      }
    });
  }, [referencePoints, onMapClick]);

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim() || !mapInstanceRef.current) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          search
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        mapInstanceRef.current.setView([parseFloat(lat), parseFloat(lon)], 10);
      }
      onSearch(search);
    } catch {
      onSearch(search);
    }
  };

  return (
    <div className="h-full flex flex-col">
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
      <div className="flex-1">
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
