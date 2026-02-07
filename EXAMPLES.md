# Usage Examples

This document provides detailed examples of how to use the contact sheet generator in different scenarios.

## Example 1: Basic usage

```bash
npm start ./my-photos
```

The script will ask:
- Serial number: `001`
- Laboratory: `(Enter to skip)`
- Date: `December 2023`

**Result**: `contact-sheet-[timestamp].jpg` in `./my-photos/`

## Example 2: Skip all metadata

```bash
npm start ./vacation-photos
```

Simply press Enter on all questions. The script will generate the contact sheet without footer information.

## Example 3: Complete film roll

```bash
npm start ./rolls/kodak-roll-36
```

Suggested metadata:
- Serial number: `KODAK-36-2024-01`
- Laboratory: `LAB Digital Pro`
- Date: `January - March 2024`

## Example 4: Multiple contact sheets

To process multiple directories:

```bash
# Sheet 1
npm start ./scans/cd-001
# Answer questions for CD-001

# Sheet 2
npm start ./scans/cd-002
# Answer questions for CD-002

# And so on...
```

## Example 5: Absolute vs relative paths

Both work:

```bash
# Relative path
npm start ./photos

# Absolute path
npm start /home/user/documents/photos
```

## Organization tips

### Recommended structure for scanned files

```
photo-collection/
├── cd-001/
│   ├── IMG_0001.jpg
│   ├── IMG_0002.jpg
│   ├── ...
│   └── contact-sheet-xxx.jpg  (generated)
├── cd-002/
│   ├── IMG_0100.jpg
│   ├── IMG_0101.jpg
│   ├── ...
│   └── contact-sheet-yyy.jpg  (generated)
└── cd-003/
    └── ...
```

### Suggested numbering system

To maintain an organized catalog:

- **Serial number**: `CD-[YEAR]-[NUMBER]`
  - Example: `CD-2024-001`, `CD-2024-002`
- **Alternative**: `[LAB]-[TYPE]-[NUMBER]`
  - Example: `LABFOTO-NEG-001`, `DIGISCAN-SLIDE-012`

### Date information

Useful formats:
- `January 2024`
- `Summer 2023`
- `2024-01-15`
- `Rome Vacation 2023`
- `1990s`

## Troubleshooting

### "No JPEG images found in directory"

**Cause**: The directory does not contain `.jpg` or `.jpeg` files

**Solution**: 
- Verify that images have correct extension
- The script does not search in subdirectories

### Out of memory error with many images

**Cause**: Very large images (>50 MB each)

**Solution**: The script processes maximum 36 images. If each image is very large, consider optimizing them beforehand.

### Contact sheet looks blurry when printing

**Cause**: The printer is scaling the image or not configured at 300 DPI

**Solution**:
- Configure printer to 300 DPI
- Disable automatic scaling
- Print at actual size (120×120mm)

### Some images appear sideways

**This is not a problem!** The script automatically rotates vertical images (portrait) to horizontal (landscape) orientation. This ensures all images are displayed consistently in landscape format on the contact sheet, making it easier to view when printed.

- Portrait photos → Rotated 90° to landscape
- Landscape photos → Displayed as-is

## Advanced automation

### Bash script to process multiple directories

Create a `process-all.sh` file:

```bash
#!/bin/bash

# Process all subdirectories
for dir in ./scans/cd-*/; do
    echo "Processing: $dir"
    
    # Extract CD number from directory name
    cd_num=$(basename "$dir")
    
    # Execute with predefined answers
    (
    echo "$cd_num"           # Serial number
    echo "LAB Digital"       # Laboratory
    echo "2024"             # Date
    ) | npm start "$dir"
    
    echo "✓ Completed: $dir"
    echo "---"
done

echo "All directories processed!"
```

Grant execution permissions:
```bash
chmod +x process-all.sh
./process-all.sh
```

## Customization

If you need to modify the design (dimensions, colors, fonts, etc.), edit the [src/index.js](src/index.js) file. Configuration constants are at the beginning of the file:

```javascript
const DPI = 300;
const SIZE_MM = 120;
const GRID_ROWS = 6;
const GRID_COLS = 6;
// ... etc
```
