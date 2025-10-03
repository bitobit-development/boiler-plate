import { z } from "zod";

// ====================================
// ENUM VALIDATIONS
// ====================================

export const productTypeSchema = z.enum([
  "pre_roll",
  "dab",
  "edible",
  "vape",
  "flower",
  "concentrate",
  "accessory",
]);

export const productStatusSchema = z.enum([
  "draft",
  "active",
  "archived",
  "out_of_stock",
]);

export const membershipTierSchema = z.enum([
  "basic",
  "premium",
  "vip",
  "founding",
]);

// ====================================
// CATEGORY VALIDATIONS
// ====================================

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().default(0),
  imageUrl: z.string().url().optional(),
  iconName: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ====================================
// PRODUCT VALIDATIONS
// ====================================

export const createProductSchema = z.object({
  // Basic Information
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),

  // Classification
  categoryId: z.string().uuid(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  productType: productTypeSchema,

  // Pricing (in cents)
  price: z.number().int().min(0),
  comparePrice: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),

  // Variants
  variantOf: z.string().uuid().optional(),
  variantLabel: z.string().max(100).optional(),
  sortVariantOrder: z.number().int().default(0),

  // Inventory
  quantity: z.number().int().min(0).default(0),
  reservedQuantity: z.number().int().min(0).default(0),
  trackQuantity: z.boolean().default(true),
  allowBackorder: z.boolean().default(false),
  lowStockThreshold: z.number().int().min(0).default(5),

  // Status
  status: productStatusSchema.default("draft"),
  isVisible: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),

  // Cannabis Attributes
  weight: z.string().max(50).optional(),
  potency: z.string().max(50).optional(),
  strain: z.string().max(100).optional(),
  thcContent: z.number().min(0).max(100).optional(),
  cbdContent: z.number().min(0).max(100).optional(),
  terpenes: z.array(z.string()).optional(),
  effects: z.array(z.string()).optional(),
  flavorProfile: z.array(z.string()).optional(),

  // Media
  imageUrl: z.string().url().optional(),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    order: z.number().optional(),
  })).default([]),

  // SEO
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().optional(),
  keywords: z.array(z.string()).default([]),

  // Membership
  requiresMembership: z.boolean().default(true),
  membershipTiers: z.array(membershipTierSchema).default(["basic"]),

  // Supplier
  supplier: z.string().max(255).optional(),
  supplierSku: z.string().max(100).optional(),

  // Tags & Custom
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.any()).optional(),

  // Compliance
  ageRestricted: z.boolean().default(true),
  complianceNotes: z.string().optional(),
  labTestResults: z.object({
    testDate: z.string().optional(),
    labName: z.string().optional(),
    certificateUrl: z.string().url().optional(),
    results: z.record(z.any()).optional(),
  }).optional(),

  // Publishing
  publishedAt: z.date().optional(),
});

export const updateProductSchema = createProductSchema.partial().omit({
  slug: true, // Don't allow slug updates through normal updates
});

// ====================================
// PRICE UPDATE VALIDATIONS
// ====================================

export const updatePriceSchema = z.object({
  productId: z.string().uuid(),
  newPrice: z.number().int().min(0),
  newCostPrice: z.number().int().min(0).optional(),
  reason: z.string().min(1).max(500),
  changeType: z.enum([
    "manual",
    "bulk_update",
    "promotion",
    "cost_adjustment",
  ]).default("manual"),
  effectiveFrom: z.date().optional(),
  effectiveUntil: z.date().optional(),
  requiresApproval: z.boolean().default(false),
});

export const bulkPriceUpdateSchema = z.object({
  updates: z.array(updatePriceSchema),
  batchNote: z.string().optional(),
});

// ====================================
// INVENTORY VALIDATIONS
// ====================================

export const inventoryMovementSchema = z.object({
  productId: z.string().uuid(),
  movementType: z.enum([
    "addition",
    "removal",
    "adjustment",
    "reservation",
    "release",
  ]),
  quantity: z.number().int(),
  reason: z.string().optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
  batchNumber: z.string().max(100).optional(),
  expiryDate: z.date().optional(),
  notes: z.string().optional(),
});

// ====================================
// QUERY VALIDATIONS
// ====================================

export const productQuerySchema = z.object({
  // Filters
  category: z.string().optional(),
  productType: productTypeSchema.optional(),
  status: productStatusSchema.optional(),
  search: z.string().optional(),
  minPrice: z.number().int().min(0).optional(),
  maxPrice: z.number().int().min(0).optional(),
  inStock: z.boolean().optional(),
  featured: z.boolean().optional(),
  membershipTier: membershipTierSchema.optional(),

  // Sorting
  sort: z.enum([
    "name",
    "price",
    "created",
    "updated",
    "popularity",
    "rating",
  ]).default("created"),
  order: z.enum(["asc", "desc"]).default("desc"),

  // Pagination
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ====================================
// ADMIN ACTION VALIDATIONS
// ====================================

export const archiveProductSchema = z.object({
  productId: z.string().uuid(),
  reason: z.string().optional(),
});

export const duplicateProductSchema = z.object({
  productId: z.string().uuid(),
  newName: z.string().min(1).max(255),
  newSlug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  newSku: z.string().max(100).optional(),
});

// ====================================
// TYPE EXPORTS
// ====================================

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export type UpdatePriceInput = z.infer<typeof updatePriceSchema>;
export type BulkPriceUpdateInput = z.infer<typeof bulkPriceUpdateSchema>;

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;

export type ArchiveProductInput = z.infer<typeof archiveProductSchema>;
export type DuplicateProductInput = z.infer<typeof duplicateProductSchema>;