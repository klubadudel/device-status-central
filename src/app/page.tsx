
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext'; 
import { useAuth } from '@/hooks/useAuth'; 

function HomePageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log("HomePageContent: Auth state - loading:", loading, "user:", user?.email || null);
    if (!loading) { // Only act once loading is complete
      if (user) {
        console.log("HomePageContent: loading false, user exists. Redirecting to /dashboard");
        router.replace('/dashboard');
      } else {
        console.log("HomePageContent: loading false, user null. Redirecting to /login");
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Render loading indicator while auth state is being determined
  // This will show until `loading` is false from AuthContext.
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="ml-2 text-foreground">Initializing Application...</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <HomePageContent />
    </AuthProvider>
  );
}
