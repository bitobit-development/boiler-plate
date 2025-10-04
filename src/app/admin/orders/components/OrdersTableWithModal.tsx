'use client';

import { useState } from 'react';
import { OrderWithRelations } from '@/app/pos/orders/page';
import { OrdersTable } from './OrdersTable';
import { OrderDetailsModal } from './OrderDetailsModal';

interface OrdersTableWithModalProps {
  orders: OrderWithRelations[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  showShopUser?: boolean;
}

export function OrdersTableWithModal({
  orders,
  totalCount,
  totalPages,
  currentPage,
  showShopUser = false,
}: OrdersTableWithModalProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleRowClick = (order: OrderWithRelations) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  return (
    <>
      <OrdersTable
        orders={orders}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        onRowClick={handleRowClick}
        showShopUser={showShopUser}
      />

      <OrderDetailsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        order={selectedOrder}
      />
    </>
  );
}