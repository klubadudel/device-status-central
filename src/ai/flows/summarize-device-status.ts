// 'use server';
/**
 * @fileOverview GenAI flow for summarizing device status and uptime across branches or regions.
 *
 * - summarizeDeviceStatus - A function that generates a summary of device status.
 * - SummarizeDeviceStatusInput - The input type for the summarizeDeviceStatus function.
 * - SummarizeDeviceStatusOutput - The return type for the summarizeDeviceStatus function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDeviceStatusInputSchema = z.object({
  scope: z
    .string()
    .describe(
      'The scope of the summary, can be branch, region, or nation-wide. Scope can be a list of branch id, region id, or all for nation-wide.'
    ),
});
export type SummarizeDeviceStatusInput = z.infer<typeof SummarizeDeviceStatusInputSchema>;

const SummarizeDeviceStatusOutputSchema = z.object({
  summary: z.string().describe('A summary of device status and uptime.'),
});
export type SummarizeDeviceStatusOutput = z.infer<typeof SummarizeDeviceStatusOutputSchema>;

export async function summarizeDeviceStatus(input: SummarizeDeviceStatusInput): Promise<SummarizeDeviceStatusOutput> {
  return summarizeDeviceStatusFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDeviceStatusPrompt',
  input: {schema: SummarizeDeviceStatusInputSchema},
  output: {schema: SummarizeDeviceStatusOutputSchema},
  prompt: `You are an expert in device uptime and maintenance.

  You will receive a scope, which contains a list of branch ID, region ID or all for nation-wide.
  Generate a summary of device status and uptime across the scope, so I can quickly identify potential maintenance needs and focus my attention effectively.

  Scope: {{{scope}}} `,
});

const summarizeDeviceStatusFlow = ai.defineFlow(
  {
    name: 'summarizeDeviceStatusFlow',
    inputSchema: SummarizeDeviceStatusInputSchema,
    outputSchema: SummarizeDeviceStatusOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
