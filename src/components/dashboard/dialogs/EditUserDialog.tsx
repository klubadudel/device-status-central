
'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserFormFields, userFormSchema, UserFormValues } from './UserFormFields';
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
import { updateUser, getRegions, getBranches } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import type { User, Region, Branch } from '@/types';
import { useAuth } from '@/hooks/useAuth';


interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void; // Changed to not expect User object
  userToEdit: User;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = ({ isOpen, onClose, onUserUpdated, userToEdit }) => {
  const { toast } = useToast();
  const { refreshUser: refreshAuthContextUser, user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema), // Password is optional by default in userFormSchema
    defaultValues: {
      username: userToEdit.username,
      name: userToEdit.name,
      email: userToEdit.email,
      role: userToEdit.role,
      password: '', // Keep password blank unless changing
      branchId: userToEdit.branchId || undefined,
      regionId: userToEdit.regionId || undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      const fetchDropdownData = async () => {
        try {
          const [fetchedRegions, fetchedBranches] = await Promise.all([getRegions(), getBranches()]);
          setRegions(fetchedRegions);
          setBranches(fetchedBranches);

          // Reset form with userToEdit data and ensure regionId for branch users is correctly pre-filled if possible
          let initialRegionId = userToEdit.regionId;
          if (userToEdit.role === 'branch' && userToEdit.branchId && !userToEdit.regionId) {
             const branchDetails = fetchedBranches.find(b => b.id === userToEdit.branchId);
             if (branchDetails) initialRegionId = branchDetails.regionId;
          }

          form.reset({
            username: userToEdit.username,
            name: userToEdit.name,
            email: userToEdit.email,
            role: userToEdit.role,
            password: '', // Keep password blank
            branchId: userToEdit.branchId || undefined,
            regionId: initialRegionId || undefined,
          });

        } catch (error) {
          console.error("Failed to fetch regions or branches for dialog:", error);
          toast({ title: "Error", description: "Could not load data for user edit form.", variant: "destructive"});
        }
      };
      fetchDropdownData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userToEdit, form]); // toast is stable


  const onSubmit = async (values: UserFormValues) => {
    setIsSubmitting(true);
    try {
      let regionIdForPayload = values.regionId;
      if (values.role === 'branch' && values.branchId) {
          const selectedBranch = branches.find(b => b.id === values.branchId);
          if (selectedBranch) regionIdForPayload = selectedBranch.regionId;
      }


      const updatePayload: Partial<Omit<User, 'id'>> = { // Omit 'id' as it's the identifier
        username: values.username,
        name: values.name,
        email: values.email,
        role: values.role,
        branchId: values.role === 'branch' ? values.branchId : undefined,
        regionId: values.role === 'regional' ? regionIdForPayload : (values.role === 'branch' ? regionIdForPayload : undefined),
      };

      if (values.password && values.password.length > 0) { // Only include password if it's being changed
        updatePayload.password = values.password; // Note: data-service updateUser needs to handle password hashing if this were real
      }

      const updatedUserFromDb = await updateUser(userToEdit.id, updatePayload);
      if (updatedUserFromDb) {
        onUserUpdated(); // Signal parent to refetch
        toast({
          title: "User Updated",
          description: `Successfully updated user "${updatedUserFromDb.name}".`,
        });
        // If the edited user is the currently logged-in user, refresh their context
        if (currentUser?.id === updatedUserFromDb.id) {
          refreshAuthContextUser(updatedUserFromDb);
        }
        onClose();
      } else {
        throw new Error("Update operation failed or returned no user.");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error Updating User",
        description: error instanceof Error ? error.message : "Failed to update user. Please try again.",
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
          <DialogTitle className="text-2xl">Edit User: {userToEdit.name}</DialogTitle>
          <DialogDescription>
            Update the details for this user account. Password field is optional.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <div className="max-h-[60vh] overflow-y-auto px-1 py-2 pr-3">
              <UserFormFields form={form} isEditMode={true} allRegions={regions} allBranches={branches} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "Saving Changes..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
