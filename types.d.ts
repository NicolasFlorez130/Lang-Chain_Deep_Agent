import type { ToolRuntime } from 'langchain';
import type { DeepAgentState, SummarySchema, ToDoSchema } from './schemas';

export type IToDo = z.infer<typeof ToDoSchema>;

export type ISummary = z.infer<typeof SummarySchema>;

export interface IFile {
    filename: string;
    file_content: string;
}

export interface IProcessedResult {
    url: string;
    title: string;
    summary: string;
    filename: string;
    raw_content: string;
}

export type IDeepAgentState = typeof DeepAgentState;

export type ToolRuntimeWithState = ToolRuntime<IDeepAgentState['State']>;

export interface SubAgent {
    name: string;
    description: string;
    prompt: string;
    tools?: string[];
}
