
'use client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Building, Users, HardDriveIcon, BrainCircuit } from 'lucide-react';
import Image from 'next/image';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
         <p className="text-lg text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const quickLinks = [
    ...(user.role === 'branch' || user.role === 'regional' || user.role === 'national' ? [{ href: '/dashboard/devices', label: 'View Devices', icon: HardDriveIcon }] : []),
    ...(user.role === 'branch' ? [{ href: '/dashboard/branch/details', label: 'My Branch Info', icon: Building }] : []),
    ...(user.role === 'regional' ? [{ href: '/dashboard/regional/branch-select', label: 'Select Branch', icon: Building }] : []),
    ...(user.role === 'national' ? [{ href: '/dashboard/national/region-select', label: 'Manage Regions/Branches', icon: Building }] : []),
    ...(user.role === 'national' ? [{ href: '/dashboard/national/user-management', label: 'Manage Users', icon: Users }] : []),
    { href: '/dashboard/ai-insights', label: 'AI Insights', icon: BrainCircuit }
  ];
  

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8 shadow-lg bg-card border-border overflow-hidden">
        <div className="md:flex">
          <div className="md:w-2/3 p-6 md:p-8">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-3xl md:text-4xl font-bold text-primary">
                {getGreeting()}, {user.name}!
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Welcome to your Device Status Central dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-foreground mb-6">
                You are logged in as a <span className="font-semibold capitalize text-accent">{user.role}</span> user.
                From here, you can monitor device statuses, manage your scope of operations, and gain insights into device performance.
              </p>
              <Link href={
                user.role === 'branch' ? '/dashboard/devices' :
                user.role === 'regional' ? '/dashboard/regional/branch-select' :
                '/dashboard/national/region-select'
              } passHref>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </div>
          <div className="md:w-1/3 relative min-h-[200px] md:min-h-0">
             <Image 
                src="https://picsum.photos/seed/dashboardHero/600/400" 
                alt="Abstract network or device monitoring graphic" 
                layout="fill"
                objectFit="cover"
                data-ai-hint="abstract network"
              />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickLinks.map(link => (
          <Link href={link.href} key={link.href} passHref>
            <Card className="hover:shadow-xl transition-shadow duration-200 cursor-pointer h-full flex flex-col bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-semibold text-primary">{link.label}</CardTitle>
                <link.icon className="h-6 w-6 text-accent" />
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Navigate to {link.label.toLowerCase()} section.
                </p>
              </CardContent>
               <CardFooter>
                 <Button variant="outline" className="w-full">Go to {link.label} <ArrowRight className="ml-auto h-4 w-4" /></Button>
               </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
