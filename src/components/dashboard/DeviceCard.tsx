
import type { Device, DeviceStatus, DeviceType } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Circle, Edit, Trash2, Smartphone, Server, Laptop, RouterIcon as RouterLucideIcon, ShieldAlert, Settings2, Tv, HardDrive, Camera, Refrigerator, Wind, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from 'next/image'; // For placeholder images

interface DeviceCardProps {
  device: Device;
  onEdit?: (device: Device) => void;
  onDelete?: (deviceId: string) => void;
  onViewLogs?: (deviceId: string) => void; // New prop for viewing logs
  canManage: boolean;
}

const getDeviceIcon = (type: DeviceType): React.ReactNode => {
  switch (type) {
    case 'Refrigerator':
      return <Refrigerator className="h-6 w-6 text-primary" />;
    case 'Air Conditioner':
      return <Wind className="h-6 w-6 text-primary" />; // Using Wind as a proxy for Air Conditioner
    default:
      // Fallback, though ideally type should always be one of the two
      return <HardDrive className="h-6 w-6 text-primary" />;
  }
};


const StatusIndicator: React.FC<{ status: DeviceStatus }> = ({ status }) => {
  let badgeVariant: "default" | "destructive" | "secondary" | "outline" = "outline";
  let badgeClasses = "capitalize";
  let IconComponent = Circle;
  let iconColor = "text-muted-foreground";

  if (status === 'online') {
    badgeVariant = 'default'; // Default uses primary, let's make it accent-like
    badgeClasses = cn(badgeClasses, "bg-accent text-accent-foreground hover:bg-accent/90");
    iconColor = "text-accent";
  } else if (status === 'offline') {
    badgeVariant = 'destructive';
    iconColor = "text-destructive";
  } else if (status === 'maintenance') {
    badgeVariant = 'secondary'; // Using secondary which is a light grey by default.
    badgeClasses = cn(badgeClasses, "bg-warning text-warning-foreground hover:bg-warning/90");
    iconColor = "text-warning";
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={badgeVariant} className={badgeClasses}>
            <IconComponent className={cn("mr-1.5 h-3 w-3", iconColor)} fill={status !== 'maintenance' ? 'currentColor' : 'none'} />
            {status}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="capitalize">Status: {status}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


export function DeviceCard({ device, onEdit, onDelete, onViewLogs, canManage }: DeviceCardProps) {
  const aiHint = device.type === 'Refrigerator' ? 'refrigerator appliance' : 'air conditioner unit';
  return (
    <Card className="w-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 flex flex-col bg-card">
      <div className="relative h-40 w-full bg-secondary/50">
        <Image
          src={`https://picsum.photos/seed/${device.id}/400/200`}
          alt={`${device.type} placeholder image`}
          layout="fill"
          objectFit="cover"
          className="opacity-70 group-hover:opacity-100 transition-opacity"
          data-ai-hint={aiHint}
        />
        <div className="absolute top-3 right-3">
          <StatusIndicator status={device.status} />
        </div>
         <div className="absolute bottom-3 left-3 p-2 bg-card/80 backdrop-blur-sm rounded-full">
          {getDeviceIcon(device.type)}
        </div>
      </div>

      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-xl font-semibold truncate" title={device.name}>{device.name}</CardTitle>
        <CardDescription className="text-sm">{device.type} - {device.location}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-1.5 text-sm text-muted-foreground flex-grow pb-3">
        <p><span className="font-medium text-foreground">ID:</span> {device.id}</p>
        {device.assignedPin !== undefined && device.assignedPin !== null && (
            <p><span className="font-medium text-foreground">GPIO Pin:</span> {device.assignedPin}</p>
        )}
        <p><span className="font-medium text-foreground">Last Seen:</span> {new Date(device.lastSeen).toLocaleString()}</p>
        {device.notes && <p className="italic mt-1"><span className="font-medium text-foreground">Notes:</span> {device.notes}</p>}
      </CardContent>

      {canManage && (onEdit || onDelete || onViewLogs) && (
        <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-4 pb-4 bg-muted/30">
          {onViewLogs &&
            <Button variant="outline" size="sm" onClick={() => onViewLogs(device.id)}>
              <FileText className="mr-1.5 h-4 w-4" /> Logs
            </Button>}
          {onEdit &&
            <Button variant="outline" size="sm" onClick={() => onEdit(device)}>
              <Edit className="mr-1.5 h-4 w-4" /> Edit
            </Button>}
          {onDelete &&
            <Button variant="destructive" size="sm" onClick={() => onDelete(device.id)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>}
        </CardFooter>
      )}
    </Card>
  );
}
