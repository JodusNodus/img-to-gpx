export interface Points {
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

export interface ReferencePoint {
  imagePoint: [number, number];
  mapPoint: [number, number] | null;
  name: string;
}

export interface FormData {
  image: File | null;
}
