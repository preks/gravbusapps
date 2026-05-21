import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { WorkflowDisplay } from './WorkflowDisplay'

const navigateToMock = jest.fn()

jest.mock('@/common/utils/navigationUtils', () => ({
  Navigation: {
    CREATE_FLOW_CREATOR: '/platform/create/flow-studio'
  },
  buildPlatformUrl: (path: string, params?: Record<string, string>) => {
    const query = new URLSearchParams(params ?? {}).toString()
    return query ? `${path}?${query}` : path
  },
  navigateTo: (...args: unknown[]) => navigateToMock(...args)
}))

describe('WorkflowDisplay', () => {
  beforeEach(() => {
    navigateToMock.mockClear()
  })

  it('keeps workflow drafts on the draftId route even when an old flowId link is provided', () => {
    render(
      <WorkflowDisplay
        workflowId="draft-123"
        accessToken=""
        textTitle="Purchase Order Approval"
        tool="create_workflow_draft"
        link="/platform/create/flow-studio?flowId=draft-123#flows"
      />
    )

    fireEvent.click(screen.getByText('Purchase Order Approval'))

    expect(navigateToMock).toHaveBeenCalledWith('/platform/create/flow-studio?draftId=draft-123#manage', {
      forceReload: true
    })
  })
})
