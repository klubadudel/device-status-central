
'use client';
import React, { useEffect, useState } from 'react';
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
import { updateDevice as updateDeviceService } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import type { Device, DeviceStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Wrench, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface EditDeviceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceUpdated: (updatedDevice: Device) => void;
  device: Device;
}

export const EditDeviceDialog: React.FC<EditDeviceDialogProps> = ({ isOpen, onClose, onDeviceUpdated, device }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);
  // Initialize local state for Firestore status directly from the prop's firestoreStatus
  const [deviceFirestoreStatus, setDeviceFirestoreStatus] = useState<DeviceStatus>(device.firestoreStatus || device.status || 'offline');

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      name: device.name || '',
      type: device.type || undefined,
      location: device.location || '',
      notes: device.notes || '',
      assignedPin: device.assignedPin === undefined ? null : device.assignedPin,
    },
  });

  useEffect(() => {
    if (isOpen) {
      console.log("EditDeviceDialog: Opened/Device Prop Changed. Device Prop:", device);
      form.reset({
        name: device.name || '',
        type: device.type || undefined,
        location: device.location || '',
        notes: device.notes || '',
        assignedPin: device.assignedPin === undefined ? null : device.assignedPin,
      });
      // Update local state if the prop changes (e.g., due to parent listener update)
      setDeviceFirestoreStatus(device.firestoreStatus || device.status || 'offline');
      console.log("EditDeviceDialog: Local deviceFirestoreStatus initialized/updated to:", device.firestoreStatus || device.status || 'offline');
    }
  }, [device, form, isOpen]);

  const handleToggleMaintenance = async () => {
    setIsTogglingMaintenance(true);
    const currentLocalStatus = deviceFirestoreStatus;
    const newFirestoreStatusToSet = currentLocalStatus === 'maintenance' ? 'offline' : 'maintenance';

    console.log(`EditDeviceDialog: handleToggleMaintenance. Current local status: ${currentLocalStatus}. Attempting to set Firestore status to: ${newFirestoreStatusToSet}. Device ID: ${device.id}`);

    try {
      // Only send the status update to the service.
      const updatedDeviceFromService = await updateDeviceService(device.id, { status: newFirestoreStatusToSet });

      if (updatedDeviceFromService) {
        console.log("EditDeviceDialog: updateDeviceService successful. Service returned device with firestoreStatus:", updatedDeviceFromService.firestoreStatus);
        onDeviceUpdated(updatedDeviceFromService); // Notify parent
        setDeviceFirestoreStatus(updatedDeviceFromService.firestoreStatus || 'offline'); // Update local state from service response
        toast({
          title: "Device Status Updated",
          description: `Device "${updatedDeviceFromService.name}" Firestore status is now ${updatedDeviceFromService.firestoreStatus || 'offline'}.`,
        });
      } else {
        console.error("EditDeviceDialog: updateDeviceService returned undefined.");
        toast({
          title: "Update Error",
          description: "Failed to get confirmation of device status update. The status may not have changed.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("EditDeviceDialog: Error in handleToggleMaintenance:", error);
      toast({
        title: "Operation Failed",
        description: `Failed to update maintenance status: ${error instanceof Error ? error.message : "Unknown error"}.`,
        variant: "destructive",
      });
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  const onSubmit = async (values: DeviceFormValues) => {
    setIsSubmitting(true);
    console.log("EditDeviceDialog: onSubmit called with form values:", values);
    try {
      const updatedDeviceData: Partial<Omit<Device, 'id' | 'status' | 'branchId' | 'lastSeen'>> = {
        name: values.name,
        type: values.type,
        location: values.location,
        notes: values.notes,
        assignedPin: values.assignedPin === null ? undefined : values.assignedPin,
      };
      // Note: We are not submitting 'status' here, as it's handled by handleToggleMaintenance
      const updated = await updateDeviceService(device.id, updatedDeviceData);
      if (updated) {
        onDeviceUpdated(updated);
        toast({
          title: "Device Details Updated",
          description: `Successfully updated details for "${updated.name}".`,
        });
        onClose(); // Close dialog only after successful details save
      } else {
        throw new Error("Update operation failed silently.");
      }
    } catch (error) {
      console.error("Error updating device details:", error);
      toast({
        title: "Error",
        description: "Failed to update device details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // This status is what the UI shows as the device's current operational state (could be from RTDB or Firestore maintenance)
  const displayStatus = device.firestoreStatus === 'maintenance' ? 'maintenance' : device.status;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting && !isTogglingMaintenance) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Device: {device.name}</DialogTitle>
          <DialogDescription>
            Update device details and GPIO pin. Live online/offline status is from RTDB.
          </DialogDescription>
        </DialogHeader>

        <Alert variant={displayStatus === 'maintenance' ? "default" : (displayStatus === 'online' ? "default" : "destructive")} className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Current Displayed Status: <Badge variant={displayStatus === 'maintenance' ? 'secondary' : (displayStatus === 'online' ? 'default' : 'destructive')} className="capitalize ml-1">{displayStatus}</Badge>
            </AlertTitle>
            <AlertDescription>
                {device.firestoreStatus === 'maintenance'
                    ? "Device is manually set to maintenance mode in Firestore."
                    : "Status is live from RTDB (reported by ESP8266)."
                }
                 Last seen (from RTDB/Firestore): {new Date(device.lastSeen).toLocaleString()}
            </AlertDescription>
        </Alert>

        <Button
            variant="outline"
            onClick={handleToggleMaintenance}
            disabled={isSubmitting || isTogglingMaintenance}
            className="w-full mb-4"
        >
            {isTogglingMaintenance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (deviceFirestoreStatus === 'maintenance' ? <Zap className="mr-2 h-4 w-4" /> : <Wrench className="mr-2 h-4 w-4" />)}
            {deviceFirestoreStatus === 'maintenance' ? "Take out of Maintenance (set to Offline in Firestore)" : "Place in Maintenance (set in Firestore)"}
        </Button>
        <p className="text-xs text-muted-foreground text-center mb-6">
            Setting to 'Maintenance' in Firestore overrides the live RTDB status in the UI.
            Taking out of maintenance sets Firestore status to 'Offline', and live RTDB status will display.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
             <div className="max-h-[40vh] overflow-y-auto px-1 py-2 pr-3">
              <DeviceFormFields form={form} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isTogglingMaintenance}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isTogglingMaintenance} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "Saving Details..." : "Save Details"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
