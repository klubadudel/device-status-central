'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserFormFields, addUserFormSchema, type AddUserFormValues } from './UserFormFields'; 
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { getRegions, getBranches } from '@/lib/data-service'; 
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; 
import type { User, Region, Branch, UserRole } from '@/types';

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void; 
}

export const AddUserDialog: React.FC<AddUserDialogProps> = ({ isOpen, onClose, onUserAdded }) => {
  const { toast } = useToast();
  const { register } = useAuth(); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const form = useForm<AddUserFormValues>({ 
    resolver: zodResolver(addUserFormSchema), // Use imported addUserFormSchema
    defaultValues: {
      username: '',
      name: '',
      email: '',
      role: 'branch' as UserRole, 
      password: '', 
      branchId: undefined,
      regionId: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      const fetchDropdownData = async () => {
        try {
          // These are synchronous in mock, but keep async for potential real API
          // This component fetches its own list of regions and branches for the dropdowns
          const fetchedRegions = await getRegions();
          const fetchedBranches = await getBranches();
          setRegions(fetchedRegions);
          setBranches(fetchedBranches);
        } catch (error) {
          console.error("Failed to fetch regions or branches for dialog:", error);
          toast({ title: "Error", description: "Could not load data for user creation form.", variant: "destructive"});
        }
      };
      fetchDropdownData();
      form.reset({ // Reset form to default values when opening
        username: '',
        name: '',
        email: '',
        role: 'branch' as UserRole,
        password: '',
        branchId: undefined,
        regionId: undefined,
      }); 
    }
  }, [isOpen, form, toast]);

  const onSubmit = async (values: AddUserFormValues) => {
    setIsSubmitting(true);
    try {
      let finalBranchId: string | undefined = undefined;
      let finalRegionId: string | undefined = undefined;

      if (values.role === 'branch') {
        finalBranchId = values.branchId;
        if (finalBranchId) {
          const selectedBranch = branches.find(b => b.id === finalBranchId);
          finalRegionId = selectedBranch?.regionId;
        }
      } else if (values.role === 'regional') {
        finalRegionId = values.regionId;
      }
      // For 'national' role, finalBranchId and finalRegionId remain undefined

      const success = await register(
        values.email,
        values.password, // Password is required by addUserFormSchema
        values.role,
        values.name,
        finalBranchId,
        finalRegionId
      );

      if (success) {
        onUserAdded(); 
        toast({
          title: "User Added",
          description: `Successfully created user "${values.name}".`,
        });
        onClose();
      } else {
        // This case might not be reached if register throws an error for failure
        throw new Error("User registration process failed in AuthContext.");
      }
    } catch (error) {
      console.error("Error adding user:", error);
      toast({
        title: "Error Adding User",
        description: error instanceof Error ? error.message : "Failed to add user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New User</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new user account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <div className="max-h-[60vh] overflow-y-auto px-1 py-2 pr-3">
              <UserFormFields form={form} isEditMode={false} allRegions={regions} allBranches={branches} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "Adding User..." : "Add User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
