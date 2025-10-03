# DALL-E Product Image Prompt Templates

## Overview
This document contains optimized DALL-E prompts for generating clean, professional product images with **pure white backgrounds** - matching the successful Indoor x1 style.

## Key Principles for Clean Backgrounds

### ✅ DO Use These Terms
- **"Isolated product"** - Ensures product stands alone
- **"Pure white background"** - Clearest instruction for white bg
- **"No props or surfaces"** - Prevents tables/decorations
- **"Floating product"** - Product appears suspended
- **"Product only"** - Reinforces single item focus
- **"Clean studio lighting"** - Professional lighting without shadows
- **"E-commerce style"** - Standard product catalog look

### ❌ AVOID These Terms
- "Wide angle" - Can trigger environment/background elements
- "On white seamless" - "On" implies a surface
- "Commercial shot" - Too broad, may add context
- Complex color descriptions - Keep colors minimal
- Environmental descriptors - No "dispensary", "shop", etc.

## Universal Prompt Template

```
Isolated product photography of {product_name} cannabis package,
{color_accent}, floating product on pure white background,
no props or surfaces, clean studio lighting, e-commerce style,
centered composition, product only, professional quality
```

**Variables:**
- `{product_name}` - Product name (e.g., "Greendoor x2", "Buddah Hit")
- `{color_accent}` - Minimal color hint (e.g., "minimalist green accents")

**Character count:** ~250-350 chars (well under 400 limit)

## Product Category Templates

### 1. Pre-Rolls
**Template:**
```
Isolated product photography of {name} pre-roll package, minimalist green accents,
floating product on pure white background, no props or surfaces, clean studio lighting,
e-commerce style, centered composition, product only, professional quality
```

**Example - Greendoor x2 (Updated):**
```
Isolated product photography of Greendoor x2 pre-roll package, minimalist green accents,
floating product on pure white background, no props or surfaces, clean studio lighting,
e-commerce style, centered composition, product only, professional quality
```

### 2. Concentrates/Dabs
**Template:**
```
Isolated product photography of {name} concentrate jar, elegant gold details,
floating product on pure white background, no props or surfaces, clean studio lighting,
e-commerce style, centered composition, product only, professional quality
```

**Example - Buddah Hit:**
```
Isolated product photography of Buddah Hit concentrate jar, elegant gold details,
floating product on pure white background, no props or surfaces, clean studio lighting,
e-commerce style, centered composition, product only, professional quality
```

### 3. Edibles
**Template:**
```
Isolated product photography of {name} edible package, subtle purple touches,
floating product on pure white background, no props or surfaces, clean studio lighting,
e-commerce style, centered composition, product only, professional quality
```

**Example - 40MG Edible:**
```
Isolated product photography of 40MG cannabis edible package, subtle purple touches,
floating product on pure white background, no props or surfaces, clean studio lighting,
e-commerce style, centered composition, product only, professional quality
```

### 4. Vape Cartridges
**Template:**
```
Isolated product photography of {name} vape cartridge box, sleek blue highlights,
floating product on pure white background, no props or surfaces, clean studio lighting,
e-commerce style, centered composition, product only, professional quality
```

**Example - 10th Planet:**
```
Isolated product photography of 10th Planet vape cartridge box, sleek blue highlights,
floating product on pure white background, no props or surfaces, clean studio lighting,
e-commerce style, centered composition, product only, professional quality
```

## What Changed from Original Prompts?

### Before (Greendoor x2 - had background elements):
```
Professional product photography of premium Greendoor x2 pre-roll package,
sleek minimalist green and white packaging design, soft studio lighting on
white seamless background, luxury commercial e-commerce shot, modern dispensary branding
```

**Problems:**
- "on white seamless" suggests a surface
- "commercial shot" and "dispensary" add context
- "premium" and "luxury" may trigger elaborate settings
- Complex color descriptions

### After (Clean isolated style):
```
Isolated product photography of Greendoor x2 pre-roll package, minimalist green accents,
floating product on pure white background, no props or surfaces, clean studio lighting,
e-commerce style, centered composition, product only, professional quality
```

**Improvements:**
- Explicit "isolated" and "floating" instructions
- "no props or surfaces" prevents additions
- Simpler color description
- "product only" reinforcement
- Removed contextual terms

## Testing Your Prompts

### Quick Checklist:
- [ ] Uses "isolated product" or "floating product"
- [ ] Specifies "pure white background"
- [ ] Includes "no props or surfaces"
- [ ] Avoids environmental context words
- [ ] Under 400 characters
- [ ] Simple color descriptions only
- [ ] Ends with "product only"

## Implementation Notes

### For Script Updates:
The `generate-product-images.ts` script has been updated with:
1. Simplified color palette (minimalist accents vs full colors)
2. New prompt template focusing on isolation
3. Removed environmental/contextual terms
4. Shorter, cleaner prompt structure

### Image Settings:
- Model: DALL-E 3
- Size: 1792x1024 (landscape)
- Quality: Standard
- Style: Natural (not vivid)

## Examples of Good vs Bad Prompts

### ✅ GOOD:
```
Isolated product photography of Indoor x1 pre-roll package, minimalist design,
floating product on pure white background, no props or surfaces, clean studio lighting,
e-commerce style, centered composition, product only, professional quality
```

### ❌ BAD:
```
Professional wide angle product photography of premium Indoor x1 pre-roll package
on white seamless background in modern dispensary setting with luxury branding
```

## Color Accent Guide

Keep colors minimal and use these subtle descriptors:
- **Pre-rolls:** "minimalist green accents"
- **Concentrates:** "elegant gold details"
- **Edibles:** "subtle purple touches"
- **Vapes:** "sleek blue highlights"
- **Flower:** "natural green tones"
- **Accessories:** "modern black elements"

## Final Tips

1. **Less is more** - Simpler prompts give cleaner results
2. **Be explicit about isolation** - Use multiple terms that reinforce the concept
3. **Avoid scene-setting** - No environmental or contextual words
4. **Test incrementally** - If a prompt adds unwanted elements, identify the trigger word
5. **Consistency matters** - Use the same template structure for all products

---

**Result:** All products will have the clean, professional look of Indoor x1 - isolated products on pure white backgrounds with no distracting elements.