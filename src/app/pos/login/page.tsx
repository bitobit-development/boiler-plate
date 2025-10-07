'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Store, AlertCircle, Info } from 'lucide-react';

function POSLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');

  // Check for session expiry or other reasons
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'session_expired') {
      setSessionMessage('Your session has expired. Please sign in again.');
    } else if (reason === 'invalid_token') {
      setSessionMessage('Your session is invalid. Please sign in again.');
    } else if (reason === 'session_inactive') {
      setSessionMessage('Your kiosk session is inactive. Please sign in again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Verify user has shop_user role
      if (data.user?.role !== 'shop_user') {
        setError('Access denied. Shop user credentials required.');
        return;
      }

      // Store tokens if provided
      if (data.tokens) {
        localStorage.setItem('accessToken', data.tokens.accessToken);
        if (data.tokens.refreshToken) {
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
        }
      }

      // Store user data for POS components
      if (data.user) {
        localStorage.setItem('posUser', JSON.stringify(data.user));
      }

      // Successful login - redirect to return URL or POS
      const returnUrl = searchParams.get('returnUrl') || '/pos';
      router.push(returnUrl);
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(34,197,94,0.1),transparent)] pointer-events-none" />

      <Card className="w-full max-w-md mx-4 bg-slate-900/90 backdrop-blur-sm border-slate-700">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <Store className="w-8 h-8 text-green-400" />
          </div>
          <CardTitle className="text-2xl text-white">POS System Login</CardTitle>
          <CardDescription className="text-slate-400">
            Sign in with your shop user credentials
          </CardDescription>
        </CardHeader>

        <CardContent>
          {sessionMessage && (
            <Alert className="mb-4 bg-blue-950/50 border-blue-900 text-blue-400">
              <Info className="h-4 w-4" />
              <AlertDescription>{sessionMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="foodtruck@biggbuzz.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-green-400 focus:ring-green-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-green-400 focus:ring-green-400"
              />
            </div>

            {error && (
              <Alert className="bg-red-950/50 border-red-900 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium h-12 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to POS'
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400">
              <strong className="text-slate-300">Shop User:</strong> foodtruck@biggbuzz.com
            </p>
            <p className="text-sm text-slate-400 mt-1">
              <strong className="text-slate-300">Password:</strong> Tsitsi2025!!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function POSLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
      </div>
    }>
      <POSLoginForm />
    </Suspense>
  );
}