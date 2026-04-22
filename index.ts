import { ChatGoogle } from '@langchain/google';
import { tavilySearch, think } from './tools/sub_agent_tools';
import { ls, readFile, writeFile } from './tools/file_tools';
import { readTodos, writeTodos } from './tools/todo_tools';
import {
    FILE_USAGE_INSTRUCTIONS,
    RESEARCHER_INSTRUCTIONS,
    SUBAGENT_USAGE_INSTRUCTIONS,
    TODO_USAGE_INSTRUCTIONS,
} from './prompts';
import { getToday, separator } from './utils';
import type { SubAgent } from './types';
import { createAgent, DynamicStructuredTool } from 'langchain';
import { createTaskTool } from './tools/task_tool';
import { DeepAgentState } from './schemas';

export const model = new ChatGoogle({ model: 'gemini-3.1-flash-lite-preview' });

const maxConcurrentResearchUnits = 3;
const maxResearchIterations = 3;

const subAgentTools = [tavilySearch, think];

const builtInTools = [ls, readFile, writeFile, writeTodos, readTodos];

const researchSubAgent: SubAgent = {
    name: 'research-agent',
    description:
        'Delegate research to the sub-agent researcher. Only give this researcher one topic at a time.',
    prompt: RESEARCHER_INSTRUCTIONS(getToday()),
    tools: ['tavily_search', 'think'],
};

const taskTool = await createTaskTool(subAgentTools, [researchSubAgent], model, DeepAgentState);

const delegationTools = [taskTool];
const allTools = [...builtInTools, ...delegationTools, ...subAgentTools];

const SUBAGENT_INSTRUCTIONS = SUBAGENT_USAGE_INSTRUCTIONS(
    maxConcurrentResearchUnits,
    maxResearchIterations,
);

const INSTRUCTIONS = `
    #TODO MANAGEMENT
    ${TODO_USAGE_INSTRUCTIONS}
    
    ${separator(80)}

    # FILE SYSTEM USAGE
    ${FILE_USAGE_INSTRUCTIONS}

    ${separator(80)}

    #SUB-AGENT DELEGATION
    ${SUBAGENT_INSTRUCTIONS}
`;

export const DeepAgent = createAgent({
    model,
    tools: allTools,
    systemPrompt: INSTRUCTIONS,
    stateSchema: DeepAgentState,
});
