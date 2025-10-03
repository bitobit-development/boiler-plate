import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function checkProductPrices() {
  try {
    console.log("Fetching products...\n");

    const allProducts = await db
      .select({
        name: products.name,
        price: products.price,
        imageUrl: products.imageUrl,
        status: products.status,
      })
      .from(products)
      .limit(10);

    console.log("Products in database:");
    console.log("=".repeat(80));

    allProducts.forEach((product) => {
      console.log(`Name: ${product.name}`);
      console.log(`Price: ${product.price === null ? 'NULL' : `R${product.price}`}`);
      console.log(`Image URL: ${product.imageUrl || 'No image'}`);
      console.log(`Status: ${product.status}`);
      console.log("-".repeat(80));
    });

    const nullPriceCount = allProducts.filter(p => p.price === null).length;
    console.log(`\nTotal products checked: ${allProducts.length}`);
    console.log(`Products with null prices: ${nullPriceCount}`);

  } catch (error) {
    console.error("Error checking products:", error);
  } finally {
    process.exit(0);
  }
}

checkProductPrices();
