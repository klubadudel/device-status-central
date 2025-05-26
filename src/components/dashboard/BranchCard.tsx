
import type { Branch, Region } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, MapPin, User, Phone, CalendarDays, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface BranchCardProps {
  branch: Branch;
  region?: Region; // Optional: to display region name
  onViewDetails?: (branchId: string) => void; // For regional/national users to click
  linkTo?: string; // Direct link URL if needed
}

export function BranchCard({ branch, region, onViewDetails, linkTo }: BranchCardProps) {
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(branch.id);
    }
  };

  const cardContent = (
    <Card className="w-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 flex flex-col bg-card">
      <div className="relative h-40 w-full bg-primary/10">
        <Image 
            src={`https://picsum.photos/seed/${branch.id}/600/300`} 
            alt={`${branch.name} building exterior or abstract representation`}
            layout="fill"
            objectFit="cover"
            className="opacity-80 group-hover:opacity-100 transition-opacity"
            data-ai-hint="office building"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent p-4 flex flex-col justify-end">
             <CardTitle className="text-2xl font-bold text-white drop-shadow-md">{branch.name}</CardTitle>
             {region && <CardDescription className="text-sm text-primary-foreground/80">{region.name}</CardDescription>}
        </div>
      </div>
      
      <CardHeader className="pt-4 pb-2">
        {/* Title and region already in image overlay, can add alternative short title here if needed */}
      </CardHeader>
      
      <CardContent className="space-y-2 text-sm text-muted-foreground flex-grow">
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-primary" />
          <span>{branch.address}</span>
        </div>
        {branch.managerName && (
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2 text-primary" />
            <span>Manager: {branch.managerName}</span>
          </div>
        )}
        {branch.contactPhone && (
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2 text-primary" />
            <span>{branch.contactPhone}</span>
          </div>
        )}
        {branch.establishedDate && (
          <div className="flex items-center">
            <CalendarDays className="h-4 w-4 mr-2 text-primary" />
            <span>Established: {new Date(branch.establishedDate).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
      
      {(onViewDetails || linkTo) && (
        <CardFooter className="border-t pt-4 pb-4 bg-muted/30">
          <Button variant="outline" className="w-full" onClick={!linkTo ? handleViewDetails : undefined}>
            {linkTo ? (
              <Link href={linkTo} className="flex items-center justify-center w-full">
                View Details <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            ) : (
              <>View Details <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  return cardContent;
}
