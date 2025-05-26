
'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { summarizeDeviceStatus, type SummarizeDeviceStatusInput } from '@/ai/flows/summarize-device-status';
import { BrainCircuit, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AISummaryProps {
  scope: string; // e.g., "branch-ny-1", "region-east", "nation-wide"
  scopeType: 'Branch' | 'Region' | 'Nation-wide'; // For display purposes
}

export const AISummary: React.FC<AISummaryProps> = ({ scope, scopeType }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    try {
      const input: SummarizeDeviceStatusInput = { scope };
      // In a real app, you'd fetch actual device data for the scope
      // and pass it to the AI if the prompt needed it.
      // The current `summarizeDeviceStatus` only takes `scope`.
      const result = await summarizeDeviceStatus(input);
      setSummary(result.summary);
      toast({
        title: "AI Summary Generated",
        description: `Summary for ${scopeType} "${scope}" is ready.`,
      });
    } catch (err) {
      console.error("Error generating AI summary:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate summary: ${errorMessage}`);
      toast({
        title: "AI Summary Error",
        description: `Could not generate summary. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <BrainCircuit className="h-7 w-7 mr-3 text-primary" />
                <CardTitle className="text-2xl">AI Device Status Summary</CardTitle>
            </div>
            <Button onClick={handleGenerateSummary} disabled={isLoading} size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Summary
            </Button>
        </div>
        <CardDescription>
          Get an AI-powered overview of device status and uptime for the current {scopeType.toLowerCase()} scope: <span className="font-semibold text-foreground">{scope}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error Generating Summary</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {isLoading && !summary && (
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Generating summary, please wait...
          </div>
        )}
        {summary && (
          <div className="p-4 bg-secondary/50 rounded-md border border-secondary">
            <h3 className="text-lg font-semibold mb-2 text-foreground">Generated Summary:</h3>
            <Textarea
              value={summary}
              readOnly
              rows={8}
              className="w-full bg-background text-sm leading-relaxed"
            />
          </div>
        )}
        {!isLoading && !summary && !error && (
            <div className="text-center p-6 text-muted-foreground">
                <p>Click &quot;Generate Summary&quot; to get AI insights for the selected scope.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
};
