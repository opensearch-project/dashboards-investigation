/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IOpenSearchDashboardsResponse, IRouter } from '../../../../../src/core/server';
import { NOTEBOOKS_API_PREFIX } from '../../../common/constants/notebooks';
import { getOpenSearchClientTransport, handleError } from '../utils';

const commonInstructions = `
# Instructions

## Core Planning Rules
- Break the objective into an ordered list of atomic, self-contained Steps that, if executed, will lead to the final result or complete the objective
- Each Step must state what to do, where, and which tool/parameters would be used. You do not execute tools, only reference them for planning
- Use only the provided tools; do not invent or assume tools. If no suitable tool applies, use reasoning or observations instead
- Base your plan only on the data and information explicitly provided; do not rely on unstated knowledge or external facts
- If there is insufficient information to create a complete plan, summarize what is known so far and clearly state what additional information is required to proceed
- Stop and summarize if the task is complete or further progress is unlikely
- Avoid vague instructions; be specific about data sources, indexes, or parameters
- Never make assumptions or rely on implicit knowledge
- Respond only in JSON format
${/* Avoid too many tokens when it is an index pattern */ ''}
- When using ListIndexTool, use include_details false when the input is an index pattern or wildcard.

## Step Examples
**Good example:** "Use Tool to sample documents from index: 'my-index'"

**Bad example:** "Use Tool to sample documents from each index"

**Bad example:** "Use Tool to sample documents from all indices"`;

const commonResponseFormat = `
# Response Format

## JSON Response Requirements
Only respond in JSON format. Always follow the given response instructions. Do not return any content that does not follow the response instructions. Do not add anything before or after the expected JSON

Always respond with a valid JSON object that strictly follows the below schema:
\`\`\`json
{
  "steps": array[string],
  "result": string
}
\`\`\`

- Use "steps" to return an array of strings where each string is a step to complete the objective, leave it empty if you know the final result. Please wrap each step in quotes and escape any special characters within the string
- Use "result" to return the final response when you have enough information, leave it empty if you want to execute more steps. When providing the final result, it MUST be a stringified JSON object with the following structure:

## Final Result Structure
Final result must be a stringified JSON object:
\`\`\`json
{
    "findings": array[object],
    "hypotheses": array[object],
    "investigationName": "string object which will be the auto generated name for the whole investigation, max 50 characters"
}
\`\`\`

Your final result JSON must include:
- **"findings"**: An array of finding objects, each containing:
  * **"id"**: A unique identifier for the finding (e.g., "F1", "F2")
  * **"description"**: Clear statement of the finding
  * **"importance"**: Rating from 0-100 indicating overall significance
  * **"evidence"**: Specific data, quotes, or observations supporting this finding
- **"hypotheses"**: An array of hypothesis objects, each containing:
  * **"id"**: A unique identifier for the hypothesis (e.g., "H1")
  * **"title"**: A concise title for the hypothesis
  * **"description"**: Clear statement of the hypothesis
  * **"likelihood"**: Rating from 0-100 indicating probability of being correct
  * **"supporting_findings"**: Array of finding IDs that support or relate to this hypothesis

### Finding Structure
\`\`\`json
{
    "id": string,
    "description": string,
    "importance": number (0-100),
    "evidence": string,
    "type": string (optional, use "TOPOLOGY" for topology graph findings)
}
\`\`\`

### Hypothesis Structure
\`\`\`json
{
    "id": string,
    "title": string,
    "description": string,
    "likelihood": number (0-100),
    "supporting_findings": array[string]
}
\`\`\`

### Likelihood Guidelines
- **Strong likelihood (70-100)**: High confidence, substantial supporting evidence
- **Moderate likelihood (40-70)**: Medium confidence, some supporting evidence
- **Weak likelihood (0-40)**: Low confidence, limited supporting evidence

## Examples
**Planning response:**
\`\`\`json
{
  "steps": ["This is an example step", "this is another example step"],
  "result": ""
}
\`\`\`

**Final response:**
\`\`\`json
{
  "steps": [],
  "result": "{\"investigationName\": \"Invalid payment token Investigation\",\"findings\":[{\"id\":\"F1\",\"description\":\"High error rate detected\",\"importance\":90,\"evidence\":\"500+ errors in last hour\"}],\"hypotheses\":[{\"id\":\"H1\",\"title\":\"Database Connection Issue\",\"description\":\"Application errors caused by database connectivity problems\",\"likelihood\":85,\"supporting_findings\":[\"F1\"]}]}"
}
\`\`\`

## Critical Rules
1. Do not use commas within individual steps
2. **CRITICAL: For tool parameters use commas without spaces (e.g., "param1,param2,param3") - This rule must be followed exactly**
3. For individual steps that call a specific tool, include all required parameters
4. Do not add any content before or after the JSON
5. Only respond with a pure JSON object
6. **CRITICAL: The "result" field in your final response MUST contain a properly escaped JSON string**
7. **CRITICAL: The hypothesis must reference specific findings by their IDs in the supporting_findings array**
8. **Topology Generation Rule:** When trace data with traceId is available, create a "Request flow topology" finding to visualize the service call hierarchy. Set "type": "TOPOLOGY" for these findings. Consolidate similar topologies - if multiple traces show identical flow patterns, include only one representative example.

### Topology Format Requirements:
- Use tree structure with consistent indentation (2 spaces per level)
- Include service/operation names with Start time (ISO format) and Duration
- Show parent-child relationships clearly with └─ for children
- Mark failed operations with [FAILED] or [ERROR] prefix
- For parallel operations, list them at the same indentation level
- Keep the topology focused on the critical path (limit depth to 5 levels)

### Example Topology:
┌──────────────────────────────────────────────────────────────────────┐
│ Request Flow Topology (TraceId: abc123)                              │
├──────────────────────────────────────────────────────────────────────┤
│ CheckoutService                                                      │
│   Start: 2024-11-17 00:11:23.040                                     │
│   Duration: 11.10 sec                                                │
│   └─ PaymentService                                                  │
│       Start: 2024-11-17 00:11:23.042                                 │
│       Duration: 10.00 sec                                            │
│       └─ charge [FAILED]                                             │
│           Start: 2024-11-17 00:11:23.045                             │
│           Duration: 9.98 sec                                         │
│   └─ ShippingService                                                 │
│       Start: 2024-11-17 00:11:33.043                                 │
│       Duration: 1.1 ms                                               │
│   └─ NotificationService                                             │
│       Start: 2024-11-17 00:11:33.048                                 │
│       Duration: 1.9 ms                                               │
│       └─ send_email                                                  │
│           Start: 2024-11-17 00:11:33.049                             │
│           Duration: 1.6 ms                                           │
└──────────────────────────────────────────────────────────────────────┘`;

const getTimeScopePrompt = (timeRange: { selectionFrom: number; selectionTo: number }) => `
  ${
    timeRange && timeRange.selectionFrom && timeRange.selectionTo
      ? `
## Time Scope

**CRITICAL: Use this exact time range for your investigation:**
- Start time: ${new Date(timeRange.selectionFrom).toISOString()}
- End time: ${new Date(timeRange.selectionTo).toISOString()}

Use these ISO 8601 UTC timestamps (format: YYYY-MM-DDTHH:mm:ss.sssZ) for all time-based queries and analysis.`
      : ''
  }
`;

export function registerAgentExecutionRoute(router: IRouter) {
  // Execute agent
  router.post(
    {
      path: `${NOTEBOOKS_API_PREFIX}/agents/{agentId}/_execute`,
      validate: {
        params: schema.object({
          agentId: schema.string(),
        }),
        body: schema.object({
          parameters: schema.recordOf(schema.string(), schema.any()),
          dataSourceId: schema.maybe(schema.string()),
        }),
        query: schema.object({
          async: schema.maybe(schema.boolean()),
        }),
      },
    },
    async (context, request, response): Promise<IOpenSearchDashboardsResponse> => {
      try {
        const { parameters, dataSourceId } = request.body;
        const { initialGoal, timeRange, prevContent, question } = parameters;
        const { agentId } = request.params;
        const { async } = request.query;
        let systemPrompt;

        if (prevContent && !!initialGoal) {
          systemPrompt = `
# Re-Investigation Agent

You are a thoughtful and analytical planner agent specializing in **RE-INVESTIGATION**. Your job is to update existing hypotheses based on current evidence while minimizing new findings creation.
${getTimeScopePrompt(timeRange)}
## Investigation Context
**ORIGINAL QUESTION:** "${initialGoal}"

The hypotheses were generated from this original question.

**NEW INVESTIGATION QUESTION:** "${question}"

You are now investigating this new question. Update the hypotheses based on this new question and current evidence.

## Re-Investigation Rules
- Analyze existing hypotheses and findings to determine if they remain valid
- **REUSE** existing findings that are still relevant rather than creating duplicates
- Only create **NEW** findings when absolutely necessary for novel evidence
- Update hypothesis likelihood based on all available evidence

${commonInstructions}

## Findings Handling
- **CRITICAL:** During rerun, ALL old findings will be DELETED. You MUST return a COMPLETE list of findings in the "findings" array
- Return ALL findings (both existing and new) that should exist after the rerun
- **For reused findings:** Include the full finding content in the "findings" array even if it existed before
- **For new findings:** Use generated finding IDs (e.g., "F1", "F2", "F3") - frontend will replace these with actual paragraph IDs
- The supporting_findings array should reference the finding IDs from your "findings" array
- **You MUST include ALL findings** - anything not in the "findings" array will be permanently lost
- **To delete irrelevant findings:** Simply don't include them in your "findings" array if they are no longer relevant to the investigation

## Findings Novelty Check
You **MUST** include ONLY findings that are genuinely NEW. A finding is **NOT** new if:
- It restates the same conclusion with different wording
- It provides minor technical details about the same core issue
- It describes the same evidence using different terminology
- It's a methodological note about how you found existing information
- It summarizes or contextualizes already-known information

**A finding IS new only if:**
- It reveals a previously unknown cause or effect
- It identifies a different system component involved
- It discovers a new time pattern or scope
- It uncovers additional impact or consequences not previously known
- It provides genuinely new evidence (not just rewording existing evidence)

## Operation Guidance
Create new hypotheses with fresh IDs. Previous hypotheses will be replaced.

${commonResponseFormat}

**The final response should create a clear chain of evidence where findings support your hypothesis while maximizing reuse of existing evidence.**
`.trim();
        } else {
          systemPrompt = `
# Investigation Planner Agent

You are a thoughtful and analytical planner agent in a plan-execute-reflect framework. Your job is to design a clear, step-by-step plan for a given objective.
${getTimeScopePrompt(timeRange)}

${commonInstructions}

${commonResponseFormat}
`.trim();
        }

        const plannerPromptTemplate = `
## AVAILABLE TOOLS
\${parameters.tools_prompt}

## PLANNING GUIDANCE
\${parameters.planner_prompt}

## OBJECTIVE
Your job is to fulfill user's requirements and answer their questions effectively. User Input:
\`\`\`\${parameters.user_prompt}\`\`\`

## PREVIOUS CONTEXT
The following are steps executed previously to help you investigate, you can take these as background knowledge and utilize these information for further research
[\${parameters.context}]

Remember: Respond only in JSON format following the required schema.`;

        const plannerWithHistoryTemplate = `
## AVAILABLE TOOLS
\${parameters.tools_prompt}

## PLANNING GUIDANCE
\${parameters.planner_prompt}

## OBJECTIVE
The following is the user's input. Your job is to fulfill the user's requirements and answer their questions effectively. User Input:
\`\`\`\${parameters.user_prompt}\`\`\`

## PREVIOUS CONTEXT
The following are steps executed previously to help you investigate, you can take these as background knowledge and utilize these information for further research
[\${parameters.context}]

## CURRENT PROGRESS
You have already completed the following steps in the current plan. Consider these when determining next actions:
[\${parameters.completed_steps}]

Remember: Respond only in JSON format following the required schema.`;

        const reflectPromptTemplate = `
## AVAILABLE TOOLS
\${parameters.tools_prompt}

## PLANNING GUIDANCE
\`\`\`\${parameters.planner_prompt}\`\`\`

## OBJECTIVE
The following is the user's input. Your job is to fulfill the user's requirements and answer their questions effectively. User Input:
\${parameters.user_prompt}

## ORIGINAL PLAN
This was the initially created plan to address the objective:
[\${parameters.steps}]

## PREVIOUS CONTEXT
The following are steps executed previously to help you investigate, you can take these as background knowledge and utilize these information for further research without doing the same thing again:
[\${parameters.context}]

## CURRENT PROGRESS
You have already completed the following steps from the original plan. Consider these when determining next actions:
[\${parameters.completed_steps}]

## REFLECTION GUIDELINE
\${parameters.reflect_prompt}

Remember: Respond only in JSON format following the required schema.`;

        const transport = await getOpenSearchClientTransport({
          context,
          request,
          dataSourceId,
        });

        // Build query parameters
        const queryParams = new URLSearchParams();
        if (async) {
          queryParams.append('async', 'true');
        }
        const queryString = queryParams.toString();
        const path = queryString
          ? `/_plugins/_ml/agents/${agentId}/_execute?${queryString}`
          : `/_plugins/_ml/agents/${agentId}/_execute`;

        const result = await transport.request({
          path,
          method: 'POST',
          body: {
            parameters: {
              context: parameters.context,
              executor_agent_memory_id: parameters.executor_agent_memory_id,
              question,
              system_prompt: systemPrompt,
              planner_prompt_template: plannerPromptTemplate,
              planner_with_history_template: plannerWithHistoryTemplate,
              reflect_prompt_template: reflectPromptTemplate,
            },
          },
        });

        return response.ok({
          body: result.body,
        });
      } catch (error) {
        return handleError(error, response);
      }
    }
  );
}
