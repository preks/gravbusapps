/**
 * Regression test for issue a7d9b3a7-a00a-457c-b0e4-4a2c6dda65f7:
 * data-testid='absence-trends-tooltip' set on ServerBackedTooltip in
 * OptimizedAbsenceTrends.tsx is not forwarded to the rendered DOM because
 * Recharts <Tooltip> ignores foreign props passed to its content slot.
 *
 * The fix is to forward the data-testid onto the actual root element rendered
 * inside ServerBackedTooltip. Recharts calls the content component with its
 * own props (`active`, `payload`, `label`) AND any extra props that were
 * placed on the element used as `content`, so ServerBackedTooltip must
 * accept `data-testid` and put it on the tooltip root <div>.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ServerBackedTooltip } from '../OptimizedAbsenceTrends'

describe('ServerBackedTooltip data-testid forwarding', () => {
  const baseProps = {
    active: true,
    label: 'Jan',
    payload: [
      {
        payload: {
          total: 3,
          uniqueEmployees: 2,
          avgDurationPerRequest: 1.5,
          trendLine: 1,
          Vacation: 2,
          'Sick Leave': 1
        }
      }
    ],
    absenceTypes: ['Vacation', 'Sick Leave'],
    getTypeColor: () => '#000',
    monthAggMap: {
      Jan: {
        totalRequests: 3,
        avgRequestsPerEmployee: 1,
        avgDaysPerRequest: 1.5,
        distinctEmployees: 2
      }
    }
  }

  it('renders the tooltip root with the forwarded data-testid attribute', () => {
    render(<ServerBackedTooltip {...baseProps} data-testid="absence-trends-tooltip" />)

    const tooltip = screen.getByTestId('absence-trends-tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip.tagName).toBe('DIV')
    expect(tooltip).toHaveTextContent('Jan')
  })
})
