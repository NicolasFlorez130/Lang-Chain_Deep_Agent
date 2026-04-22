import type { IProcessedResult, ISummary } from './types';
import type { TavilySearchResponse } from '@tavily/core';
import { SUMMARIZE_WEB_SEARCH } from './prompts';
import { SummarySchema } from './schemas';
import { SystemMessage } from 'langchain';
import TurndownService from 'turndown';
import { tavily } from '@tavily/core';
import { randomBytes } from 'crypto';
import { model } from '.';
import path from 'path';

export const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

export function filesReducer(left?: Record<string, string>, right?: Record<string, string>) {
    if (!left) {
        return right;
    } else if (!right) {
        return left;
    } else {
        return { ...left, ...right };
    }
}

export function getToday() {
    return new Date().toDateString();
}

export function summarizeWebpageContent(webpageContent: string) {
    try {
        const structuredModel = model.withStructuredOutput(SummarySchema);

        return structuredModel.invoke([
            new SystemMessage(SUMMARIZE_WEB_SEARCH(webpageContent, getToday())),
        ]);
    } catch (error) {
        return {
            filename: 'search_result.md',
            summary:
                webpageContent.length > 1000
                    ? `${webpageContent.slice(0, 1000)}...`
                    : webpageContent,
        } satisfies ISummary;
    }
}

const turndownService = new TurndownService();

export async function processSearchResults(results: TavilySearchResponse) {
    const processedResults: IProcessedResult[] = [];
    const searchResults = results.results || [];

    for (const result of searchResults) {
        const url = result.url;
        let rawContent = '';
        let summaryObj: ISummary;

        try {
            // Set up a 30-second timeout using AbortController (Standard for fetch)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            // Read URL with timeout
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId); // Clear timeout if the request finishes in time

            if (response.ok) {
                // Equivalent to status_code == 200
                const htmlText = await response.text();
                // Convert HTML to markdown
                rawContent = turndownService.turndown(htmlText);
                summaryObj = await summarizeWebpageContent(rawContent);
            } else {
                // Use Tavily's generated summary on non-200 responses
                rawContent = result.rawContent || '';
                summaryObj = {
                    filename: 'URL_error.md',
                    summary: result.content || 'Error reading URL; try another search.',
                };
            }
        } catch (error) {
            // Handle timeout (AbortError) or connection errors gracefully
            rawContent = result.rawContent || '';
            summaryObj = {
                filename: 'connection_error.md',
                summary:
                    result.content ||
                    'Could not fetch URL (timeout/connection error). Try another search.',
            };
        }

        // Uniquify file names
        // Note: 6 random bytes encoded to base64url results in exactly 8 characters, mirroring the Python slice [:8]
        const uid = randomBytes(6).toString('base64url');
        const ext = path.extname(summaryObj.filename);
        const name = path.basename(summaryObj.filename, ext);
        summaryObj.filename = `${name}_${uid}${ext}`;

        processedResults.push({
            url: result.url,
            title: result.title,
            summary: summaryObj.summary,
            filename: summaryObj.filename,
            raw_content: rawContent,
        });
    }

    return processedResults;
}

export const separator = (length: number) => Array.from({ length }).map(() => '=');
