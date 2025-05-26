
'use client';
import React, { useState, useEffect, useCallback } from 'react'; // Removed Suspense
import { useAuth } from '@/hooks/useAuth';
import type { Device, Branch, Region } from '@/types';
import { getDevicesByBranchId, getBranchById, getBranchesByRegion, getRegions, getBranches as getAllBranches, getDevices as getAllDevices } from '@/lib/data-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AISummary } from '@/components/dashboard/AISummary';
import { AIMaintenanceSuggestions } from '@/components/dashboard/AIMaintenanceSuggestions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, BrainCircuit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function AIInsightsContent() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [devicesForScope, setDevicesForScope] = useState<Device[]>([]);
  const [currentScopeName, setCurrentScopeName] = useState<string>('nation-wide'); // Default scope
  const [currentScopeType, setCurrentScopeType] = useState<'Branch' | 'Region' | 'Nation-wide'>('Nation-wide');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScopeData, setIsLoadingScopeData] = useState(false);


  // For selectors if not branch user
  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | undefined>(undefined);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (role === 'branch' && user.branchId) {
        const branchDevices = await getDevicesByBranchId(user.branchId);
        setDevicesForScope(branchDevices || []);
        const branchDetails = await getBranchById(user.branchId);
        setCurrentScopeName(branchDetails ? branchDetails.name : user.branchId);
        setCurrentScopeType('Branch');
      } else {
        const [allRegionsData, allBranchesData] = await Promise.all([
          getRegions(),
          getAllBranches()
        ]);
        setRegions(allRegionsData || []);
        setBranches(allBranchesData || []);
        
        if (role === 'regional' && user.regionId) {
          const regionDetails = (allRegionsData || []).find(r => r.id === user.regionId);
          setCurrentScopeName(regionDetails ? regionDetails.name : user.regionId);
          setCurrentScopeType('Region');
          
          const branchesInUserRegion = (allBranchesData || []).filter(b => b.regionId === user.regionId);
          let devicesInUserRegion: Device[] = [];
          for (const b of branchesInUserRegion) {
              const branchDevices = await getDevicesByBranchId(b.id);
              devicesInUserRegion = devicesInUserRegion.concat(branchDevices || []);
          }
          setDevicesForScope(devicesInUserRegion);
          setSelectedRegionId(user.regionId);
        } else { // National or regional without specific regionId or other roles
          const allDevicesData = await getAllDevices();
          setDevicesForScope(allDevicesData || []);
          setCurrentScopeName('Nation-wide');
          setCurrentScopeType('Nation-wide');
        }
      }
    } catch (error) {
        console.error("Error fetching initial AI insights data:", error);
        toast({ title: "Error", description: "Could not load initial data for AI insights.", variant: "destructive" });
        setDevicesForScope([]);
    } finally {
        setIsLoading(false);
    }
  }, [user, role, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleScopeChange = useCallback(async () => {
    if (role === 'branch') return; // Branch scope is fixed

    setIsLoadingScopeData(true);
    let newDevices: Device[] = [];
    let newScopeNameDisplay = 'Nation-wide';
    let newScopeTypeDisplay: 'Branch' | 'Region' | 'Nation-wide' = 'Nation-wide';

    try {
        if (selectedBranchId) {
            newDevices = await getDevicesByBranchId(selectedBranchId);
            const branch = branches.find(b => b.id === selectedBranchId);
            newScopeNameDisplay = branch ? branch.name : selectedBranchId;
            newScopeTypeDisplay = 'Branch';
        } else if (selectedRegionId) {
            const branchesInRegion = branches.filter(b => b.regionId === selectedRegionId);
            for (const b of branchesInRegion) {
                const branchDevices = await getDevicesByBranchId(b.id);
                newDevices = newDevices.concat(branchDevices || []);
            }
            const region = regions.find(r => r.id === selectedRegionId);
            newScopeNameDisplay = region ? region.name : selectedRegionId;
            newScopeTypeDisplay = 'Region';
        } else { // Nation-wide
            newDevices = await getAllDevices();
        }
    } catch (error) {
        console.error("Error fetching data for scope change:", error);
        toast({ title: "Error", description: "Could not load data for the selected scope.", variant: "destructive"});
        newDevices = []; // Reset on error
    }
    
    setDevicesForScope(newDevices || []);
    setCurrentScopeName(newScopeNameDisplay);
    setCurrentScopeType(newScopeTypeDisplay);
    setIsLoadingScopeData(false);
  }, [selectedBranchId, selectedRegionId, role, branches, regions, toast]);
  
  useEffect(() => {
    if (role === 'regional' || role === 'national') {
        handleScopeChange();
    }
  }, [selectedBranchId, selectedRegionId, role, handleScopeChange]);

  if (isLoading && !user) { 
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary flex items-center">
            <BrainCircuit className="mr-3 h-8 w-8" /> AI-Powered Insights
          </CardTitle>
          <CardDescription>
            Leverage generative AI to understand device uptime patterns and get maintenance suggestions for your scope.
          </CardDescription>
        </CardHeader>
        {(role === 'regional' || role === 'national') && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 mb-6 bg-muted/30 border rounded-lg">
              <div>
                <Label htmlFor="ai-region-select">Filter by Region</Label>
                <Select 
                  value={selectedRegionId} 
                  onValueChange={(value) => {
                    setSelectedRegionId(value === "all" ? undefined : value); // Handle 'all' value
                    setSelectedBranchId(undefined); 
                  }}
                  disabled={role === 'regional' && !!user?.regionId} 
                >
                  <SelectTrigger id="ai-region-select">
                    <SelectValue placeholder="All Regions (Nation-wide)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions (Nation-wide)</SelectItem>
                    {regions.map(region => (
                      <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ai-branch-select">Filter by Branch</Label>
                <Select 
                  value={selectedBranchId} 
                  onValueChange={(value) => setSelectedBranchId(value === "all" ? undefined : value)}
                  disabled={!selectedRegionId && role !== 'national'} 
                >
                  <SelectTrigger id="ai-branch-select">
                    <SelectValue placeholder={!selectedRegionId && role!=='national' ? "Select a region first" : "All Branches in Region"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches in Region</SelectItem>
                    {branches
                      .filter(b => !selectedRegionId || b.regionId === selectedRegionId)
                      .map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                     {(!selectedRegionId || branches.filter(b => b.regionId === selectedRegionId).length === 0) && <SelectItem value="no-branches" disabled>No branches in selected region</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      {isLoading || isLoadingScopeData ? (
        <div className="space-y-6 flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading AI insights data...</p>
          <Skeleton className="h-48 w-full mt-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : devicesForScope ? (
        <div className="space-y-8">
          <AISummary scope={currentScopeName} scopeType={currentScopeType} />
          <AIMaintenanceSuggestions devices={devicesForScope} scope={currentScopeName} scopeType={currentScopeType} />
        </div>
      ) : (
        <Alert>
            <Info className="h-5 w-5" />
            <AlertTitle>No Data for AI Insights</AlertTitle>
            <AlertDescription>
                { (role === 'regional' || role === 'national') ? "Please select a scope (region/branch) to generate AI insights, or there might be no devices in the current selection." : "No device data found for your branch. AI insights cannot be generated."}
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function AIInsightsPage() {
  // AIInsightsContent is already a client component because 'use client' is at the top of the file.
  // The Suspense boundary in src/app/(app)/layout.tsx will handle this page.
  return <AIInsightsContent />;
}
