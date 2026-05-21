import type { Dayjs } from 'dayjs'
import type { CalendarExpenseItem } from '../types'
import StatusWithDate from './StatusWithDate'
import { formatCurrencyDisplay } from '../../../../utils'

export interface DayCellEventsProps {
  value: Dayjs
  items: CalendarExpenseItem[]
  planItems: CalendarExpenseItem[]
  requestItems: CalendarExpenseItem[]
  active: { plan: boolean; request: boolean }
  onClick: (item: CalendarExpenseItem) => void
}

function getEventItemBackgroundClass(type: CalendarExpenseItem['type']): string {
  if (type === 'plan') {
    return 'gba:bg-info-secondary'
  }
  if (type === 'request') {
    return 'gba:bg-success-secondary'
  }
  return 'gba:bg-muted'
}

function DayCellEvents({ value, planItems, requestItems, active, onClick }: DayCellEventsProps) {
  // Items removed - only show plans and requests
  const allAvailable = [...(active.plan ? planItems : []), ...(active.request ? requestItems : [])]

  const itemsForDate = allAvailable.filter(item => {
    if (item.endDate && (item.type === 'plan' || item.type === 'request')) {
      return (
        (value.isSame(item.expenseDate, 'day') || value.isAfter(item.expenseDate, 'day')) &&
        (value.isSame(item.endDate, 'day') || value.isBefore(item.endDate, 'day'))
      )
    }
    return item.expenseDate.isSame(value, 'day')
  })

  if (itemsForDate.length === 0) {
    return null
  }

  return (
    <ul className="gba-events-list gba:m-0 gba:list-none gba:min-w-0 gba:p-0">
      {itemsForDate.map(item => (
        <li key={item.id} className="gba:mb-1 gba:min-w-0">
          <button
            type="button"
            className={`gba:event-item-card gba:w-full gba:min-w-0 gba:cursor-pointer gba:rounded gba:border gba:border-border gba:p-1 gba:text-left gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring ${getEventItemBackgroundClass(item.type)}`}
            data-testid={`day-cell-event-${item.id}`}
            onMouseDown={e => {
              e.preventDefault()
            }}
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()
              onClick(item)
            }}
          >
            <div className="gba:truncate gba:text-xs gba:font-bold">{item.title}</div>
            {(!item.endDate || value.isSame(item.expenseDate, 'day') || item.type === 'expense') && (
              <div className="gba:flex gba:min-w-0 gba:flex-col gba:gap-1 gba:text-xs">
                <span className="gba:truncate">{formatCurrencyDisplay(item.totalAmount, item.currencyCode)}</span>
                <div className="gba:flex gba:w-full gba:min-w-0 gba:justify-end">
                  <StatusWithDate type={item.type} status={item.status} value={value} />
                </div>
              </div>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

export default DayCellEvents
