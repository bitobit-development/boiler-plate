import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Prices in cents (R250 = 25000 cents)
const priceUpdates = [
  // Pre-rolls
  { name: "Greendoor x2", price: 25000 }, // R250
  { name: "Indoor x1", price: 30000 }, // R300
  { name: "Indoor x2", price: 50000, comparePrice: 60000 }, // R500 (was R600)
  { name: "Indoor x3", price: 70000, comparePrice: 90000 }, // R700 (was R900)
  { name: "Indoor x4", price: 90000, comparePrice: 120000 }, // R900 (was R1200)
  { name: "Indoor x5", price: 100000, comparePrice: 150000 }, // R1000 (was R1500)
  { name: "Indoor x10", price: 150000, comparePrice: 300000 }, // R1500 (was R3000)

  // Dabs
  { name: "Buddah Hit", price: 30000 }, // R300
  { name: "Diamondz Hit", price: 45000, comparePrice: 50000 }, // R450 (was R500)

  // Edibles
  { name: "40MG Edible", price: 8000 }, // R80
  { name: "80MG Edible", price: 16000 }, // R160

  // THC Vapes
  { name: "10th Planet", price: 80000 }, // R800
  { name: "Cannabis Collective", price: 120000, comparePrice: 150000 }, // R1200 (was R1500)
];

async function updatePrices() {
  try {
    console.log("Updating product prices...\n");
    console.log("=".repeat(80));

    for (const update of priceUpdates) {
      // Find product by name
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.name, update.name))
        .limit(1);

      if (!product) {
        console.log(`❌ Product not found: ${update.name}`);
        continue;
      }

      // Update price
      await db
        .update(products)
        .set({
          price: update.price,
          comparePrice: update.comparePrice || null,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id));

      const displayPrice = `R${(update.price / 100).toFixed(0)}`;
      const compareDisplay = update.comparePrice
        ? ` (was R${(update.comparePrice / 100).toFixed(0)})`
        : "";

      console.log(`✅ Updated ${update.name}: ${displayPrice}${compareDisplay}`);
    }

    console.log("=".repeat(80));
    console.log(`\n✨ Successfully updated ${priceUpdates.length} products!`);
  } catch (error) {
    console.error("Error updating prices:", error);
  } finally {
    process.exit(0);
  }
}

updatePrices();
