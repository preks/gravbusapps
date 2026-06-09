import React from 'react'
import { render, screen } from '@testing-library/react'
import { ChartInlineBody, statTrendDirection } from '../chartInlineBody'

describe('statTrendDirection', () => {
  it('uses the explicit positive flag when present', () => {
    expect(statTrendDirection({ value: '12%', positive: true })).toBe('up')
    expect(statTrendDirection({ value: '12%', positive: false })).toBe('down')
  })

  it('infers direction from the value sign/glyph when flag is absent', () => {
    expect(statTrendDirection({ value: '+4%' })).toBe('up')
    expect(statTrendDirection({ value: '▲ 4%' })).toBe('up')
    expect(statTrendDirection({ value: '-8%' })).toBe('down')
    expect(statTrendDirection({ value: 'down 3' })).toBe('down')
    expect(statTrendDirection({ value: '0%' })).toBe('flat')
  })
})

describe('ChartInlineBody — KPI stat cards', () => {
  const dashboard = {
    title: 'Leads by Status Dashboard',
    sections: [
      {
        type: 'stat',
        stats: [
          { label: 'Total Leads', value: '1,500', trend: { value: '12%', positive: true } },
          { label: 'Avg per Status', value: '375' },
          { label: 'Top Status', value: 'New', trend: { value: '-3%', positive: false } }
        ]
      }
    ]
  }

  it('renders all stat labels and values', () => {
    render(<ChartInlineBody data={dashboard} />)
    expect(screen.getByText('Total Leads')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
    expect(screen.getByText('Avg per Status')).toBeInTheDocument()
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('renders one clean KPI card per stat', () => {
    render(<ChartInlineBody data={dashboard} />)
    const cards = screen.getAllByTestId('stat-card')
    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveClass('gba:bg-background')
    expect(cards[0]).toHaveClass('gba:rounded-lg')
    expect(cards[0]).not.toHaveClass('gba:shadow-sm')
  })

  it('renders trend chips with the correct direction and only for stats that have a trend', () => {
    render(<ChartInlineBody data={dashboard} />)
    const chips = screen.getAllByTestId('stat-trend-chip')
    expect(chips).toHaveLength(2)
    expect(chips[0]).toHaveAttribute('data-trend-direction', 'up')
    expect(chips[0]).toHaveTextContent('12%')
    expect(chips[1]).toHaveAttribute('data-trend-direction', 'down')
    expect(chips[1]).toHaveTextContent('3%')
  })

  it('renders the dashboard title', () => {
    render(<ChartInlineBody data={dashboard} />)
    expect(screen.getByText('Leads by Status Dashboard')).toBeInTheDocument()
  })
})
