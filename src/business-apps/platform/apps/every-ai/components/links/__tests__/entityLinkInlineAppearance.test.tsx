/**
 * EntityLink appearance="inline": navigation-only entities render as a
 * lightweight text link (no avatar pill), while functional download chips keep
 * their rich rendering even inline.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

const navigateTo = jest.fn()

jest.mock('@/common/utils/navigationUtils', () => ({
  __esModule: true,
  navigateTo,
  Navigation: {},
  buildPlatformUrl: (path: string) => path
}))

jest.mock('../EmployeeLinkChip', () => ({
  __esModule: true,
  default: ({ children }: any) => <span data-testid="employee-chip">{children}</span>
}))

jest.mock('../SandboxFileLinkChip', () => ({
  __esModule: true,
  default: ({ children }: any) => <span data-testid="sandbox-chip">{children}</span>
}))

jest.mock('../IrmDocumentLinkChip', () => ({
  __esModule: true,
  default: ({ children }: any) => <span data-testid="irm-chip">{children}</span>
}))

jest.mock('../BaseEntityLinkChip', () => ({
  __esModule: true,
  BaseEntityLinkChip: ({ children }: any) => <span data-testid="base-chip">{children}</span>
}))

import EntityLink from '../EntityLink'

describe('EntityLink appearance="inline"', () => {
  it('renders an employee mention as a plain text link, not the avatar chip', () => {
    render(
      <EntityLink href="employee://emp-1" accessToken="tok" appearance="inline">
        Denis Prekrat
      </EntityLink>
    )

    const link = screen.getByText('Denis Prekrat')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toContain('employeeId=emp-1')
    expect(link.className).toContain('gba:text-primary')
    expect(screen.queryByTestId('employee-chip')).not.toBeInTheDocument()
    // No avatar pill background on the inline mention.
    expect(link.className).not.toContain('gba:rounded-full')
  })

  it('still renders the employee avatar chip for the default (chip) appearance', () => {
    render(
      <EntityLink href="employee://emp-1" accessToken="tok">
        Denis Prekrat
      </EntityLink>
    )

    expect(screen.getByTestId('employee-chip')).toBeInTheDocument()
  })

  it('keeps the functional sandbox download chip even in inline mode', () => {
    render(
      <EntityLink href="sandbox://report.pdf" accessToken="tok" appearance="inline">
        report.pdf
      </EntityLink>
    )

    expect(screen.getByTestId('sandbox-chip')).toBeInTheDocument()
  })
})
