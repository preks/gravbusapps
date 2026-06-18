import { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import type { StudioNode } from '../../types/studioTypes'
import { createDefaultConfig } from '../../utils/graphStoreUtils'
import { resolveConfigPanelHeaderTitle } from './resolveConfigPanelHeader'

const t = (key: string) => key

function makeTaskNode(stepType: FlowStepType, label = 'Task label'): StudioNode {
  return {
    id: 'task-1',
    type: 'task',
    label,
    config: {
      ...(createDefaultConfig('task') as any),
      stepType
    }
  }
}

describe('resolveConfigPanelHeaderTitle', () => {
  it('returns structural node type labels', () => {
    expect(
      resolveConfigPanelHeaderTitle(
        { id: 's', type: 'start', label: 'Start', config: createDefaultConfig('start') as any },
        [],
        t
      )
    ).toBe('palette-start')
    expect(
      resolveConfigPanelHeaderTitle(
        { id: 'e', type: 'end', label: 'End', config: createDefaultConfig('end') as any },
        [],
        t
      )
    ).toBe('palette-end')
  })

  it('returns step kind label for tasks and decisions', () => {
    expect(resolveConfigPanelHeaderTitle(makeTaskNode(FlowStepType.TASK, 'My Task'), [], t)).toBe(
      'step-kind-custom-task'
    )
    expect(
      resolveConfigPanelHeaderTitle(
        {
          id: 'd',
          type: 'decision',
          label: 'Old label',
          config: createDefaultConfig('decision') as any
        },
        [],
        t
      )
    ).toBe('task-type-approval')
  })
})
