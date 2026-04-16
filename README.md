# Simple Image Editor

A small browser-based image editor built with plain HTML, CSS, and JavaScript. It loads local images into a canvas and provides a few basic editing and export tools without using remote image URLs.

## Features

- Load an image from your computer.
- Paste an image directly from the clipboard with `Ctrl+V`.
- Preview a crop area by dragging on the canvas.
- Keep the crop selection visible until `Crop` is clicked.
- Crop the image without including the red selection rectangle in the final image.
- Convert the image to greyscale.
- Download the edited image as `edited-image.png`.
- Export the current image as a Base64 PNG data URL.
- Copy the current image to the clipboard as a PNG.

## Project Structure

```text
.
├── index.html
├── script.js
├── styles.css
├── playwright.config.js
├── package.json
└── tests/
    └── image-editor.spec.js
```

- `index.html` contains the page structure.
- `styles.css` contains the page styling.
- `script.js` contains the image editor behavior.
- `tests/image-editor.spec.js` contains Playwright browser tests.

## How To Use

Open `index.html` in a browser.

1. Click the file input and choose an image from your computer.
2. Or paste an image directly with `Ctrl+V`.
3. To crop, drag on the image to draw a red selection rectangle.
4. Click `Crop` to apply the selected crop area.
5. Click `Greyscale` to convert the image to greyscale.
6. Click `Download` to save the edited image as a PNG.
7. Click `Get Base64` to view the PNG data URL.
8. Click `Copy Image` to copy the current image to the clipboard.

## Running Tests

Install dependencies:

```bash
npm install
```

Install the Playwright browser runtime if it is not already installed:

```bash
npx playwright install chromium
```

Run the test suite:

```bash
npm test
```

The tests cover image loading, paste support, crop selection behavior, crop output, greyscale conversion, downloads, Base64 export, clipboard copy, and JavaScript startup.
