# POS Stock Level Indicators

## Implementation Summary

### Features Added
Stock level indicators have been added to the POS product cards with comprehensive inventory override support.

### Component Path
`/Users/haim/Projects/boiler-plate/src/components/pos/ProductCatalog/ProductCard.tsx`

### Key Features

#### 1. Stock Badge Component
- **Location**: Top-right corner of product card
- **Color Coding**:
  - **Green** (stock > 10): `bg-green-100 text-green-800`
  - **Yellow** (5-10): `bg-yellow-100 text-yellow-800`
  - **Red** (1-4): `bg-red-100 text-red-800`
  - **Gray** (0): `bg-gray-100 text-gray-800`
- **Display Format**: Shows "Stock: X" with package icon
- **Uses shadcn/ui Badge component**

#### 2. Out of Stock Overlay
- Semi-transparent overlay (`bg-black/60`) when stock = 0
- "Out of Stock" text centered in gray box
- Shows "Override Available" badge if `allowBackorder=true`
- Disables "Add to Cart" button unless override is allowed

#### 3. Low Stock Warning
- Subtle pulse animation (`animate-pulse-subtle`) when stock < 5
- Tooltip on hover showing exact quantity
- Warning icon (AlertTriangle) next to stock badge
- Additional warning message below Add to Cart button

#### 4. Override Indicator
- Shows "Override OK" badge when `allowBackorder=true`
- Blue color scheme: `bg-blue-100 text-blue-800`
- Position: Below stock badge
- Changes Add to Cart button to blue with "Add with Override" text

### Product Schema Fields Used
- `quantity` - Current stock level
- `allowBackorder` - Boolean flag for inventory override
- `lowStockThreshold` - Default 5 units
- `trackQuantity` - Enable/disable inventory tracking

### Visual Enhancements
- **Tooltips**: Hover over stock badge shows detailed inventory status
- **Icons Used**:
  - Package (stock indicator)
  - AlertTriangle (low stock warning)
  - CheckCircle2 (override available)
  - ShieldCheck (override indicator)
- **Animations**:
  - Subtle pulse for low stock items
  - Hover effects on badges
- **Responsive**: Mobile-friendly touch targets

### Testing
Run the test script to set various stock levels:
```bash
npx tsx scripts/test-stock-levels.ts
```

This sets up products with:
- Out of stock (0 units)
- Out of stock with override allowed
- Critical stock (2 units)
- Low stock (5 units)
- Medium stock (8 units)
- Good stock (15 units)
- High stock (50 units)

### Accessibility Features
- ARIA labels on interactive elements
- Keyboard navigation support
- High contrast color schemes
- Clear visual hierarchy
- Descriptive tooltips

### Mobile Optimizations
- Touch-friendly button sizes
- Clear visual indicators
- Responsive badge positioning
- Optimized for small screens