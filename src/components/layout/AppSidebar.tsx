
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SiteLogo } from './SiteLogo';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Building2,
  MapPinned,
  Settings,
  ListTree,
  BrainCircuit,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Ticket,
  Activity,
  HardDrive,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: ('branch' | 'regional' | 'national')[];
  subItems?: NavItem[];
  collapsible?: boolean; // for items with subItems
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['branch', 'regional', 'national'] },
  {
    href: '/dashboard/branch-management', // Parent dummy href or specific page
    label: 'Branch Space',
    icon: Building2,
    roles: ['branch', 'regional', 'national'],
    collapsible: true,
    subItems: [
      { href: '/dashboard/branch/details', label: 'My Branch Details', icon: GitBranch, roles: ['branch'] },
      { href: '/dashboard/regional/branch-select', label: 'Select Branch', icon: GitBranch, roles: ['regional'] },
      { href: '/dashboard/national/region-select', label: 'Select Region/Branch', icon: GitBranch, roles: ['national'] },
    ]
  },
  { href: '/dashboard/devices', label: 'Devices', icon: HardDrive, roles: ['branch', 'regional', 'national'] },
  { href: '/dashboard/ai-insights', label: 'AI Insights', icon: BrainCircuit, roles: ['branch', 'regional', 'national'] },
  {
    href: '/dashboard/admin',
    label: 'Administration',
    icon: ShieldCheck,
    roles: ['national'],
    collapsible: true,
    subItems: [
      { href: '/dashboard/national/branch-creation', label: 'Branch Management', icon: ListTree, roles: ['national'] },
      { href: '/dashboard/national/user-management', label: 'User Management', icon: Users, roles: ['national'] },
    ]
  },
];

const SidebarNavLink: React.FC<{ item: NavItem; isSubItem?: boolean }> = ({ item, isSubItem = false }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
  const [isOpen, setIsOpen] = useState(isActive && !!item.subItems); // Keep open if active child

  const { user } = useAuth();
  if (!user || !item.roles.includes(user.role)) {
    return null;
  }

  if (item.subItems && item.subItems.length > 0) {
    // Filter subItems based on role
    const visibleSubItems = item.subItems.filter(sub => sub.roles.includes(user.role));
    if (visibleSubItems.length === 0 && !item.collapsible) return null; // Hide if no visible sub-items and not a main link

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setIsOpen(!isOpen)}
          isActive={isActive && !item.subItems} // Active if it's a direct link and current path
          className="justify-between"
          tooltip={{ children: item.label, side: 'right', align: 'center' }}
        >
          <div className="flex items-center gap-2">
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </div>
          {item.collapsible && (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
        </SidebarMenuButton>
        {isOpen && item.collapsible && visibleSubItems.length > 0 && (
          <SidebarMenuSub>
            {visibleSubItems.map((subItem) => (
              <SidebarMenuSubItem key={subItem.href}>
                <Link href={subItem.href} legacyBehavior passHref>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname === subItem.href || pathname.startsWith(subItem.href)}
                  >
                    <a>
                      <subItem.icon className="h-4 w-4 mr-1.5 text-sidebar-accent-foreground/80" />
                      <span>{subItem.label}</span>
                    </a>
                  </SidebarMenuSubButton>
                </Link>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  const ButtonComponent = isSubItem ? SidebarMenuSubButton : SidebarMenuButton;

  return (
    <SidebarMenuItem>
      <Link href={item.href} legacyBehavior passHref>
        <ButtonComponent
          asChild
          isActive={isActive}
          tooltip={!isSubItem ? { children: item.label, side: 'right', align: 'center' } : undefined}
        >
          <a>
            <item.icon className={cn("h-5 w-5", isSubItem && "mr-1.5 text-sidebar-accent-foreground/80")} />
            <span>{item.label}</span>
          </a>
        </ButtonComponent>
      </Link>
    </SidebarMenuItem>
  );
};

export function AppSidebar() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
       <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-3">
           <Skeleton className="h-10 w-full" />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        </SidebarContent>
        <SidebarFooter className="p-3 mt-auto">
          <Skeleton className="h-9 w-full" />
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r shadow-md">
      <SidebarHeader className="flex items-center justify-center p-3 border-b border-sidebar-border">
        <Link href="/dashboard" className="group-data-[collapsible=icon]:hidden">
          <SiteLogo size="sm" textColorClass="text-sidebar-foreground" />
        </Link>
        <Link href="/dashboard" className="hidden group-data-[collapsible=icon]:block">
           <SiteLogo size="icon" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarNavLink key={item.href} item={item} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} tooltip={{ children: "Log Out", side: 'right', align: 'center' }}>
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
