
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';
import { getUsers, deleteUser as deleteUserService } from '@/lib/data-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Search, Users, AlertTriangle, Filter } from 'lucide-react';
import { AddUserDialog } from '@/components/dashboard/dialogs/AddUserDialog';
import { EditUserDialog } from '@/components/dashboard/dialogs/EditUserDialog';
import { DeleteUserDialog } from '@/components/dashboard/dialogs/DeleteUserDialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function UserManagementPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Dialog states
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchUsersData = async () => {
    setIsLoading(true);
    try {
      const usersFromDb = await getUsers();
      setAllUsers(usersFromDb);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({ title: "Error", description: "Could not load users data.", variant: "destructive" });
      setAllUsers([]); // Set to empty on error
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (role === 'national') {
      fetchUsersData();
    } else {
      setIsLoading(false); // Non-national users shouldn't see this page
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]); // toast is stable

  const handleUserAdded = () => {
    fetchUsersData(); // Refetch to get the latest list including the new user
  };

  const handleUserUpdated = () => {
     fetchUsersData(); // Refetch for consistency
  };
  const handleUserDeleted = async () => {
    if (userToDelete) {
        try {
            await deleteUserService(userToDelete.id);
            toast({ title: "User Deleted", description: `User "${userToDelete.name}" has been deleted.` });
            fetchUsersData(); // Refetch
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
        }
    }
    setIsDeleteUserModalOpen(false);
    setUserToDelete(null);
  };

  const openEditUserModal = (userToEdit: User) => {
    setUserToEdit(userToEdit);
    setIsEditUserModalOpen(true);
  };

  const openDeleteUserModal = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setIsDeleteUserModalOpen(true);
  };

  const filteredUsers = useMemo(() => {
    return allUsers
      .filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .filter(u => roleFilter === 'all' || u.role === roleFilter);
  }, [allUsers, searchTerm, roleFilter]);


  if (isLoading && role === 'national') { // Show loading only if authorized and actually loading
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" /> {/* Filter bar placeholder */}
        <Skeleton className="h-96 w-full" /> {/* Table placeholder */}
      </div>
    );
  }

  if (role !== 'national') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>This page is intended for National Administrators only.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-3xl font-bold text-primary flex items-center">
              <Users className="mr-3 h-8 w-8" /> User Management
            </CardTitle>
            <CardDescription>Add, edit, or remove user accounts for Device Status Central.</CardDescription>
          </div>
          <Button onClick={() => setIsAddUserModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New User
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label htmlFor="search-users" className="block text-sm font-medium text-foreground mb-1">Search Users</label>
                <div className="relative">
                  <Input
                    id="search-users"
                    type="text"
                    placeholder="Search by name, username, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label htmlFor="role-filter" className="block text-sm font-medium text-foreground mb-1">Filter by Role</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role-filter">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="branch">Branch User</SelectItem>
                    <SelectItem value="regional">Regional Manager</SelectItem>
                    <SelectItem value="national">National Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <Alert>
              <Filter className="h-5 w-5" />
              <AlertTitle>No Users Found</AlertTitle>
              <AlertDescription>
                No users match your current search or filter criteria. Try adjusting your filters or add a new user.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Scope ID</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell><TableCell>{u.username}</TableCell><TableCell>{u.email}</TableCell><TableCell>
                        <Badge variant={u.role === 'national' ? 'default' : (u.role === 'regional' ? 'secondary' : 'outline')} className="capitalize bg-primary text-primary-foreground">
                           {u.role}
                        </Badge>
                      </TableCell><TableCell>{u.role === 'branch' ? u.branchId : (u.role === 'regional' ? u.regionId : 'N/A')}</TableCell><TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditUserModal(u)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteUserModal(u.id, u.name)} 
                              disabled={user?.id === u.id} 
                              className={user?.id === u.id ? "text-muted-foreground cursor-not-allowed" : "text-destructive focus:bg-destructive/10 focus:text-destructive"}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isAddUserModalOpen && (
        <AddUserDialog
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          onUserAdded={handleUserAdded}
        />
      )}
      {isEditUserModalOpen && userToEdit && (
        <EditUserDialog
          isOpen={isEditUserModalOpen}
          onClose={() => { setIsEditUserModalOpen(false); setUserToEdit(null); }}
          onUserUpdated={handleUserUpdated}
          userToEdit={userToEdit}
        />
      )}
      {isDeleteUserModalOpen && userToDelete && (
        <DeleteUserDialog
          isOpen={isDeleteUserModalOpen}
          onClose={() => { setIsDeleteUserModalOpen(false); setUserToDelete(null); }}
          onUserDeleted={handleUserDeleted} // This will call the async version
          userIdToDelete={userToDelete.id}
          userNameToDelete={userToDelete.name}
        />
      )}
    </div>
  );
}

