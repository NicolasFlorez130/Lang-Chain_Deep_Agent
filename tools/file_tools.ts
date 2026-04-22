import { tool, ToolMessage } from 'langchain';
import { LS_DESCRIPTION, READ_FILE_DESCRIPTION, WRITE_FILE_DESCRIPTION } from '../prompts';
import z from 'zod';
import type { ToolRuntimeWithState } from '../types';
import { Command } from '@langchain/langgraph';

export const ls = tool(
    (_, { state: { files } }: ToolRuntimeWithState) => Object.keys(files ?? {}),
    {
        name: 'ls',
        description: LS_DESCRIPTION,
    },
);

export const readFile = tool(
    ({ filePath, offset = 0, limit = 2000 }, { state: { files } }: ToolRuntimeWithState) => {
        const content = files?.['filePath'];

        if (content === undefined) {
            return `Error: File '${filePath}' not found`;
        } else if (content.length === 0) {
            return 'System reminder: File exists but has empty contents';
        }

        const lines = content.split(/\r?\n|\r/);
        const startIdx = offset;
        const endIdx = Math.min(offset + limit, lines.length);

        if (startIdx >= lines.length) {
            return `Error: Line offset ${offset} exceeds file length (${lines.length} lines)`;
        }

        const resultLines: string[] = [];

        Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i).forEach(i => {
            resultLines.push(`${(i + 1).toString().padStart(6)}\t ${lines.at(i)?.slice(0, 2000)}`);
        });

        resultLines.join('\n');
    },
    {
        name: 'read_file',
        description: READ_FILE_DESCRIPTION,
        schema: z.object({
            filePath: z.string().describe('Path to the file to read'),
            offset: z.number().describe('Line number to start reading from (default: 0)'),
            limit: z.number().describe('Maximum number of lines to read (default: 2000)'),
        }),
    },
);

export const writeFile = tool(
    ({ filePath, content }, { state, toolCallId }: ToolRuntimeWithState) => {
        const files = state.files ?? {};
        files[filePath] = content;

        return new Command({
            update: {
                files,
                messages: [new ToolMessage(`Updated/written file ${filePath}`, toolCallId)],
            },
        });
    },
    {
        name: 'write_file',
        description: WRITE_FILE_DESCRIPTION,
        schema: z.object({
            filePath: z.string().describe('Path where the file should be created/updated'),
            content: z.string().describe('Content to write to the file'),
        }),
    },
);
