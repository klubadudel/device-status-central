
'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteLogo } from '@/components/layout/SiteLogo';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState(''); // Renamed from username to email
  const [password, setPassword] = useState('');
  const { login, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const success = await login(email, password); // Pass email state
    if (!success) {
      setError('Invalid email or password. Please try again.'); // Updated error message slightly
    } else {
      // Successful login is handled by onAuthStateChanged in AuthContext for navigation
      // router.push('/dashboard'); // This can be removed if onAuthStateChanged handles all redirects
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <SiteLogo size="lg" className="justify-center" />
          <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label> {/* Changed from Username to Email */}
              <Input
                id="email" // Changed from username to email
                type="email" // Changed type to email for better semantics and validation
                placeholder="e.g., user@example.com" // Updated placeholder
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting || authLoading}>
              {isSubmitting || authLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Device Status Central. All rights reserved.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
