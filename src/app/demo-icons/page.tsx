import React from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import type { ProductWithCategory } from "@/types/products";

// Demo products showcasing all product types with various strains
const demoProducts: ProductWithCategory[] = [
  {
    id: "demo_001",
    name: "Blue Dream Premium Flower",
    slug: "blue-dream-premium",
    productType: "flower",
    description: "Premium indoor-grown Blue Dream with exceptional terpene profile",
    shortDescription: "Uplifting sativa-dominant hybrid",
    price: 350,
    comparePrice: 450,
    quantity: 50,
    weight: "3.5g",
    potency: "THC: 22%",
    strain: "Blue Dream Sativa",
    isNew: true,
    isFeatured: false,
    category: {
      id: "cat_flower",
      name: "Flower",
      slug: "flower",
      description: "Premium cannabis flower",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo_002",
    name: "OG Kush Indica",
    slug: "og-kush-indica",
    productType: "flower",
    description: "Classic OG Kush with heavy indica effects",
    shortDescription: "Relaxing evening strain",
    price: 380,
    comparePrice: 480,
    quantity: 30,
    weight: "3.5g",
    potency: "THC: 25%",
    strain: "OG Kush Indica",
    isNew: false,
    isFeatured: true,
    category: {
      id: "cat_flower",
      name: "Flower",
      slug: "flower",
      description: "Premium cannabis flower",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo_003",
    name: "Strawberry Gummies",
    slug: "strawberry-gummies",
    productType: "edible",
    description: "Delicious strawberry-flavored THC gummies",
    shortDescription: "10mg THC per gummy",
    price: 150,
    comparePrice: 200,
    quantity: 100,
    weight: "100g",
    potency: "100mg Total",
    strain: null,
    isNew: true,
    isFeatured: false,
    category: {
      id: "cat_edibles",
      name: "Edibles",
      slug: "edibles",
      description: "Cannabis-infused edibles",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo_004",
    name: "Hybrid Vape Cartridge",
    slug: "hybrid-vape-cart",
    productType: "vape",
    description: "Premium distillate vape cartridge with natural terpenes",
    shortDescription: "Smooth and potent",
    price: 450,
    comparePrice: 550,
    quantity: 25,
    weight: "1g",
    potency: "THC: 85%",
    strain: "Gelato Hybrid",
    isNew: false,
    isFeatured: true,
    category: {
      id: "cat_vapes",
      name: "THC Vapes",
      slug: "thc-vapes",
      description: "Vape cartridges and pens",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo_005",
    name: "Live Resin Concentrate",
    slug: "live-resin",
    productType: "concentrate",
    description: "Premium live resin extracted from fresh-frozen cannabis",
    shortDescription: "Full spectrum extract",
    price: 600,
    comparePrice: 750,
    quantity: 15,
    weight: "1g",
    potency: "THC: 78%",
    strain: "Purple Haze Sativa",
    isNew: true,
    isFeatured: true,
    category: {
      id: "cat_concentrates",
      name: "Concentrates",
      slug: "concentrates",
      description: "Cannabis concentrates and extracts",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo_006",
    name: "King Size Pre-Roll",
    slug: "king-size-preroll",
    productType: "pre_roll",
    description: "King size pre-rolled joint with premium flower",
    shortDescription: "Ready to smoke",
    price: 120,
    comparePrice: 150,
    quantity: 40,
    weight: "1.5g",
    potency: "THC: 20%",
    strain: "Wedding Cake Indica",
    isNew: false,
    isFeatured: false,
    category: {
      id: "cat_prerolls",
      name: "Pre-rolls",
      slug: "pre-rolls",
      description: "Pre-rolled joints",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo_007",
    name: "Premium Glass Bong",
    slug: "glass-bong",
    productType: "accessory",
    description: "High-quality borosilicate glass water pipe",
    shortDescription: "Smooth hits every time",
    price: 850,
    comparePrice: 1000,
    quantity: 10,
    weight: "500g",
    potency: null,
    strain: null,
    isNew: false,
    isFeatured: false,
    category: {
      id: "cat_accessories",
      name: "Accessories",
      slug: "accessories",
      description: "Smoking accessories",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo_008",
    name: "Chocolate Bar Edible",
    slug: "chocolate-bar",
    productType: "edible",
    description: "Dark chocolate infused with premium cannabis oil",
    shortDescription: "Rich and potent",
    price: 180,
    comparePrice: 220,
    quantity: 60,
    weight: "100g",
    potency: "200mg THC",
    strain: null,
    isNew: false,
    isFeatured: false,
    category: {
      id: "cat_edibles",
      name: "Edibles",
      slug: "edibles",
      description: "Cannabis-infused edibles",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo_009",
    name: "Amnesia Haze",
    slug: "amnesia-haze",
    productType: "flower",
    description: "Award-winning sativa strain with citrus notes",
    shortDescription: "Energizing and creative",
    price: 420,
    comparePrice: 500,
    quantity: 20,
    weight: "3.5g",
    potency: "THC: 24%",
    strain: "Amnesia Haze Sativa",
    isNew: true,
    isFeatured: false,
    category: {
      id: "cat_flower",
      name: "Flower",
      slug: "flower",
      description: "Premium cannabis flower",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo_010",
    name: "Disposable Vape Pen",
    slug: "disposable-vape",
    productType: "vape",
    description: "Convenient all-in-one disposable vape pen",
    shortDescription: "No charging required",
    price: 350,
    comparePrice: 400,
    quantity: 35,
    weight: "0.5g",
    potency: "THC: 88%",
    strain: "Jack Herer Hybrid",
    isNew: false,
    isFeatured: false,
    category: {
      id: "cat_vapes",
      name: "THC Vapes",
      slug: "thc-vapes",
      description: "Vape cartridges and pens",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function DemoIconsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Product Icon System Demo
          </h1>
          <p className="text-zinc-400 mt-2">
            Showcasing creative product icons with varied designs, colors, and animations
          </p>
        </div>
      </div>

      {/* Key Features */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">✨ Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div>
                <strong>Icon Variety:</strong> Each product type has multiple icon variations
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div>
                <strong>Color Coding:</strong> Consistent colors for product types
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div>
                <strong>Strain Indicators:</strong> Secondary icons show strain types
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div>
                <strong>Animations:</strong> Pulse for new, glow for featured
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div>
                <strong>Tooltips:</strong> Hover for detailed information
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div>
                <strong>Responsive:</strong> Icons scale for different devices
              </div>
            </div>
          </div>
        </div>

        {/* Product Type Legend */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">🎨 Product Type Colors</h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm">Flower</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-pink-500"></div>
              <span className="text-sm">Edible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-violet-500"></div>
              <span className="text-sm">Vape</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-cyan-500"></div>
              <span className="text-sm">Concentrate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500"></div>
              <span className="text-sm">Pre-roll</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-500"></div>
              <span className="text-sm">Accessory</span>
            </div>
          </div>
        </div>

        {/* Demo Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {demoProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isMember={true}
              onAddToCart={(p) => console.log("Demo add to cart:", p)}
            />
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">💡 Interactive Features</h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>• <strong>Hover</strong> over product type icons to see tooltips with detailed information</li>
            <li>• <strong>Notice</strong> how each product gets a unique icon from the variation pool</li>
            <li>• <strong>Observe</strong> the pulse animation on new products (Blue Dream, Strawberry Gummies)</li>
            <li>• <strong>See</strong> the glow effect on featured products (OG Kush, Hybrid Vape, Live Resin)</li>
            <li>• <strong>Check</strong> strain badges showing Sativa (sun), Indica (moon), or Hybrid (cloud) icons</li>
            <li>• <strong>Resize</strong> your browser to see responsive icon scaling</li>
          </ul>
        </div>
      </div>
    </div>
  );
}