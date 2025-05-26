
'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Branch, Region, Device } from '@/types';
import { getRegions, getBranchesByRegion, getDevicesByBranchId } from '@/lib/data-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BranchCard } from '@/components/dashboard/BranchCard';
import { DeviceCard } from '@/components/dashboard/DeviceCard';
import { AlertTriangle, Building, HardDrive, MapPinned, Info, Globe, ListFilter, Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function NationalRegionSelectPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [branchesInSelectedRegion, setBranchesInSelectedRegion] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [devicesInSelectedBranch, setDevicesInSelectedBranch] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchInitialData = async () => {
      if (user && role === 'national') {
        setIsLoading(true);
        try {
          const regionsData = await getRegions();
          setAllRegions(regionsData || []);
        } catch (error) {
          console.error("Failed to fetch regions:", error);
          toast({ title: "Error", description: "Could not load regions.", variant: "destructive" });
          setAllRegions([]);
        } finally {
          setIsLoading(false);
        }
      } else if (user && role !== 'national') {
        setIsLoading(false); // Not a national user
        setAllRegions([]);
      }
    };
    fetchInitialData();
  }, [user, role, toast]);

  const handleRegionSelect = useCallback(async (regionId: string | undefined) => {
    if (!regionId) {
      setSelectedRegion(null);
      setBranchesInSelectedRegion([]);
      setSelectedBranch(null);
      setDevicesInSelectedBranch([]);
      return;
    }
    const region = allRegions.find(r => r.id === regionId);
    setSelectedRegion(region || null);
    setBranchesInSelectedRegion([]); // Clear previous branches
    setSelectedBranch(null); // Reset selected branch
    setDevicesInSelectedBranch([]); // Reset devices

    if (region) {
      setIsLoadingBranches(true);
      try {
        const branchesData = await getBranchesByRegion(region.id);
        setBranchesInSelectedRegion(branchesData || []);
      } catch (error) {
        console.error(`Failed to fetch branches for region ${region.id}:`, error);
        toast({ title: "Error", description: `Could not load branches for ${region.name}.`, variant: "destructive" });
        setBranchesInSelectedRegion([]);
      } finally {
        setIsLoadingBranches(false);
      }
    }
  }, [allRegions, toast]);

  const handleBranchSelect = useCallback(async (branchId: string | undefined) => {
     if (!branchId) {
      setSelectedBranch(null);
      setDevicesInSelectedBranch([]);
      return;
    }
    const branch = branchesInSelectedRegion.find(b => b.id === branchId);
    setSelectedBranch(branch || null);
    setDevicesInSelectedBranch([]); // Clear previous devices

    if (branch) {
      setIsLoadingDevices(true);
      try {
        const devicesData = await getDevicesByBranchId(branch.id);
        setDevicesInSelectedBranch(devicesData || []);
      } catch (error) {
        console.error(`Failed to fetch devices for branch ${branch.id}:`, error);
        toast({ title: "Error", description: `Could not load devices for ${branch.name}.`, variant: "destructive" });
        setDevicesInSelectedBranch([]);
      } finally {
        setIsLoadingDevices(false);
      }
    }
  }, [branchesInSelectedRegion, toast]);
  
  const filteredDevices = useMemo(() => devicesInSelectedBranch
    .filter(device => device.name.toLowerCase().includes(searchTerm.toLowerCase()) || device.type.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(device => statusFilter === 'all' || device.status === statusFilter), [devicesInSelectedBranch, searchTerm, statusFilter]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (role !== 'national') {
     return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>This page is intended for national users only.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary flex items-center">
            <Globe className="mr-3 h-8 w-8" /> National Overview
          </CardTitle>
          <CardDescription>Select a region and then a branch to view details and device statuses nationwide.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="region-select" className="block text-sm font-medium text-foreground mb-1">Select Region</label>
            <Select onValueChange={handleRegionSelect} value={selectedRegion?.id || ""}>
              <SelectTrigger id="region-select" className="w-full">
                <SelectValue placeholder="Choose a region..." />
              </SelectTrigger>
              <SelectContent>
                {allRegions.length > 0 ? allRegions.map(region => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                )) : <SelectItem value="no-regions" disabled>No regions available</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="branch-select" className="block text-sm font-medium text-foreground mb-1">Select Branch</label>
            <Select onValueChange={handleBranchSelect} value={selectedBranch?.id || ""} disabled={!selectedRegion || branchesInSelectedRegion.length === 0 || isLoadingBranches}>
              <SelectTrigger id="branch-select" className="w-full">
                <SelectValue placeholder={isLoadingBranches ? "Loading branches..." : (!selectedRegion ? "Select a region first" : (branchesInSelectedRegion.length === 0 ? "No branches in region" : "Choose a branch..."))} />
              </SelectTrigger>
              <SelectContent>
                 {branchesInSelectedRegion.length > 0 ? branchesInSelectedRegion.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} - {branch.address}
                  </SelectItem>
                )) : <SelectItem value="no-branches" disabled>
                      {isLoadingBranches ? "Loading..." : (selectedRegion ? "No branches found" : "Select region first")}
                    </SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoadingBranches && selectedRegion && (
        <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Fetching branches for {selectedRegion.name}...
        </div>
      )}

      {!isLoadingBranches && selectedRegion && !selectedBranch && branchesInSelectedRegion.length > 0 && (
        <Alert>
          <Info className="h-5 w-5" />
          <AlertTitle>Branches in {selectedRegion.name}</AlertTitle>
          <AlertDescription>Please select a branch from the dropdown above to view its details.</AlertDescription>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {branchesInSelectedRegion.map(branch => (
                 <BranchCard key={branch.id} branch={branch} region={selectedRegion} onViewDetails={() => handleBranchSelect(branch.id)} />
            ))}
          </div>
        </Alert>
      )}
      
      {selectedBranch && selectedRegion && (
        <>
        <Separator />
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground flex items-center"><Building className="mr-3 h-6 w-6 text-primary" />Branch Overview: {selectedBranch.name}</h2>
          <BranchCard branch={selectedBranch} region={selectedRegion} />
        
          <Separator />
          <h2 className="text-2xl font-semibold text-foreground flex items-center"><HardDrive className="mr-3 h-6 w-6 text-primary" />Devices in {selectedBranch.name}</h2>
          <div className="mb-6 p-4 bg-card rounded-lg shadow border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label htmlFor="search-devices-national" className="block text-sm font-medium text-foreground mb-1">Search Devices</label>
                <div className="relative">
                  <Input
                    id="search-devices-national"
                    type="text"
                    placeholder="Search by name or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label htmlFor="status-filter-national" className="block text-sm font-medium text-foreground mb-1">Filter by Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter-national">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {isLoadingDevices && (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Fetching devices for {selectedBranch.name}...
            </div>
          )}

          {!isLoadingDevices && devicesInSelectedBranch.length > 0 ? (
            filteredDevices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDevices.map(device => (
                  <DeviceCard key={device.id} device={device} canManage={false} /> // National users cannot manage devices directly here
                ))}
              </div>
            ) : (
              <Alert>
                <ListFilter className="h-5 w-5" />
                <AlertTitle>No Devices Found</AlertTitle>
                <AlertDescription>No devices match your current search/filter criteria in {selectedBranch.name}.</AlertDescription>
              </Alert>
            )
          ) : (
            !isLoadingDevices && (
              <Alert>
                <HardDrive className="h-5 w-5" />
                <AlertTitle>No Devices in Branch</AlertTitle>
                <AlertDescription>{selectedBranch.name} currently has no devices registered.</AlertDescription>
              </Alert>
            )
          )}
           <CardFooter className="mt-6">
             <Link href="/dashboard/devices" passHref>
                <Button variant="outline">
                  View All Devices Page (filtered by selection)
                </Button>
              </Link>
           </CardFooter>
        </section>
        </>
      )}
    </div>
  );
}

