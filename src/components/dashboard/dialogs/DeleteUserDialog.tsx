
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
import { deleteUser } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface DeleteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted: () => void;
  userIdToDelete: string;
  userNameToDelete: string;
}

export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({ isOpen, onClose, onUserDeleted, userIdToDelete, userNameToDelete }) => {
  const { toast } = useToast();
  const { user: currentUser, logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    if (currentUser?.id === userIdToDelete) {
      toast({
        title: "Action Not Allowed",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      setIsDeleting(false);
      onClose();
      return;
    }

    try {
      const success = deleteUser(userIdToDelete);
      if (success) {
        onUserDeleted();
        toast({
          title: "User Deleted",
          description: `Successfully deleted user "${userNameToDelete}".`,
        });
        onClose();
      } else {
        throw new Error("Delete operation failed.");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
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
            This action cannot be undone. This will permanently delete the user account for
            <span className="font-semibold"> &quot;{userNameToDelete}&quot; </span>
            and remove all their associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting || currentUser?.id === userIdToDelete} className="bg-destructive hover:bg-destructive/90">
            {isDeleting ? "Deleting..." : (currentUser?.id === userIdToDelete ? "Cannot Delete Self" : "Yes, delete user")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
