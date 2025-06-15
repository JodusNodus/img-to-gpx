# Image to Line Vector Converter

This program converts images to vector line drawings by detecting prominent lines in the image and converting them to SVG format.

## Requirements

- Python 3.7+
- OpenCV
- NumPy
- scikit-image
- svgwrite

## Installation

1. Clone this repository
2. Install the required packages:

```bash
pip install -r requirements.txt
```

## Usage

Basic usage:

```bash
python img_to_line.py input_image.png
```

This will create an SVG file with the same name as your input image (e.g., `input_image.svg`).

To specify a custom output path:

```bash
python img_to_line.py input_image.png --output custom_output.svg
```

## How it works

1. The image is preprocessed (converted to grayscale and blurred)
2. Edge detection is performed using the Canny algorithm
3. Prominent lines are detected using the Hough Transform
4. The detected lines are converted to SVG format

## Parameters

The program uses the following default parameters for line detection:

- Minimum line length: 100 pixels
- Maximum line gap: 10 pixels
- Edge detection thresholds: 50 and 150

You can modify these parameters in the code if needed for different results.
