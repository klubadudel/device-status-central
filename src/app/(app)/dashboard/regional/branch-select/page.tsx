
'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Branch, Region, Device } from '@/types';
import { getBranchesByRegion, getRegionById, getDevicesByBranchId } from '@/lib/data-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BranchCard } from '@/components/dashboard/BranchCard';
import { DeviceCard } from '@/components/dashboard/DeviceCard';
import { AlertTriangle, Building, HardDrive, Info, ListFilter, Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function RegionalBranchSelectPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [region, setRegion] = useState<Region | null>(null);
  const [branchesInRegion, setBranchesInRegion] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [devicesInSelectedBranch, setDevicesInSelectedBranch] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');


  useEffect(() => {
    const fetchInitialData = async () => {
      if (user && role === 'regional' && user.regionId) {
        setIsLoading(true);
        setIsLoadingBranches(true);
        try {
          const currentRegion = await getRegionById(user.regionId);
          setRegion(currentRegion || null);
          if (currentRegion) {
            const branchesData = await getBranchesByRegion(currentRegion.id);
            setBranchesInRegion(branchesData || []);
          } else {
            setBranchesInRegion([]);
          }
        } catch (error) {
          console.error("Failed to fetch regional data:", error);
          toast({ title: "Error", description: "Could not load regional data.", variant: "destructive"});
          setRegion(null);
          setBranchesInRegion([]);
        } finally {
          setIsLoading(false);
          setIsLoadingBranches(false);
        }
      } else if (user && role !== 'regional') {
        setIsLoading(false); 
      }
    };
    fetchInitialData();
  }, [user, role, toast]);

  const handleBranchSelect = useCallback(async (branchId: string | undefined) => {
    if (!branchId) {
      setSelectedBranch(null);
      setDevicesInSelectedBranch([]);
      return;
    }
    const branch = branchesInRegion.find(b => b.id === branchId);
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
  }, [branchesInRegion, toast]);

  const filteredDevices = useMemo(() => devicesInSelectedBranch
    .filter(device => device.name.toLowerCase().includes(searchTerm.toLowerCase()) || device.type.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(device => statusFilter === 'all' || device.status === statusFilter), [devicesInSelectedBranch, searchTerm, statusFilter]);


  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-10 w-full md:w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (role !== 'regional') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>This page is intended for regional users only.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!user?.regionId || !region) {
     return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="warning">
          <Info className="h-5 w-5" />
          <AlertTitle>Region Information Missing</AlertTitle>
          <AlertDescription>
            Your user account is not assigned to a specific region, or the region data could not be loaded. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Regional Dashboard: {region.name}</CardTitle>
          <CardDescription>Select a branch within your region to view its details and device statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBranches ? (
            <div className="flex items-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading branches...
            </div>
          ) : branchesInRegion.length > 0 ? (
            <div className="max-w-md">
              <label htmlFor="branch-select" className="block text-sm font-medium text-foreground mb-1">Select Branch</label>
              <Select onValueChange={handleBranchSelect} value={selectedBranch?.id || ""}>
                <SelectTrigger id="branch-select" className="w-full">
                  <SelectValue placeholder="Choose a branch..." />
                </SelectTrigger>
                <SelectContent>
                  {branchesInRegion.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} - {branch.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-muted-foreground">No branches found in your assigned region ({region.name}).</p>
          )}
        </CardContent>
      </Card>

      {selectedBranch && (
        <>
        <Separator />
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground flex items-center"><Building className="mr-3 h-6 w-6 text-primary" />Branch Overview: {selectedBranch.name}</h2>
          <BranchCard branch={selectedBranch} region={region} />
        
          <Separator />
          <h2 className="text-2xl font-semibold text-foreground flex items-center"><HardDrive className="mr-3 h-6 w-6 text-primary" />Devices in {selectedBranch.name}</h2>
           <div className="mb-6 p-4 bg-card rounded-lg shadow border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label htmlFor="search-devices" className="block text-sm font-medium text-foreground mb-1">Search Devices</label>
                <div className="relative">
                  <Input
                    id="search-devices"
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
                <label htmlFor="status-filter" className="block text-sm font-medium text-foreground mb-1">Filter by Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
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

          {!isLoadingDevices && filteredDevices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDevices.map(device => (
                <DeviceCard key={device.id} device={device} canManage={false} />
              ))}
            </div>
          ) : (
             !isLoadingDevices && (
                <Alert>
                <ListFilter className="h-5 w-5" />
                <AlertTitle>No Devices Found</AlertTitle>
                <AlertDescription>
                    There are no devices matching your current filters for {selectedBranch.name}, or the branch has no devices.
                </AlertDescription>
                </Alert>
             )
          )}
           <CardFooter className="mt-6">
             <Link href="/dashboard/devices" passHref>
                <Button variant="outline">
                  View All Devices Page (filtered by selected branch)
                </Button>
              </Link>
           </CardFooter>
        </section>
        </>
      )}
    </div>
  );
}
