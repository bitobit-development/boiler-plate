"use server";

import { db } from "@/lib/db";
import {
  products,
  productCategories,
  priceHistory,
  inventoryMovements,
  type Product,
  type ProductCategory,
  type NewProduct,
  type NewPriceHistory,
  type NewInventoryMovement,
} from "@/lib/db/schema/products";
import { adminUsers, auditLogs, subscribers } from "@/lib/db/schema";
import {
  eq,
  and,
  or,
  gte,
  lte,
  like,
  desc,
  asc,
  sql,
  inArray,
  isNull,
  not,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/jwt";
import {
  createProductSchema,
  updateProductSchema,
  updatePriceSchema,
  inventoryMovementSchema,
  productQuerySchema,
  type CreateProductInput,
  type UpdateProductInput,
  type UpdatePriceInput,
  type InventoryMovementInput,
  type ProductQueryInput,
} from "@/lib/validations/products";
import { z } from "zod";

// ====================================
// TYPES
// ====================================

export type ProductWithCategory = Product & {
  category: ProductCategory | null;
};

export type ProductListItem = Pick<
  Product,
  | "id"
  | "name"
  | "slug"
  | "price"
  | "comparePrice"
  | "imageUrl"
  | "status"
  | "quantity"
  | "isFeatured"
  | "isNew"
  | "productType"
  | "weight"
  | "potency"
  | "strain"
  | "shortDescription"
>;

export type ProductsResponse = {
  products: ProductWithCategory[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ====================================
// HELPER FUNCTIONS
// ====================================

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  // Get full user data
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, payload.userId))
    .limit(1);

  return user;
}

async function checkMembershipAccess(): Promise<boolean> {
  // For now, check if there's a valid subscriber session
  // This can be enhanced based on your membership system
  const cookieStore = await cookies();
  const subscriberId = cookieStore.get("subscriber_id")?.value;

  if (!subscriberId) {
    return false;
  }

  // Validate the subscriber
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.id, subscriberId),
        eq(subscribers.status, "active"),
        eq(subscribers.mobileVerified, true)
      )
    )
    .limit(1);

  return !!subscriber;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

// ====================================
// PUBLIC ACTIONS (FOR SHOP PAGE)
// ====================================

export async function getProducts(
  params?: Partial<ProductQueryInput>
): Promise<ActionResult<ProductsResponse>> {
  try {
    const validatedParams = productQuerySchema.partial().parse(params || {});
    const {
      category,
      productType,
      search,
      minPrice,
      maxPrice,
      inStock,
      featured,
      sort = "created",
      order = "desc",
      page = 1,
      limit = 20,
    } = validatedParams;

    const offset = (page - 1) * limit;
    const isMember = await checkMembershipAccess();

    // Build where conditions
    const whereConditions = [
      eq(products.status, "active"),
      eq(products.isVisible, true),
      isNull(products.archivedAt),
    ];

    if (category) {
      // First find category by slug
      const [cat] = await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.slug, category))
        .limit(1);

      if (cat) {
        whereConditions.push(eq(products.categoryId, cat.id));
      }
    }

    if (productType) {
      whereConditions.push(eq(products.productType, productType));
    }

    if (search) {
      whereConditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.description, `%${search}%`),
          like(products.sku, `%${search}%`)
        )!
      );
    }

    if (minPrice !== undefined) {
      whereConditions.push(gte(products.price, minPrice));
    }

    if (maxPrice !== undefined) {
      whereConditions.push(lte(products.price, maxPrice));
    }

    if (inStock === true) {
      whereConditions.push(
        sql`${products.quantity} > ${products.reservedQuantity}`
      );
    }

    if (featured === true) {
      whereConditions.push(eq(products.isFeatured, true));
    }

    // Build order by
    let orderBy;
    switch (sort) {
      case "name":
        orderBy = order === "asc" ? asc(products.name) : desc(products.name);
        break;
      case "price":
        orderBy = order === "asc" ? asc(products.price) : desc(products.price);
        break;
      case "updated":
        orderBy = order === "asc" ? asc(products.updatedAt) : desc(products.updatedAt);
        break;
      case "popularity":
        orderBy = desc(products.purchaseCount);
        break;
      case "rating":
        orderBy = desc(products.rating);
        break;
      case "created":
      default:
        orderBy = order === "asc" ? asc(products.createdAt) : desc(products.createdAt);
        break;
    }

    // Get products with category
    const productsQuery = db
      .select()
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...whereConditions));

    const [productsResult, [{ count }]] = await Promise.all([
      productsQuery,
      countQuery,
    ]);

    // Format results
    const formattedProducts = productsResult.map((row) => ({
      ...row.products,
      category: row.product_categories,
      // Hide prices for non-members
      price: isMember ? row.products.price : null,
      comparePrice: isMember ? row.products.comparePrice : null,
      costPrice: undefined, // Never expose cost price to public
    })) as ProductWithCategory[];

    return {
      success: true,
      data: {
        products: formattedProducts,
        total: count,
        page,
        limit,
        hasMore: offset + limit < count,
      },
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      success: false,
      error: "Failed to fetch products",
    };
  }
}

export async function getProductBySlug(
  slug: string
): Promise<ActionResult<ProductWithCategory | null>> {
  try {
    const isMember = await checkMembershipAccess();

    const [result] = await db
      .select()
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(
        and(
          eq(products.slug, slug),
          eq(products.status, "active"),
          eq(products.isVisible, true),
          isNull(products.archivedAt)
        )
      )
      .limit(1);

    if (!result) {
      return {
        success: true,
        data: null,
      };
    }

    // Increment view count
    await db
      .update(products)
      .set({ viewCount: sql`${products.viewCount} + 1` })
      .where(eq(products.id, result.products.id));

    const product: ProductWithCategory = {
      ...result.products,
      category: result.product_categories,
      // Hide prices for non-members
      price: isMember ? result.products.price : null,
      comparePrice: isMember ? result.products.comparePrice : null,
      costPrice: undefined, // Never expose cost price
    };

    return {
      success: true,
      data: product,
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return {
      success: false,
      error: "Failed to fetch product",
    };
  }
}

export async function getCategories(): Promise<
  ActionResult<ProductCategory[]>
> {
  try {
    const categories = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.isActive, true))
      .orderBy(asc(productCategories.sortOrder), asc(productCategories.name));

    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      error: "Failed to fetch categories",
    };
  }
}

export async function getFeaturedProducts(
  limit = 8
): Promise<ActionResult<ProductListItem[]>> {
  try {
    const isMember = await checkMembershipAccess();

    const featuredProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        comparePrice: products.comparePrice,
        imageUrl: products.imageUrl,
        status: products.status,
        quantity: products.quantity,
        isFeatured: products.isFeatured,
        isNew: products.isNew,
        productType: products.productType,
        weight: products.weight,
        potency: products.potency,
        strain: products.strain,
        shortDescription: products.shortDescription,
      })
      .from(products)
      .where(
        and(
          eq(products.status, "active"),
          eq(products.isVisible, true),
          eq(products.isFeatured, true),
          isNull(products.archivedAt)
        )
      )
      .orderBy(desc(products.createdAt))
      .limit(limit);

    // Hide prices for non-members
    const formattedProducts = featuredProducts.map((p) => ({
      ...p,
      price: isMember ? p.price : null,
      comparePrice: isMember ? p.comparePrice : null,
    })) as ProductListItem[];

    return {
      success: true,
      data: formattedProducts,
    };
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return {
      success: false,
      error: "Failed to fetch featured products",
    };
  }
}

// ====================================
// ADMIN ACTIONS (FOR PRODUCT MANAGEMENT)
// ====================================

export async function createProduct(
  data: CreateProductInput
): Promise<ActionResult<Product>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Check permissions
    if (user.role === "viewer") {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    // Validate input
    const validatedData = createProductSchema.parse(data);

    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if slug already exists
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (existingProduct) {
      return {
        success: false,
        error: "A product with this slug already exists",
      };
    }

    // Create product
    const [newProduct] = await db
      .insert(products)
      .values({
        ...validatedData,
        slug,
        createdBy: user.id,
        updatedBy: user.id,
        publishedAt: validatedData.status === "active" ? new Date() : undefined,
      } as NewProduct)
      .returning();

    // Update category product count
    await db
      .update(productCategories)
      .set({
        productCount: sql`${productCategories.productCount} + 1`,
      })
      .where(eq(productCategories.id, newProduct.categoryId));

    // Create audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "create",
      resource: "product",
      resourceId: newProduct.id,
      details: { productName: newProduct.name },
      ipAddress: "server-action",
      userAgent: "server-action",
    });

    // Revalidate cache
    revalidatePath("/specials");
    revalidatePath("/admin/products");

    return {
      success: true,
      data: newProduct,
    };
  } catch (error) {
    console.error("Error creating product:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors[0].message}`,
      };
    }
    return {
      success: false,
      error: "Failed to create product",
    };
  }
}

export async function updateProduct(
  id: string,
  data: UpdateProductInput
): Promise<ActionResult<Product>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Check permissions
    if (user.role === "viewer") {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    // Validate input
    const validatedData = updateProductSchema.parse(data);

    // Check if product exists
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existingProduct) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    // Update product
    const [updatedProduct] = await db
      .update(products)
      .set({
        ...validatedData,
        updatedBy: user.id,
        updatedAt: new Date(),
        publishedAt:
          validatedData.status === "active" && !existingProduct.publishedAt
            ? new Date()
            : existingProduct.publishedAt,
      })
      .where(eq(products.id, id))
      .returning();

    // Update category product counts if category changed
    if (validatedData.categoryId && validatedData.categoryId !== existingProduct.categoryId) {
      // Decrement old category
      await db
        .update(productCategories)
        .set({
          productCount: sql`GREATEST(${productCategories.productCount} - 1, 0)`,
        })
        .where(eq(productCategories.id, existingProduct.categoryId));

      // Increment new category
      await db
        .update(productCategories)
        .set({
          productCount: sql`${productCategories.productCount} + 1`,
        })
        .where(eq(productCategories.id, validatedData.categoryId));
    }

    // Create audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "update",
      resource: "product",
      resourceId: id,
      details: {
        productName: updatedProduct.name,
        changes: validatedData,
      },
      ipAddress: "server-action",
      userAgent: "server-action",
    });

    // Revalidate cache
    revalidatePath("/specials");
    revalidatePath(`/specials/${existingProduct.slug}`);
    revalidatePath("/admin/products");

    return {
      success: true,
      data: updatedProduct,
    };
  } catch (error) {
    console.error("Error updating product:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors[0].message}`,
      };
    }
    return {
      success: false,
      error: "Failed to update product",
    };
  }
}

export async function updateProductPrice(
  productId: string,
  newPrice: number,
  reason?: string
): Promise<ActionResult<Product>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Check permissions
    if (user.role === "viewer") {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    // Get current product
    const [currentProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!currentProduct) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    // Create price history entry
    const priceHistoryEntry: NewPriceHistory = {
      productId,
      productName: currentProduct.name,
      productSku: currentProduct.sku,
      oldPrice: currentProduct.price,
      newPrice,
      priceDifference: newPrice - currentProduct.price,
      percentageChange: ((newPrice - currentProduct.price) / currentProduct.price) * 100,
      reason: reason || "Manual price update",
      changeType: "manual",
      changedBy: user.id,
      changedByName: user.name,
      changedByRole: user.role,
      effectiveFrom: new Date(),
    };

    // Start transaction
    await db.transaction(async (tx) => {
      // Insert price history
      await tx.insert(priceHistory).values(priceHistoryEntry);

      // Update product price
      await tx
        .update(products)
        .set({
          price: newPrice,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));
    });

    // Get updated product
    const [updatedProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    // Create audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "update",
      resource: "product_price",
      resourceId: productId,
      details: {
        productName: currentProduct.name,
        oldPrice: currentProduct.price,
        newPrice,
        reason: reason || "Manual price update",
      },
      ipAddress: "server-action",
      userAgent: "server-action",
    });

    // Revalidate cache
    revalidatePath("/specials");
    revalidatePath(`/specials/${currentProduct.slug}`);
    revalidatePath("/admin/products");

    return {
      success: true,
      data: updatedProduct,
    };
  } catch (error) {
    console.error("Error updating product price:", error);
    return {
      success: false,
      error: "Failed to update product price",
    };
  }
}

export async function deleteProduct(
  id: string
): Promise<ActionResult<Product>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Check permissions (only admins can delete)
    if (user.role !== "super_admin" && user.role !== "admin") {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    // Get product
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existingProduct) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    // Soft delete (archive) the product
    const [archivedProduct] = await db
      .update(products)
      .set({
        status: "archived",
        isVisible: false,
        archivedAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    // Update category product count
    await db
      .update(productCategories)
      .set({
        productCount: sql`GREATEST(${productCategories.productCount} - 1, 0)`,
      })
      .where(eq(productCategories.id, existingProduct.categoryId));

    // Create audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "delete",
      resource: "product",
      resourceId: id,
      details: {
        productName: existingProduct.name,
        archived: true,
      },
      ipAddress: "server-action",
      userAgent: "server-action",
    });

    // Revalidate cache
    revalidatePath("/specials");
    revalidatePath(`/specials/${existingProduct.slug}`);
    revalidatePath("/admin/products");

    return {
      success: true,
      data: archivedProduct,
    };
  } catch (error) {
    console.error("Error deleting product:", error);
    return {
      success: false,
      error: "Failed to delete product",
    };
  }
}

export async function updateProductInventory(
  productId: string,
  quantity: number,
  reason: string,
  movementType: "addition" | "removal" | "adjustment" = "adjustment"
): Promise<ActionResult<Product>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Check permissions
    if (user.role === "viewer") {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    // Get current product
    const [currentProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!currentProduct) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    // Calculate new quantity
    let newQuantity: number;
    let movementQuantity: number;

    if (movementType === "adjustment") {
      newQuantity = quantity;
      movementQuantity = quantity - currentProduct.quantity;
    } else if (movementType === "addition") {
      newQuantity = currentProduct.quantity + quantity;
      movementQuantity = quantity;
    } else {
      newQuantity = Math.max(0, currentProduct.quantity - quantity);
      movementQuantity = -quantity;
    }

    // Create inventory movement record
    const inventoryMovement: NewInventoryMovement = {
      productId,
      movementType,
      quantity: movementQuantity,
      previousQuantity: currentProduct.quantity,
      newQuantity,
      reason,
      performedBy: user.id,
    };

    // Start transaction
    await db.transaction(async (tx) => {
      // Insert inventory movement
      await tx.insert(inventoryMovements).values(inventoryMovement);

      // Update product quantity and status
      const updates: Partial<Product> = {
        quantity: newQuantity,
        updatedBy: user.id,
        updatedAt: new Date(),
      };

      // Update status based on quantity
      if (newQuantity === 0 && currentProduct.trackQuantity) {
        updates.status = "out_of_stock";
      } else if (currentProduct.status === "out_of_stock" && newQuantity > 0) {
        updates.status = "active";
      }

      await tx.update(products).set(updates).where(eq(products.id, productId));
    });

    // Get updated product
    const [updatedProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    // Create audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "update",
      resource: "product_inventory",
      resourceId: productId,
      details: {
        productName: currentProduct.name,
        previousQuantity: currentProduct.quantity,
        newQuantity,
        movementType,
        reason,
      },
      ipAddress: "server-action",
      userAgent: "server-action",
    });

    // Check for low stock alert
    if (
      currentProduct.lowStockThreshold &&
      newQuantity <= currentProduct.lowStockThreshold &&
      newQuantity > 0
    ) {
      console.log(
        `LOW STOCK ALERT: ${currentProduct.name} has only ${newQuantity} units left`
      );
      // Here you could trigger notifications, emails, etc.
    }

    // Revalidate cache
    revalidatePath("/specials");
    revalidatePath(`/specials/${currentProduct.slug}`);
    revalidatePath("/admin/products");

    return {
      success: true,
      data: updatedProduct,
    };
  } catch (error) {
    console.error("Error updating product inventory:", error);
    return {
      success: false,
      error: "Failed to update product inventory",
    };
  }
}

// ====================================
// SEARCH/FILTER ACTIONS
// ====================================

export async function searchProducts(
  query: string
): Promise<ActionResult<ProductListItem[]>> {
  try {
    const isMember = await checkMembershipAccess();

    const searchResults = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        comparePrice: products.comparePrice,
        imageUrl: products.imageUrl,
        status: products.status,
        quantity: products.quantity,
        isFeatured: products.isFeatured,
        isNew: products.isNew,
        productType: products.productType,
        weight: products.weight,
        potency: products.potency,
        strain: products.strain,
        shortDescription: products.shortDescription,
      })
      .from(products)
      .where(
        and(
          eq(products.status, "active"),
          eq(products.isVisible, true),
          isNull(products.archivedAt),
          or(
            like(products.name, `%${query}%`),
            like(products.description, `%${query}%`),
            like(products.sku, `%${query}%`),
            like(products.strain, `%${query}%`)
          )!
        )
      )
      .orderBy(desc(products.rating), desc(products.purchaseCount))
      .limit(10);

    // Hide prices for non-members
    const formattedResults = searchResults.map((p) => ({
      ...p,
      price: isMember ? p.price : null,
      comparePrice: isMember ? p.comparePrice : null,
    })) as ProductListItem[];

    return {
      success: true,
      data: formattedResults,
    };
  } catch (error) {
    console.error("Error searching products:", error);
    return {
      success: false,
      error: "Failed to search products",
    };
  }
}

export async function getProductsByCategory(
  categorySlug: string
): Promise<ActionResult<ProductListItem[]>> {
  try {
    const isMember = await checkMembershipAccess();

    // Find category
    const [category] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.slug, categorySlug))
      .limit(1);

    if (!category) {
      return {
        success: true,
        data: [],
      };
    }

    // Get products in category
    const categoryProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        comparePrice: products.comparePrice,
        imageUrl: products.imageUrl,
        status: products.status,
        quantity: products.quantity,
        isFeatured: products.isFeatured,
        isNew: products.isNew,
        productType: products.productType,
        weight: products.weight,
        potency: products.potency,
        strain: products.strain,
        shortDescription: products.shortDescription,
      })
      .from(products)
      .where(
        and(
          eq(products.categoryId, category.id),
          eq(products.status, "active"),
          eq(products.isVisible, true),
          isNull(products.archivedAt)
        )
      )
      .orderBy(asc(products.sortVariantOrder), asc(products.name));

    // Hide prices for non-members
    const formattedProducts = categoryProducts.map((p) => ({
      ...p,
      price: isMember ? p.price : null,
      comparePrice: isMember ? p.comparePrice : null,
    })) as ProductListItem[];

    return {
      success: true,
      data: formattedProducts,
    };
  } catch (error) {
    console.error("Error fetching category products:", error);
    return {
      success: false,
      error: "Failed to fetch category products",
    };
  }
}

// ====================================
// ADMIN DASHBOARD ACTIONS
// ====================================

export async function getProductStats(): Promise<
  ActionResult<{
    totalProducts: number;
    activeProducts: number;
    outOfStock: number;
    lowStock: number;
    featuredProducts: number;
    totalValue: number;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    const stats = await db
      .select({
        totalProducts: sql<number>`count(*)`,
        activeProducts: sql<number>`count(*) filter (where status = 'active')`,
        outOfStock: sql<number>`count(*) filter (where quantity = 0 and track_quantity = true)`,
        lowStock: sql<number>`count(*) filter (where quantity > 0 and quantity <= low_stock_threshold and track_quantity = true)`,
        featuredProducts: sql<number>`count(*) filter (where is_featured = true)`,
        totalValue: sql<number>`COALESCE(sum(quantity * cost_price), 0)`,
      })
      .from(products)
      .where(isNull(products.archivedAt));

    return {
      success: true,
      data: stats[0],
    };
  } catch (error) {
    console.error("Error fetching product stats:", error);
    return {
      success: false,
      error: "Failed to fetch product statistics",
    };
  }
}

// ====================================
// BULK ACTIONS
// ====================================

export async function bulkUpdateProductStatus(
  productIds: string[],
  status: string
): Promise<ActionResult<{ updated: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    if (user.role === "viewer") {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    // Update products
    await db
      .update(products)
      .set({
        status: status as any,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(inArray(products.id, productIds));

    // Create audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "bulk_update",
      resource: "product_status",
      details: {
        productIds,
        newStatus: status,
        count: productIds.length,
      },
      ipAddress: "server-action",
      userAgent: "server-action",
    });

    // Revalidate cache
    revalidatePath("/admin/products");
    revalidatePath("/specials");

    return {
      success: true,
      data: { updated: productIds.length },
    };
  } catch (error) {
    console.error("Error bulk updating product status:", error);
    return {
      success: false,
      error: "Failed to update product status",
    };
  }
}

export async function bulkUpdateProductPrices(
  productIds: string[],
  changeType: "percentage" | "fixed",
  changeValue: number,
  reason: string
): Promise<ActionResult<{ updated: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    if (user.role === "viewer") {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    // Get current products
    const currentProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    // Calculate new prices and create history entries
    const priceHistoryEntries: NewPriceHistory[] = [];
    const updates: { id: string; newPrice: number }[] = [];

    for (const product of currentProducts) {
      let newPrice: number;

      if (changeType === "percentage") {
        newPrice = Math.round(product.price * (1 + changeValue / 100));
      } else {
        newPrice = Math.round(product.price + changeValue * 100); // Convert to cents
      }

      newPrice = Math.max(0, newPrice); // Ensure non-negative

      updates.push({ id: product.id, newPrice });

      priceHistoryEntries.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        oldPrice: product.price,
        newPrice,
        priceDifference: newPrice - product.price,
        percentageChange: product.price > 0
          ? ((newPrice - product.price) / product.price) * 100
          : 0,
        reason,
        changeType: "bulk_update",
        changedBy: user.id,
        changedByName: user.name,
        changedByRole: user.role,
        effectiveFrom: new Date(),
      });
    }

    // Perform updates in transaction
    await db.transaction(async (tx) => {
      // Insert price history
      if (priceHistoryEntries.length > 0) {
        await tx.insert(priceHistory).values(priceHistoryEntries);
      }

      // Update each product
      for (const update of updates) {
        await tx
          .update(products)
          .set({
            price: update.newPrice,
            updatedBy: user.id,
            updatedAt: new Date(),
          })
          .where(eq(products.id, update.id));
      }
    });

    // Create audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "bulk_update",
      resource: "product_prices",
      details: {
        productIds,
        changeType,
        changeValue,
        reason,
        count: productIds.length,
      },
      ipAddress: "server-action",
      userAgent: "server-action",
    });

    // Revalidate cache
    revalidatePath("/admin/products");
    revalidatePath("/specials");

    return {
      success: true,
      data: { updated: updates.length },
    };
  } catch (error) {
    console.error("Error bulk updating product prices:", error);
    return {
      success: false,
      error: "Failed to update product prices",
    };
  }
}

export async function bulkArchiveProducts(
  productIds: string[]
): Promise<ActionResult<{ archived: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    if (user.role !== "super_admin" && user.role !== "admin") {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    // Archive products
    await db
      .update(products)
      .set({
        status: "archived",
        isVisible: false,
        archivedAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(inArray(products.id, productIds));

    // Create audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "bulk_archive",
      resource: "products",
      details: {
        productIds,
        count: productIds.length,
      },
      ipAddress: "server-action",
      userAgent: "server-action",
    });

    // Revalidate cache
    revalidatePath("/admin/products");
    revalidatePath("/specials");

    return {
      success: true,
      data: { archived: productIds.length },
    };
  } catch (error) {
    console.error("Error bulk archiving products:", error);
    return {
      success: false,
      error: "Failed to archive products",
    };
  }
}

export async function duplicateProduct(
  productId: string,
  newName?: string
): Promise<ActionResult<Product>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    if (user.role === "viewer") {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    // Get original product
    const [original] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!original) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    // Create new product
    const duplicateName = newName || `${original.name} (Copy)`;
    const duplicateSlug = generateSlug(duplicateName);

    const newProduct: NewProduct = {
      ...original,
      id: undefined as any, // Let DB generate new ID
      name: duplicateName,
      slug: duplicateSlug,
      sku: original.sku ? `${original.sku}-COPY` : undefined,
      status: "draft",
      createdBy: user.id,
      updatedBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: undefined,
      archivedAt: null,
    };

    const [duplicated] = await db
      .insert(products)
      .values(newProduct)
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "duplicate",
      resource: "product",
      resourceId: duplicated.id,
      details: {
        originalId: productId,
        originalName: original.name,
        newName: duplicateName,
      },
      ipAddress: "server-action",
      userAgent: "server-action",
    });

    // Revalidate cache
    revalidatePath("/admin/products");

    return {
      success: true,
      data: duplicated,
    };
  } catch (error) {
    console.error("Error duplicating product:", error);
    return {
      success: false,
      error: "Failed to duplicate product",
    };
  }
}