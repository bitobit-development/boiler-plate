import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POS Login | Bigg Buzz',
  description: 'Login to POS System',
};

/**
 * Login page layout - bypasses POS authentication
 * This overrides the parent /pos layout to allow unauthenticated access
 */
export default function POSLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
