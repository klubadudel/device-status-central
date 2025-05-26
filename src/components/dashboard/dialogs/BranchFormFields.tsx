
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Region } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export const branchFormSchema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters.").max(50),
  address: z.string().min(5, "Address must be at least 5 characters.").max(100),
  regionId: z.string({ required_error: "Region is required." }).min(1, "Region is required."),
  managerName: z.string().max(50).optional().or(z.literal('')),
  contactPhone: z.string().regex(/^(\+\d{1,3}[- ]?)?\d{10}$/, "Invalid phone number format.").optional().or(z.literal('')), // Simple North American format + optional country code
  establishedDate: z.date().optional(),
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;

interface BranchFormFieldsProps {
  form: UseFormReturn<BranchFormValues>;
  allRegions: Region[];
  isLoadingRegions?: boolean;
}

export const BranchFormFields: React.FC<BranchFormFieldsProps> = ({ form, allRegions, isLoadingRegions = false }) => {
  const sortedRegions = React.useMemo(() => {
    if (!Array.isArray(allRegions)) return [];
    return [...allRegions].sort((a, b) => a.name.localeCompare(b.name));
  }, [allRegions]);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Branch Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Downtown Main Branch" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl>
              <Textarea placeholder="e.g., 123 Commerce St, Suite 100, Metropolis, CA 90210" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="regionId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Region</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingRegions || sortedRegions.length === 0}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingRegions ? "Loading regions..." : (sortedRegions.length === 0 ? "No regions available" : "Select the region for this branch")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {sortedRegions.map(region => (
                  <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="managerName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Manager Name (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Jane Smith" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="contactPhone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Phone (Optional)</FormLabel>
            <FormControl>
              <Input type="tel" placeholder="e.g., +1 555-123-4567" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="establishedDate"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Established Date (Optional)</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

