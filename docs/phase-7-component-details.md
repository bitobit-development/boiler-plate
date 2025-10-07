# Phase 7: Component Implementation Details

## Component Breakdown

### 1. ExpirationTimer Component

#### Props Interface
```typescript
interface ExpirationTimerProps {
  expiresAt: Date;           // Order expiration date
  onExpired?: () => void;    // Optional callback when timer expires
  className?: string;        // Optional additional classes
}
```

#### Visual States

**Normal State (> 1 hour remaining)**
```
┌─────────────────────────┐
│ 🕐 23:45:12            │  Blue background
└─────────────────────────┘  Calm, informative
```

**Warning State (< 1 hour remaining)**
```
┌─────────────────────────┐
│ 🕐 00:45:30 (pulsing)  │  Amber background
└─────────────────────────┘  Attention-grabbing
```

**Expired State**
```
┌─────────────────────────┐
│ 🕐 Expired              │  Red background
└─────────────────────────┘  Clear error state
```

#### Technical Implementation
- **Update Interval:** 1 second (1000ms)
- **Time Format:** HH:MM:SS with zero-padding
- **Warning Threshold:** < 1 hour (3600 seconds)
- **Accessibility:** ARIA timer role, live updates
- **Performance:** Cleanup on unmount, single interval

---

### 2. PendingOrderCard Component

#### Props Interface
```typescript
interface PendingOrderCardProps {
  order: PendingOrder;                      // Order data
  onCancel: (orderId: string) => Promise<void>;  // Cancel callback
  className?: string;                       // Optional classes
}
```

#### Card Structure

```
┌──────────────────────────────────────────────────────────┐
│  ORDER-20251007-001                         [Pending]    │
│  📅 Oct 7, 2025, 11:30                                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🛍️  3 items                        R 230.00       │ │
│  │                              incl. R 30.00 tax     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  Expires in:                            🕐 23:45:12      │
│                                                           │
│  📦 Order Details                                    [▼] │
│                                                           │
├──────────────────────────────────────────────────────────┤
│  [❌ Cancel Order]                                       │
└──────────────────────────────────────────────────────────┘
```

#### Expanded State

```
┌──────────────────────────────────────────────────────────┐
│  ORDER-20251007-001                         [Pending]    │
│  📅 Oct 7, 2025, 11:30                                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🛍️  3 items                        R 230.00       │ │
│  │                              incl. R 30.00 tax     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  Expires in:                            🕐 23:45:12      │
│                                                           │
│  📦 Order Details                                    [▲] │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │  Cannabis Flower Premium                           │ │
│  │  SKU: CF-001                                       │ │
│  │  Qty: 2 × R 100.00                      R 200.00   │ │
│  │  ───────────────────────────────────────────────   │ │
│  │  Vape Cartridge Indica                             │ │
│  │  SKU: VC-002                                       │ │
│  │  Qty: 1 × R 150.00                      R 150.00   │ │
│  │  ───────────────────────────────────────────────   │ │
│  │                                                     │ │
│  │  Subtotal                               R 350.00   │ │
│  │  Tax (15%)                              R  52.50   │ │
│  │  ═══════════════════════════════════════════════   │ │
│  │  Total                                  R 402.50   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
├──────────────────────────────────────────────────────────┤
│  [❌ Cancel Order]                                       │
└──────────────────────────────────────────────────────────┘
```

#### Cancel Confirmation Dialog

```
           ┌──────────────────────────────┐
           │                              │
           │      ⚠️  (red circle)         │
           │                              │
           │      Cancel Order?           │
           │                              │
           │  Are you sure you want to    │
           │  cancel order                │
           │  ORDER-20251007-001?         │
           │  This action cannot be       │
           │  undone.                     │
           │                              │
           │  ┌────────────────────────┐  │
           │  │ Items      3 items     │  │
           │  │ Total      R 230.00    │  │
           │  └────────────────────────┘  │
           │                              │
           │  [Keep Order]                │
           │  [❌ Yes, Cancel Order]      │
           │                              │
           └──────────────────────────────┘
```

---

### 3. PendingOrdersList Component

#### Props Interface
```typescript
interface PendingOrdersListProps {
  orders: PendingOrder[];     // Array of pending orders
  subscriberId: string;       // Subscriber UUID
  className?: string;         // Optional classes
}
```

#### Layout

```
┌──────────────────────────────────────────────────────────┐
│                                                           │
│  [Order Card 1]                                          │
│  ORDER-20251007-001                                      │
│  R 230.00  •  3 items  •  🕐 23:45:12                   │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  [Order Card 2]                                          │
│  ORDER-20251007-002                                      │
│  R 450.00  •  5 items  •  🕐 10:30:45                   │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  [Order Card 3]                                          │
│  ORDER-20251006-015                                      │
│  R 180.00  •  2 items  •  🕐 02:15:20                   │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

#### State Management
- **Initial:** Receives orders from server
- **Optimistic Update:** Removes cancelled order immediately
- **Server Refresh:** Revalidates after cancellation
- **Error Handling:** Shows toast on failure, keeps order in list

---

### 4. My Orders Page

#### Page Layout

```
┌──────────────────────────────────────────────────────────┐
│ Header (Sticky)                                          │
│ ← Back to Shop  |  My Orders                             │
│                    Welcome back, John                     │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ Main Content                                             │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ℹ️  Order Expiration Policy                        │ │
│  │    Pending orders automatically expire after       │ │
│  │    48 hours. Please complete payment before        │ │
│  │    the timer runs out.                             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  Pending Orders (3)                                      │
│                                                           │
│  [PendingOrdersList Component]                           │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Need Help?                                         │ │
│  │                                                     │ │
│  │ If you have questions about your order or need     │ │
│  │ assistance, please contact our support team.       │ │
│  │                                                     │ │
│  │ Support: support@biggbuzz.com                      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

#### Empty State

```
┌──────────────────────────────────────────────────────────┐
│ Main Content                                             │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ℹ️  Order Expiration Policy                        │ │
│  │    (same as above)                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │              📥  (inbox icon)                       │ │
│  │                                                     │ │
│  │          No Pending Orders                          │ │
│  │                                                     │ │
│  │     You don't have any pending orders at the       │ │
│  │     moment. Start shopping to create your          │ │
│  │     first order!                                    │ │
│  │                                                     │ │
│  │        [🛍️ Browse Products]                        │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Responsive Breakpoints

### Mobile (default - 0px+)
```
┌────────────────────┐
│ Header             │
│ ← Back  My Orders  │
├────────────────────┤
│                    │
│ Alert (full width) │
│                    │
│ Order Card         │
│ (full width)       │
│ [Cancel Order]     │
│ (full width)       │
│                    │
│ Order Card         │
│ (full width)       │
│                    │
└────────────────────┘
```

### Tablet (md: 768px+)
```
┌─────────────────────────────────┐
│ Header                          │
│ ← Back to Shop  My Orders       │
├─────────────────────────────────┤
│         Alert (padded)          │
│                                 │
│    Order Card (max-width)       │
│    [Cancel]  [View Details]     │
│                                 │
│    Order Card (max-width)       │
│                                 │
└─────────────────────────────────┘
```

### Desktop (lg: 1024px+)
```
┌──────────────────────────────────────────────────┐
│ Header                                           │
│ ← Back to Shop  My Orders                        │
├──────────────────────────────────────────────────┤
│                                                   │
│        Alert (max-width: 896px, centered)        │
│                                                   │
│        Order Card (max-width: 896px)             │
│        Enhanced spacing, hover effects           │
│                                                   │
│        Order Card (max-width: 896px)             │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## Color Palette

### Order Status
- **Pending:** Blue (`bg-blue-50 text-blue-700`)
- **Warning:** Amber (`bg-amber-50 text-amber-700`)
- **Expired:** Red (`bg-destructive/10 text-destructive`)
- **Cancelled:** Gray (`bg-muted text-muted-foreground`)

### UI Elements
- **Card Background:** `bg-card`
- **Muted Sections:** `bg-muted/50`
- **Borders:** `border` (default theme color)
- **Text Primary:** `text-foreground`
- **Text Secondary:** `text-muted-foreground`

### Interactive States
- **Hover:** `hover:shadow-md`, `hover:bg-muted/50`
- **Focus:** `focus:ring-2 focus:ring-ring`
- **Active:** `active:scale-95`
- **Disabled:** `opacity-50 pointer-events-none`

---

## Typography Scale

### Headings
- **h1 (Page Title):** `text-lg sm:text-xl font-semibold`
- **h2 (Section Title):** `text-lg font-semibold`
- **h3 (Card Title):** `text-lg font-semibold`

### Body Text
- **Normal:** `text-sm`
- **Large:** `text-base`
- **Metadata:** `text-xs text-muted-foreground`

### Special Text
- **Price (Large):** `text-lg font-semibold`
- **Price (Total):** `text-base font-semibold`
- **Timer:** `text-xs font-medium tabular-nums`

---

## Spacing System

### Card Spacing
- **Header:** `pb-3`
- **Content:** `space-y-4 pb-3`
- **Footer:** `pt-4`

### Container Spacing
- **Mobile:** `px-4 py-6`
- **Tablet:** `sm:px-6 sm:py-8`
- **Desktop:** `lg:px-8`

### Gap Spacing
- **Tight:** `gap-2` (8px)
- **Normal:** `gap-4` (16px)
- **Loose:** `gap-6` (24px)

---

## Animation & Transitions

### Hover Effects
```css
transition-all hover:shadow-md
```

### Loading States
```css
opacity-50 pointer-events-none
```

### Expand/Collapse
```css
transition-all duration-200
```

### Pulse Animation (Warning)
```css
animate-pulse
```

---

## Accessibility Features

### Semantic HTML Elements
```html
<time dateTime="2025-10-07T11:30:00">Oct 7, 2025, 11:30</time>
<button type="button">Cancel Order</button>
<header>Page Header</header>
<main>Main Content</main>
<section aria-label="Pending orders">Orders List</section>
```

### ARIA Attributes
```html
<div role="timer" aria-live="polite" aria-label="Order expires in...">
<button aria-expanded="true" aria-controls="order-items-123">
<svg aria-hidden="true">Icon</svg>
<span className="sr-only">Screen reader only text</span>
```

### Keyboard Navigation
- **Tab:** Navigate between interactive elements
- **Enter/Space:** Activate buttons
- **Escape:** Close dialogs
- **Arrow Keys:** Navigate within components

### Focus Indicators
```css
focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
```

---

## Error States & Validation

### Order Not Found
```
Toast: "Order not found"
Action: Keep order in list, show error
```

### Cancellation Failed
```
Toast: "Failed to cancel order. Please try again."
Action: Keep order in list, allow retry
```

### Unauthorized Access
```
Redirect to: /specials?login=true
Message: Login required
```

### Expired Order
```
Visual: Timer shows "Expired"
Action: Auto-cancelled on backend
Message: "Order has expired and has been automatically cancelled"
```

---

## Performance Optimizations

### Server-Side Rendering
- Initial page load is server-rendered
- Fast first contentful paint
- SEO-friendly

### Client-Side Updates
- Optimistic UI updates on cancel
- Smooth transitions
- No full page reload

### Timer Performance
- Single interval per timer
- Cleanup on unmount
- Minimal re-renders

### Image Optimization
- No images in order cards (icons only)
- SVG icons for small file size

---

## Mobile Considerations

### Touch Targets
- Minimum 44x44px for all buttons
- Adequate spacing between interactive elements
- No hover-dependent features

### Viewport
- Responsive meta tag in layout
- Mobile-first CSS
- Tested on iOS and Android

### Performance
- Minimal JavaScript bundle
- Fast Time to Interactive
- Smooth animations at 60fps

---

## Security Considerations

### Authentication
```typescript
// Check cookie
const subscriberId = await getSubscriberId();
if (!subscriberId) redirect("/specials?login=true");

// Validate subscriber
const validation = await validateSubscriber(subscriberId);
if (!validation.isValid) redirect("/specials?login=true");
```

### Authorization
```typescript
// Verify ownership
if (order.subscriberId !== validated.subscriberId) {
  return { success: false, message: "Unauthorized" };
}
```

### Input Validation
```typescript
// Zod schemas
const cancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  subscriberId: z.string().uuid(),
});
```

---

## Browser Support

### Tested Browsers
- ✅ Chrome 120+
- ✅ Safari 17+
- ✅ Firefox 120+
- ✅ Edge 120+

### Required Features
- CSS Grid & Flexbox
- ES6+ JavaScript
- Fetch API
- Promises/Async-Await
- CSS Custom Properties

### Fallbacks
- No special fallbacks needed
- Modern browsers only (as per Next.js 15)

---

## Maintenance Notes

### Adding New Order Fields
1. Update `PendingOrder` type in `@/app/actions/orders.ts`
2. Update card display in `PendingOrderCard.tsx`
3. Update database schema if needed

### Changing Expiration Time
- Update in `@/app/actions/orders.ts`
- Current: 48 hours (configurable)

### Modifying Styles
- All styles use Tailwind CSS
- Theme colors in `globals.css`
- Component-specific styles in component files

### Testing Changes
1. TypeScript: `npx tsc --noEmit`
2. Dev server: `npm run dev`
3. Manual testing: Visit `/my-orders`
4. Integration test: `npx tsx scripts/test-my-orders-page.ts`

---

## Component Dependencies

### External Libraries
- `react` - Core framework
- `next` - Framework and routing
- `lucide-react` - Icons
- `sonner` - Toast notifications
- `@radix-ui/*` - Headless UI primitives (via shadcn/ui)

### Internal Dependencies
- `@/lib/utils` - cn() utility
- `@/lib/db` - Database access
- `@/app/actions/orders` - Server actions
- `@/components/ui/*` - shadcn/ui components

### No Dependencies Needed
- No date libraries (native Date API)
- No currency libraries (simple math)
- No state management libraries (React hooks)

---

## Summary

**Phase 7 delivers a complete, production-ready order management UI** with:

✅ **4 new components** (Timer, Card, List, Page)
✅ **100% responsive** (mobile, tablet, desktop)
✅ **WCAG 2.1 AA accessible** (semantic HTML, ARIA, keyboard nav)
✅ **Secure** (cookie auth, input validation, ownership checks)
✅ **Performant** (optimistic updates, minimal re-renders)
✅ **User-friendly** (loading states, toast feedback, clear CTAs)
✅ **Maintainable** (TypeScript, clean code, documented)

**Status:** ✅ Ready for Production
**Next Steps:** User acceptance testing, gather feedback, iterate if needed
