const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let image = new Image();

let isDragging = false;
let startX, startY, endX, endY;

// ---------------- LOAD IMAGE FROM FILE ----------------
fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result);
    reader.readAsDataURL(file);
};

// ---------------- PASTE IMAGE SUPPORT ----------------
document.addEventListener("paste", event => {
    const items = event.clipboardData.items;

    for (const item of items) {
        if (item.type.startsWith("image/")) {
            const blob = item.getAsFile();
            const url = URL.createObjectURL(blob);
            loadImage(url);
            return;
        }
    }
});

// ---------------- GENERIC IMAGE LOADER (SAFE) ----------------
function loadImage(src) {
    image = new Image();
    image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
    };
    image.src = src; // No CORS = Always SAFE now
}

// ---------------- CROP TOOL ----------------
canvas.addEventListener("mousedown", e => {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
});

canvas.addEventListener("mousemove", e => {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    endX = e.clientX - rect.left;
    endY = e.clientY - rect.top;

    ctx.drawImage(image, 0, 0);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, endX - startX, endY - startY);
});

canvas.addEventListener("mouseup", () => isDragging = false);

// ---------------- APPLY CROP ----------------
document.getElementById("cropBtn").onclick = () => {
    if (startX == null || endX == null) return;

    const width = endX - startX;
    const height = endY - startY;

    const cropped = ctx.getImageData(startX, startY, width, height);

    canvas.width = width;
    canvas.height = height;

    ctx.putImageData(cropped, 0, 0);

    image.src = canvas.toDataURL(); // Now always safe
};

// ---------------- GREYSCALE ----------------
document.getElementById("grayBtn").onclick = () => {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        const g = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = g;
    }

    ctx.putImageData(imgData, 0, 0);
    image.src = canvas.toDataURL();
};

// ---------------- DOWNLOAD ----------------
document.getElementById("downloadBtn").onclick = () => {
    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = canvas.toDataURL();
    link.click();
};

// ---------------- BASE64 EXPORT ----------------
document.getElementById("base64Btn").onclick = () => {
    const base64 = canvas.toDataURL("image/png");
    prompt("Base64 Image", base64);
};

document.getElementById("copyBtn").onclick = async () => {
    const canvas = document.getElementById("canvas");

    try {
        // Convert canvas to Blob
        canvas.toBlob(async blob => {
            if (!blob) throw new Error("Failed to get image blob");

            // Create ClipboardItem
            const item = new ClipboardItem({ "image/png": blob });

            // Write to clipboard
            await navigator.clipboard.write([item]);

            alert("Image copied to clipboard!");
        }, "image/png");
    } catch (err) {
        console.error("Copy failed:", err);
        alert("Failed to copy image. Make sure your browser supports Clipboard API.");
    }
};
