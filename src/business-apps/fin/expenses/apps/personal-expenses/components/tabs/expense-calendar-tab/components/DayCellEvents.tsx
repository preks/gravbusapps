import React from 'react'
import type { Dayjs } from 'dayjs'
import type { CalendarExpenseItem } from '../types'
import StatusWithDate from './StatusWithDate'
import { formatCurrencyDisplay } from '../../../../utils'

export interface DayCellEventsProps {
  value: Dayjs
  items: CalendarExpenseItem[]
  planItems: CalendarExpenseItem[]
  requestItems: CalendarExpenseItem[]
  active: { expense: boolean; plan: boolean; request: boolean }
  onClick: (item: CalendarExpenseItem) => void
}

const DayCellEvents: React.FC<DayCellEventsProps> = ({ value, items, planItems, requestItems, active, onClick }) => {
  const allAvailable = [
    ...(active.expense ? items : []),
    ...(active.plan ? planItems : []),
    ...(active.request ? requestItems : [])
  ]

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
    <ul className="gba-events-list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {itemsForDate.map(item => (
        <li
          key={item.id}
          className="gba-event-item-card"
          style={{
            marginBottom: '4px',
            padding: '4px',
            border: '1px solid #f0f0f0',
            borderRadius: '4px',
            backgroundColor: item.type === 'plan' ? '#e6f7ff' : item.type === 'request' ? '#e6fffb' : '#fafafa',
            cursor: 'pointer'
          }}
          onMouseDown={e => {
            e.preventDefault()
          }}
          onClick={e => {
            e.stopPropagation()
            e.preventDefault()
            onClick(item)
          }}
        >
          <div
            style={{
              fontSize: '0.8em',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {item.title}
          </div>
          {(!item.endDate || value.isSame(item.expenseDate, 'day') || item.type === 'expense') && (
            <div style={{ fontSize: '0.75em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{formatCurrencyDisplay(item.totalAmount, item.currencyCode)}</span>
              <StatusWithDate type={item.type} status={item.status} value={value} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export default DayCellEvents
