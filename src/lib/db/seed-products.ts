import { db } from "./index";
import {
  productCategories,
  products,
  type NewProductCategory,
  type NewProduct,
} from "./schema/products";
import { sql } from "drizzle-orm";

/**
 * Seed initial product categories and products for the shop
 */
export async function seedProducts() {
  console.log("🌱 Starting product seeding...");

  try {
    // Start a transaction
    await db.transaction(async (tx) => {
      // Clear existing data (optional - comment out if you want to preserve existing data)
      console.log("🧹 Clearing existing product data...");
      await tx.delete(products);
      await tx.delete(productCategories);

      // ====================================
      // 1. SEED CATEGORIES
      // ====================================
      console.log("📁 Creating product categories...");

      const categoriesData: NewProductCategory[] = [
        {
          name: "Pre-rolls",
          slug: "pre-rolls",
          description: "Ready-to-smoke cannabis joints, professionally rolled for your convenience",
          iconName: "Cigarette",
          color: "#10b981", // Green
          sortOrder: 1,
          isActive: true,
          isFeatured: true,
          metaTitle: "Premium Pre-rolled Cannabis Joints | Bigg Buzz",
          metaDescription: "Shop our selection of premium pre-rolled cannabis joints. Indoor and greenhouse varieties available.",
        },
        {
          name: "Dabs",
          slug: "dabs",
          description: "Concentrated cannabis extracts for experienced users",
          iconName: "Droplet",
          color: "#f59e0b", // Amber
          sortOrder: 2,
          isActive: true,
          isFeatured: false,
          metaTitle: "Cannabis Dabs & Concentrates | Bigg Buzz",
          metaDescription: "High-quality cannabis concentrates and dabs for the discerning consumer.",
        },
        {
          name: "Edibles",
          slug: "edibles",
          description: "Cannabis-infused treats with precise THC dosing",
          iconName: "Cookie",
          color: "#8b5cf6", // Purple
          sortOrder: 3,
          isActive: true,
          isFeatured: false,
          metaTitle: "THC Edibles - Precisely Dosed Cannabis Treats | Bigg Buzz",
          metaDescription: "Enjoy our selection of precisely dosed THC edibles. 40mg and 80mg options available.",
        },
        {
          name: "THC Vapes",
          slug: "thc-vapes",
          description: "Premium vaporizer cartridges with pure cannabis oil",
          iconName: "Wind",
          color: "#3b82f6", // Blue
          sortOrder: 4,
          isActive: true,
          isFeatured: true,
          metaTitle: "THC Vape Cartridges - Premium Cannabis Oil | Bigg Buzz",
          metaDescription: "Discover our premium THC vape cartridges featuring top brands and strains.",
        },
      ];

      const insertedCategories = await tx.insert(productCategories).values(categoriesData).returning();
      console.log(`✅ Created ${insertedCategories.length} categories`);

      // Create a map for easy category lookup
      const categoryMap = new Map(
        insertedCategories.map((cat) => [cat.slug, cat.id])
      );

      // ====================================
      // 2. SEED PRODUCTS
      // ====================================
      console.log("📦 Creating products...");

      // Helper function to generate SKU
      const generateSku = (category: string, index: number): string => {
        const prefix = category.substring(0, 3).toUpperCase();
        return `${prefix}-${String(index).padStart(4, "0")}`;
      };

      // Helper function to generate slug
      const generateSlug = (name: string): string => {
        return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      };

      const productsData: NewProduct[] = [
        // ====================================
        // PRE-ROLLS
        // ====================================
        {
          name: "Greendoor x2",
          slug: generateSlug("Greendoor x2"),
          description: "Premium greenhouse-grown cannabis, expertly rolled into 2 convenient joints. Our Greendoor selection offers a smooth, balanced experience perfect for sharing or enjoying over time.",
          shortDescription: "2 premium greenhouse joints",
          categoryId: categoryMap.get("pre-rolls")!,
          sku: generateSku("pre-rolls", 1),
          productType: "pre_roll",
          price: 25000, // R250.00
          comparePrice: null,
          costPrice: 15000,
          quantity: 50,
          trackQuantity: true,
          allowBackorder: false,
          lowStockThreshold: 10,
          status: "active",
          isVisible: true,
          isFeatured: false,
          isNew: false,
          weight: "2 joints",
          potency: "Moderate THC",
          strain: "Hybrid",
          thcContent: "18.00",
          cbdContent: "0.50",
          terpenes: ["Myrcene", "Limonene"],
          effects: ["Relaxed", "Happy", "Creative"],
          flavorProfile: ["Earthy", "Pine", "Citrus"],
          imageUrl: "/images/products/greendoor-x2.jpg",
          requiresMembership: true,
          membershipTiers: ["basic", "premium", "vip"],
          supplier: "Greendoor Gardens",
          tags: ["greenhouse", "value", "hybrid"],
          metaTitle: "Greendoor x2 Pre-rolls - Greenhouse Cannabis Joints",
          metaDescription: "2 premium greenhouse-grown cannabis joints. Perfect for sharing or enjoying over time.",
          publishedAt: new Date(),
        },
        {
          name: "Indoor x1",
          slug: generateSlug("Indoor x1"),
          description: "Single premium indoor-grown cannabis joint. Cultivated under controlled conditions for maximum potency and flavor.",
          shortDescription: "1 premium indoor joint",
          categoryId: categoryMap.get("pre-rolls")!,
          sku: generateSku("pre-rolls", 2),
          productType: "pre_roll",
          price: 30000, // R300.00
          comparePrice: null,
          costPrice: 18000,
          variantOf: null,
          variantLabel: "x1",
          sortVariantOrder: 1,
          quantity: 100,
          trackQuantity: true,
          status: "active",
          isVisible: true,
          weight: "1 joint",
          potency: "High THC",
          strain: "Indica",
          thcContent: "22.00",
          cbdContent: "0.30",
          terpenes: ["Caryophyllene", "Linalool", "Myrcene"],
          effects: ["Relaxed", "Sleepy", "Happy"],
          flavorProfile: ["Sweet", "Berry", "Earthy"],
          requiresMembership: true,
          membershipTiers: ["basic", "premium", "vip"],
          supplier: "Premium Indoor Farms",
          tags: ["indoor", "premium", "indica"],
          publishedAt: new Date(),
        },
        {
          name: "Indoor x2",
          slug: generateSlug("Indoor x2"),
          description: "Twin pack of premium indoor-grown cannabis joints. Double the enjoyment with consistent quality.",
          shortDescription: "2 premium indoor joints",
          categoryId: categoryMap.get("pre-rolls")!,
          sku: generateSku("pre-rolls", 3),
          productType: "pre_roll",
          price: 50000, // R500.00
          comparePrice: 60000, // Show savings
          costPrice: 30000,
          variantLabel: "x2",
          sortVariantOrder: 2,
          quantity: 80,
          trackQuantity: true,
          status: "active",
          isVisible: true,
          isFeatured: true,
          weight: "2 joints",
          potency: "High THC",
          strain: "Indica",
          thcContent: "22.00",
          cbdContent: "0.30",
          requiresMembership: true,
          membershipTiers: ["basic", "premium", "vip"],
          supplier: "Premium Indoor Farms",
          tags: ["indoor", "premium", "indica", "value-pack"],
          publishedAt: new Date(),
        },
        {
          name: "Indoor x3",
          slug: generateSlug("Indoor x3"),
          description: "Triple pack of premium indoor cannabis joints. Perfect for weekend enjoyment or sharing with friends.",
          shortDescription: "3 premium indoor joints",
          categoryId: categoryMap.get("pre-rolls")!,
          sku: generateSku("pre-rolls", 4),
          productType: "pre_roll",
          price: 70000, // R700.00
          comparePrice: 90000,
          costPrice: 42000,
          variantLabel: "x3",
          sortVariantOrder: 3,
          quantity: 60,
          trackQuantity: true,
          status: "active",
          isVisible: true,
          weight: "3 joints",
          potency: "High THC",
          strain: "Indica",
          thcContent: "22.00",
          requiresMembership: true,
          membershipTiers: ["basic", "premium", "vip"],
          supplier: "Premium Indoor Farms",
          tags: ["indoor", "premium", "indica", "bulk"],
          publishedAt: new Date(),
        },
        {
          name: "Indoor x4",
          slug: generateSlug("Indoor x4"),
          description: "Four-pack of premium indoor cannabis joints. Stock up and save with this value pack.",
          shortDescription: "4 premium indoor joints",
          categoryId: categoryMap.get("pre-rolls")!,
          sku: generateSku("pre-rolls", 5),
          productType: "pre_roll",
          price: 90000, // R900.00
          comparePrice: 120000,
          costPrice: 54000,
          variantLabel: "x4",
          sortVariantOrder: 4,
          quantity: 40,
          trackQuantity: true,
          status: "active",
          isVisible: true,
          weight: "4 joints",
          potency: "High THC",
          strain: "Indica",
          thcContent: "22.00",
          requiresMembership: true,
          membershipTiers: ["premium", "vip"],
          supplier: "Premium Indoor Farms",
          tags: ["indoor", "premium", "indica", "bulk"],
          publishedAt: new Date(),
        },
        {
          name: "Indoor x5",
          slug: generateSlug("Indoor x5"),
          description: "Five premium indoor cannabis joints. Our most popular pack size for regular consumers.",
          shortDescription: "5 premium indoor joints",
          categoryId: categoryMap.get("pre-rolls")!,
          sku: generateSku("pre-rolls", 6),
          productType: "pre_roll",
          price: 100000, // R1000.00
          comparePrice: 150000,
          costPrice: 60000,
          variantLabel: "x5",
          sortVariantOrder: 5,
          quantity: 30,
          trackQuantity: true,
          status: "active",
          isVisible: true,
          weight: "5 joints",
          potency: "High THC",
          strain: "Indica",
          thcContent: "22.00",
          requiresMembership: true,
          membershipTiers: ["premium", "vip"],
          supplier: "Premium Indoor Farms",
          tags: ["indoor", "premium", "indica", "bulk", "popular"],
          publishedAt: new Date(),
        },
        {
          name: "Indoor x10",
          slug: generateSlug("Indoor x10"),
          description: "Mega pack of 10 premium indoor cannabis joints. Best value for regular enthusiasts.",
          shortDescription: "10 premium indoor joints",
          categoryId: categoryMap.get("pre-rolls")!,
          sku: generateSku("pre-rolls", 7),
          productType: "pre_roll",
          price: 150000, // R1500.00
          comparePrice: 300000,
          costPrice: 90000,
          variantLabel: "x10",
          sortVariantOrder: 10,
          quantity: 20,
          trackQuantity: true,
          status: "active",
          isVisible: true,
          isFeatured: true,
          weight: "10 joints",
          potency: "High THC",
          strain: "Indica",
          thcContent: "22.00",
          requiresMembership: true,
          membershipTiers: ["vip"],
          supplier: "Premium Indoor Farms",
          tags: ["indoor", "premium", "indica", "bulk", "best-value"],
          publishedAt: new Date(),
        },

        // ====================================
        // DABS
        // ====================================
        {
          name: "Buddah Hit",
          slug: generateSlug("Buddah Hit"),
          description: "Premium cannabis concentrate for the experienced user. Buddah Hit delivers a powerful, clean experience with exceptional flavor retention.",
          shortDescription: "Premium cannabis concentrate",
          categoryId: categoryMap.get("dabs")!,
          sku: generateSku("dabs", 1),
          productType: "dab",
          price: 30000, // R300.00
          comparePrice: null,
          costPrice: 18000,
          quantity: 40,
          trackQuantity: true,
          lowStockThreshold: 8,
          status: "active",
          isVisible: true,
          weight: "1g",
          potency: "Very High THC",
          strain: "Hybrid",
          thcContent: "75.00",
          cbdContent: "0.10",
          terpenes: ["Terpinolene", "Pinene", "Ocimene"],
          effects: ["Euphoric", "Energetic", "Creative"],
          flavorProfile: ["Pine", "Herbal", "Citrus"],
          requiresMembership: true,
          membershipTiers: ["premium", "vip"],
          supplier: "Concentrate Labs",
          tags: ["concentrate", "high-potency", "hybrid"],
          metaTitle: "Buddah Hit - Premium Cannabis Concentrate",
          metaDescription: "Experience the power of Buddah Hit cannabis concentrate. 75% THC content for experienced users.",
          publishedAt: new Date(),
        },
        {
          name: "Diamondz Hit",
          slug: generateSlug("Diamondz Hit"),
          description: "Ultra-premium THCA diamonds in terpene sauce. The pinnacle of cannabis extraction technology.",
          shortDescription: "THCA diamonds in terp sauce",
          categoryId: categoryMap.get("dabs")!,
          sku: generateSku("dabs", 2),
          productType: "dab",
          price: 45000, // R450.00
          comparePrice: 50000,
          costPrice: 27000,
          quantity: 25,
          trackQuantity: true,
          lowStockThreshold: 5,
          status: "active",
          isVisible: true,
          isFeatured: true,
          isNew: true,
          weight: "1g",
          potency: "Ultra High THC",
          strain: "Sativa",
          thcContent: "85.00",
          cbdContent: "0.05",
          terpenes: ["Limonene", "Caryophyllene", "Pinene", "Linalool"],
          effects: ["Euphoric", "Focused", "Uplifted", "Creative"],
          flavorProfile: ["Citrus", "Sweet", "Diesel"],
          requiresMembership: true,
          membershipTiers: ["vip"],
          supplier: "Diamond Extracts",
          tags: ["diamonds", "ultra-premium", "sativa", "new"],
          metaTitle: "Diamondz Hit - THCA Diamonds Cannabis Concentrate",
          metaDescription: "Ultra-premium THCA diamonds in terpene sauce. 85% THC content for the ultimate experience.",
          publishedAt: new Date(),
        },

        // ====================================
        // EDIBLES
        // ====================================
        {
          name: "40MG Edible",
          slug: generateSlug("40MG Edible"),
          description: "Precisely dosed cannabis edible with 40mg of THC. Perfect for moderate tolerance users seeking a controlled experience.",
          shortDescription: "40mg THC infused treat",
          categoryId: categoryMap.get("edibles")!,
          sku: generateSku("edibles", 1),
          productType: "edible",
          price: 8000, // R80.00
          comparePrice: null,
          costPrice: 4800,
          quantity: 100,
          trackQuantity: true,
          lowStockThreshold: 20,
          status: "active",
          isVisible: true,
          weight: "10g",
          potency: "40mg THC",
          thcContent: "40.00", // mg not percentage for edibles
          cbdContent: "0.00",
          effects: ["Relaxed", "Happy", "Euphoric"],
          flavorProfile: ["Sweet", "Fruity"],
          requiresMembership: true,
          membershipTiers: ["basic", "premium", "vip"],
          supplier: "Edible Innovations",
          tags: ["edible", "moderate-dose", "beginner-friendly"],
          metaTitle: "40MG THC Edible - Precisely Dosed Cannabis Treat",
          metaDescription: "Enjoy a precisely dosed 40mg THC edible. Perfect for controlled, moderate experiences.",
          publishedAt: new Date(),
        },
        {
          name: "80MG Edible",
          slug: generateSlug("80MG Edible"),
          description: "Higher potency cannabis edible with 80mg of THC. Designed for experienced users with higher tolerance.",
          shortDescription: "80mg THC infused treat",
          categoryId: categoryMap.get("edibles")!,
          sku: generateSku("edibles", 2),
          productType: "edible",
          price: 16000, // R160.00
          comparePrice: null,
          costPrice: 9600,
          quantity: 80,
          trackQuantity: true,
          lowStockThreshold: 15,
          status: "active",
          isVisible: true,
          isFeatured: false,
          weight: "20g",
          potency: "80mg THC",
          thcContent: "80.00", // mg not percentage for edibles
          cbdContent: "0.00",
          effects: ["Relaxed", "Euphoric", "Sleepy", "Happy"],
          flavorProfile: ["Sweet", "Berry", "Tropical"],
          requiresMembership: true,
          membershipTiers: ["premium", "vip"],
          supplier: "Edible Innovations",
          tags: ["edible", "high-dose", "experienced"],
          metaTitle: "80MG THC Edible - High Potency Cannabis Treat",
          metaDescription: "High potency 80mg THC edible for experienced users. Double the dose for double the experience.",
          publishedAt: new Date(),
        },

        // ====================================
        // THC VAPES
        // ====================================
        {
          name: "10th Planet",
          slug: generateSlug("10th Planet"),
          description: "Premium THC vape cartridge featuring the legendary 10th Planet strain. Known for its potent effects and exceptional flavor profile.",
          shortDescription: "Premium hybrid vape cartridge",
          categoryId: categoryMap.get("thc-vapes")!,
          sku: generateSku("vapes", 1),
          productType: "vape",
          price: 80000, // R800.00
          comparePrice: null,
          costPrice: 48000,
          quantity: 35,
          trackQuantity: true,
          lowStockThreshold: 7,
          status: "active",
          isVisible: true,
          isFeatured: true,
          weight: "1ml",
          potency: "High THC",
          strain: "Hybrid",
          thcContent: "85.00",
          cbdContent: "0.50",
          terpenes: ["Myrcene", "Caryophyllene", "Limonene", "Pinene"],
          effects: ["Relaxed", "Happy", "Euphoric", "Creative"],
          flavorProfile: ["Earthy", "Pine", "Citrus", "Spicy"],
          requiresMembership: true,
          membershipTiers: ["premium", "vip"],
          supplier: "Vape Masters",
          tags: ["vape", "cartridge", "hybrid", "premium"],
          metaTitle: "10th Planet THC Vape Cartridge - Premium Cannabis Oil",
          metaDescription: "Experience the legendary 10th Planet strain in a premium THC vape cartridge. 85% THC content.",
          labTestResults: {
            testDate: "2024-01-15",
            labName: "Cannabis Testing Lab SA",
            certificateUrl: "/lab-results/10th-planet.pdf",
          },
          publishedAt: new Date(),
        },
        {
          name: "Cannabis Collective",
          slug: generateSlug("Cannabis Collective"),
          description: "Ultra-premium THC vape cartridge from Cannabis Collective. A curated blend of the finest strains for the ultimate vaping experience.",
          shortDescription: "Ultra-premium vape cartridge",
          categoryId: categoryMap.get("thc-vapes")!,
          sku: generateSku("vapes", 2),
          productType: "vape",
          price: 120000, // R1200.00
          comparePrice: 150000,
          costPrice: 72000,
          quantity: 20,
          trackQuantity: true,
          lowStockThreshold: 5,
          status: "active",
          isVisible: true,
          isFeatured: true,
          isNew: true,
          weight: "1ml",
          potency: "Very High THC",
          strain: "Premium Blend",
          thcContent: "90.00",
          cbdContent: "0.25",
          terpenes: ["Limonene", "Linalool", "Caryophyllene", "Terpinolene", "Myrcene"],
          effects: ["Euphoric", "Uplifted", "Focused", "Energetic", "Creative"],
          flavorProfile: ["Fruity", "Sweet", "Tropical", "Citrus"],
          requiresMembership: true,
          membershipTiers: ["vip"],
          supplier: "Cannabis Collective Co.",
          tags: ["vape", "cartridge", "ultra-premium", "exclusive", "new"],
          metaTitle: "Cannabis Collective THC Vape - Ultra Premium Cannabis Oil",
          metaDescription: "The ultimate vaping experience with Cannabis Collective's ultra-premium THC cartridge. 90% THC content.",
          labTestResults: {
            testDate: "2024-01-20",
            labName: "Cannabis Testing Lab SA",
            certificateUrl: "/lab-results/cannabis-collective.pdf",
          },
          publishedAt: new Date(),
        },
      ];

      const insertedProducts = await tx.insert(products).values(productsData).returning();
      console.log(`✅ Created ${insertedProducts.length} products`);

      // ====================================
      // 3. UPDATE CATEGORY PRODUCT COUNTS
      // ====================================
      console.log("📊 Updating category product counts...");

      for (const [slug, categoryId] of categoryMap) {
        const productCount = insertedProducts.filter(p => p.categoryId === categoryId).length;
        await tx.execute(
          sql`UPDATE ${productCategories}
              SET product_count = ${productCount}
              WHERE id = ${categoryId}`
        );
      }

      console.log("✅ Category product counts updated");

    });

    console.log("🎉 Product seeding completed successfully!");

    // Log summary
    const categoryCount = await db.execute(sql`SELECT COUNT(*) as count FROM ${productCategories}`);
    const productCount = await db.execute(sql`SELECT COUNT(*) as count FROM ${products}`);

    console.log("\n📊 Summary:");
    console.log(`   - Categories created: ${categoryCount[0].count}`);
    console.log(`   - Products created: ${productCount[0].count}`);

  } catch (error) {
    console.error("❌ Error seeding products:", error);
    throw error;
  }
}

// Execute if running directly
if (require.main === module) {
  seedProducts()
    .then(() => {
      console.log("\n✨ Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Seeding failed:", error);
      process.exit(1);
    });
}