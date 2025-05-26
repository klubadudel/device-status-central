
'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DeviceCard } from '@/components/dashboard/DeviceCard';
import type { Device, Branch, Region } from '@/types';
import {
  getBranchById,
  getBranchesByRegion,
  getRegions,
  getBranches as getAllBranches,
  listenToDevicesByBranchId,
  // listenToAllDevices // Keep if planning to use for a "view all" mode
} from '@/lib/data-service';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListFilter, Search, RefreshCw, Globe, Loader2, FileText } from 'lucide-react';
import { AddDeviceDialog } from '@/components/dashboard/dialogs/AddDeviceDialog';
import { EditDeviceDialog } from '@/components/dashboard/dialogs/EditDeviceDialog';
import { DeleteDeviceDialog } from '@/components/dashboard/dialogs/DeleteDeviceDialog';
import { DeviceLogsDialog } from '@/components/dashboard/dialogs/DeviceLogsDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Unsubscribe } from 'firebase/firestore';


export default function DevicesPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(true); // General page loading
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true); // Specific to device list
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [regions, setRegions] = useState<Region[]>([]);
  const [branchesForSelection, setBranchesForSelection] = useState<Branch[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | undefined>(undefined);
  const [selectedBranchIdForView, setSelectedBranchIdForView] = useState<string | undefined>(undefined);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null);
  const [deviceIdToDelete, setDeviceIdToDelete] = useState<string | null>(null);
  const [deviceIdForLogs, setDeviceIdForLogs] = useState<string | null>(null);

  const canManageDevices = role === 'branch';
  const deviceListenerUnsubscribeRef = useRef<Unsubscribe | null>(null);

  const fetchFilterData = useCallback(async () => {
    if (!user || (role !== 'regional' && role !== 'national')) {
      setIsLoadingFilters(false);
      return;
    }

    setIsLoadingFilters(true);
    try {
      const fetchedRegions = await getRegions();
      setRegions(fetchedRegions || []);

      if (role === 'regional' && user.regionId) {
          setBranchesForSelection(await getBranchesByRegion(user.regionId) || []);
          if (!selectedRegionId) setSelectedRegionId(user.regionId);
      } else if (role === 'national') {
           if (selectedRegionId) {
              setBranchesForSelection(await getBranchesByRegion(selectedRegionId) || []);
          } else {
              setBranchesForSelection(await getAllBranches() || []);
          }
      }
    } catch (error) {
      console.error("Error fetching filter data:", error);
      toast({ title: "Error", description: "Could not load filter options.", variant: "destructive" });
    } finally {
      setIsLoadingFilters(false);
    }
  }, [user, role, selectedRegionId, toast]);

  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  const setupAndListenToDevices = useCallback(async () => {
    console.log("DevicesPage: setupAndListenToDevices called. SelectedBranchIdForView:", selectedBranchIdForView);
    // Clean up previous listener if it exists
    if (deviceListenerUnsubscribeRef.current) {
      console.log("DevicesPage: Unsubscribing from previous device listener.");
      deviceListenerUnsubscribeRef.current();
      deviceListenerUnsubscribeRef.current = null;
    }

    if (!user) {
      setIsLoading(false);
      setIsLoadingDevices(false);
      setDevices([]);
      setSelectedBranch(null);
      return;
    }

    setIsLoading(true); // General loading for the page or refresh action
    setIsLoadingDevices(true);
    setDevices([]); // Clear devices before fetching/listening
    setSelectedBranch(null);

    try {
      let branchIdToListen: string | undefined = undefined;
      if (role === 'branch' && user.branchId) {
        branchIdToListen = user.branchId;
      } else if ((role === 'regional' || role === 'national') && selectedBranchIdForView) {
        branchIdToListen = selectedBranchIdForView;
      }

      if (branchIdToListen) {
        console.log(`DevicesPage: Fetching branch details for ${branchIdToListen} and setting up listeners.`);
        const branch = await getBranchById(branchIdToListen);
        setSelectedBranch(branch || null);

        deviceListenerUnsubscribeRef.current = listenToDevicesByBranchId(branchIdToListen, (fetchedDevices) => {
          setDevices(fetchedDevices || []);
          setIsLoadingDevices(false); // Devices data has arrived or updated
        });
      } else {
        console.log("DevicesPage: No specific branch to listen for. Clearing device list.");
        setIsLoadingDevices(false); // No devices to load if no branch selected
      }
    } catch (error) {
      console.error("Error setting up device listeners or fetching branch details:", error);
      toast({ title: "Error", description: "Could not load device data.", variant: "destructive" });
      setSelectedBranch(null); // Ensure branch is cleared on error
      setIsLoadingDevices(false);
    } finally {
      // General loading state should perhaps be handled more carefully,
      // it might be set to false too early if setIsLoadingDevices is the primary indicator.
      // For now, let's rely on setIsLoadingDevices for the device section.
      setIsLoading(false);
    }
  }, [user, role, selectedBranchIdForView, toast]);

  useEffect(() => {
    console.log("DevicesPage: Main listener useEffect triggered. User, role, or selectedBranchIdForView changed.");
    setupAndListenToDevices();

    // Cleanup function for this effect
    return () => {
      if (deviceListenerUnsubscribeRef.current) {
        console.log("DevicesPage: Cleaning up device listener on unmount or dependency change.");
        deviceListenerUnsubscribeRef.current();
        deviceListenerUnsubscribeRef.current = null;
      }
    };
  }, [setupAndListenToDevices]); // Depends only on the memoized setupAndListenToDevices

  useEffect(() => {
    const updateBranchesForNational = async () => {
        if (role === 'national') {
            setIsLoadingFilters(true);
            try {
                if (selectedRegionId) {
                    setBranchesForSelection(await getBranchesByRegion(selectedRegionId) || []);
                } else {
                    setBranchesForSelection(await getAllBranches() || []);
                }
            } catch (error) {
                console.error("Error updating branches for national admin:", error);
                toast({ title: "Error", description: "Could not update branch list for selected region.", variant: "destructive"});
                setBranchesForSelection([]);
            } finally {
                setIsLoadingFilters(false);
            }
            // If region changes, reset selected branch for view to avoid showing stale devices.
            // The main listener useEffect will then pick up the change in selectedBranchIdForView.
            if (selectedBranchIdForView) setSelectedBranchIdForView(undefined);
        }
    };
    if (role === 'national') updateBranchesForNational();
  }, [selectedRegionId, role, toast]); // Removed selectedBranchIdForView as it causes loop with previous logic

  const handleRefresh = useCallback(() => {
    console.log("DevicesPage: Manual refresh triggered.");
    toast({title: "Refreshing Devices", description: "Fetching latest device statuses..."});
    // setupAndListenToDevices will handle cleanup of old listeners and setup of new ones.
    setupAndListenToDevices();
  }, [setupAndListenToDevices, toast]);


  const handleDeviceAdded = () => { /* Listener handles update, or could call handleRefresh */ };
  const handleDeviceUpdated = () => { /* Listener handles update, or could call handleRefresh */ };
  const handleDeviceDeleted = () => { /* Listener handles update, or could call handleRefresh */ };

  const openEditModal = (device: Device) => {
    setDeviceToEdit(device);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (deviceId: string) => {
    setDeviceIdToDelete(deviceId);
    setIsDeleteModalOpen(true);
  };

  const openLogsModal = (deviceId: string) => {
    setDeviceIdForLogs(deviceId);
    setIsLogsModalOpen(true);
  };

  const filteredDevices = devices
    .filter(device => device.name.toLowerCase().includes(searchTerm.toLowerCase()) || device.type.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(device => statusFilter === 'all' || device.status === statusFilter);

  // More precise loading state for the main content area
  const showPageSkeletons = isLoading && !user; // Initial full page skeleton
  const showDeviceSkeletons = isLoadingDevices && (selectedBranchIdForView || (role === 'branch' && user?.branchId));


  if (showPageSkeletons) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            {selectedBranch ? `${selectedBranch.name} Devices` : 'Device Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {selectedBranch ? `Manage and monitor devices for ${selectedBranch.name}.` : `View devices across selected scopes. Select a branch to view devices.`}
          </p>
        </div>
        {canManageDevices && selectedBranch && (
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Device
          </Button>
        )}
      </div>

      { (role === 'regional' || role === 'national') && (
        <Card className="mb-6 p-4 shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {role === 'national' && (
              <div>
                <Label htmlFor="region-select">Select Region</Label>
                <Select value={selectedRegionId} onValueChange={(value) => setSelectedRegionId(value === "all" ? undefined : value)} disabled={isLoadingFilters}>
                  <SelectTrigger id="region-select">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map(region => (
                      <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                    ))}
                     {regions.length === 0 && <SelectItem value="no-regions" disabled>No regions available</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
             <div>
                <Label htmlFor="branch-select-view">Select Branch to View</Label>
                <Select
                    value={selectedBranchIdForView}
                    onValueChange={(value) => setSelectedBranchIdForView(value === "all" ? undefined : value)}
                    disabled={isLoadingFilters || (role === 'regional' && !user?.regionId && branchesForSelection.length === 0)}
                >
                  <SelectTrigger id="branch-select-view">
                    <SelectValue placeholder={isLoadingFilters ? "Loading branches..." : (branchesForSelection.length > 0 ? "Select a branch" : (role==='regional' && !user?.regionId ? "No region assigned" : "No branches available"))} />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">Select a branch</SelectItem>
                    {branchesForSelection.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                    {branchesForSelection.length === 0 && <SelectItem value="no-branches-selection" disabled>No branches available</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
          </div>
        </Card>
      )}


      { (selectedBranch || ( (role === 'regional' || role === 'national') && selectedBranchIdForView)) && (
        <div className="mb-6 p-4 bg-card rounded-lg shadow border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="search-devices">Search Devices</Label>
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
              <Label htmlFor="status-filter">Filter by Status</Label>
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
            <Button onClick={handleRefresh} variant="outline" className="w-full md:w-auto" disabled={isLoadingDevices || isLoading}>
              {isLoadingDevices || isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
               {isLoadingDevices || isLoading ? 'Refreshing...' : 'Refresh Devices'}
            </Button>
          </div>
        </div>
      )}

      {showDeviceSkeletons ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-lg" />)}
        </div>
      ) : !selectedBranchIdForView && (role === 'regional' || role === 'national') ? (
          <Alert className="mt-8 border-primary/50 bg-primary/5 text-primary">
            <Globe className="h-5 w-5" />
            <AlertTitle className="font-semibold">Select a Scope</AlertTitle>
            <AlertDescription>
              Please select a {role === 'national' && !selectedRegionId ? 'region and then a' : ''} branch from the dropdowns above to view its devices.
            </AlertDescription>
          </Alert>
      ) : filteredDevices.length === 0 && (selectedBranchIdForView || (role === 'branch' && !!user?.branchId)) ? (
         <Alert className="mt-8">
            <ListFilter className="h-5 w-5" />
            <AlertTitle>No Devices Found</AlertTitle>
            <AlertDescription>
              There are no devices matching your current filters for {selectedBranch?.name || 'the selected branch'}.
              {canManageDevices && <span className="block mt-2">You can <Button variant="link" className="p-0 h-auto" onClick={() => setIsAddModalOpen(true)}>add a new device</Button>.</span>}
            </AlertDescription>
          </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDevices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onEdit={canManageDevices ? openEditModal : undefined}
              onDelete={canManageDevices ? openDeleteModal : undefined}
              onViewLogs={openLogsModal}
              canManage={canManageDevices}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {isAddModalOpen && selectedBranch && (
        <AddDeviceDialog
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onDeviceAdded={handleDeviceAdded}
          branchId={selectedBranch.id}
        />
      )}
      {isEditModalOpen && deviceToEdit && (
        <EditDeviceDialog
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setDeviceToEdit(null); }}
          onDeviceUpdated={handleDeviceUpdated}
          device={deviceToEdit}
        />
      )}
      {isDeleteModalOpen && deviceIdToDelete && (
        <DeleteDeviceDialog
          isOpen={isDeleteModalOpen}
          onClose={() => { setIsDeleteModalOpen(false); setDeviceIdToDelete(null); }}
          onDeviceDeleted={handleDeviceDeleted}
          deviceId={deviceIdToDelete}
          deviceName={devices.find(d => d.id === deviceIdToDelete)?.name || 'this device'}
        />
      )}
      {isLogsModalOpen && deviceIdForLogs && (
        <DeviceLogsDialog
          isOpen={isLogsModalOpen}
          onClose={() => { setIsLogsModalOpen(false); setDeviceIdForLogs(null); }}
          deviceId={deviceIdForLogs}
          deviceName={devices.find(d => d.id === deviceIdForLogs)?.name || 'Device'}
        />
      )}
    </div>
  );
}
