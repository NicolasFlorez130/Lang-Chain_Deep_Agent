import { getToday, processSearchResults, tavilyClient } from '../utils';
import { tool, ToolMessage } from 'langchain';
import type { IDeepAgentState, ToolRuntimeWithState } from '../types';
import { Command } from '@langchain/langgraph';
import z from 'zod';

export const tavilySearch = tool(
    async (
        { query, maxResults = 1, topic = 'general' },
        { state, toolCallId }: ToolRuntimeWithState,
    ) => {
        const searchResults = await tavilyClient.search(query, {
            maxResults,
            topic,
        });

        const processedResults = await processSearchResults(searchResults);

        const files = state.files || {};
        const savedFiles: string[] = [];
        const summaries: string[] = [];

        processedResults.forEach(({ filename, title, url, summary, raw_content }) => {
            files[filename] = `
            # Search Result: ${title}

            **URL:** ${url}
            **Query:** ${query}
            **Date:** ${getToday()}

            ## Summary
            ${summary}

            ## Raw Content
            ${!!raw_content?.length ? raw_content : 'No raw content available'}
            `;

            savedFiles.push(filename);
            summaries.push(`- ${filename}: ${summary}...`);
        });

        const summaryText = `
        Found ${processedResults.length} results for ${query}:

        ${summaries.join('\n\n\n\n')}

        Files: ${savedFiles.join(', ')}
        Use read_files to access full details when needed.
        `;

        return new Command({
            update: {
                files,
                messages: [new ToolMessage(summaryText, toolCallId)],
            },
        });
    },
    {
        name: 'tavily_search',
        description: `
        Search web and save detailed results to files while returning minimal context.
        
        Performs web search and saves full content to files for context offloading.
        Returns only essential information to help the agent decide on next steps.`,
        schema: z.object({
            query: z.string().describe('Search query to execute'),
            maxResults: z.number().describe('Maximum number of results to return (default: 1)'),
            topic: z
                .literal(['general', 'news', 'finance'])
                .describe("Topic filter - 'general', 'news', or 'finance' (default: 'general')"),
        }),
    },
);

export const think = tool(({ reflection }) => `Reflection recorded: ${reflection}`, {
    name: 'think',
    description: `
    Tool for strategic reflection on research progress and decision-making.

    Use this tool after each search to analyze results and plan next steps systematically.
    This creates a deliberate pause in the research workflow for quality decision-making.

    When to use:
    - After receiving search results: What key information did I find?
    - Before deciding next steps: Do I have enough to answer comprehensively?
    - When assessing research gaps: What specific information am I still missing?
    - Before concluding research: Can I provide a complete answer now?
    - How complex is the question: Have I reached the number of search limits?

    Reflection should address:
    1. Analysis of current findings - What concrete information have I gathered?
    2. Gap assessment - What crucial information is still missing?
    3. Quality evaluation - Do I have sufficient evidence/examples for a good answer?
    4. Strategic decision - Should I continue searching or provide my answer?
    `,
    schema: z.object({
        reflection: z.string(
            'Your detailed reflection on research progress, findings, gaps, and next steps',
        ),
    }),
});
