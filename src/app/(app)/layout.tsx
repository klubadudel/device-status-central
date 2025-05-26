
'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { Toaster } from '@/components/ui/toaster';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { NextTopLoader} from '@/components/ui/next-top-loader'; 

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("AppLayoutContent: Auth state - loading:", loading, "user:", user?.email || null, "pathname:", pathname);
    if (!loading && !user) {
      console.log("AppLayoutContent: loading false, user null. Redirecting to login.");
      router.replace(`/login?redirect=${pathname}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    console.log("AppLayoutContent: loading true. Showing spinner.");
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="ml-3 text-lg text-foreground">Loading Application Data...</p>
      </div>
    );
  }

  if (!user && pathname !== '/login') { 
    console.log("AppLayoutContent: loading false, user null, not on login. Showing redirecting indicator.");
     return (
        <div className="flex h-screen items-center justify-center bg-background">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="ml-3 text-lg text-foreground">Redirecting to login...</p>
        </div>
    );
  }
  
  console.log("AppLayoutContent: loading false, user exists. Rendering app shell.");
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset> {/* This renders as a <main> tag */}
        <div className="sticky top-0 z-30 bg-background"> {/* Wrapper for sticky header */}
          <AppHeader />
        </div>
        {/* The main scrollable area for page content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto overflow-x-auto bg-background"> 
          <Suspense fallback={
            <div className="flex h-full items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
               <p className="ml-2 text-foreground">Loading page content...</p>
            </div>
          }>
            {children}
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <NextTopLoader color="hsl(var(--primary))" showSpinner={false} />
      <AppLayoutContent>{children}</AppLayoutContent>
      <Toaster />
    </AuthProvider>
  );
}
