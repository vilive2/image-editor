const { test, expect } = require("@playwright/test");
const path = require("path");
const { pathToFileURL } = require("url");

const appUrl = pathToFileURL(path.join(__dirname, "..", "index.html")).href;

function svgImagePayload({ width = 40, height = 30 } = {}) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <rect width="${width}" height="${height}" fill="rgb(200,20,40)"/>
            <rect x="${Math.floor(width / 2)}" width="${Math.ceil(width / 2)}" height="${height}" fill="rgb(20,180,80)"/>
        </svg>
    `;

    return {
        name: "sample.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from(svg)
    };
}

async function gotoApp(page) {
    const errors = [];

    page.on("pageerror", error => errors.push(error.message));
    await page.goto(appUrl);

    return errors;
}

async function uploadImage(page, options) {
    await page.setInputFiles("#fileInput", svgImagePayload(options));
    await expect.poll(async () => {
        return page.locator("#canvas").evaluate(canvas => ({
            width: canvas.width,
            height: canvas.height
        }));
    }).toEqual({
        width: options?.width ?? 40,
        height: options?.height ?? 30
    });
}

test("loads without JavaScript startup errors", async ({ page }) => {
    const errors = await gotoApp(page);

    await expect(page.locator("#fileInput")).toBeVisible();
    await expect(page.locator("#canvas")).toBeVisible();
    expect(errors).toEqual([]);
});

test("loads an image from the file input and resizes the canvas", async ({ page }) => {
    await gotoApp(page);
    await uploadImage(page, { width: 40, height: 30 });

    const size = await page.locator("#canvas").evaluate(canvas => ({
        width: canvas.width,
        height: canvas.height
    }));

    expect(size).toEqual({ width: 40, height: 30 });
});

test("loads a pasted image onto the canvas", async ({ page }) => {
    await gotoApp(page);

    await page.evaluate(async svg => {
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const file = new File([blob], "pasted.svg", { type: "image/svg+xml" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        document.dispatchEvent(new ClipboardEvent("paste", {
            clipboardData: dataTransfer
        }));
    }, svgImagePayload({ width: 24, height: 18 }).buffer.toString());

    await expect.poll(async () => {
        return page.locator("#canvas").evaluate(canvas => ({
            width: canvas.width,
            height: canvas.height
        }));
    }).toEqual({ width: 24, height: 18 });
});

test("keeps the red crop selection rectangle visible after dragging", async ({ page }) => {
    await gotoApp(page);
    await uploadImage(page, { width: 40, height: 30 });

    const canvas = page.locator("#canvas");
    const box = await canvas.boundingBox();

    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + 16);

    const outlinePixel = await canvas.evaluate(canvas => {
        const ctx = canvas.getContext("2d");
        return Array.from(ctx.getImageData(4, 4, 1, 1).data);
    });

    await page.mouse.up();

    expect(outlinePixel.slice(0, 3)).toEqual([255, 0, 0]);
    expect(outlinePixel[3]).toBe(255);

    const visibleAfterMouseupPixel = await canvas.evaluate(canvas => {
        const ctx = canvas.getContext("2d");
        return Array.from(ctx.getImageData(4, 4, 1, 1).data);
    });

    expect(visibleAfterMouseupPixel.slice(0, 3)).toEqual([255, 0, 0]);
    expect(visibleAfterMouseupPixel[3]).toBe(255);
});

test("crops the selected area when Crop is clicked", async ({ page }) => {
    await gotoApp(page);
    await uploadImage(page, { width: 40, height: 30 });

    const canvas = page.locator("#canvas");
    const box = await canvas.boundingBox();

    await page.mouse.move(box.x + 5, box.y + 6);
    await page.mouse.down();
    await page.mouse.move(box.x + 25, box.y + 18);
    await page.mouse.up();

    const visibleSelectionPixel = await canvas.evaluate(canvas => {
        const ctx = canvas.getContext("2d");
        return Array.from(ctx.getImageData(5, 6, 1, 1).data);
    });

    expect(visibleSelectionPixel.slice(0, 3)).toEqual([255, 0, 0]);

    await page.click("#cropBtn");

    const size = await canvas.evaluate(canvas => ({
        width: canvas.width,
        height: canvas.height
    }));
    const topLeftPixel = await canvas.evaluate(canvas => {
        const ctx = canvas.getContext("2d");
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    });

    expect(size).toEqual({ width: 20, height: 12 });
    expect(topLeftPixel.slice(0, 3)).not.toEqual([255, 0, 0]);
    expect(topLeftPixel[3]).toBe(255);
});

test("converts image pixels to greyscale", async ({ page }) => {
    await gotoApp(page);
    await uploadImage(page, { width: 40, height: 30 });

    await page.click("#grayBtn");

    const pixel = await page.locator("#canvas").evaluate(canvas => {
        const ctx = canvas.getContext("2d");
        return Array.from(ctx.getImageData(1, 1, 1, 1).data);
    });

    expect(pixel[0]).toBe(pixel[1]);
    expect(pixel[1]).toBe(pixel[2]);
    expect(pixel[3]).toBe(255);
});

test("downloads the edited image as a PNG", async ({ page }) => {
    await gotoApp(page);
    await uploadImage(page, { width: 40, height: 30 });

    const downloadPromise = page.waitForEvent("download");
    await page.click("#downloadBtn");
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("edited-image.png");
});

test("exports a PNG data URL through the Base64 button", async ({ page }) => {
    await gotoApp(page);
    await uploadImage(page, { width: 40, height: 30 });

    let promptMessage;
    let promptValue;

    page.on("dialog", async dialog => {
        promptMessage = dialog.message();
        promptValue = dialog.defaultValue();
        await dialog.dismiss();
    });

    await page.click("#base64Btn");

    expect(promptMessage).toBe("Base64 Image");
    expect(promptValue).toMatch(/^data:image\/png;base64,/);
});

test("copies the current canvas image to the clipboard as a PNG", async ({ page }) => {
    await gotoApp(page);
    await uploadImage(page, { width: 40, height: 30 });

    await page.evaluate(() => {
        window.__clipboardWrites = [];

        window.ClipboardItem = class ClipboardItem {
            constructor(items) {
                this.items = items;
            }
        };

        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
                write: async items => {
                    window.__clipboardWrites.push(items.map(item => Object.keys(item.items)));
                }
            }
        });

        window.alert = message => {
            window.__lastAlert = message;
        };
    });

    await page.click("#copyBtn");

    await expect.poll(async () => {
        return page.evaluate(() => window.__clipboardWrites);
    }).toEqual([[["image/png"]]]);

    await expect.poll(async () => {
        return page.evaluate(() => window.__lastAlert);
    }).toBe("Image copied to clipboard!");
});
