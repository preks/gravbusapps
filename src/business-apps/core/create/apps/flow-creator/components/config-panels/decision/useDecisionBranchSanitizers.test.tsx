import React from 'react'
import { render, waitFor } from '@testing-library/react'
import type { DecisionNodeConfig } from '../../../types/studioTypes'
import { useDecisionBranchSanitizers } from './useDecisionBranchSanitizers'

function SanitizerHarness({
  config,
  onUpdate
}: {
  config: DecisionNodeConfig
  onUpdate: (partial: Partial<DecisionNodeConfig>) => void
}) {
  useDecisionBranchSanitizers(config, onUpdate)
  return null
}

describe('useDecisionBranchSanitizers', () => {
  it('repairs invalid logic branch references to the fallback branch', async () => {
    const updateConfig = jest.fn()

    render(
      <SanitizerHarness
        config={
          {
            nodeType: 'decision',
            decisionMode: 'LOGIC',
            branches: [
              { id: 'approve-branch', label: 'Approve' },
              { id: 'reject-branch', label: 'Reject' }
            ],
            defaultBranch: 'approve-branch',
            logicConfig: {
              conditions: [
                {
                  expression: "$steps.self.resultData.decisionResult == 'approve'",
                  branchId: 'missing-branch'
                }
              ]
            }
          } as any
        }
        onUpdate={updateConfig}
      />
    )

    await waitFor(() =>
      expect(updateConfig).toHaveBeenCalledWith({
        logicConfig: {
          conditions: [
            {
              expression: "$steps.self.resultData.decisionResult == 'approve'",
              branchId: 'approve-branch'
            }
          ]
        }
      })
    )
  })

  it('repairs invalid task expert mapping branch references to the fallback branch', async () => {
    const updateConfig = jest.fn()

    render(
      <SanitizerHarness
        config={
          {
            nodeType: 'decision',
            decisionMode: 'AI',
            branches: [
              { id: 'approve-branch', label: 'Approve' },
              { id: 'reject-branch', label: 'Reject' }
            ],
            defaultBranch: 'approve-branch',
            aiConfig: {
              executor: 'TASK_EXPERT',
              humanInstructions: 'Escalate to a reviewer.',
              escalation: {
                mode: 'USER',
                assignment: { targets: null, assignmentMode: 'CLAIM' }
              },
              mapping: {
                conditions: [
                  {
                    expression: "$steps.self.resultData.decisionResult == 'approve'",
                    branchId: 'missing-branch'
                  }
                ]
              }
            }
          } as any
        }
        onUpdate={updateConfig}
      />
    )

    await waitFor(() =>
      expect(updateConfig).toHaveBeenCalledWith({
        aiConfig: {
          executor: 'TASK_EXPERT',
          humanInstructions: 'Escalate to a reviewer.',
          escalation: {
            mode: 'USER',
            assignment: { targets: null, assignmentMode: 'CLAIM' }
          },
          mapping: {
            conditions: [
              {
                expression: "$steps.self.resultData.decisionResult == 'approve'",
                branchId: 'approve-branch'
              }
            ]
          }
        }
      })
    )
  })
})
