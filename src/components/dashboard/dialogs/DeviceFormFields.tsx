
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DeviceType } from '@/types';
import { GPIO_PINS } from '@/types'; // Import GPIO_PINS

const deviceTypes: [DeviceType, ...DeviceType[]] = ['Refrigerator', 'Air Conditioner'];
const NO_PIN_SELECTED_VALUE = "_NO_PIN_"; // Special string value for "None" option in Select

export const deviceFormSchema = z.object({
  name: z.string().min(2, { message: "Device name must be at least 2 characters." }).max(50),
  type: z.enum(deviceTypes, { required_error: "Device type is required." }),
  location: z.string().min(2, { message: "Location must be at least 2 characters." }).max(50),
  notes: z.string().max(200).optional().or(z.literal('')),
  // assignedPin will store number | null | undefined.
  // The select component will use strings, so we preprocess.
  assignedPin: z.preprocess(
    (val) => {
      if (val === NO_PIN_SELECTED_VALUE || val === "" || val === null || val === undefined) return null;
      const num = parseInt(String(val), 10);
      return isNaN(num) ? null : num;
    },
    z.number().nullable().optional()
  ),
});

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;

interface DeviceFormFieldsProps {
  form: UseFormReturn<DeviceFormValues>;
}

export const DeviceFormFields: React.FC<DeviceFormFieldsProps> = ({ form }) => {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Device Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Kitchen Refrigerator, Living Room AC" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Device Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {deviceTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Kitchen, Server Room, Bedroom 1" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="assignedPin"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assigned GPIO Pin (Optional)</FormLabel>
            <Select
              // The Select value prop needs a string. Convert number/null/undefined from form state.
              value={field.value === null || field.value === undefined ? NO_PIN_SELECTED_VALUE : String(field.value)}
              onValueChange={(selectedValue) => {
                // Store number or null in form state.
                field.onChange(selectedValue === NO_PIN_SELECTED_VALUE ? null : parseInt(selectedValue, 10));
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select GPIO pin" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NO_PIN_SELECTED_VALUE}>None</SelectItem>
                {GPIO_PINS.map(pin => (
                  // SelectItem value needs to be a string.
                  <SelectItem key={pin.value} value={String(pin.value)}>{pin.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes (Optional)</FormLabel>
            <FormControl>
              <Textarea placeholder="Any additional notes about the device..." className="resize-none" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
