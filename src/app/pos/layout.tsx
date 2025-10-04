import type { Metadata } from 'next';
import './pos.css';

export const metadata: Metadata = {
  title: 'POS System | Bigg Buzz',
  description: 'Point of Sale System for Bigg Buzz Cannabis Shop',
};

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pos-layout">
      {children}
    </div>
  );
}