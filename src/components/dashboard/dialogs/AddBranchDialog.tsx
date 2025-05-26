
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
import { addBranch, getRegions } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import type { Branch, Region } from '@/types';

interface AddBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchAdded: (newBranch: Branch) => void;
}

export const AddBranchDialog: React.FC<AddBranchDialogProps> = ({ isOpen, onClose, onBranchAdded }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: '',
      address: '',
      regionId: undefined,
      managerName: '',
      contactPhone: '',
      establishedDate: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setIsLoadingRegions(true);
      getRegions()
        .then(setRegions)
        .catch(err => {
          console.error("Failed to fetch regions for dialog:", err);
          toast({ title: "Error", description: "Could not load regions for form.", variant: "destructive"});
          setRegions([]); // Ensure regions is an empty array on error
        })
        .finally(() => setIsLoadingRegions(false));
      form.reset(); // Reset form when dialog opens
    }
  }, [isOpen, form, toast]);

  const onSubmit = async (values: BranchFormValues) => {
    setIsSubmitting(true);
    try {
      // Convert Date object to ISO string for establishedDate, or undefined if not set
      const newBranchData: Omit<Branch, 'id'> = {
        ...values,
        establishedDate: values.establishedDate ? values.establishedDate.toISOString() : undefined,
      };
      const newBranch = await addBranch(newBranchData); // Await the async call
      onBranchAdded(newBranch);
      toast({
        title: "Branch Created",
        description: `Successfully created branch "${newBranch.name}".`,
      });
      onClose();
    } catch (error) {
      console.error("Error creating branch:", error);
      toast({
        title: "Error Creating Branch",
        description: (error instanceof Error ? error.message : "Failed to create branch. Please try again."),
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
          <DialogTitle className="text-2xl">Create New Branch</DialogTitle>
          <DialogDescription>
            Fill in the details to establish a new branch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <div className="max-h-[60vh] overflow-y-auto px-1 py-2 pr-3">
              <BranchFormFields form={form} allRegions={regions} isLoadingRegions={isLoadingRegions} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingRegions || regions.length === 0} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "Creating Branch..." : "Create Branch"}
              </Button>
            </DialogFooter>
            {!isLoadingRegions && regions.length === 0 && (
                <p className="text-sm text-destructive text-center mt-2">Cannot create branch: No regions available or failed to load regions. Please create a region first or check console for errors.</p>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
