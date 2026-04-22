import {
    createAgent,
    HumanMessage,
    tool,
    ToolMessage,
    type DynamicStructuredTool,
} from 'langchain';
import type { IDeepAgentState, SubAgent, ToolRuntimeWithState } from '../types';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TASK_DESCRIPTION_PREFIX } from '../prompts';
import { Command } from '@langchain/langgraph';
import z from 'zod';

export async function createTaskTool(
    tools: DynamicStructuredTool[],
    subAgents: SubAgent[],
    model: BaseChatModel,
    stateSchema: IDeepAgentState,
) {
    const toolsByName = Object.fromEntries(tools.map(tool => [tool.name, tool]));

    const agents = Object.fromEntries(
        subAgents.map(agent => [
            agent.name,
            createAgent({
                model,
                stateSchema,
                tools: !agent.tools
                    ? tools
                    : agent.tools.reduce((arr, toolName) => {
                          const tool = toolsByName[toolName];

                          !!tool && [...arr].push(tool);

                          return arr;
                      }, [] as DynamicStructuredTool[]),
            }),
        ]),
    );

    const otherAgentsString = subAgents
        .map(({ name, description }) => `- ${name}: ${description}`)
        .join('\n');

    const task = tool(
        async ({ subAgentType, description }, { state, toolCallId }: ToolRuntimeWithState) => {
            const subAgent = agents[subAgentType];

            if (!subAgent) {
                return `Error: invoked agent of type ${subAgentType}, the only allowed types are ${Object.keys(agents).join(' - ')}.`;
            }

            state.messages = [new HumanMessage(description)];

            const result = await subAgent.invoke(state);

            return new Command({
                update: {
                    files: result.files,
                    messages: [new ToolMessage(result.messages.at(-1)!.content, toolCallId)],
                },
            });
        },
        {
            name: 'sub_agent_task',
            description: TASK_DESCRIPTION_PREFIX(otherAgentsString),
            schema: z.object({
                description: z.string().describe('Clear, specific research question or task '),
                subAgentType: z.string().describe("Type of agent to use (e.g., 'research-agent')"),
            }),
        },
    );

    return task;
}
