import sharp from "sharp";

// Read logo2.jpg and make the light/checkerboard background transparent
const input = "./public/logo2.jpg";
const output = "./public/logo2.png";

const image = sharp(input);
const { width, height } = await image.metadata();

// Get raw pixel data (RGBA)
const raw = await image.ensureAlpha().raw().toBuffer();

const pixels = Buffer.from(raw);
const threshold = 200; // pixels with R, G, B all above this become transparent

for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];

  // If pixel is very light (white/light-gray checkerboard background), make transparent
  if (r > threshold && g > threshold && b > threshold) {
    pixels[i + 3] = 0; // set alpha to 0
  }

  // Also handle the gray checkerboard squares (around RGB 200-210)
  if (r > 185 && g > 185 && b > 185 && r < 220 && g < 220 && b < 220) {
    pixels[i + 3] = 0;
  }
}

await sharp(pixels, { raw: { width, height, channels: 4 } })
  .png()
  .toFile(output);

console.log(`Created transparent PNG: ${output} (${width}x${height})`);
