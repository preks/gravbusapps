import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SidebarSearchBar } from '../SidebarSearchBar'

describe('SidebarSearchBar', () => {
  it('shows search progress and clears the query', () => {
    const onChange = jest.fn()

    const { rerender } = render(
      <SidebarSearchBar
        isCollapsed={false}
        query="report"
        onChange={onChange}
        onRequestExpand={jest.fn()}
        isSearching
      />
    )

    expect(screen.getByTestId('sidebar-search-loading')).toBeInTheDocument()

    rerender(
      <SidebarSearchBar
        isCollapsed={false}
        query="report"
        onChange={onChange}
        onRequestExpand={jest.fn()}
        resultCount={2}
      />
    )

    expect(screen.getByText('sidebar-matching-sessions-many')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('sidebar-search-clear'))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('requests sidebar expansion in collapsed mode', () => {
    const onRequestExpand = jest.fn()

    render(<SidebarSearchBar isCollapsed query="" onChange={jest.fn()} onRequestExpand={onRequestExpand} />)

    fireEvent.click(screen.getByTestId('sidebar-search-icon'))
    expect(onRequestExpand).toHaveBeenCalled()
  })
})
