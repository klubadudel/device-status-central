'use server';
/**
 * @fileOverview AI-powered suggestions for device maintenance based on uptime patterns.
 *
 * - suggestMaintenance - A function that provides maintenance suggestions for devices.
 * - SuggestMaintenanceInput - The input type for the suggestMaintenance function.
 * - SuggestMaintenanceOutput - The return type for the suggestMaintenance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMaintenanceInputSchema = z.object({
  scope: z
    .string()
    .describe("The scope of devices to analyze (e.g., branch, region, or nation-wide)."),
  deviceData: z.string().describe('JSON string containing data about devices, including their uptime and status.'),
});
export type SuggestMaintenanceInput = z.infer<typeof SuggestMaintenanceInputSchema>;

const SuggestMaintenanceOutputSchema = z.object({
  suggestions: z
    .string()
    .describe('A textual overview of devices that may require maintenance, with reasons.'),
});
export type SuggestMaintenanceOutput = z.infer<typeof SuggestMaintenanceOutputSchema>;

export async function suggestMaintenance(input: SuggestMaintenanceInput): Promise<SuggestMaintenanceOutput> {
  return suggestMaintenanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMaintenancePrompt',
  input: {schema: SuggestMaintenanceInputSchema},
  output: {schema: SuggestMaintenanceOutputSchema},
  prompt: `You are an AI assistant that analyzes device uptime patterns and suggests devices that may require maintenance.

  Analyze the following device data for the given scope. Provide a short textual overview of devices that may require maintenance based on their uptime patterns and reported status. Suggest reasons for the potential maintenance needs.

  Scope: {{{scope}}}
  Device Data: {{{deviceData}}}
  \n`,
});

const suggestMaintenanceFlow = ai.defineFlow(
  {
    name: 'suggestMaintenanceFlow',
    inputSchema: SuggestMaintenanceInputSchema,
    outputSchema: SuggestMaintenanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
