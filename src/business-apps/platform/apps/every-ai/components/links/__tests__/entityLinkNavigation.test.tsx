import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

const navigateTo = jest.fn()

jest.mock('@/common/utils/navigationUtils', () => ({
  __esModule: true,
  navigateTo,
  Navigation: {
    FLOW_DETAIL: '/platform/apps/flow/apps/detail',
    CREATE_FLOW_CREATOR: '/platform/create/flow-studio'
  },
  buildPlatformUrl: (path: string, params?: Record<string, string>) => {
    if (!params || Object.keys(params).length === 0) {
      return path
    }
    return `${path}?${new URLSearchParams(params).toString()}`
  }
}))

jest.mock('../EmployeeLinkChip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>
}))

jest.mock('../SandboxFileLinkChip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>
}))

jest.mock('../IrmDocumentLinkChip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>
}))

import EntityLink from '../EntityLink'

describe('EntityLink navigation', () => {
  beforeEach(() => {
    navigateTo.mockClear()
  })

  it('navigates in-app for service_ticket chips via flow detail taskId', () => {
    const taskId = 'f65965fb-5953-3c20-8857-2589bc9a4782'

    render(
      <EntityLink href={`service_ticket://${taskId}`} accessToken="tok">
        Aktenzeichen und Vollständigkeit - Completed
      </EntityLink>
    )

    const link = screen.getByText('Aktenzeichen und Vollständigkeit - Completed')
    expect(link.closest('a')).not.toHaveAttribute('target', '_blank')

    fireEvent.click(link)
    expect(navigateTo).toHaveBeenCalledWith(`/platform/apps/flow/apps/detail?taskId=${taskId}`, undefined)
  })

  it('navigates in-app for resolved cflow_task chips by default', () => {
    const taskId = '4694a31c-5f5f-30a7-992b-a13cc9f7f8ad'
    render(
      <EntityLink href={`cflow_task://${taskId}`} accessToken="tok">
        Aktenzeichen und Vollständigkeit - Completed
      </EntityLink>
    )

    const link = screen.getByText('Aktenzeichen und Vollständigkeit - Completed')
    expect(link.closest('a')).not.toHaveAttribute('target', '_blank')

    fireEvent.click(link)
    expect(navigateTo).toHaveBeenCalledWith(`/platform/apps/flow/apps/detail?taskId=${taskId}`, undefined)
  })

  it('opens resolved entity chips in a new tab when openInNewTab is set', () => {
    const taskId = '4694a31c-5f5f-30a7-992b-a13cc9f7f8ad'
    render(
      <EntityLink href={`cflow_task://${taskId}`} accessToken="tok" openInNewTab>
        Open task
      </EntityLink>
    )

    const anchor = screen.getByText('Open task').closest('a')
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer')

    fireEvent.click(anchor!)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('navigates in-app for root-relative platform links by default', () => {
    render(
      <EntityLink href="/platform/task-manager?view=inbox&taskId=task-123" accessToken="tok">
        Open task
      </EntityLink>
    )

    const anchor = screen.getByText('Open task').closest('a')
    expect(anchor).not.toHaveAttribute('target', '_blank')

    fireEvent.click(anchor!)
    expect(navigateTo).toHaveBeenCalledWith('/platform/task-manager?view=inbox&taskId=task-123')
  })
})
