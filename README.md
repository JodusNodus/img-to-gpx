# Image to GPX Converter

A full-stack web application that converts images containing route lines into GPX tracks. The application uses computer vision to detect paths in images and projects them onto real-world maps using reference points, with optional road snapping via Valhalla routing engine.

## Features

- **Image Upload & Processing**: Upload images containing route lines and click to start path detection
- **Interactive Path Selection**: Click on the image to specify the starting point for path detection
- **Reference Point Mapping**: Set reference points to align the image with real-world coordinates
- **Multiple Projection Methods**: Compare different coordinate transformation methods (Affine, Axis-aligned)
- **Road Snapping**: Snap detected paths to actual road networks using Valhalla routing engine
- **GPX Export**: Export the final route as a standard GPX file for use in GPS devices and mapping applications
- **Real-time Preview**: See the projected route on an interactive map with OpenStreetMap tiles

## Project Structure

```
img-to-gpx/
├── frontend/          # React + TypeScript frontend (Vite)
├── backend/           # Python Flask API server
├── custom_files/      # Valhalla routing data
└── valhalla_data/     # Additional routing data
```

## Prerequisites

- **Node.js** (v16 or higher)
- **Python** (3.7 or higher)
- **Docker** (for Valhalla routing engine)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd img-to-gpx
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install backend dependencies

```bash
cd ../backend
pip install -r requirements.txt
```

### 4. Set up Valhalla routing engine (optional, for road snapping)

```bash
# Create custom files directory
mkdir custom_files

# Run Valhalla container
docker run -dt --name valhalla_gis-ops -p 8002:8002 \
  -v $PWD/custom_files:/custom_files \
  ghcr.io/nilsnolde/docker-valhalla/valhalla:latest

# Download routing data (example: Netherlands)
wget -O custom_files/netherlands-latest.osm.pbf \
  https://download.geofabrik.de/europe/netherlands-latest.osm.pbf
```

## Usage

### Development Mode

1. **Start the backend server**:

   ```bash
   npm run backend
   # or
   cd backend && python server.py
   ```

2. **Start the frontend development server**:

   ```bash
   npm run frontend
   # or
   cd frontend && npm run dev
   ```

3. **Or start both simultaneously**:

   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

### Production Build

1. **Build the frontend**:

   ```bash
   cd frontend
   npm run build
   ```

2. **Start the production server**:

   ```bash
   cd backend
   python server.py
   ```

3. Open your browser to `http://localhost:5131`

## How to Use the Application

### 1. Upload Image

- Upload an image containing a route line (e.g., a screenshot from Google Maps, a hand-drawn route, etc.)

### 2. Select Starting Point

- Click on the image to specify where the path detection should begin
- The application will detect and extract the route line from that point

### 3. Set Reference Points

- Add at least 3 reference points by clicking on the image and then clicking the corresponding location on the map
- This allows the application to project the image coordinates to real-world coordinates

### 4. Review Projection

- The application will show the projected route on the map
- You can toggle the original image overlay to verify alignment
- Compare different projection methods if needed

### 5. Optional: Snap to Roads

- Click "Snap to Roads" to align the route with actual road networks
- This requires the Valhalla routing engine to be running

### 6. Export GPX

- Click "Export GPX" to download the route as a GPX file
- The file can be imported into GPS devices, mapping applications, or fitness trackers

## API Endpoints

- `POST /api/points` - Generate points from uploaded image
- `POST /api/snap-points` - Snap points to road network

## Configuration

### Environment Variables

- `VALHALLA_URL`: URL for Valhalla routing engine (default: `http://localhost:8002`)
