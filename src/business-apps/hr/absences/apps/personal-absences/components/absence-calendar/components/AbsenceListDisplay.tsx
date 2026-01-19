import React from 'react'
import { List, Tag } from 'antd'
import { formatDate } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getAbsenceStatusConfig } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

export interface AbsenceListDisplayItem {
  id: string
  type: string
  status: string
  originalStatus?: string
  tagColor?: string
  description?: string
  startDate: string
  endDate: string
}

export interface AbsenceListDisplayProps extends BusinessAppContextProps {
  absences: AbsenceListDisplayItem[]
  title?: string
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number, pageSize: number) => void
}

export const AbsenceListDisplay: React.FC<AbsenceListDisplayProps> = ({
  absences,
  title,
  page,
  pageSize,
  total,
  onPageChange
}) => {
  return (
    <div className="gba:absence-list-root" data-testid="absence-calendar-list-root">
      {title && (
        <div className="gba:text-lg gba:font-semibold gba:mb-2" data-testid="absence-calendar-list-title">
          {title}
        </div>
      )}
      <List
        itemLayout="vertical"
        dataSource={absences}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: onPageChange,
          showSizeChanger: false
        }}
        locale={{ emptyText: 'No absences.' }}
        data-testid="absence-calendar-list"
        renderItem={item => {
          const isSameDay = item.startDate === item.endDate
          return (
            <List.Item
              key={item.id}
              className="gba:absence-event-item"
              data-testid={`absence-calendar-list-item-${item.id}`}
            >
              <div className="gba:absence-event-row">
                <div className="gba:absence-event-date" data-testid={`absence-calendar-list-item-date-${item.id}`}>
                  {isSameDay
                    ? `Date: ${formatDate(item.startDate, 'date.long')}`
                    : `From: ${formatDate(item.startDate, 'date.long')} - To: ${formatDate(item.endDate, 'date.long')}`}
                </div>
                <span>Type: </span>
                <Tag
                  color={item.tagColor || getAbsenceStatusConfig(item.originalStatus).color}
                  className={`gba:absence-event-tag${getAbsenceStatusConfig(item.originalStatus).type === 'pending' ? ' gba:absence-pending' : ''}`}
                  data-testid={`absence-calendar-list-item-type-${item.id}`}
                >
                  {item.type}
                </Tag>
                <div className="gba:absence-event-status" data-testid={`absence-calendar-list-item-status-${item.id}`}>
                  Status: {item.status}
                </div>
                {item.description && (
                  <div
                    className="gba:absence-event-description"
                    data-testid={`absence-calendar-list-item-description-${item.id}`}
                  >
                    Note: {item.description}
                  </div>
                )}
              </div>
            </List.Item>
          )
        }}
      />
    </div>
  )
}
