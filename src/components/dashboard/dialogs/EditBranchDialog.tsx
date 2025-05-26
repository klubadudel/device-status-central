
'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BranchFormFields, branchFormSchema, BranchFormValues } from './BranchFormFields';
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
import { updateBranch, getRegions } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import type { Branch, Region } from '@/types';

interface EditBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchUpdated: () => void;
  branchToEdit: Branch | null;
  allRegions: Region[]; // Pass allRegions from parent to avoid re-fetching
}

export const EditBranchDialog: React.FC<EditBranchDialogProps> = ({ isOpen, onClose, onBranchUpdated, branchToEdit, allRegions }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Regions are passed as a prop, so no need to fetch them here.
  // const [regions, setRegions] = useState<Region[]>(allRegions);
  // const [isLoadingRegions, setIsLoadingRegions] = useState(false);


  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    // Default values will be set in useEffect when branchToEdit is available
  });

  useEffect(() => {
    if (isOpen && branchToEdit) {
      form.reset({
        name: branchToEdit.name || '',
        address: branchToEdit.address || '',
        regionId: branchToEdit.regionId || undefined,
        managerName: branchToEdit.managerName || '',
        contactPhone: branchToEdit.contactPhone || '',
        establishedDate: branchToEdit.establishedDate ? new Date(branchToEdit.establishedDate) : undefined,
      });
    }
  }, [isOpen, branchToEdit, form]);

  const onSubmit = async (values: BranchFormValues) => {
    if (!branchToEdit) return;
    setIsSubmitting(true);
    try {
      const updatedBranchData: Partial<Omit<Branch, 'id'>> = {
        ...values,
        establishedDate: values.establishedDate ? values.establishedDate.toISOString() : undefined,
      };
      await updateBranch(branchToEdit.id, updatedBranchData);
      onBranchUpdated();
      toast({
        title: "Branch Updated",
        description: `Successfully updated branch "${values.name}".`,
      });
      onClose();
    } catch (error) {
      console.error("Error updating branch:", error);
      toast({
        title: "Error Updating Branch",
        description: (error instanceof Error ? error.message : "Failed to update branch. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!branchToEdit) {
    return null; // Or some loading/error state if preferred, but parent controls opening
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Branch: {branchToEdit.name}</DialogTitle>
          <DialogDescription>
            Modify the details for this branch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <div className="max-h-[60vh] overflow-y-auto px-1 py-2 pr-3">
              <BranchFormFields form={form} allRegions={allRegions} isLoadingRegions={false} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || allRegions.length === 0} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "Saving Changes..." : "Save Changes"}
              </Button>
            </DialogFooter>
             {allRegions.length === 0 && (
                <p className="text-sm text-destructive text-center mt-2">Cannot edit branch: No regions available or failed to load regions. Please ensure regions exist.</p>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
