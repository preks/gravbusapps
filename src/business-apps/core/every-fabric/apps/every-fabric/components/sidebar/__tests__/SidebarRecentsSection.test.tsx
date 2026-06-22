import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { FabricSessionSummary } from '../../../types/fabric'
import { SidebarRecentsSection } from '../SidebarRecentsSection'

const makeSession = (overrides?: Partial<FabricSessionSummary>): FabricSessionSummary => ({
  session_id: 'session-1',
  input: 'Prepare report',
  status: 'completed',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides
})

describe('SidebarRecentsSection', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders a load-more control for older sessions', () => {
    const onLoadMore = jest.fn()

    render(
      <SidebarRecentsSection
        sessions={[makeSession()]}
        activeSessionId={null}
        onSelect={jest.fn()}
        onDelete={jest.fn()}
        hasMore
        onLoadMore={onLoadMore}
      />
    )

    fireEvent.click(screen.getByTestId('sidebar-recents-load-more'))
    expect(onLoadMore).toHaveBeenCalled()
  })

  it('shows loading and search-aware empty states', () => {
    const { rerender } = render(
      <SidebarRecentsSection sessions={[]} activeSessionId={null} onSelect={jest.fn()} onDelete={jest.fn()} isLoading />
    )

    expect(screen.getByText('sidebar-recents-loading')).toBeInTheDocument()

    rerender(
      <SidebarRecentsSection
        sessions={[]}
        activeSessionId={null}
        onSelect={jest.fn()}
        onDelete={jest.fn()}
        emptyHint="No sessions match your search or filters."
        searchActive
      />
    )

    expect(screen.getByText('No sessions match your search or filters.')).toBeInTheDocument()
  })
})
