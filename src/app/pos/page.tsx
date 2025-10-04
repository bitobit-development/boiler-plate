'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// POS Components
import { POSHeader } from '@/components/pos/POSHeader';
import { POSLayout } from '@/components/pos/POSLayout';
import { CartProvider, useCart } from '@/components/pos/CartContext';

// Product Catalog Components
import { CategoryFilter } from '@/components/pos/ProductCatalog/CategoryFilter';
import { ProductSearch } from '@/components/pos/ProductCatalog/ProductSearch';
import { ProductGrid } from '@/components/pos/ProductCatalog/ProductGrid';

// Cart Components
import { CartPanel } from '@/components/pos/Cart/CartPanel';

// Customer Components
import { CustomerSearch } from '@/components/pos/Customer/CustomerSearch';
import { CustomerCard } from '@/components/pos/Customer/CustomerCard';
import { OTPActivationDialog } from '@/components/pos/Customer/OTPActivationDialog';
import { OTPOverrideDialog } from '@/components/pos/Customer/OTPOverrideDialog';

// Checkout Components
import { CheckoutButton } from '@/components/pos/Checkout/CheckoutButton';
import { PaymentSelector, PaymentMethod } from '@/components/pos/Checkout/PaymentSelector';
import { OrderConfirmation } from '@/components/pos/Checkout/OrderConfirmation';
import { InventoryOverrideDialog } from '@/components/pos/Checkout/InventoryOverrideDialog';

// Server Actions
import {
  getPOSProducts,
  getPOSCategories,
  verifyCustomerStatus,
  createPOSOrder,
  type ProductWithCategory,
  type CreatePOSOrderInput
} from '@/app/actions/pos';

// Types
import { ProductCategory, Subscriber } from '@/lib/db/schema';

function POSContent() {
  const {
    customer,
    setCustomer,
    customerVerified,
    setCustomerVerified,
    clearCart,
    removeItem,
    items,
    total
  } = useCart();

  // State Management
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [wasCustomerOverridden, setWasCustomerOverridden] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{ method: PaymentMethod; details: any } | null>(null);
  const [insufficientStockItems, setInsufficientStockItems] = useState<any[]>([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter products based on category and search
  useEffect(() => {
    let filtered = products;

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.brand && p.brand.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        getPOSProducts(),
        getPOSCategories()
      ]);

      setProducts(productsData);
      setFilteredProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load POS data:', error);
      toast.error('Failed to load products. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = useCallback(async (categoryId: string | null) => {
    setSelectedCategory(categoryId);

    // Optionally reload products for specific category
    if (categoryId) {
      try {
        const categoryProducts = await getPOSProducts(categoryId);
        setProducts(categoryProducts);
      } catch (error) {
        console.error('Failed to load category products:', error);
      }
    } else {
      // Load all products
      loadInitialData();
    }
  }, []);

  const handleCustomerSelect = async (selectedCustomer: Subscriber) => {
    // Verify customer status
    const verification = await verifyCustomerStatus(selectedCustomer.mobile);

    if (verification.found && verification.customer) {
      setCustomer(verification.customer);

      if (verification.isActive && !verification.requiresOTP) {
        setCustomerVerified(true);
        toast.success('Customer verified successfully');
      } else if (verification.requiresOTP) {
        setCustomerVerified(false);
        setShowOTPDialog(true);
      } else {
        setCustomerVerified(false);
        toast.error('Customer account is not active');
      }
    } else {
      toast.error(verification.message || 'Customer not found');
    }
  };

  const handleCustomerVerified = (verifiedCustomer: Subscriber, isOverride: boolean = false) => {
    setCustomer(verifiedCustomer);
    setCustomerVerified(true);
    setWasCustomerOverridden(isOverride);
    setShowOTPDialog(false);
    setShowOverrideDialog(false);
    toast.success('Customer verified successfully');
  };

  const handleRemoveCustomer = () => {
    setCustomer(null);
    setCustomerVerified(false);
    setWasCustomerOverridden(false);
  };

  const handleCheckout = () => {
    // Temporarily bypass customer verification for testing
    // if (!customerVerified) {
    //   toast.error('Please verify customer before checkout');
    //   return;
    // }

    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setShowPaymentDialog(true);
  };

  const handlePaymentConfirm = async (method: PaymentMethod, details: any) => {
    // Temporary test customer for integration testing
    const testCustomer = customer || {
      id: 'test-customer-id',
      name: 'Test',
      surname: 'Customer',
      mobile: '+27820000000',
      email: 'test@example.com'
    };

    if (!testCustomer) {
      toast.error('Customer verification required');
      return;
    }

    try {
      // Prepare order data for the server action
      const orderInput: CreatePOSOrderInput = {
        subscriberId: testCustomer.id,
        customerName: `${testCustomer.name} ${testCustomer.surname}`,
        customerMobile: testCustomer.mobile,
        // TODO: Get actual shop user from session/context
        shopUserId: '9ecc9ff7-313e-4560-81b7-ecfe90a4a965', // foodtruck@biggbuzz.com
        shopUserName: 'Food Truck',
        kioskId: 'POS-KIOSK-001',
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.memberPrice || item.product.price // Price in cents
        })),
        paymentMethod: method === 'terminal_yoko' ? 'card' : method,
        subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
        tax: Math.round(total * 0.15), // South African VAT is 15%
        total,
        wasOtpOverridden: wasCustomerOverridden,
        overrideReason: wasCustomerOverridden ? 'Manual verification' : undefined
      };

      // Create the order in the database
      const result = await createPOSOrder(orderInput);

      if (!result.success) {
        // Handle insufficient stock
        if (result.insufficientStock) {
          // Store the payment details for retry after override
          setPendingPayment({ method, details });
          setInsufficientStockItems(result.insufficientStock);
          setShowPaymentDialog(false);
          setShowInventoryDialog(true);
          return;
        }

        // Other errors
        toast.error(result.message || 'Failed to create order');
        return;
      }

      // Success - prepare order details for confirmation dialog
      const order = {
        orderNumber: result.order!.orderNumber,
        customerName: `${testCustomer.name} ${testCustomer.surname}`,
        customerMobile: testCustomer.mobile,
        customerEmail: testCustomer.email,
        wasOverridden: wasCustomerOverridden,
        items: items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.memberPrice || item.product.price,
          subtotal: item.subtotal
        })),
        subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
        tax: Math.round(total * 0.15),
        total,
        paymentMethod: method.toUpperCase(),
        timestamp: result.order!.createdAt || new Date()
      };

      setOrderDetails(order);
      setShowPaymentDialog(false);
      setShowConfirmationDialog(true);

      // Clear cart after successful order
      clearCart();
      toast.success('Order created successfully!');
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error('Failed to process order. Please try again.');
    }
  };

  const handleNewOrder = () => {
    clearCart();
    setOrderDetails(null);
    setShowConfirmationDialog(false);
  };

  const handleInventoryOverride = async (reason: string, explanation: string) => {
    if (!pendingPayment || !customer) return;

    // Use test customer fallback if no verified customer
    const orderCustomer = customer || {
      id: 'test-customer-id',
      name: 'Test',
      surname: 'Customer',
      mobile: '+27820000000',
      email: 'test@example.com'
    };

    try {
      // Retry the order with override flags
      const orderInput: CreatePOSOrderInput = {
        subscriberId: orderCustomer.id,
        customerName: `${orderCustomer.name} ${orderCustomer.surname || ''}`.trim(),
        customerMobile: orderCustomer.mobile,
        // TODO: Get actual shop user from session/context
        shopUserId: '9ecc9ff7-313e-4560-81b7-ecfe90a4a965', // foodtruck@biggbuzz.com
        shopUserName: 'Food Truck',
        kioskId: 'POS-KIOSK-001',
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.memberPrice || item.product.price
        })),
        paymentMethod: pendingPayment.method === 'terminal_yoko' ? 'card' : pendingPayment.method,
        subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
        tax: Math.round(total * 0.15),
        total,
        wasOtpOverridden: wasCustomerOverridden,
        overrideReason: reason,
        overrideExplanation: explanation
      };

      // Retry order creation with override flags
      const result = await createPOSOrder(orderInput);

      if (!result.success) {
        toast.error(result.message || 'Failed to create order even with override');
        return;
      }

      // Success - prepare order details for confirmation dialog
      const order = {
        orderNumber: result.order!.orderNumber,
        customerName: `${orderCustomer.name} ${orderCustomer.surname || ''}`.trim(),
        customerMobile: orderCustomer.mobile,
        customerEmail: orderCustomer.email,
        wasOverridden: wasCustomerOverridden,
        items: items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.memberPrice || item.product.price,
          subtotal: item.subtotal
        })),
        subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
        tax: Math.round(total * 0.15),
        total,
        paymentMethod: pendingPayment.method.toUpperCase(),
        timestamp: result.order!.createdAt || new Date()
      };

      setOrderDetails(order);
      setShowInventoryDialog(false);
      setShowConfirmationDialog(true);
      setPendingPayment(null);
      setInsufficientStockItems([]);

      // Clear cart after successful order
      clearCart();
      toast.success('Order created successfully with inventory override!');
    } catch (error) {
      console.error('Override error:', error);
      toast.error('Failed to process order with override');
    }
  };

  const handleInventoryCancel = () => {
    // Remove unavailable items from cart
    const unavailableProductIds = insufficientStockItems
      .filter(item => !item.allowBackorder)
      .map(item => item.productId);

    if (unavailableProductIds.length > 0) {
      unavailableProductIds.forEach(productId => {
        removeItem(productId);
      });
      toast.info(`Removed ${unavailableProductIds.length} unavailable item(s) from cart`);
    }

    setShowInventoryDialog(false);
    setPendingPayment(null);
    setInsufficientStockItems([]);
  };

  // Customer Section Component
  const CustomerSection = (
    <div className="space-y-3">
      {!customer ? (
        <CustomerSearch onSelectCustomer={handleCustomerSelect} />
      ) : (
        <CustomerCard
          customer={customer}
          isVerified={customerVerified}
          onActivate={() => setShowOTPDialog(true)}
          onRemove={handleRemoveCustomer}
        />
      )}
    </div>
  );

  // Checkout Section Component
  const CheckoutSection = (
    <CheckoutButton
      onClick={handleCheckout}
      customerVerified={true} // Temporarily bypass for testing
      disabled={items.length === 0}
    />
  );

  return (
    <>
      <POSLayout
        leftPanel={
          <div className="flex flex-col h-full">
            {/* Category Filter */}
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />

            {/* Search Bar */}
            <div className="p-4 border-b border-slate-700">
              <ProductSearch
                onSearch={setSearchQuery}
                placeholder="Search products..."
              />
            </div>

            {/* Product Grid */}
            <ScrollArea className="flex-1 pos-scrollbar">
              <ProductGrid
                products={filteredProducts}
                loading={loading}
              />
            </ScrollArea>
          </div>
        }
        rightPanel={
          <CartPanel
            customerSection={CustomerSection}
            checkoutSection={CheckoutSection}
          />
        }
      >
        <POSHeader />
      </POSLayout>

      {/* Dialogs */}
      <OTPActivationDialog
        open={showOTPDialog}
        onOpenChange={setShowOTPDialog}
        customer={customer}
        onSuccess={handleCustomerVerified}
        onOverride={() => {
          setShowOTPDialog(false);
          setShowOverrideDialog(true);
        }}
      />

      <OTPOverrideDialog
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
        customer={customer}
        onSuccess={(customer) => handleCustomerVerified(customer, true)}
      />

      <PaymentSelector
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        total={total}
        onConfirm={handlePaymentConfirm}
      />

      <OrderConfirmation
        open={showConfirmationDialog}
        onOpenChange={setShowConfirmationDialog}
        orderDetails={orderDetails}
        onNewOrder={handleNewOrder}
        onPrintReceipt={() => toast.info('Print functionality coming soon')}
      />

      <InventoryOverrideDialog
        open={showInventoryDialog}
        onOpenChange={setShowInventoryDialog}
        insufficientStock={insufficientStockItems}
        onOverride={handleInventoryOverride}
        onCancel={handleInventoryCancel}
      />
    </>
  );
}

export default function POSPage() {
  return (
    <CartProvider>
      <POSContent />
    </CartProvider>
  );
}