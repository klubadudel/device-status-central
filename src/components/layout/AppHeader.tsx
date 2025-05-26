
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, UserCircle, Building, Map, Globe, ChevronsUpDown } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from "@/components/ui/skeleton";

export function AppHeader() {
  const { user, logout, loading } = useAuth();

  const getInitials = (name: string = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  }
  
  const getRoleIcon = (role: string | undefined) => {
    switch (role) {
      case 'branch': return <Building className="mr-2 h-4 w-4 text-muted-foreground" />;
      case 'regional': return <Map className="mr-2 h-4 w-4 text-muted-foreground" />;
      case 'national': return <Globe className="mr-2 h-4 w-4 text-muted-foreground" />;
      default: return <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 md:hidden" /> {/* SidebarTrigger placeholder */}
          <Skeleton className="h-6 w-32" /> {/* Title placeholder */}
        </div>
        <Skeleton className="h-10 w-10 rounded-full" /> {/* Avatar placeholder */}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" /> 
        {/* Placeholder for dynamic title or breadcrumbs if needed later */}
        <h1 className="text-lg font-semibold md:text-xl text-foreground hidden sm:block">
          Device Dashboard
        </h1>
      </div>
      
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-auto px-2 py-1 rounded-full flex items-center gap-2 group">
              <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-primary transition-colors">
                <AvatarImage src={user.avatarUrl || `https://picsum.photos/seed/${user.username}/40/40`} alt={user.name} data-ai-hint="profile avatar" />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground ml-1 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center space-x-3 p-1">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatarUrl || `https://picsum.photos/seed/${user.username}/60/60`} alt={user.name} data-ai-hint="profile avatar large" />
                  <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-base font-semibold leading-none">{user.name}</p>
                  <p className="text-sm leading-none text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground cursor-default hover:bg-transparent focus:bg-transparent">
                {getRoleIcon(user.role)} Role: <span className="ml-auto font-medium text-foreground capitalize">{user.role}</span>
            </DropdownMenuItem>
            {user.branchId && (
                 <DropdownMenuItem className="text-muted-foreground cursor-default hover:bg-transparent focus:bg-transparent">
                    <Building className="mr-2 h-4 w-4" /> Branch ID: <span className="ml-auto font-medium text-foreground">{user.branchId}</span>
                </DropdownMenuItem>
            )}
            {user.regionId && (
                 <DropdownMenuItem className="text-muted-foreground cursor-default hover:bg-transparent focus:bg-transparent">
                    <Map className="mr-2 h-4 w-4" /> Region ID: <span className="ml-auto font-medium text-foreground">{user.regionId}</span>
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
