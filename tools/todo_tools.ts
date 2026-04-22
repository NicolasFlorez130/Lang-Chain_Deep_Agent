import { tool, ToolMessage } from 'langchain';
import { ToDoSchema } from '../schemas';
import { Command } from '@langchain/langgraph';
import z from 'zod';
import { WRITE_TODOS_DESCRIPTION } from '../prompts';
import type { ToolRuntimeWithState } from '../types';

export const writeTodos = tool(
    ({ todos }, { toolCallId }: ToolRuntimeWithState) => {
        return new Command({
            update: {
                todos,
                messages: [
                    new ToolMessage(`Updated todo list to ${todos.join(' --//-- ')}`, toolCallId),
                ],
            },
        });
    },
    {
        name: 'write_todos',
        description: WRITE_TODOS_DESCRIPTION,
        schema: z.object({
            todos: z.array(ToDoSchema),
        }),
    },
);

export const readTodos = tool(
    (_, { state: { todos }, toolCallId }: ToolRuntimeWithState) => {
        if (!todos || !todos?.length) {
            return 'No todos currently in the list';
        } else {
            const statusEmojis = { pending: '⏳', in_progress: '🔄', completed: '✅' } as Record<
                string,
                string
            >;

            return `
            Current TODO List: \n
            ${todos
                .map(
                    ({ status, content }, i) =>
                        `${i + 1}. ${statusEmojis[status] ?? '❓'} ${content} (${status})`,
                )
                .join('\n\n')}
            `;
        }
    },
    {
        name: 'read_todos',
        description: `
    Read the current TODO list from the agent state.

    This tool allows the agent to retrieve and review the current TODO list
    to stay focused on remaining tasks and track progress through complex workflows.
    `,
    },
);
