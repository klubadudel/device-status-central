
'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { suggestMaintenance, type SuggestMaintenanceInput } from '@/ai/flows/suggest-maintenance';
import type { Device } from '@/types';
import { Lightbulb, Wrench, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AIMaintenanceSuggestionsProps {
  devices: Device[]; // Pass the relevant devices for the current scope
  scope: string; // e.g., "branch-ny-1", "region-east", "nation-wide"
  scopeType: 'Branch' | 'Region' | 'Nation-wide';
}

export const AIMaintenanceSuggestions: React.FC<AIMaintenanceSuggestionsProps> = ({ devices, scope, scopeType }) => {
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    if (devices.length === 0) {
      setError("No device data available for this scope to generate suggestions.");
      setIsLoading(false);
      toast({
        title: "No Device Data",
        description: "Cannot generate suggestions without device information.",
        variant: "default",
      });
      return;
    }

    try {
      const deviceDataString = JSON.stringify(devices.map(d => ({ id: d.id, name: d.name, status: d.status, uptime: Math.random() * 100 }))); // Mocking uptime for AI
      const input: SuggestMaintenanceInput = { 
        scope: `${scopeType}: ${scope}`,
        deviceData: deviceDataString,
       };
      const result = await suggestMaintenance(input);
      setSuggestions(result.suggestions);
      toast({
        title: "AI Suggestions Generated",
        description: `Maintenance suggestions for ${scopeType} "${scope}" are ready.`,
      });
    } catch (err) {
      console.error("Error generating AI maintenance suggestions:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate suggestions: ${errorMessage}`);
      toast({
        title: "AI Suggestions Error",
        description: `Could not generate suggestions. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-accent/20">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <Lightbulb className="h-7 w-7 mr-3 text-accent" />
                <CardTitle className="text-2xl">AI Maintenance Suggestions</CardTitle>
            </div>
             <Button onClick={handleGenerateSuggestions} disabled={isLoading || devices.length === 0} size="sm" variant="outline" className="border-accent text-accent hover:bg-accent/10 hover:text-accent">
                {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <Wrench className="mr-2 h-4 w-4" />
                )}
                Get Suggestions
            </Button>
        </div>
        <CardDescription>
          Receive AI-powered suggestions for devices that might require maintenance based on patterns for scope: <span className="font-semibold text-foreground">{scope}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
         {devices.length === 0 && !isLoading && (
          <Alert variant="default" className="mb-4">
            <AlertTitle>No Device Data</AlertTitle>
            <AlertDescription>There is no device data available for the current scope to analyze for maintenance suggestions.</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error Generating Suggestions</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {isLoading && !suggestions && (
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Analyzing devices and generating suggestions...
          </div>
        )}
        {suggestions && (
          <div className="p-4 bg-secondary/50 rounded-md border border-secondary">
            <h3 className="text-lg font-semibold mb-2 text-foreground">Generated Suggestions:</h3>
            <Textarea
              value={suggestions}
              readOnly
              rows={8}
              className="w-full bg-background text-sm leading-relaxed"
            />
          </div>
        )}
         {!isLoading && !suggestions && !error && devices.length > 0 && (
            <div className="text-center p-6 text-muted-foreground">
                <p>Click &quot;Get Suggestions&quot; for AI-driven maintenance advice based on the current device data.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
};
