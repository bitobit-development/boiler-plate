"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Package,
  Tag,
  DollarSign,
  Archive,
  Eye,
  Cannabis,
  Image as ImageIcon,
  Search,
  Loader2,
} from "lucide-react";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validations/products";
import type { Product, ProductCategory } from "@/lib/db/schema/products";
import { createProduct, updateProduct } from "@/app/actions/products";
import { cn } from "@/lib/utils";

interface ProductFormProps {
  product?: Product;
  categories: ProductCategory[];
  mode?: "create" | "edit";
}

export function ProductForm({ product, categories, mode = "create" }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const form = useForm<CreateProductInput | UpdateProductInput>({
    resolver: zodResolver(mode === "create" ? createProductSchema : updateProductSchema),
    defaultValues: {
      name: product?.name || "",
      slug: product?.slug || "",
      description: product?.description || "",
      shortDescription: product?.shortDescription || "",
      categoryId: product?.categoryId || "",
      sku: product?.sku || "",
      productType: product?.productType || "pre_roll",
      price: product?.price || 0,
      comparePrice: product?.comparePrice || undefined,
      costPrice: product?.costPrice || undefined,
      quantity: product?.quantity || 0,
      trackQuantity: product?.trackQuantity ?? true,
      allowBackorder: product?.allowBackorder ?? false,
      lowStockThreshold: product?.lowStockThreshold || 5,
      status: product?.status || "draft",
      isVisible: product?.isVisible ?? true,
      isFeatured: product?.isFeatured ?? false,
      isNew: product?.isNew ?? false,
      weight: product?.weight || "",
      potency: product?.potency || "",
      strain: product?.strain || "",
      thcContent: product?.thcContent || undefined,
      cbdContent: product?.cbdContent || undefined,
      imageUrl: product?.imageUrl || "",
      metaTitle: product?.metaTitle || "",
      metaDescription: product?.metaDescription || "",
      requiresMembership: product?.requiresMembership ?? true,
      membershipTiers: product?.membershipTiers || ["basic"],
      supplier: product?.supplier || "",
      supplierSku: product?.supplierSku || "",
    },
  });

  const watchName = form.watch("name");
  const watchSlug = form.watch("slug");
  const watchStatus = form.watch("status");
  const watchTrackQuantity = form.watch("trackQuantity");
  const watchRequiresMembership = form.watch("requiresMembership");

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  };

  const handleNameChange = (name: string) => {
    form.setValue("name", name);
    if (mode === "create" && !watchSlug) {
      form.setValue("slug", generateSlug(name));
    }
  };

  const formatPriceDisplay = (cents: number) => {
    if (!cents) return "R0";
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const onSubmit = async (data: CreateProductInput | UpdateProductInput) => {
    setIsSubmitting(true);
    try {
      let result;
      if (mode === "create") {
        result = await createProduct(data as CreateProductInput);
      } else if (product) {
        result = await updateProduct(product.id, data as UpdateProductInput);
      }

      if (result?.success) {
        toast.success(mode === "create" ? "Product created successfully" : "Product updated successfully");
        router.push("/admin/products");
        router.refresh();
      } else {
        toast.error(result?.error || "Failed to save product");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="cannabis">Cannabis</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the basic details about your product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Premium OG Kush Pre-Roll"
                          {...field}
                          onChange={(e) => handleNameChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input placeholder="premium-og-kush" {...field} />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue("slug", generateSlug(watchName))}
                          >
                            Generate
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        URL-friendly version of the product name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief product description for listings..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Displayed in product cards and search results
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed product description..."
                          className="resize-none"
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pre_roll">Pre-roll</SelectItem>
                            <SelectItem value="dab">Dab</SelectItem>
                            <SelectItem value="edible">Edible</SelectItem>
                            <SelectItem value="vape">Vape</SelectItem>
                            <SelectItem value="flower">Flower</SelectItem>
                            <SelectItem value="concentrate">Concentrate</SelectItem>
                            <SelectItem value="accessory">Accessory</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="PRE-OGK-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="grid gap-6 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="isVisible"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Visible</FormLabel>
                          <FormDescription className="text-xs">
                            Show in shop
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Featured</FormLabel>
                          <FormDescription className="text-xs">
                            Promote product
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isNew"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">New</FormLabel>
                          <FormDescription className="text-xs">
                            Show "New" badge
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Media Card */}
            <Card>
              <CardHeader>
                <CardTitle>Media</CardTitle>
                <CardDescription>Product images and gallery</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Primary product image (upload functionality coming soon)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>
                  Set your product pricing and membership requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (in cents)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              type="number"
                              placeholder="25000"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                            <p className="text-sm text-muted-foreground">
                              Display: {formatPriceDisplay(field.value)}
                            </p>
                          </div>
                        </FormControl>
                        <FormDescription>Enter price in cents</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comparePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compare Price (optional)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              type="number"
                              placeholder="30000"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                            {field.value && (
                              <p className="text-sm text-muted-foreground">
                                Display: {formatPriceDisplay(field.value)}
                              </p>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>Original price for discounts</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Price (optional)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              type="number"
                              placeholder="15000"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                            {field.value && (
                              <p className="text-sm text-muted-foreground">
                                Display: {formatPriceDisplay(field.value)}
                              </p>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>Internal cost tracking</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="requiresMembership"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Requires Membership
                        </FormLabel>
                        <FormDescription>
                          Only members can purchase this product
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {watchRequiresMembership && (
                  <FormField
                    control={form.control}
                    name="membershipTiers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allowed Membership Tiers</FormLabel>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          {["basic", "premium", "vip", "founding"].map((tier) => (
                            <label
                              key={tier}
                              className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                            >
                              <input
                                type="checkbox"
                                checked={field.value?.includes(tier as any)}
                                onChange={(e) => {
                                  const tiers = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...tiers, tier]);
                                  } else {
                                    field.onChange(
                                      tiers.filter((t) => t !== tier)
                                    );
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm capitalize">{tier}</span>
                            </label>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management</CardTitle>
                <CardDescription>
                  Manage stock levels and inventory tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="trackQuantity"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Track Quantity</FormLabel>
                        <FormDescription>
                          Monitor stock levels and prevent overselling
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {watchTrackQuantity && (
                  <>
                    <div className="grid gap-6 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lowStockThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Low Stock Threshold</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 5)
                                }
                              />
                            </FormControl>
                            <FormDescription>Alert when stock falls below</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="allowBackorder"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Backorders</FormLabel>
                              <FormDescription className="text-xs">
                                Allow when out
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <Input placeholder="Supplier name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplierSku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="SUP-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cannabis Attributes Tab */}
          <TabsContent value="cannabis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cannabis Attributes</CardTitle>
                <CardDescription>
                  Specific details for cannabis products
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 1g, 2 joints" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="potency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potency</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 40mg THC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="strain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strain</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., OG Kush" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="thcContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>THC Content (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="22.5"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || undefined)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cbdContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CBD Content (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="0.5"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || undefined)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search Engine Optimization</CardTitle>
                <CardDescription>
                  Optimize how your product appears in search results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Premium OG Kush Pre-Roll | Bigg Buzz"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Page title for search engines (50-60 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Experience premium OG Kush in our expertly rolled pre-rolls..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Search result description (150-160 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsNavigating(true);
              router.push("/admin/products");
            }}
            disabled={isNavigating}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isNavigating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isNavigating ? "Redirecting..." : "Cancel"}
          </Button>
          <div className="flex items-center gap-2">
            {watchStatus === "draft" && (
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
              >
                Save Draft
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                ? "Create Product"
                : "Update Product"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}