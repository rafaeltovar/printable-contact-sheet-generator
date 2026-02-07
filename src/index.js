#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for 120x120mm format at 300 DPI
const DPI = 300;
const SIZE_MM = 120;
const SIZE_INCHES = SIZE_MM / 25.4;
const IMAGE_SIZE = Math.round(SIZE_INCHES * DPI); // ~1417 pixels

const GRID_ROWS = 6;
const GRID_COLS = 6;
const MAX_IMAGES = GRID_ROWS * GRID_COLS;

// Margins and spacing
const MARGIN = 12; // 1mm at 300 DPI
const CELL_PADDING = 4; // 0.3mm between images (both rows and columns)

// Cell dimensions - calculated to fit grid with exact spacing
const CELL_HEIGHT = 175; // Height of each thumbnail cell
const CELL_WIDTH = 228; // Width of each thumbnail cell (fits 6 columns with spacing)

// Calculated grid height
const GRID_HEIGHT = (GRID_ROWS * CELL_HEIGHT) + ((GRID_ROWS - 1) * CELL_PADDING); // 1070px ≈ 90.7mm

// Colors
const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };
const LIGHT_GRAY = { r: 240, g: 240, b: 240 };

/**
 * Create readline interface for user input
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Ask a question to the user
 */
function question(rl, query) {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer.trim() || null);
    });
  });
}

/**
 * Get list of images from directory
 */
async function getImages(directory) {
  try {
    const files = await fs.readdir(directory);
    const imageExtensions = ['.jpg', '.jpeg', '.JPG', '.JPEG'];
    
    const imageFiles = files.filter(file => {
      const ext = path.extname(file);
      return imageExtensions.includes(ext);
    });

    // Take only the first MAX_IMAGES images
    return imageFiles.slice(0, MAX_IMAGES).map(file => ({
      filename: file,
      fullPath: path.join(directory, file)
    }));
  } catch (error) {
    throw new Error(`Error reading directory: ${error.message}`);
  }
}

/**
 * Create SVG with text
 */
function createTextSVG(text, width, height, fontSize = 10, color = 'black') {
  // Escape special characters for XML
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return Buffer.from(`
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="white"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        fill="${color}"
        text-anchor="middle"
        dominant-baseline="middle"
        style="font-weight: 300;">
        ${escapedText}
      </text>
    </svg>
  `);
}

/**
 * Create footer SVG with highlighted serial number
 */
function createFooterSVG(serialNumber, laboratory, date, notes, width, height) {
  const parts = [];
  let yPos = 60;
  const labelX = 0;
  const valueX = 320; // Increased spacing to avoid overlap
  
  // Roll line - highlighted and prominent
  if (serialNumber) {
    parts.push(`<text x="${labelX}" y="${yPos}" font-family="Arial, sans-serif" font-size="58" font-weight="normal" fill="#666" text-anchor="start">Roll:</text>`);
    parts.push(`<text x="${valueX}" y="${yPos}" font-family="Arial, sans-serif" font-size="84" font-weight="bold" fill="#000" text-anchor="start">${escapeXml(serialNumber)}</text>`);
    yPos += 68;
  }
  
  // Scaned by line
  if (laboratory) {
    parts.push(`<text x="${labelX}" y="${yPos}" font-family="Arial, sans-serif" font-size="58" font-weight="400" fill="#666" text-anchor="start">Scaned by:</text>`);
    parts.push(`<text x="${valueX}" y="${yPos}" font-family="Arial, sans-serif" font-size="58" font-weight="300" fill="#333" text-anchor="start">${escapeXml(laboratory)}</text>`);
    yPos += 63;
  }
  
  // Date line
  if (date) {
    parts.push(`<text x="${labelX}" y="${yPos}" font-family="Arial, sans-serif" font-size="58" font-weight="400" fill="#666" text-anchor="start">Date:</text>`);
    parts.push(`<text x="${valueX}" y="${yPos}" font-family="Arial, sans-serif" font-size="58" font-weight="300" fill="#333" text-anchor="start">${escapeXml(date)}</text>`);
    yPos += 63;
  }
  
  // Notes line
  if (notes) {
    parts.push(`<text x="${labelX}" y="${yPos}" font-family="Arial, sans-serif" font-size="58" font-weight="400" fill="#666" text-anchor="start">Notes:</text>`);
    parts.push(`<text x="${valueX}" y="${yPos}" font-family="Arial, sans-serif" font-size="58" font-weight="300" fill="#333" text-anchor="start">${escapeXml(notes)}</text>`);
  }
  
  return Buffer.from(`
    <svg width="${width}" height="${height}">
      ${parts.join('\n      ')}
    </svg>
  `);
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create the contact sheet
 */
async function createContactSheet(images, metadata) {
  console.log(`\n📸 Creating contact sheet with ${images.length} image(s)...`);

  // Use fixed cell dimensions with exact spacing
  const thumbHeight = CELL_HEIGHT;
  const thumbWidth = CELL_WIDTH;
  
  // Footer starts after grid
  const footerStartY = MARGIN + GRID_HEIGHT;
  const footerHeight = IMAGE_SIZE - footerStartY - MARGIN;

  // Create base canvas
  const canvas = sharp({
    create: {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      channels: 3,
      background: WHITE
    }
  });

  const compositeImages = [];

  // Process each image
  for (let i = 0; i < images.length; i++) {
    const row = Math.floor(i / GRID_COLS);
    const col = i % GRID_COLS;

    const x = MARGIN + col * (CELL_WIDTH + CELL_PADDING);
    const y = MARGIN + row * (CELL_HEIGHT + CELL_PADDING);

    try {
      // Load image and get metadata
      const imageBuffer = await sharp(images[i].fullPath);
      const metadata = await imageBuffer.metadata();
      
      // Rotate vertical images to horizontal format for consistent display
      // All images are shown in landscape orientation on the contact sheet
      let processedImage = sharp(images[i].fullPath);
      if (metadata.height > metadata.width) {
        processedImage = processedImage.rotate(90);
      }
      
      // Create thumbnail buffer first
      const thumbnailBuffer = await processedImage
        .resize(thumbWidth, thumbHeight, {
          fit: 'contain',
          background: WHITE
        })
        .toBuffer();

      // Add thumbnail to composition
      compositeImages.push({
        input: thumbnailBuffer,
        top: y,
        left: x
      });

    } catch (error) {
      console.warn(`⚠️  Error processing ${images[i].filename}: ${error.message}`);
    }
  }

  // Create footer in the remaining space at bottom
  const footerY = footerStartY + 20;
  
  if (metadata.serialNumber || metadata.laboratory || metadata.date || metadata.notes) {
    const footerSVG = createFooterSVG(
      metadata.serialNumber,
      metadata.laboratory,
      metadata.date,
      metadata.notes,
      IMAGE_SIZE - MARGIN * 2,
      footerHeight
    );
    
    compositeImages.push({
      input: footerSVG,
      top: footerY,
      left: MARGIN
    });
  }

  // Decorative line above footer
  if (metadata.serialNumber || metadata.laboratory || metadata.date || metadata.notes) {
    const lineSVG = Buffer.from(`
      <svg width="${IMAGE_SIZE - MARGIN * 2}" height="1">
        <line x1="0" y1="0" x2="${IMAGE_SIZE - MARGIN * 2}" y2="0" 
              stroke="#E0E0E0" stroke-width="1"/>
      </svg>
    `);
    
    compositeImages.push({
      input: lineSVG,
      top: footerStartY + 8,
      left: MARGIN
    });
  }

  // Compose final image
  return canvas.composite(compositeImages);
}

/**
 * Main function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Printable Contact Sheet Generator           ║');
  console.log('║        For Photographic Film Scans             ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Validate arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: You must provide a directory as argument\n');
    console.log('Usage: npm start <directory-with-images>');
    console.log('Example: npm start ./my-photos\n');
    process.exit(1);
  }

  const directory = path.resolve(args[0]);

  // Verify that directory exists
  try {
    const stats = await fs.stat(directory);
    if (!stats.isDirectory()) {
      console.error('❌ Error: The provided path is not a directory\n');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: Directory does not exist or is not accessible\n`);
    process.exit(1);
  }

  // Get images
  console.log(`📁 Scanning directory: ${directory}\n`);
  const images = await getImages(directory);

  if (images.length === 0) {
    console.error('❌ Error: No JPEG images found in directory\n');
    process.exit(1);
  }

  console.log(`✓ Found ${images.length} image(s)\n`);

  if (images.length > MAX_IMAGES) {
    console.log(`⚠️  Only the first ${MAX_IMAGES} images will be processed\n`);
  }

  // Request metadata
  const rl = createInterface();

  console.log('Please provide the following information');
  console.log('(press Enter to skip any field):\n');

  const serialNumber = await question(rl, '🎞️  Film roll number: ');
  const laboratory = await question(rl, '🔬 Scanned by: ');
  const date = await question(rl, '📅 Approximate date of photos: ');
  const notes = await question(rl, '📝 Notes: ');

  rl.close();

  const metadata = { serialNumber, laboratory, date, notes };

  // Create contact sheet
  const contactSheet = await createContactSheet(images, metadata);

  // Output filename
  const outputFilename = `contact-sheet-${Date.now()}.jpg`;
  const outputPath = path.join(directory, outputFilename);

  // Save image
  await contactSheet
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toFile(outputPath);

  console.log(`\n✅ Contact sheet created successfully!`);
  console.log(`📄 File: ${outputPath}`);
  console.log(`📐 Dimensions: ${IMAGE_SIZE}x${IMAGE_SIZE} pixels (120x120mm @ 300 DPI)`);
  console.log(`\n💡 This image is ready to print at 120x120mm format\n`);
}

// Run
main().catch(error => {
  console.error(`\n❌ Error: ${error.message}\n`);
  process.exit(1);
});
