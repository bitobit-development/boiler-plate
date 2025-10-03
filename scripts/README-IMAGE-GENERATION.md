# Product Image Generation Guide

## Overview

The AI Product Image Generation system uses OpenAI's DALL-E 3 to automatically generate professional product images for the cannabis e-commerce platform.

## Quick Start

### 1. Check Current Products

First, see what products are in your database:

```bash
npm run products:check
```

This will show you:
- Total product count
- Products grouped by type
- Products missing images
- Greendoor products (if any)

### 2. Generate Image for Single Product (POC)

Generate an image for the Greendoor x2 product:

```bash
npm run products:generate-images -- --product "greendoor-x2"
```

### 3. Test Without API Calls (Dry Run)

Test the script without making actual API calls:

```bash
npm run products:generate-images -- --product "greendoor-x2" --dry-run
```

## Command Options

```bash
# Single product
npm run products:generate-images -- --product "product-slug"

# All products missing images
npm run products:generate-images -- --all

# Specific product category
npm run products:generate-images -- --category "pre_roll"

# Dry run (no API calls)
npm run products:generate-images -- --product "slug" --dry-run

# Help
npm run products:generate-images -- --help
```

## Product Categories

- `pre_roll` - Green and white packaging
- `dab` - Gold and black packaging
- `edible` - Purple and white packaging
- `vape` - Blue and silver packaging
- `flower` - Emerald green packaging
- `concentrate` - Amber and gold packaging
- `accessory` - Black and silver packaging

## Image Specifications

- **Model**: DALL-E 3
- **Size**: 1024x1024 pixels
- **Quality**: Standard
- **Format**: PNG
- **Storage**: `/public/images/products/{slug}.png`

## Architecture

### Files Structure
```
scripts/
├── generate-product-images.ts  # Main generation script
├── check-products.ts           # Database inspection tool
└── README-IMAGE-GENERATION.md  # This guide

public/images/products/         # Generated images stored here
├── greendoor-x2.png
├── indoor-x1.png
└── ...
```

### Database Updates

The script automatically:
1. Downloads the generated image from OpenAI
2. Saves it locally as `/public/images/products/{slug}.png`
3. Updates the product's `imageUrl` field in the database
4. Updates the `updatedAt` timestamp

### Error Handling

- **Retry Logic**: 3 attempts with exponential backoff
- **Rate Limiting**: 2-second delay between batch generations
- **Transaction Safety**: Database updates only on successful image save
- **Clear Logging**: Detailed progress and error messages

## DALL-E Prompt Template

The system uses intelligent prompt generation based on product attributes:

```
Professional product photography of premium {product.name} {productType} package,
sleek minimalist {color_scheme} packaging design,
soft studio lighting on white seamless background,
luxury commercial e-commerce shot,
modern dispensary branding
```

Additional details are added for:
- Weight labels (e.g., "2g", "1 joint")
- Potency indicators (e.g., "THC 20%")
- Strain branding (e.g., "Sativa", "Indica")

## Batch Processing

For production use:

```bash
# Generate for all products without images
npm run products:generate-images -- --all

# Generate for specific category
npm run products:generate-images -- --category "pre_roll"
```

### Performance Considerations

- API calls are rate-limited (2s delay between calls)
- Each generation takes ~5-10 seconds
- Batch of 13 products: ~2-3 minutes total

## Troubleshooting

### Common Issues

1. **"Product not found"**
   - Check the slug is correct: `npm run products:check`
   - Ensure product exists in database

2. **"OPENAI_API_KEY not found"**
   - Add to `.env.local`: `OPENAI_API_KEY=sk-...`

3. **"DATABASE_URL not found"**
   - Ensure `.env.local` has database connection string

4. **Rate Limiting**
   - Script has built-in delays
   - If still hitting limits, increase delay in script

### Checking Results

After generation:
1. Check file exists: `ls -la public/images/products/`
2. Verify database: `npm run products:check`
3. View in browser: `http://localhost:3000/images/products/greendoor-x2.png`

## Environment Variables

Required in `.env.local`:
```env
DATABASE_URL=your_database_connection_string
OPENAI_API_KEY=your_openai_api_key
```

## Cost Estimates

- DALL-E 3 Standard Quality: ~$0.04 per image
- 13 products: ~$0.52 total
- With retries (worst case): ~$1.50

## Next Steps

After successful POC:
1. Review generated image quality
2. Adjust prompts if needed
3. Run batch generation for all products
4. Integrate with product display pages
5. Set up automated generation for new products