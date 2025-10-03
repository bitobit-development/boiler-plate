/**
 * Product utility functions for price formatting, calculations, and data transformations
 */

// ====================================
// PRICE FORMATTING
// ====================================

/**
 * Format price from cents to display format (R250.00)
 */
export function formatPrice(cents: number): string {
  const rands = cents / 100;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rands);
}

/**
 * Convert price from rands to cents for storage
 */
export function toCents(rands: number): number {
  return Math.round(rands * 100);
}

/**
 * Convert price from cents to rands
 */
export function toRands(cents: number): number {
  return cents / 100;
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercentage(
  price: number,
  comparePrice: number
): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

/**
 * Calculate savings amount
 */
export function calculateSavings(
  price: number,
  comparePrice: number
): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return comparePrice - price;
}

/**
 * Format discount badge text
 */
export function formatDiscountBadge(percentage: number): string {
  if (percentage <= 0) return "";
  return `${percentage}% OFF`;
}

// ====================================
// PRODUCT SLUG GENERATION
// ====================================

/**
 * Generate URL-friendly slug from product name
 */
export function generateProductSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/**
 * Generate SKU from category and index
 */
export function generateSku(category: string, index: number): string {
  const prefix = category.substring(0, 3).toUpperCase();
  const paddedIndex = String(index).padStart(4, "0");
  return `${prefix}-${paddedIndex}`;
}

// ====================================
// INVENTORY CALCULATIONS
// ====================================

/**
 * Calculate available quantity (total - reserved)
 */
export function calculateAvailableQuantity(
  quantity: number,
  reservedQuantity: number = 0
): number {
  return Math.max(0, quantity - reservedQuantity);
}

/**
 * Check if product is low on stock
 */
export function isLowStock(
  quantity: number,
  threshold: number,
  reservedQuantity: number = 0
): boolean {
  const available = calculateAvailableQuantity(quantity, reservedQuantity);
  return available <= threshold;
}

/**
 * Check if product is in stock
 */
export function isInStock(
  quantity: number,
  reservedQuantity: number = 0,
  allowBackorder: boolean = false
): boolean {
  if (allowBackorder) return true;
  return calculateAvailableQuantity(quantity, reservedQuantity) > 0;
}

/**
 * Get stock status label
 */
export function getStockStatus(
  quantity: number,
  reservedQuantity: number = 0,
  lowThreshold: number = 5,
  allowBackorder: boolean = false
): {
  label: string;
  variant: "success" | "warning" | "destructive" | "secondary";
} {
  const available = calculateAvailableQuantity(quantity, reservedQuantity);

  if (available === 0 && !allowBackorder) {
    return { label: "Out of Stock", variant: "destructive" };
  }

  if (available === 0 && allowBackorder) {
    return { label: "Backorder", variant: "secondary" };
  }

  if (available <= lowThreshold) {
    return { label: `Only ${available} left`, variant: "warning" };
  }

  return { label: "In Stock", variant: "success" };
}

// ====================================
// PRODUCT ATTRIBUTES
// ====================================

/**
 * Format THC/CBD content for display
 */
export function formatCannabinoidContent(
  content: number | string | null | undefined,
  type: "THC" | "CBD" = "THC"
): string {
  if (!content) return "";

  const value = typeof content === "string" ? parseFloat(content) : content;
  if (isNaN(value)) return "";

  // For edibles (values > 1 are likely mg)
  if (value > 1) {
    return `${value}mg ${type}`;
  }

  // For percentages
  return `${type} ${value}%`;
}

/**
 * Format weight for display
 */
export function formatProductWeight(weight: string | null | undefined): string {
  if (!weight) return "";

  // If already formatted (e.g., "2 joints"), return as is
  if (weight.includes("joint") || weight.includes("pack")) {
    return weight;
  }

  // Otherwise, assume it's a weight measurement
  return weight;
}

/**
 * Get product type display name
 */
export function getProductTypeDisplayName(type: string): string {
  const typeMap: Record<string, string> = {
    pre_roll: "Pre-rolls",
    dab: "Dabs",
    edible: "Edibles",
    vape: "THC Vapes",
    flower: "Flower",
    concentrate: "Concentrates",
    accessory: "Accessories",
  };

  return typeMap[type] || type;
}

/**
 * Get strain badge color
 */
export function getStrainBadgeColor(strain: string | null | undefined): string {
  if (!strain) return "secondary";

  const strainLower = strain.toLowerCase();

  if (strainLower.includes("sativa")) return "success";
  if (strainLower.includes("indica")) return "purple";
  if (strainLower.includes("hybrid")) return "blue";

  return "secondary";
}

// ====================================
// MEMBERSHIP & ACCESS
// ====================================

/**
 * Check if user has access to product based on membership
 */
export function canAccessProduct(
  productTiers: string[],
  userTier: string | null
): boolean {
  if (!productTiers || productTiers.length === 0) return true;
  if (!userTier) return false;

  // Define tier hierarchy (higher index = higher tier)
  const tierHierarchy = ["basic", "premium", "vip", "founding"];
  const userTierIndex = tierHierarchy.indexOf(userTier);

  if (userTierIndex === -1) return false;

  // User can access if their tier is in the allowed list
  // or if they have a higher tier than the minimum required
  const minRequiredTierIndex = Math.min(
    ...productTiers.map(tier => tierHierarchy.indexOf(tier)).filter(i => i !== -1)
  );

  return userTierIndex >= minRequiredTierIndex;
}

/**
 * Get membership badge text
 */
export function getMembershipBadge(tiers: string[]): string {
  if (!tiers || tiers.length === 0) return "Public";

  if (tiers.includes("vip") && tiers.length === 1) return "VIP Only";
  if (tiers.includes("premium") && !tiers.includes("basic")) return "Premium+";
  if (tiers.includes("founding")) return "Founding Members";

  return "Members Only";
}

// ====================================
// SORTING & FILTERING
// ====================================

/**
 * Sort products by various criteria
 */
export function sortProducts<T extends {
  price: number;
  name: string;
  createdAt: Date;
  viewCount?: number;
  purchaseCount?: number;
}>(
  products: T[],
  sortBy: "price" | "name" | "created" | "popularity" = "created",
  order: "asc" | "desc" = "desc"
): T[] {
  const sorted = [...products].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return order === "asc" ? a.price - b.price : b.price - a.price;

      case "name":
        return order === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);

      case "created":
        return order === "asc"
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime();

      case "popularity":
        const aPopularity = (a.viewCount || 0) + (a.purchaseCount || 0) * 10;
        const bPopularity = (b.viewCount || 0) + (b.purchaseCount || 0) * 10;
        return order === "asc"
          ? aPopularity - bPopularity
          : bPopularity - aPopularity;

      default:
        return 0;
    }
  });

  return sorted;
}

/**
 * Filter products by price range
 */
export function filterByPriceRange<T extends { price: number }>(
  products: T[],
  minPrice?: number,
  maxPrice?: number
): T[] {
  return products.filter(product => {
    if (minPrice !== undefined && product.price < minPrice) return false;
    if (maxPrice !== undefined && product.price > maxPrice) return false;
    return true;
  });
}

// ====================================
// SEARCH & MATCHING
// ====================================

/**
 * Simple product search
 */
export function searchProducts<T extends {
  name: string;
  description?: string | null;
  tags?: string[] | null;
}>(products: T[], query: string): T[] {
  const searchTerm = query.toLowerCase().trim();

  if (!searchTerm) return products;

  return products.filter(product => {
    // Search in name
    if (product.name.toLowerCase().includes(searchTerm)) return true;

    // Search in description
    if (product.description?.toLowerCase().includes(searchTerm)) return true;

    // Search in tags
    if (product.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) return true;

    return false;
  });
}

// ====================================
// ANALYTICS & METRICS
// ====================================

/**
 * Calculate product engagement score
 */
export function calculateEngagementScore(
  viewCount: number,
  purchaseCount: number,
  rating?: number | null
): number {
  const viewScore = Math.min(viewCount, 1000) / 1000 * 20; // Max 20 points
  const purchaseScore = Math.min(purchaseCount, 100) / 100 * 50; // Max 50 points
  const ratingScore = rating ? (rating / 5) * 30 : 15; // Max 30 points or 15 if no rating

  return Math.round(viewScore + purchaseScore + ratingScore);
}

/**
 * Get popularity badge
 */
export function getPopularityBadge(
  viewCount: number,
  purchaseCount: number
): string | null {
  if (purchaseCount > 50) return "Best Seller";
  if (purchaseCount > 20) return "Popular";
  if (viewCount > 500) return "Trending";

  return null;
}