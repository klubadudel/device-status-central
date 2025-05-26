
'use client';
import React, { Suspense } from 'react'; // Added Suspense
import { useAuth } from '@/hooks/useAuth';
import type { Device, Branch, Region } from '@/types';
import { getDevicesByBranchId as getDevicesByBranchIdSnapshot, getBranchById, getBranchesByRegion, getRegions, getBranches as getAllBranchesSnapshot, getDevices as getAllDevicesSnapshot } from '@/lib/data-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AISummary } from '@/components/dashboard/AISummary';
import { AIMaintenanceSuggestions } from '@/components/dashboard/AIMaintenanceSuggestions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, BrainCircuit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic'; // Import dynamic

// Dynamically import AIInsightsContent to ensure it's client-rendered
const AIInsightsContent = dynamic(() => import('@/components/dashboard/ai-insights/AIInsightsContent').then(mod => mod.AIInsightsContent), {
  ssr: false, // Disable server-side rendering for this component
  loading: () => ( // Fallback UI while the component is loading
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Skeleton className="h-10 w-1/2 mb-4" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  ),
});

export default function AIInsightsPage() {
  // The Suspense boundary in src/app/(app)/layout.tsx will handle this page.
  // The dynamic import already provides its own loading state.
  return <AIInsightsContent />;
}
