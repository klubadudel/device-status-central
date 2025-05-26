
'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Branch, Region } from '@/types';
import { getBranches, getRegions, deleteBranch as deleteBranchService } from '@/lib/data-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Search, Building2, AlertTriangle, Filter, MapPin } from 'lucide-react';
import { AddBranchDialog } from '@/components/dashboard/dialogs/AddBranchDialog';
import { EditBranchDialog } from '@/components/dashboard/dialogs/EditBranchDialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function BranchManagementPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  // Dialog states
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [isDeleteBranchModalOpen, setIsDeleteBranchModalOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchesData = await getBranches();
      setAllBranches(Array.isArray(branchesData) ? branchesData : []);
      const regionsData = await getRegions();
      setAllRegions(Array.isArray(regionsData) ? regionsData : []);
    } catch (error) {
      console.error("Failed to fetch branches or regions:", error);
      toast({ title: "Error", description: "Could not load initial data.", variant: "destructive" });
      setAllBranches([]);
      setAllRegions([]);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (role === 'national') {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [role, fetchData]);

  const handleBranchAdded = () => {
    fetchData(); 
  };
  const handleBranchUpdated = () => {
    fetchData();
  };
  const handleBranchDeletedConfirmed = async () => {
    if (branchToDelete) {
      try {
        await deleteBranchService(branchToDelete.id);
        toast({ title: "Branch Deleted", description: `Branch "${branchToDelete.name}" has been deleted.` });
        fetchData();
      } catch (error) {
        console.error("Error deleting branch:", error);
        toast({ title: "Error", description: "Failed to delete branch.", variant: "destructive" });
      }
    }
    setIsDeleteBranchModalOpen(false);
    setBranchToDelete(null);
  };


  const openEditBranchModal = (branch: Branch) => {
    setBranchToEdit(branch);
    setIsEditBranchModalOpen(true);
  };

  const openDeleteBranchModal = (branchId: string, branchName: string) => {
    setBranchToDelete({ id: branchId, name: branchName });
    setIsDeleteBranchModalOpen(true);
  };

  const filteredBranches = useMemo(() => {
    if (!Array.isArray(allBranches)) { 
        return [];
    }
    return allBranches
      .filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.managerName && b.managerName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .filter(b => regionFilter === 'all' || b.regionId === regionFilter);
  }, [allBranches, searchTerm, regionFilter]);

  const getRegionName = (regionId: string) => {
    if (!Array.isArray(allRegions)) return 'Unknown Region';
    const region = allRegions.find(r => r.id === regionId);
    return region ? region.name : 'Unknown Region';
  }


  if (isLoading) {
    return (
       <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (role !== 'national') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>This page is intended for National Administrators only.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-3xl font-bold text-primary flex items-center">
              <Building2 className="mr-3 h-8 w-8" /> Branch Management
            </CardTitle>
            <CardDescription>Create, view, and manage branches across all regions.</CardDescription>
          </div>
          <Button onClick={() => setIsAddBranchModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Branch
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label htmlFor="search-branches" className="block text-sm font-medium text-foreground mb-1">Search Branches</label>
                <div className="relative">
                  <Input
                    id="search-branches"
                    type="text"
                    placeholder="Search by name, address, manager..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label htmlFor="region-filter" className="block text-sm font-medium text-foreground mb-1">Filter by Region</label>
                <Select value={regionFilter} onValueChange={setRegionFilter} disabled={allRegions.length === 0}>
                  <SelectTrigger id="region-filter">
                    <SelectValue placeholder={allRegions.length === 0 ? "No regions available" : "All Regions"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {Array.isArray(allRegions) && [...allRegions]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(region => (
                      <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredBranches.length === 0 ? (
            <Alert>
              <Filter className="h-5 w-5" />
              <AlertTitle>No Branches Found</AlertTitle>
              <AlertDescription>
                No branches match your current search or filter criteria. Try adjusting your filters or create a new branch.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>{branch.address}</TableCell>
                      <TableCell>{getRegionName(branch.regionId)}</TableCell>
                      <TableCell>{branch.managerName || 'N/A'}</TableCell>
                      <TableCell>{branch.contactPhone || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditBranchModal(branch)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteBranchModal(branch.id, branch.name)}
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isAddBranchModalOpen && (
        <AddBranchDialog
          isOpen={isAddBranchModalOpen}
          onClose={() => setIsAddBranchModalOpen(false)}
          onBranchAdded={handleBranchAdded}
        />
      )}
      {isEditBranchModalOpen && branchToEdit && (
        <EditBranchDialog
          isOpen={isEditBranchModalOpen}
          onClose={() => { setIsEditBranchModalOpen(false); setBranchToEdit(null); }}
          onBranchUpdated={handleBranchUpdated}
          branchToEdit={branchToEdit}
          allRegions={allRegions}
        />
      )}
      {isDeleteBranchModalOpen && branchToDelete && (
         <AlertDialog open={isDeleteBranchModalOpen} onOpenChange={setIsDeleteBranchModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the branch &quot;{branchToDelete.name}&quot;? This will also delete all associated devices. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteBranchModalOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBranchDeletedConfirmed} className="bg-destructive hover:bg-destructive/90">Delete Branch</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
