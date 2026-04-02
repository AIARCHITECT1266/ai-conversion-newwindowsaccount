import sharp from "sharp";

const input = "./public/logo1.jpg";
const output = "./public/logo1.png";

const image = sharp(input);
const { width, height } = await image.metadata();

const raw = await image.ensureAlpha().raw().toBuffer();
const pixels = Buffer.from(raw);

// Lower threshold (18) to preserve white text anti-aliasing edges
const threshold = 18;

for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];

  if (r < threshold && g < threshold && b < threshold) {
    pixels[i + 3] = 0;
  }
}

await sharp(pixels, { raw: { width, height, channels: 4 } })
  .png()
  .toFile(output);

console.log(`Created transparent PNG: ${output} (${width}x${height})`);
