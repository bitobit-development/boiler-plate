import type {
  Product,
  ProductCategory,
  PriceHistory,
  InventoryMovement,
  ProductAttribute,
  ProductType,
  ProductStatus,
  MembershipTier
} from "@/lib/db/schema/products";

// ====================================
// PRODUCT TYPES WITH RELATIONS
// ====================================

export interface ProductWithCategory extends Product {
  category: ProductCategory;
}

export interface ProductWithRelations extends Product {
  category: ProductCategory;
  priceHistory?: PriceHistory[];
  inventoryMovements?: InventoryMovement[];
  attributes?: ProductAttribute[];
  variants?: Product[];
  parentProduct?: Product;
}

// ====================================
// LIST & DISPLAY TYPES
// ====================================

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  imageUrl?: string | null;
  categoryId: string;
  categoryName?: string;
  productType: ProductType;
  status: ProductStatus;
  quantity: number;
  isFeatured: boolean;
  isNew: boolean;
  weight?: string | null;
  potency?: string | null;
  strain?: string | null;
  thcContent?: string | null;
  cbdContent?: string | null;
}

export interface CategoryWithCount extends ProductCategory {
  productCount: number;
}

// ====================================
// FORM & INPUT TYPES
// ====================================

export interface ProductFormData {
  // Basic Information
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;

  // Classification
  categoryId: string;
  sku?: string;
  barcode?: string;
  productType: ProductType;

  // Pricing
  price: number;
  comparePrice?: number;
  costPrice?: number;

  // Variants
  variantOf?: string;
  variantLabel?: string;
  sortVariantOrder?: number;

  // Inventory
  quantity: number;
  trackQuantity: boolean;
  allowBackorder: boolean;
  lowStockThreshold?: number;

  // Status
  status: ProductStatus;
  isVisible: boolean;
  isFeatured: boolean;
  isNew: boolean;

  // Cannabis Attributes
  weight?: string;
  potency?: string;
  strain?: string;
  thcContent?: number;
  cbdContent?: number;
  terpenes?: string[];
  effects?: string[];
  flavorProfile?: string[];

  // Media
  imageUrl?: string;
  images?: Array<{
    url: string;
    alt?: string;
    order?: number;
  }>;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];

  // Membership
  requiresMembership: boolean;
  membershipTiers?: MembershipTier[];

  // Supplier
  supplier?: string;
  supplierSku?: string;

  // Tags & Custom
  tags?: string[];
  customFields?: Record<string, any>;

  // Compliance
  ageRestricted: boolean;
  complianceNotes?: string;
  labTestResults?: {
    testDate?: string;
    labName?: string;
    certificateUrl?: string;
    results?: Record<string, any>;
  };
}

// ====================================
// FILTER & QUERY TYPES
// ====================================

export interface ProductFilters {
  category?: string;
  categorySlug?: string;
  productType?: ProductType;
  status?: ProductStatus;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  membershipTier?: MembershipTier;
  tags?: string[];
  strain?: string;
  minThc?: number;
  maxThc?: number;
}

export interface ProductSortOptions {
  field: 'name' | 'price' | 'created' | 'updated' | 'popularity' | 'rating' | 'quantity';
  direction: 'asc' | 'desc';
}

export interface ProductQueryParams {
  filters?: ProductFilters;
  sort?: ProductSortOptions;
  pagination?: {
    page: number;
    limit: number;
  };
  includeRelations?: boolean;
}

// ====================================
// PRICE UPDATE TYPES
// ====================================

export interface PriceUpdateData {
  productId: string;
  newPrice: number;
  newCostPrice?: number;
  reason: string;
  changeType?: 'manual' | 'bulk_update' | 'promotion' | 'cost_adjustment';
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  requiresApproval?: boolean;
  batchId?: string;
  batchNote?: string;
}

export interface BulkPriceUpdateData {
  updates: PriceUpdateData[];
  batchNote?: string;
}

// ====================================
// INVENTORY TYPES
// ====================================

export interface InventoryUpdateData {
  productId: string;
  quantity: number;
  movementType: 'addition' | 'removal' | 'adjustment' | 'reservation' | 'release';
  reason: string;
  referenceType?: string;
  referenceId?: string;
  batchNumber?: string;
  expiryDate?: Date;
  notes?: string;
}

// ====================================
// RESPONSE TYPES
// ====================================

export interface ProductsResponse {
  products: ProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductActionResult<T = Product> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string[]>;
}

// ====================================
// MEMBER ACCESS TYPES
// ====================================

export interface MemberAccessInfo {
  isMember: boolean;
  membershipTier?: MembershipTier;
  canViewPrices: boolean;
  canPurchase: boolean;
  accessibleProducts: string[]; // Product IDs the member can access
}

export interface ProductWithAccess extends Product {
  userHasAccess: boolean;
  priceHidden?: boolean;
  accessMessage?: string;
}

// ====================================
// ADMIN TYPES
// ====================================

export interface ProductAuditEntry {
  id: string;
  productId: string;
  action: 'create' | 'update' | 'delete' | 'archive' | 'restore' | 'price_change' | 'inventory_change';
  changes?: Record<string, { old: any; new: any }>;
  performedBy: string;
  performedByName?: string;
  timestamp: Date;
  reason?: string;
  ipAddress?: string;
}

export interface ProductBulkAction {
  action: 'archive' | 'delete' | 'update_status' | 'update_price' | 'update_category';
  productIds: string[];
  data?: any;
  reason?: string;
}

// ====================================
// STATISTICS TYPES
// ====================================

export interface ProductStatistics {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  featuredProducts: number;
  totalValue: number; // Total inventory value
  categoryCounts: Record<string, number>;
  typeCounts: Record<ProductType, number>;
}

// ====================================
// EXPORT ALL SCHEMA TYPES
// ====================================

export type {
  Product,
  ProductCategory,
  PriceHistory,
  InventoryMovement,
  ProductAttribute,
  ProductType,
  ProductStatus,
  MembershipTier
} from "@/lib/db/schema/products";