import React, { useState } from 'react'
import { Table, Card, Typography, Timeline, Button, Space } from 'antd'
import Pill from '@/components/pill'
import type { ColumnsType } from 'antd/es/table'
import { formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import {
  MapPinIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  MapTrifoldIcon,
  FlagIcon,
  TableIcon,
  ChartLineIcon
} from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import { expenseRecordKey } from '../../utils/expenseRecordI18n'
import { expenseRecordTripRowKey, withUniqueRowKeys } from '../../utils/expenseRecordRowKeys'
import type {
  ExpenseRecordI18nPrefix,
  ExpenseRecordTranslations,
  ExpenseRecordTrip as ExpenseRecordTripItem
} from '../../types/expenseRecordShared.types'

interface ExpenseRecordTripProps {
  expenseRequestTrips: ExpenseRecordTripItem[]
  i18nPrefix: ExpenseRecordI18nPrefix
  translations: ExpenseRecordTranslations
  dataTestId: string
}

const { Text, Paragraph } = Typography

const ExpenseRecordTrip: React.FC<ExpenseRecordTripProps> = ({
  expenseRequestTrips,
  i18nPrefix,
  translations,
  dataTestId
}) => {
  const { t } = useTranslation(translations)
  const key = (suffix: string) => expenseRecordKey(i18nPrefix, suffix)
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('timeline')

  const sortedTrips = [...expenseRequestTrips].sort((a, b) => a.tripOrder - b.tripOrder)

  const getPointTypeIcon = (pointType: string) => {
    switch (pointType) {
      case 'START_POINT':
        return <FlagIcon className="gba:text-green-500" />
      case 'END_POINT':
        return <FlagIcon className="gba:text-red-500" />
      case 'DESTINATION_POINT':
        return <MapPinIcon className="gba:text-blue-500" />
      case 'REGION_ARRIVAL':
        return <MapTrifoldIcon className="gba:text-purple-500" />
      default:
        return <MapPinIcon />
    }
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'GO':
        return <ArrowRightIcon className="gba:text-blue-500" />
      case 'BACK':
        return <ArrowLeftIcon className="gba:text-orange-500" />
      default:
        return null
    }
  }

  const getPointTypeLabel = (pointType: string) => {
    switch (pointType) {
      case 'START_POINT':
        return t(key('point-type-start'))
      case 'END_POINT':
        return t(key('point-type-end'))
      case 'DESTINATION_POINT':
        return t(key('point-type-destination'))
      case 'REGION_ARRIVAL':
        return t(key('point-type-region-arrival'))
      default:
        return pointType
    }
  }

  const getDirectionLabel = (direction: string) => {
    switch (direction) {
      case 'GO':
        return t(key('direction-outbound'))
      case 'BACK':
        return t(key('direction-return'))
      default:
        return direction
    }
  }

  const columns: ColumnsType<ExpenseRecordTripItem> = [
    {
      title: t(key('trip-column-order')),
      dataIndex: 'tripOrder',
      key: 'tripOrder',
      width: 80,
      align: 'center'
    },
    {
      title: t(key('trip-column-date-time')),
      dataIndex: 'tripDateTime',
      key: 'tripDateTime',
      render: (date: string) => (
        <>
          {formatDate(date, 'date.short')}, {formatDate(date, 'time.short')}
        </>
      ),
      sorter: (a, b) => new Date(a.tripDateTime).getTime() - new Date(b.tripDateTime).getTime()
    },
    {
      title: t(key('trip-column-direction')),
      dataIndex: 'tripDirection',
      key: 'tripDirection',
      render: (direction: string) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          {getDirectionIcon(direction)}
          <span>{getDirectionLabel(direction)}</span>
        </div>
      ),
      filters: [
        { text: t(key('direction-outbound')), value: 'GO' },
        { text: t(key('direction-return')), value: 'BACK' }
      ],
      onFilter: (value, record) => record.tripDirection === value
    },
    {
      title: t(key('trip-column-destination')),
      dataIndex: 'pointType',
      key: 'pointType',
      render: (pointType: string) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          {getPointTypeIcon(pointType)}
          <span>{getPointTypeLabel(pointType)}</span>
        </div>
      ),
      filters: [
        { text: t(key('point-type-start')), value: 'START_POINT' },
        { text: t(key('point-type-end')), value: 'END_POINT' },
        { text: t(key('point-type-destination')), value: 'DESTINATION_POINT' },
        { text: t(key('point-type-region-arrival')), value: 'REGION_ARRIVAL' }
      ],
      onFilter: (value, record) => record.pointType === value
    },
    {
      title: t(key('trip-column-start-location')),
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => <Paragraph ellipsis={{ rows: 2, tooltip: text }}>{text}</Paragraph>
    },
    {
      title: t(key('trip-column-country')),
      dataIndex: ['country', 'value'],
      key: 'country',
      render: (_: string, record) => (
        <Pill
          type="waiting"
          label={getCatalogValue(record.country) || record.country?.value || '-'}
          data-testid="country-pill"
        />
      )
    },
    {
      title: t(key('trip-column-region')),
      dataIndex: ['travelRegion', 'value'],
      key: 'travelRegion',
      render: (_: string, record) => (
        <Pill
          type="task"
          label={getCatalogValue(record.travelRegion) || record.travelRegion?.value || '-'}
          data-testid="travel-region-pill"
        />
      )
    }
  ]

  const renderTripTimeline = () => (
    <Timeline
      mode="left"
      className="gba:mt-6"
      items={sortedTrips.map(trip => ({
        label: `${formatDate(trip.tripDateTime, 'date.short')}, ${formatDate(trip.tripDateTime, 'time.short')}`,
        children: (
          <div className="gba:space-y-1">
            <div className="gba:flex gba:items-center gba:gap-2">
              {getPointTypeIcon(trip.pointType)}
              <Text strong>{getPointTypeLabel(trip.pointType)}</Text>
              {getDirectionIcon(trip.tripDirection)}
              <Text type="secondary">{getDirectionLabel(trip.tripDirection)}</Text>
            </div>
            <Text>{trip.address}</Text>
            <div className="gba:mt-1">
              <Pill
                type="waiting"
                label={getCatalogValue(trip.country) || trip.country.value}
                data-testid="timeline-country-pill"
              />
              <Pill
                type="task"
                label={getCatalogValue(trip.travelRegion) || trip.travelRegion.value}
                data-testid="timeline-travel-region-pill"
              />
            </div>
          </div>
        ),
        color: trip.tripDirection === 'GO' ? 'blue' : 'orange'
      }))}
    />
  )

  const renderViewModeToggle = () => (
    <Space className="gba:ml-2" data-testid="trip-view-toggle-buttons">
      <Button
        type={viewMode === 'table' ? 'primary' : 'default'}
        icon={<TableIcon />}
        onClick={() => setViewMode('table')}
        data-testid="trip-table-view-button"
      >
        {t(key('view-table'))}
      </Button>
      <Button
        type={viewMode === 'timeline' ? 'primary' : 'default'}
        icon={<ChartLineIcon />}
        onClick={() => setViewMode('timeline')}
        data-testid="trip-timeline-view-button"
      >
        {t(key('view-timeline'))}
      </Button>
    </Space>
  )

  return (
    <div className="gba:space-y-6 gba:pl-6 gba:pr-6" data-testid={dataTestId}>
      <Card
        title={
          <div className="gba:flex gba:items-center gba:justify-between">
            <span>{t(key('trip-section-title'))}</span>
            {renderViewModeToggle()}
          </div>
        }
        className="gba:border-none"
        data-testid={`${dataTestId}-${viewMode}-view`}
      >
        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={withUniqueRowKeys(sortedTrips, expenseRecordTripRowKey, 'expense-trip')}
            pagination={false}
            size="middle"
          />
        ) : (
          renderTripTimeline()
        )}
      </Card>
    </div>
  )
}

export default ExpenseRecordTrip
