import {
  Cannabis,
  Leaf,
  Flower,
  TreePine,
  Sprout,
  Cookie,
  Candy,
  CakeSlice,
  Cherry,
  Apple,
  IceCream2,
  Zap,
  Wind,
  Cloud,
  Gauge,
  Battery,
  Droplet,
  Gem,
  Diamond,
  Sparkles,
  Droplets,
  Cigarette,
  Scroll,
  Package,
  Wrench,
  Box,
  ShoppingBag,
  Sun,
  Moon,
  CloudRain,
  type LucideIcon,
} from "lucide-react";

// Product type icon variations for visual diversity
export const iconVariations: Record<string, LucideIcon[]> = {
  flower: [Cannabis, Leaf, Flower, TreePine, Sprout],
  edible: [Cookie, Candy, CakeSlice, Cherry, Apple, IceCream2],
  vape: [Zap, Wind, Cloud, Gauge, Battery],
  concentrate: [Droplet, Gem, Diamond, Sparkles, Droplets],
  pre_roll: [Cigarette, Scroll, Wind],
  accessory: [Package, Wrench, Box, ShoppingBag],
};

// Strain type icons for secondary indicators
export const strainIcons: Record<string, LucideIcon> = {
  sativa: Sun,        // Energizing, daytime
  indica: Moon,       // Relaxing, nighttime
  hybrid: CloudRain,  // Balanced, versatile
};

// Product type color classes with gradients
export const typeColors = {
  flower: {
    text: "text-green-500",
    bg: "bg-green-500",
    gradient: "from-green-500 to-emerald-600",
    shadow: "shadow-green-500/50",
    hex: "#22c55e",
  },
  edible: {
    text: "text-pink-500",
    bg: "bg-pink-500",
    gradient: "from-pink-500 to-rose-600",
    shadow: "shadow-pink-500/50",
    hex: "#ec4899",
  },
  vape: {
    text: "text-violet-500",
    bg: "bg-violet-500",
    gradient: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/50",
    hex: "#8b5cf6",
  },
  concentrate: {
    text: "text-cyan-500",
    bg: "bg-cyan-500",
    gradient: "from-cyan-500 to-sky-600",
    shadow: "shadow-cyan-500/50",
    hex: "#06b6d4",
  },
  pre_roll: {
    text: "text-amber-500",
    bg: "bg-amber-500",
    gradient: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/50",
    hex: "#f59e0b",
  },
  accessory: {
    text: "text-slate-500",
    bg: "bg-slate-500",
    gradient: "from-slate-500 to-slate-600",
    shadow: "shadow-slate-500/50",
    hex: "#64748b",
  },
};

// Strain type color classes
export const strainColors = {
  sativa: {
    text: "text-green-600",
    bg: "bg-green-600",
    gradient: "from-green-500 to-emerald-500",
    hex: "#16a34a",
  },
  indica: {
    text: "text-purple-600",
    bg: "bg-purple-600",
    gradient: "from-purple-500 to-violet-500",
    hex: "#9333ea",
  },
  hybrid: {
    text: "text-yellow-600",
    bg: "bg-yellow-600",
    gradient: "from-yellow-500 to-amber-500",
    hex: "#ca8a04",
  },
};

/**
 * Get a consistent icon for a product based on its ID
 * This ensures the same product always gets the same icon
 */
export function getProductIcon(productType: string, productId: string): LucideIcon {
  const icons = iconVariations[productType] || iconVariations.accessory;

  // Create a simple hash from the product ID
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    const char = productId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use absolute value to ensure positive index
  const index = Math.abs(hash) % icons.length;
  return icons[index];
}

/**
 * Get the product type label for display
 */
export function getProductTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    flower: "Cannabis Flower",
    edible: "Edible",
    vape: "Vape Cartridge",
    concentrate: "Concentrate",
    pre_roll: "Pre-Roll",
    accessory: "Accessory",
  };
  return labels[type] || "Product";
}

/**
 * Get the strain type label for display
 */
export function getStrainTypeLabel(strain: string): string {
  if (!strain) return "";

  const strainLower = strain.toLowerCase();
  if (strainLower.includes("sativa")) return "Sativa - Energizing";
  if (strainLower.includes("indica")) return "Indica - Relaxing";
  if (strainLower.includes("hybrid")) return "Hybrid - Balanced";

  return strain;
}

/**
 * Determine strain type from strain name
 */
export function getStrainType(strain: string): "sativa" | "indica" | "hybrid" | null {
  if (!strain) return null;

  const strainLower = strain.toLowerCase();
  if (strainLower.includes("sativa")) return "sativa";
  if (strainLower.includes("indica")) return "indica";
  if (strainLower.includes("hybrid")) return "hybrid";

  return null;
}

/**
 * Get animation classes based on product properties
 */
export function getAnimationClasses(isNew?: boolean, isFeatured?: boolean): string {
  const classes: string[] = [];

  if (isNew) {
    classes.push("animate-pulse");
  }

  if (isFeatured) {
    // Glow effect for featured products
    classes.push("shadow-[0_0_20px_rgba(139,92,246,0.6)]");
  }

  return classes.join(" ");
}

/**
 * Get responsive icon size classes
 */
export function getIconSize(context: "badge" | "card" | "list" | "detail"): string {
  const sizes = {
    badge: "w-4 h-4 md:w-5 md:h-5",      // 16px mobile, 20px desktop
    card: "w-5 h-5 md:w-6 md:h-6",       // 20px mobile, 24px desktop
    list: "w-4 h-4",                      // 16px
    detail: "w-6 h-6 lg:w-8 lg:h-8",     // 24px, 32px large
  };
  return sizes[context] || sizes.card;
}