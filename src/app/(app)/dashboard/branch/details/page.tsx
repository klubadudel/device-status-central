
'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Branch, Region } from '@/types';
import { getBranchById, getRegionById } from '@/lib/data-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, MapPin, User, Phone, CalendarDays, Info, Map, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

export default function BranchDetailsPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBranchData = async () => {
      if (user && role === 'branch' && user.branchId) {
        setIsLoading(true);
        try {
          const currentBranch = await getBranchById(user.branchId);
          setBranch(currentBranch || null);
          if (currentBranch && currentBranch.regionId) {
            const currentRegion = await getRegionById(currentBranch.regionId);
            setRegion(currentRegion || null);
          } else if (currentBranch && !currentBranch.regionId) {
             setRegion(null); // Branch exists but no regionId
          }
        } catch (error) {
          console.error("Failed to fetch branch details:", error);
          toast({ title: "Error", description: "Could not load branch details.", variant: "destructive" });
          setBranch(null);
          setRegion(null);
        } finally {
          setIsLoading(false);
        }
      } else if (user && role !== 'branch') {
        setBranch(null);
        setRegion(null);
        setIsLoading(false);
      }
    };

    if (user) { // Ensure user context is available before fetching
        fetchBranchData();
    } else {
        setIsLoading(true); // Keep loading if user context is not yet ready
    }
  }, [user, role, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="shadow-lg">
          <Skeleton className="h-48 w-full rounded-t-lg" />
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
              <p className="text-muted-foreground">Loading branch details...</p>
            </div>
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!branch && role === 'branch') {
     return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <Info className="h-5 w-5" />
          <AlertTitle>Branch Not Found</AlertTitle>
          <AlertDescription>
            Your assigned branch (ID: {user?.branchId}) could not be found. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (role !== 'branch') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="default" className="border-accent bg-accent/10 text-accent-foreground">
          <Info className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This page is intended for users with the 'branch' role. Please navigate using the sidebar.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!branch) return null; // Should be covered by above checks

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="shadow-xl overflow-hidden bg-card">
        <div className="relative h-56 md:h-72 w-full">
          <Image 
            src={`https://picsum.photos/seed/${branch.id}/1200/400`} 
            alt={`${branch.name} representative image`}
            fill // Changed from layout="fill"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Added sizes prop
            style={{objectFit:"cover"}} // Changed from objectFit="cover"
            className="opacity-90"
            data-ai-hint="office building city"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-8">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg">{branch.name}</h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 drop-shadow-sm">{branch.address}</p>
          </div>
        </div>
        
        <CardHeader className="pt-6">
          <CardTitle className="text-2xl text-primary flex items-center">
            <Building className="mr-3 h-7 w-7" /> Branch Information
          </CardTitle>
          <CardDescription>Detailed information about {branch.name}.</CardDescription>
        </CardHeader>
        
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6 text-base pt-4">
          <div className="flex items-start">
            <MapPin className="h-5 w-5 mr-3 mt-1 text-accent flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Address</p>
              <p className="text-muted-foreground">{branch.address}</p>
            </div>
          </div>
          
          {region && (
            <div className="flex items-start">
              <Map className="h-5 w-5 mr-3 mt-1 text-accent flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Region</p>
                <p className="text-muted-foreground">{region.name}</p>
              </div>
            </div>
          )}

          {branch.managerName && (
            <div className="flex items-start">
              <User className="h-5 w-5 mr-3 mt-1 text-accent flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Branch Manager</p>
                <p className="text-muted-foreground">{branch.managerName}</p>
              </div>
            </div>
          )}

          {branch.contactPhone && (
            <div className="flex items-start">
              <Phone className="h-5 w-5 mr-3 mt-1 text-accent flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Contact Phone</p>
                <p className="text-muted-foreground">{branch.contactPhone}</p>
              </div>
            </div>
          )}

          {branch.establishedDate && (
            <div className="flex items-start">
              <CalendarDays className="h-5 w-5 mr-3 mt-1 text-accent flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Established Date</p>
                <p className="text-muted-foreground">{new Date(branch.establishedDate).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          
           <div className="flex items-start md:col-span-2">
            <Info className="h-5 w-5 mr-3 mt-1 text-accent flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Branch ID</p>
              <p className="text-muted-foreground">{branch.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
