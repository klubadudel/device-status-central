
'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteDevice } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';

interface DeleteDeviceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceDeleted: () => void;
  deviceId: string;
  deviceName: string;
}

export const DeleteDeviceDialog: React.FC<DeleteDeviceDialogProps> = ({ isOpen, onClose, onDeviceDeleted, deviceId, deviceName }) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = deleteDevice(deviceId);
      if (success) {
        onDeviceDeleted();
        toast({
          title: "Device Deleted",
          description: `Successfully deleted "${deviceName}".`,
        });
        onClose();
      } else {
         throw new Error("Delete operation failed.");
      }
    } catch (error) {
      console.error("Error deleting device:", error);
      toast({
        title: "Error",
        description: "Failed to delete device. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the device
            <span className="font-semibold"> &quot;{deviceName}&quot; </span>
            and remove its data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
            {isDeleting ? "Deleting..." : "Yes, delete device"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
