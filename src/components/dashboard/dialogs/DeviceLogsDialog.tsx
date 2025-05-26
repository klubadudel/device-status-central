
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Info, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDeviceActivityLogs } from '@/lib/data-service';
import type { DeviceActivityLog } from '@/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DeviceLogsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceName: string;
}

export const DeviceLogsDialog: React.FC<DeviceLogsDialogProps> = ({ isOpen, onClose, deviceId, deviceName }) => {
  const [logs, setLogs] = useState<DeviceActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (!deviceId) return;
    setIsLoadingLogs(true);
    setError(null);
    console.log(`DeviceLogsDialog: Attempting to fetch logs for deviceId: ${deviceId}`);
    try {
      const fetchedLogs = await getDeviceActivityLogs(deviceId, 50);
      setLogs(fetchedLogs);
      if (fetchedLogs.length === 0) {
        console.log(`DeviceLogsDialog: No logs found for deviceId: ${deviceId}`);
      } else {
        console.log(`DeviceLogsDialog: Successfully fetched ${fetchedLogs.length} logs for deviceId: ${deviceId}`);
      }
    } catch (err: any) {
      console.error(`DeviceLogsDialog: Error fetching logs for deviceId ${deviceId}:`, err);
      const errorMessage = err.message || "Failed to load logs. Check console for details.";
      setError(errorMessage);
      // Toast is already called from data-service, but we can add a generic one here too if needed.
      // toast({
      //   title: "Error Fetching Logs",
      //   description: errorMessage,
      //   variant: "destructive",
      // });
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, toast]); // Added toast to dependency array for stability, though it's stable

  useEffect(() => {
    if (isOpen && deviceId) {
      fetchLogs();
    }
  }, [isOpen, deviceId, fetchLogs]);

  const getEventTypeBadgeVariant = (eventType: DeviceActivityLog['eventType']) => {
    switch (eventType) {
      case 'rtdb_status_change':
        return 'secondary';
      case 'maintenance_set':
        return 'default';
      case 'maintenance_cleared':
        return 'outline';
      case 'device_created':
        return 'default'; // Using primary for creation
      case 'device_details_updated':
        return 'outline';
      case 'log_error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <FileText className="mr-2 h-6 w-6 text-primary" /> Device Activity Logs: {deviceName}
          </DialogTitle>
          <DialogDescription>
            Showing recent activity and status changes for device ID: {deviceId}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Button onClick={fetchLogs} variant="outline" size="sm" className="mb-3" disabled={isLoadingLogs}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            Refresh Logs
          </Button>

          {isLoadingLogs && !logs.length && !error ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading logs...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Logs</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !isLoadingLogs && logs.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Logs Available</AlertTitle>
              <AlertDescription>
                There are currently no activity logs recorded for this device.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[400px] border rounded-md p-0 bg-muted/20">
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      <Badge variant={getEventTypeBadgeVariant(log.eventType)} className="capitalize text-xs">
                        {log.eventType.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{log.message}</p>
                    {log.oldValue !== undefined && log.newValue !== undefined && (
                       <p className="text-xs text-muted-foreground mt-1">
                         Changed: <Badge variant="outline" className="text-xs">{log.oldValue || 'N/A'}</Badge> {'->'} <Badge variant={log.newValue === 'online' ? 'default' : (log.newValue === 'offline' ? 'destructive' : 'secondary')} className="text-xs">{log.newValue || 'N/A'}</Badge>
                       </p>
                    )}
                    {log.userId && (
                      <p className="text-xs text-accent mt-1">User ID: {log.userId}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

    