
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Region, Branch, UserRole } from '@/types';

const ALL_REGIONS_FILTER_VALUE = "_all_regions_";

// Define the base object structure without refinement first
const baseUserObjectSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters.").max(30),
  name: z.string().min(2, "Full name must be at least 2 characters.").max(50),
  email: z.string().email("Invalid email address."),
  role: z.enum(['branch', 'regional', 'national']),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')), // Optional for edit
  branchId: z.string().optional(),
  regionId: z.string().optional(),
});

// Define the refinement function separately
// This refinement will be applied to both userFormSchema (edit mode) and addUserFormSchema (add mode)
const userSchemaRefinement = (data: z.infer<typeof baseUserObjectSchema> | (z.infer<typeof baseUserObjectSchema> & { password?: string }), ctx: z.RefinementCtx) => {
  if (data.role === 'branch' && !data.branchId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Branch ID is required for branch users.",
      path: ['branchId'],
    });
  }
  if (data.role === 'regional' && !data.regionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Region ID is required for regional users.",
      path: ['regionId'],
    });
  }
};

// Schema for editing a user (password optional)
export const userFormSchema = baseUserObjectSchema.superRefine(userSchemaRefinement);
export type UserFormValues = z.infer<typeof userFormSchema>;

// Schema for adding a user (password required)
// Extend the base schema to make password non-optional, then apply refinements.
export const addUserFormSchema = baseUserObjectSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters."), // Overrides the optional password to make it required
}).superRefine(userSchemaRefinement); // Apply the same role-based refinements

export type AddUserFormValues = z.infer<typeof addUserFormSchema>;


interface UserFormFieldsProps {
  form: UseFormReturn<UserFormValues | AddUserFormValues>; 
  isEditMode?: boolean;
  allRegions: Region[]; 
  allBranches: Branch[]; 
}

export const UserFormFields: React.FC<UserFormFieldsProps> = ({ form, isEditMode = false, allRegions, allBranches }) => {
  const selectedRole = form.watch('role');
  const selectedRegionForBranchFiltering = form.watch('regionId');

  const branchesForSelectedRoleAndFilter = React.useMemo(() => {
    if (selectedRole === 'branch') {
      if (selectedRegionForBranchFiltering && selectedRegionForBranchFiltering !== ALL_REGIONS_FILTER_VALUE) {
        return allBranches.filter(b => b.regionId === selectedRegionForBranchFiltering);
      }
      return allBranches; // Show all branches if no region filter or "All Regions" is selected
    }
    return allBranches; // Not relevant for other roles or handled by direct assignment
  }, [selectedRole, selectedRegionForBranchFiltering, allBranches]);
  
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input placeholder="e.g., john.doe" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g., John Doe" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email Address</FormLabel>
            <FormControl>
              <Input type="email" placeholder="e.g., user@example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Role</FormLabel>
            <Select onValueChange={(value) => {
                field.onChange(value);
                form.setValue('branchId', undefined as any); 
                form.setValue('regionId', undefined as any);
            }} defaultValue={field.value as UserRole}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select user role" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="branch">Branch User</SelectItem>
                <SelectItem value="regional">Regional Manager</SelectItem>
                <SelectItem value="national">National Administrator</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{isEditMode ? 'New Password (Optional)' : 'Password'}</FormLabel>
            <FormControl>
              <Input type="password" placeholder={isEditMode ? "Leave blank to keep current" : "••••••••"} {...field} value={field.value || ''} />
            </FormControl>
            <FormDescription>{isEditMode ? "Enter a new password to change it." : "Minimum 6 characters."}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedRole === 'regional' && (
        <FormField
          control={form.control}
          name="regionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign to Region</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined} >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allRegions.map(region => (
                    <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                  ))}
                  {allRegions.length === 0 && <SelectItem value="no-regions" disabled>No regions available</SelectItem>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {selectedRole === 'branch' && (
        <>
          <FormField
            control={form.control}
            name="regionId" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Filter Branches by Region (Optional)</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    // When region filter changes, reset selected branchId
                    // as the list of available branches will change.
                    form.setValue('branchId', undefined as any); 
                  }} 
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a region to filter branches" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     <SelectItem value={ALL_REGIONS_FILTER_VALUE}>All Regions</SelectItem>
                    {allRegions.map(region => (
                      <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                    ))}
                     {allRegions.length === 0 && <SelectItem value="no-regions-filter" disabled>No regions to filter by</SelectItem>}
                  </SelectContent>
                </Select>
                <FormDescription>Select a region to narrow down the branch list below.</FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Branch</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || undefined} 
                  disabled={branchesForSelectedRoleAndFilter.length === 0 && (!!selectedRegionForBranchFiltering && selectedRegionForBranchFiltering !== ALL_REGIONS_FILTER_VALUE)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        (!!selectedRegionForBranchFiltering && selectedRegionForBranchFiltering !== ALL_REGIONS_FILTER_VALUE && branchesForSelectedRoleAndFilter.length === 0) 
                        ? "No branches in selected region" 
                        : "Select a branch"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {branchesForSelectedRoleAndFilter.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name} ({branch.id})</SelectItem>
                    ))}
                    {branchesForSelectedRoleAndFilter.length === 0 && <SelectItem value="no-branches" disabled>No branches available for selection</SelectItem>}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  );
};
