import React from 'react'
import { render, screen } from '@testing-library/react'
import { VersionHistory } from '../VersionHistory'

jest.mock('@newwork/nw-design-system', () => ({
  Avatar: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AvatarFallback: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AvatarImage: () => null,
  Badge: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Button: ({ children, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button {...props}>{children}</button>
  ),
  Dialog: ({ children, open }: React.PropsWithChildren<{ open?: boolean }>) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
    <div {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ScrollArea: ({ children }: React.PropsWithChildren<{ className?: string }>) => <div>{children}</div>,
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')
}))

jest.mock('lucide-react', () => ({
  AlertCircle: () => <span />,
  CheckCircle: () => <span />,
  Clock: () => <span />,
  FileText: () => <span />,
  RotateCcw: () => <span />,
  User: () => <span />
}))

jest.mock('../VersionHistoryApprovalSection', () => ({
  VersionHistoryApprovalSection: () => null
}))

describe('VersionHistory', () => {
  it('renders an explicit error state instead of the empty history state', () => {
    render(
      <VersionHistory
        versions={[]}
        isLoading={false}
        error="Failed to load versions"
        onRestore={async () => undefined}
        onClose={() => undefined}
        messages={{
          empty: 'No version history yet'
        }}
      />
    )

    expect(screen.getByText('Failed to load versions')).toBeInTheDocument()
    expect(screen.queryByText('No version history yet')).not.toBeInTheDocument()
    expect(screen.getByTestId('version-history-error')).toBeInTheDocument()
  })
})
