#!/usr/bin/env tsx

import {
  getProductIcon,
  getProductTypeLabel,
  getStrainType,
  getStrainTypeLabel,
  iconVariations,
  typeColors,
} from "../src/lib/product-icons";

// Test product IDs
const testProducts = [
  { id: "prod_001", type: "flower", strain: "Blue Dream Sativa" },
  { id: "prod_002", type: "flower", strain: "OG Kush Indica" },
  { id: "prod_003", type: "edible", strain: null },
  { id: "prod_004", type: "vape", strain: "Hybrid Blend" },
  { id: "prod_005", type: "concentrate", strain: "Sativa Shatter" },
  { id: "prod_006", type: "pre_roll", strain: "Indica Pre-roll" },
  { id: "prod_007", type: "accessory", strain: null },
  { id: "prod_008", type: "flower", strain: "Purple Haze Sativa" },
  { id: "prod_009", type: "edible", strain: null },
  { id: "prod_010", type: "vape", strain: "Hybrid Cartridge" },
];

console.log("🎨 Testing Product Icon System\n");
console.log("=" .repeat(60));

// Test icon variety
console.log("\n📦 Icon Variations per Product Type:");
console.log("-".repeat(40));
Object.entries(iconVariations).forEach(([type, icons]) => {
  console.log(`${type.padEnd(12)} : ${icons.length} variations`);
});

// Test consistent icon assignment
console.log("\n🔄 Testing Consistent Icon Assignment:");
console.log("-".repeat(40));
testProducts.forEach((product) => {
  const Icon = getProductIcon(product.type, product.id);
  const typeLabel = getProductTypeLabel(product.type);
  const strainType = product.strain ? getStrainType(product.strain) : null;
  const strainLabel = product.strain ? getStrainTypeLabel(product.strain) : "N/A";
  const color = typeColors[product.type]?.hex || "#ffffff";

  console.log(`\n${product.id}:`);
  console.log(`  Type: ${typeLabel} (${product.type})`);
  console.log(`  Icon: [Lucide Icon Component]`);
  console.log(`  Color: ${color}`);
  console.log(`  Strain: ${strainLabel} ${strainType ? `(${strainType})` : ""}`);
});

// Verify consistency
console.log("\n✅ Consistency Check:");
console.log("-".repeat(40));
const consistencyTest = testProducts.map((product) => {
  const icon1 = getProductIcon(product.type, product.id);
  const icon2 = getProductIcon(product.type, product.id);
  const icon3 = getProductIcon(product.type, product.id);

  return {
    id: product.id,
    consistent: icon1 === icon2 && icon2 === icon3,
    iconName: "[Lucide Icon]",
  };
});

consistencyTest.forEach((test) => {
  console.log(`${test.id}: ${test.consistent ? "✅ Consistent" : "❌ Inconsistent"} - ${test.iconName}`);
});

// Test color system
console.log("\n🎨 Color System:");
console.log("-".repeat(40));
Object.entries(typeColors).forEach(([type, colors]) => {
  console.log(`\n${type}:`);
  console.log(`  Text: ${colors.text}`);
  console.log(`  Background: ${colors.bg}`);
  console.log(`  Gradient: ${colors.gradient}`);
  console.log(`  Shadow: ${colors.shadow}`);
  console.log(`  Hex: ${colors.hex}`);
});

console.log("\n" + "=".repeat(60));
console.log("✨ Product Icon System Test Complete!");
console.log("=" .repeat(60));