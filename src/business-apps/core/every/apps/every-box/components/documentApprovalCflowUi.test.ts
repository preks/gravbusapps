import type { UnifiedTask } from '../types'
import {
  filterFormFieldsForDocumentApproval,
  getTaskAppTag,
  isDocumentApprovalTask,
  resolveDocumentApprovalRequestId
} from './documentApprovalCflowUi'

function createTask(overrides: Partial<UnifiedTask> = {}): UnifiedTask {
  return {
    id: 'task-1',
    status: 'IN_PROGRESS',
    source: 'cflow',
    tags: {},
    ...overrides
  }
}

describe('documentApprovalCflowUi', () => {
  it('resolves document approval metadata from tags and entity links', () => {
    const task = createTask({
      tags: {
        app: 'document-approval',
        approvalRequestId: 'approval-tag-1'
      }
    })

    expect(getTaskAppTag(task)).toBe('document-approval')
    expect(resolveDocumentApprovalRequestId(task)).toBe('approval-tag-1')
    expect(isDocumentApprovalTask(task)).toBe(true)
  })

  it('falls back to entity metadata when approval tags are missing', () => {
    const task = createTask({
      tags: {
        app: 'document-approval'
      }
    })

    expect(
      resolveDocumentApprovalRequestId(task, {
        type: 'entity:document',
        metadata: {
          approvalRequestId: 'approval-link-1'
        }
      })
    ).toBe('approval-link-1')
    expect(
      isDocumentApprovalTask(task, {
        type: 'entity:document',
        metadata: {
          approvalRequestId: 'approval-link-1'
        }
      })
    ).toBe(true)
  })

  it('hides the decision radio for document approval tasks but preserves other fields', () => {
    const task = createTask({
      tags: {
        app: 'document-approval',
        approvalRequestId: 'approval-tag-1'
      },
      form: [
        {
          type: 'RADIO',
          name: 'decision',
          label: 'Decision'
        },
        {
          type: 'TEXTAREA',
          name: 'comment',
          label: 'Comment'
        }
      ]
    })

    expect(filterFormFieldsForDocumentApproval(task)).toEqual([
      {
        type: 'TEXTAREA',
        name: 'comment',
        label: 'Comment'
      }
    ])
  })

  it('leaves non-document-approval forms unchanged', () => {
    const task = createTask({
      tags: {
        app: 'quick-task'
      },
      form: [
        {
          type: 'RADIO',
          name: 'decision',
          label: 'Decision'
        }
      ]
    })

    expect(filterFormFieldsForDocumentApproval(task)).toEqual(task.form)
  })
})
