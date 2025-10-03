import { NextRequest, NextResponse } from "next/server";
import { getProducts, getCategories, getFeaturedProducts } from "@/app/actions/products";

export async function GET(req: NextRequest) {
  try {
    // Test fetching categories
    const categoriesResult = await getCategories();

    // Test fetching products
    const productsResult = await getProducts({ limit: 5 });

    // Test fetching featured products
    const featuredResult = await getFeaturedProducts(3);

    const response = {
      success: true,
      tests: {
        categories: categoriesResult.success
          ? { success: true, count: categoriesResult.data.length, data: categoriesResult.data }
          : { success: false, error: categoriesResult.error },

        products: productsResult.success
          ? { success: true, count: productsResult.data.total, sample: productsResult.data.products.slice(0, 3) }
          : { success: false, error: productsResult.error },

        featured: featuredResult.success
          ? { success: true, count: featuredResult.data.length, data: featuredResult.data }
          : { success: false, error: featuredResult.error },
      },
      summary: {
        totalCategories: categoriesResult.success ? categoriesResult.data.length : 0,
        totalProducts: productsResult.success ? productsResult.data.total : 0,
        featuredProducts: featuredResult.success ? featuredResult.data.length : 0,
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error testing products:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}