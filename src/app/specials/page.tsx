import React from "react";
import { cookies } from "next/headers";
import { getProducts, getCategories } from "@/app/actions/products";
import { ProductGridWrapper } from "@/components/shop/ProductGridWrapper";
import { MembershipBanner } from "@/components/shop/MembershipBanner";
import { CategoryFilterWrapper } from "@/components/shop/CategoryFilterWrapper";
import { Badge } from "@/components/ui/badge";
import {
  Cannabis,
  Shield,
  Truck,
  Award,
  Clock,
  CheckCircle2
} from "lucide-react";

// Check membership status
async function checkMembershipStatus(): Promise<boolean> {
  const cookieStore = await cookies();
  const subscriberId = cookieStore.get("subscriber_id")?.value;
  const accessToken = cookieStore.get("access_token")?.value;

  return !!(subscriberId || accessToken);
}

interface PageProps {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    search?: string;
  }>;
}

export default async function SpecialsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Fetch data in parallel
  const [productsResponse, categoriesResponse, isMember] = await Promise.all([
    getProducts({
      category: params?.category,
      sort: params?.sort as any,
      search: params?.search,
    }),
    getCategories(),
    checkMembershipStatus(),
  ]);

  const products = productsResponse.success ? productsResponse.data.products : [];
  const categories = categoriesResponse.success ? categoriesResponse.data : [];

  // Calculate product counts per category
  const productCounts = products.reduce<Record<string, number>>((acc, product) => {
    const categorySlug = product.category?.slug || "other";
    acc[categorySlug] = (acc[categorySlug] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section with Membership Banner */}
      <MembershipBanner variant="hero" dismissible={!isMember} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 lg:py-12">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Cannabis className="h-8 w-8 text-emerald-500" />
            <h1 className="text-4xl lg:text-5xl font-bold text-white">
              Premium Cannabis Specials
            </h1>
            <Cannabis className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Discover South Africa's finest selection of cannabis products.
            {!isMember && (
              <>
                {" "}
                <span className="text-amber-400 font-semibold">
                  Subscribe to purchase - prices visible to all!
                </span>
              </>
            )}
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Badge variant="outline" className="px-4 py-2 border-zinc-700">
            <Shield className="h-4 w-4 mr-2 text-emerald-500" />
            Lab Tested
          </Badge>
          <Badge variant="outline" className="px-4 py-2 border-zinc-700">
            <Award className="h-4 w-4 mr-2 text-amber-500" />
            Premium Quality
          </Badge>
          <Badge variant="outline" className="px-4 py-2 border-zinc-700">
            <Truck className="h-4 w-4 mr-2 text-blue-500" />
            Fast Delivery
          </Badge>
          <Badge variant="outline" className="px-4 py-2 border-zinc-700">
            <Clock className="h-4 w-4 mr-2 text-purple-500" />
            Fresh Stock Daily
          </Badge>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <CategoryFilterWrapper
            categories={categories}
            productCounts={productCounts}
          />
        </div>

        {/* Products Grid */}
        <ProductGridWrapper
          products={products}
          isMember={isMember}
        />

        {/* Features Section */}
        <div className="mt-16 py-12 border-t border-zinc-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-emerald-500/10 rounded-xl">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold text-white">Quality Guaranteed</h3>
              <p className="text-zinc-400">
                All products are lab-tested and sourced from trusted local growers
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-amber-500/10 rounded-xl">
                <Award className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white">Member Benefits</h3>
              <p className="text-zinc-400">
                Exclusive pricing, early access to new products, and special rewards
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-blue-500/10 rounded-xl">
                <Truck className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-white">Discreet Delivery</h3>
              <p className="text-zinc-400">
                Fast, secure, and discreet delivery nationwide within 24-48 hours
              </p>
            </div>
          </div>
        </div>

        {/* Floating Membership Banner for non-members */}
        {!isMember && <MembershipBanner variant="floating" />}
      </div>
    </div>
  );
}

// Note: Client components are separated into their own files