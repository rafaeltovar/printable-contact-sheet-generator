#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Image dimensions (3:2 ratio)
const WIDTH_H = 3089;   // Horizontal width
const HEIGHT_H = 2048;  // Horizontal height
const WIDTH_V = 2048;   // Vertical width
const HEIGHT_V = 3089;  // Vertical height

const TOTAL_IMAGES = 36;
const HALF_IMAGES = TOTAL_IMAGES / 2;

// Generate diverse colors using HSL
function generateColor(index) {
  const hue = (index * 137.5) % 360; // Use golden angle for good color distribution
  const saturation = 60 + (index % 4) * 10; // Vary saturation 60-90%
  const lightness = 45 + (index % 3) * 10; // Vary lightness 45-65%
  
  return hslToRgb(hue / 360, saturation / 100, lightness / 100);
}

// Convert HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

// Create SVG with centered number
function createNumberSVG(number, width, height) {
  // Calculate font size based on smallest dimension
  const minDimension = Math.min(width, height);
  const fontSize = Math.floor(minDimension * 0.3); // 30% of smallest dimension
  
  return Buffer.from(`
    <svg width="${width}" height="${height}">
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold"
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle">
        ${number}
      </text>
    </svg>
  `);
}

// Generate a single test image
async function generateImage(number, isVertical, outputPath) {
  const width = isVertical ? WIDTH_V : WIDTH_H;
  const height = isVertical ? HEIGHT_V : HEIGHT_H;
  const color = generateColor(number - 1);

  console.log(`Generating image ${number} (${width}×${height}) - Color: rgb(${color.r}, ${color.g}, ${color.b})`);

  // Create base image with colored background
  const baseImage = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color
    }
  });

  // Create text overlay
  const textSVG = createNumberSVG(number, width, height);

  // Composite text over background
  await baseImage
    .composite([{
      input: textSVG,
      gravity: 'center'
    }])
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

// Main function
async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║     Test Image Generator for Contact Sheet   ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // Create directories
  const testDir = path.join(__dirname, 'test');
  const imagesDir = path.join(testDir, 'images');

  console.log('📁 Creating directories...');
  await fs.mkdir(testDir, { recursive: true });
  await fs.mkdir(imagesDir, { recursive: true });
  console.log(`✓ Created: ${imagesDir}\n`);

  // Generate images
  console.log(`📸 Generating ${TOTAL_IMAGES} test images...\n`);

  for (let i = 1; i <= TOTAL_IMAGES; i++) {
    const isVertical = i > HALF_IMAGES; // First 18 horizontal, last 18 vertical
    const filename = `IMG_${String(i).padStart(4, '0')}.jpg`;
    const outputPath = path.join(imagesDir, filename);
    
    await generateImage(i, isVertical, outputPath);
  }

  console.log('\n✅ All test images generated successfully!');
  console.log(`📂 Location: ${imagesDir}`);
  console.log(`📊 Total: ${TOTAL_IMAGES} images`);
  console.log(`   - Horizontal (3089×2048): ${HALF_IMAGES} images`);
  console.log(`   - Vertical (2048×3089): ${HALF_IMAGES} images\n`);
  console.log('💡 You can now test the contact sheet generator:');
  console.log(`   npm start ${imagesDir}\n`);
}

main().catch(error => {
  console.error(`\n❌ Error: ${error.message}\n`);
  process.exit(1);
});
