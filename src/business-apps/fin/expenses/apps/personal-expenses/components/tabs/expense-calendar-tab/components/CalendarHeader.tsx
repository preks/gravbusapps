import React, { useEffect } from 'react'
import type { Dayjs } from 'dayjs'
import { Typography, Space, Button } from 'antd'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import { getTranslatedMonthName } from '../../../../utils/monthTranslationUtils'
import personalTranslations from '../../../../_i18n'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CalendarHeaderProps extends BusinessAppContextProps {
  value: Dayjs
  onChange: (newValue: Dayjs) => void
  currentCalendarValue: Dayjs
  setCalendarValue: (newValue: Dayjs) => void
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ value, onChange, currentCalendarValue, setCalendarValue }) => {
  const { t } = useTranslation(personalTranslations)
  useEffect(() => {
    if (!value.isSame(currentCalendarValue, 'month')) {
      setCalendarValue(value)
    }
  }, [value, currentCalendarValue, setCalendarValue])
  const currentMonth = getTranslatedMonthName(value.toDate(), t)
  const currentYear = value.format('YYYY')
  return (
    <div
      style={{
        padding: '8px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}
      data-testid="expense-calendar-header"
    >
      <Typography.Title level={4} style={{ margin: 0 }}>{`${currentMonth} ${currentYear}`}</Typography.Title>
      <Space>
        <Button
          shape="circle"
          icon={<CaretLeftIcon />}
          onClick={() => {
            const newValue = value.subtract(1, 'month')
            setCalendarValue(newValue)
            onChange(newValue)
          }}
          aria-label="Previous month"
          data-testid="expense-calendar-prev-button"
        />
        <Button
          shape="circle"
          icon={<CaretRightIcon size={16} />}
          onClick={() => {
            const newValue = value.add(1, 'month')
            setCalendarValue(newValue)
            onChange(newValue)
          }}
          aria-label="Next month"
          data-testid="expense-calendar-next-button"
        />
      </Space>
    </div>
  )
}

export default CalendarHeader
