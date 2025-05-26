
'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DeviceFormFields, deviceFormSchema, DeviceFormValues } from './DeviceFormFields';
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
import { addDevice as addDeviceService } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import type { Device } from '@/types';

interface AddDeviceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceAdded: (newDevice: Device) => void;
  branchId: string;
}

export const AddDeviceDialog: React.FC<AddDeviceDialogProps> = ({ isOpen, onClose, onDeviceAdded, branchId }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      name: '',
      type: undefined, // User must select a type
      location: '',
      notes: '',
      assignedPin: null, // Default to null for no pin
    },
  });

  const onSubmit = async (values: DeviceFormValues) => {
    setIsSubmitting(true);
    try {
      const newDeviceData: Omit<Device, 'id' | 'status'> & { status: 'offline' } = {
        name: values.name,
        type: values.type!, // Type is required by schema
        location: values.location,
        notes: values.notes,
        assignedPin: values.assignedPin === null ? undefined : values.assignedPin, // Store undefined if null
        branchId,
        lastSeen: new Date().toISOString(),
        status: 'offline',
      };
      const newDevice = await addDeviceService(newDeviceData as Omit<Device, 'id'>);
      onDeviceAdded(newDevice);
      toast({
        title: "Device Added",
        description: `Successfully added "${newDevice.name}". It is initially offline.`,
      });
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error adding device:", error);
      toast({
        title: "Error",
        description: "Failed to add device. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New Device</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new device to branch ID: {branchId}. Device status will be 'offline' initially.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <div className="max-h-[60vh] overflow-y-auto px-1 py-2 pr-3">
              <DeviceFormFields form={form} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "Adding..." : "Add Device"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
