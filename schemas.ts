import { Annotation, messagesStateReducer, StateSchema } from '@langchain/langgraph';
import type { BaseMessage } from 'langchain';
import { filesReducer } from './utils';
import type { IToDo } from './types';
import z from 'zod';

export const ToDoSchema = z.object({
    content: z.string().describe('Short, specific description of the task'),
    status: z
        .literal(['pending', 'in_progress', 'completed'])
        .describe('Current state - pending, in_progress, or completed'),
});

export const SummarySchema = z.object({
    filename: z.string().describe('Name of the file to store.'),
    summary: z.string().describe('Key learnings from the webpage.'),
});

export const DeepAgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
    }),
    files: Annotation<Record<string, string> | undefined>({
        reducer: filesReducer,
    }),
    todos: Annotation<IToDo[] | undefined>,
});
