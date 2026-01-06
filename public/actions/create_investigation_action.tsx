/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import dateMath from '@elastic/datemath';
import { first } from 'rxjs/operators';
import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { NotebookContext, NoteBookSource, NotebookType } from '../../common/types/notebooks';
import { CoreStart, UiSettingScope } from '../../../../src/core/public';
import { AssistantAction } from '../../../../src/plugins/context_provider/public';

interface CreateInvestigationArgs {
  name: string;
  initialGoal: string;
  symptom: string;
  index: string;
  dslQuery?: string;
  pplQuery?: string;
  timeField?: string;
  timeRange?: {
    from: string;
    to: string;
  };
  baseline?: {
    from: string;
    to: string;
  };
  dataSourceId?: string;
}

interface CreateInvestigationResult {
  success: boolean;
  notebookId?: string;
  name?: string;
  error?: string;
  initialGoal: string;
  symptom: string;
  index: string;
  timeRange?: {
    from: string;
    to: string;
  };
  message?: string;
  path?: string;
}

export const createInvestigationAction = (
  services: CoreStart
): AssistantAction<CreateInvestigationArgs> => {
  return {
    name: 'create_investigation',
    description:
      'Create a new agentic investigation notebook with the provided details. IMPORTANT: Only call this tool ONCE per request. Do not make duplicate calls with the same or similar parameters.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the investigation (should be descriptive and concise)',
        },
        initialGoal: {
          type: 'string',
          description: 'The initial goal or question for the investigation',
        },
        symptom: {
          type: 'string',
          description: 'Description of the symptom or issue being investigated',
        },
        index: {
          type: 'string',
          description: 'Index pattern or dataset title (required)',
        },
        dslQuery: {
          type: 'string',
          description: 'Optional DSL query to include in the investigation',
        },
        pplQuery: {
          type: 'string',
          description: 'Optional PPL query to include in the investigation',
        },
        timeField: {
          type: 'string',
          description: 'Optional time field name for the dataset',
        },
        timeRange: {
          type: 'object',
          description:
            'Optional time range for the investigation. Supports both absolute dates (ISO-8601 format) and relative time expressions (e.g., now-15m, now-1h, now-7d)',
          properties: {
            from: {
              type: 'string',
              description:
                'Start time. Can be ISO-8601 format (e.g., 2025-12-22T22:31:36Z) or relative expression (e.g., now-15m, now-1h, now-7d)',
            },
            to: {
              type: 'string',
              description:
                'End time. Can be ISO-8601 format (e.g., 2025-12-22T22:31:36Z) or relative expression (e.g., now)',
            },
          },
        },
        baseline: {
          type: 'object',
          description:
            'Optional baseline time range for comparison. Supports both absolute dates (ISO-8601 format) and relative time expressions (e.g., now-15m, now-1h, now-7d)',
          properties: {
            from: {
              type: 'string',
              description:
                'Baseline start time. Can be ISO-8601 format (e.g., 2025-12-22T22:31:36Z) or relative expression (e.g., now-15m, now-1h, now-7d)',
            },
            to: {
              type: 'string',
              description:
                'Baseline end time. Can be ISO-8601 format (e.g., 2025-12-22T22:31:36Z) or relative expression (e.g., now)',
            },
          },
        },
      },
      required: ['name', 'initialGoal', 'symptom', 'index'],
    },
    requiresConfirmation: true,
    confirmationDescription:
      'This will create a new investigation notebook with the specified parameters.',
    handler: async (args: CreateInvestigationArgs): Promise<CreateInvestigationResult> => {
      try {
        // log args
        console.log('create investigation args', args);
        // Validate initial goal
        if (!args.initialGoal || args.initialGoal.trim().length === 0) {
          throw new Error('Investigation goal cannot be empty');
        }

        const currentTime = new Date().getTime();

        // Get default data source ID
        const { http, uiSettings, workspaces } = services;

        // Get workspace scope for data source
        let scope: UiSettingScope = UiSettingScope.GLOBAL;
        if (workspaces?.currentWorkspaceId$) {
          const currentWorkspaceId = workspaces.currentWorkspaceId$.getValue();
          if (currentWorkspaceId) {
            scope = UiSettingScope.WORKSPACE;
          }
        }

        // Get default data source ID
        const dataSourceId =
          args.dataSourceId || uiSettings
            ? await uiSettings.getUserProvidedWithScope<string | null>('defaultDataSource', scope)
            : undefined;

        // Build the notebook context
        const context: NotebookContext = {
          source: NoteBookSource.CHAT,
          index: args.index,
          notebookType: NotebookType.AGENTIC,
          initialGoal: args.initialGoal,
          symptom: args.symptom,
          timeField: args.timeField || '',
          currentTime,
          dataSourceId: dataSourceId || '',
        };

        const dateFormat = uiSettings?.get('dateFormat') || 'MMM D, YYYY @ HH:mm:ss.SSS';

        // Add time range if provided (parse ISO-8601 UTC timestamps or relative time expressions)
        if (args.timeRange) {
          // Use dateMath to parse both absolute dates and relative expressions like "now-15m"
          const fromMoment = dateMath.parse(args.timeRange.from);
          const toMoment = dateMath.parse(args.timeRange.to, { roundUp: true });

          // Validate dates
          if (!fromMoment || !toMoment || !fromMoment.isValid() || !toMoment.isValid()) {
            throw new Error(
              `Invalid time range format. From: "${args.timeRange.from}", To: "${args.timeRange.to}". ` +
                'Expected ISO-8601 format (e.g., 2025-12-22T22:31:36Z) or relative time expression (e.g., now-15m, now-1h, now-7d, now)'
            );
          }

          // Validate that from is before to
          if (fromMoment.isAfter(toMoment)) {
            throw new Error(
              `Invalid time range: start time (${fromMoment.format(
                dateFormat
              )}) is after end time (${toMoment.format(dateFormat)})`
            );
          }

          // Parse baseline if provided
          let baselineFrom = 0;
          let baselineTo = 0;

          if (args.baseline) {
            const baselineFromMoment = dateMath.parse(args.baseline.from);
            const baselineToMoment = dateMath.parse(args.baseline.to, { roundUp: true });

            // Validate baseline dates
            if (
              !baselineFromMoment ||
              !baselineToMoment ||
              !baselineFromMoment.isValid() ||
              !baselineToMoment.isValid()
            ) {
              throw new Error(
                `Invalid baseline time range format. From: "${args.baseline.from}", To: "${args.baseline.to}". ` +
                  'Expected ISO-8601 format (e.g., 2025-12-22T22:31:36Z) or relative time expression (e.g., now-15m, now-1h, now-7d, now)'
              );
            }

            // Validate that baseline from is before baseline to
            if (baselineFromMoment.isAfter(baselineToMoment)) {
              throw new Error(
                `Invalid baseline time range: start time (${baselineFromMoment.format(
                  dateFormat
                )}) is after end time (${baselineToMoment.format(dateFormat)})`
              );
            }

            baselineFrom = baselineFromMoment.valueOf();
            baselineTo = baselineToMoment.valueOf();
          }

          context.timeRange = {
            selectionFrom: fromMoment.valueOf(),
            selectionTo: toMoment.valueOf(),
            baselineFrom,
            baselineTo,
          };
        }

        // Add query variables if provided
        if (args.dslQuery || args.pplQuery) {
          context.variables = {
            ...(args.dslQuery && { dslQuery: args.dslQuery }),
            ...(args.pplQuery && { pplQuery: args.pplQuery }),
            pplFilters: [],
          };
        }

        // TODO wait for 1 second to allow the context to be updated
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Create the notebook via API
        const notebookId = await http.post<string>(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook`, {
          body: JSON.stringify({
            name: args.name,
            context,
          }),
        });

        if (!notebookId) {
          throw new Error('Failed to create investigation notebook');
        }

        // Auto-navigate to the investigation page after a brief delay
        const path = `#/agentic/${notebookId}`;
        setTimeout(() => {
          if (services.application) {
            services.application.navigateToApp('investigation-notebooks', {
              path,
            });
          }
        }, 500);

        return {
          success: true,
          notebookId,
          name: args.name,
          initialGoal: args.initialGoal,
          symptom: args.symptom,
          index: args.index,
          timeRange: args.timeRange,
          message: `Investigation created successfully`,
          path,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          initialGoal: args.initialGoal,
          symptom: args.symptom,
          index: args.index,
          timeRange: args.timeRange,
        };
      }
    },
    render: ({
      status,
      args,
      result,
    }: {
      status: 'pending' | 'executing' | 'complete' | 'failed';
      args?: CreateInvestigationArgs;
      result?: CreateInvestigationResult;
    }) => {
      // logger args and result
      console.log('Render create_investigation action', { status, args, result });
      // Return null if we have neither args nor result
      if (!args && !result) {
        return null;
      }

      const getStatusColor = () => {
        if (status === 'failed' || (result && !result.success)) return 'danger';
        if (status === 'complete' && result?.success) return 'success';
        return 'subdued';
      };

      const getStatusIcon = () => {
        if (status === 'failed' || (result && !result.success)) return 'cross';
        if (status === 'executing') return 'clock';
        return 'check';
      };

      const getStatusIconColor = () => {
        if (status === 'failed' || (result && !result.success)) return 'danger';
        if (status === 'executing') return 'primary';
        return 'success';
      };

      return (
        <EuiPanel paddingSize="s" color={getStatusColor()}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type={getStatusIcon()} color={getStatusIconColor()} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>
                  {status === 'executing' && 'Creating investigation...'}
                  {status === 'complete' && result?.success && 'Create investigation'}
                  {status === 'failed' && 'Failed to create investigation'}
                </strong>
              </EuiText>
              {status === 'complete' && result?.success && result?.name && (
                <EuiText size="xs" color="subdued">
                  {result.name}
                </EuiText>
              )}
              {status === 'failed' && result?.error && (
                <EuiText size="xs" color="danger">
                  {result.error}
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>

          {status === 'complete' && result?.success && (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="check" color="success" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>Navigate to investigation page</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    Navigated to page:{' '}
                    <EuiLink
                      onClick={async () => {
                        if (result?.notebookId) {
                          // Check if we're already in the investigation-notebooks app
                          const currentApp = await services.application?.currentAppId$
                            .pipe(first())
                            .toPromise();

                          if (currentApp === 'investigation-notebooks') {
                            // Phase 1: Navigate to the investigation-notebooks app first
                            await services.application?.navigateToApp('investigation-notebooks');

                            // Phase 2: Navigate to the specific notebook after a short delay
                            setTimeout(() => {
                              services.application?.navigateToApp('investigation-notebooks', {
                                path: `#/agentic/${result.notebookId}`,
                              });
                            }, 100);
                          } else {
                            // If we're in a different app, navigate directly with the path
                            services.application?.navigateToApp('investigation-notebooks', {
                              path: `#/agentic/${result.notebookId}`,
                            });
                          }
                        }
                      }}
                    >
                      {result?.name}
                    </EuiLink>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </EuiPanel>
      );
    },
    enabled: true,
    useCustomRenderer: true,
  };
};
