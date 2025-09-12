import React, { useState } from 'react';
import { Table, Card, Typography, Timeline, Button, Space } from 'antd';
import Pill from '@/components/pill';
import type { ColumnsType } from 'antd/es/table';
import { ExpenseRequestTrip } from '../types/expensePlanRecord.types';
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils';
import { PiMapPin, PiArrowRight, PiArrowLeft, PiMapTrifold, PiFlag, PiTable, PiChartLine } from 'react-icons/pi';
import dayjs from 'dayjs';

interface ExpensePlanTripProps {
  expenseRequestTrips: ExpenseRequestTrip[];
}

const { Text, Paragraph } = Typography;

const ExpensePlanTrip: React.FC<ExpensePlanTripProps> = ({ expenseRequestTrips }) => {
  // State to toggle between table and timeline view
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('timeline');
  // Use shared formatDate util for display consistency

  // Sort trips by order
  const sortedTrips = [...expenseRequestTrips].sort((a, b) => a.tripOrder - b.tripOrder);

  // Get point type icon
  const getPointTypeIcon = (pointType: string) => {
    switch (pointType) {
      case 'START_POINT':
        return <PiFlag className="gba:text-green-500" />;
      case 'END_POINT':
        return <PiFlag className="gba:text-red-500" />;
      case 'DESTINATION_POINT':
        return <PiMapPin className="gba:text-blue-500" />;
      case 'REGION_ARRIVAL':
        return <PiMapTrifold className="gba:text-purple-500" />;
      default:
        return <PiMapPin />;
    }
  };

  // Get direction icon
  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'GO':
        return <PiArrowRight className="gba:text-blue-500" />;
      case 'BACK':
        return <PiArrowLeft className="gba:text-orange-500" />;
      default:
        return null;
    }
  };

  // Get point type label
  const getPointTypeLabel = (pointType: string) => {
    switch (pointType) {
      case 'START_POINT':
        return getTranslationFromI18nKeyAndLabel('expense.trip.pointType.startPoint', 'Start Point');
      case 'END_POINT':
        return getTranslationFromI18nKeyAndLabel('expense.trip.pointType.endPoint', 'End Point');
      case 'DESTINATION_POINT':
        return getTranslationFromI18nKeyAndLabel('expense.trip.pointType.destinationPoint', 'Destination');
      case 'REGION_ARRIVAL':
        return getTranslationFromI18nKeyAndLabel('expense.trip.pointType.regionArrival', 'Region Arrival');
      default:
        return pointType;
    }
  };

  // Get direction label
  const getDirectionLabel = (direction: string) => {
    switch (direction) {
      case 'GO':
        return getTranslationFromI18nKeyAndLabel('expense.trip.direction.go', 'Outbound');
      case 'BACK':
        return getTranslationFromI18nKeyAndLabel('expense.trip.direction.back', 'Return');
      default:
        return direction;
    }
  };

  const columns: ColumnsType<ExpenseRequestTrip> = [
    {
      title: getTranslationFromI18nKeyAndLabel('expense.trip.order', 'Order'),
      dataIndex: 'tripOrder',
      key: 'tripOrder',
      width: 80,
      align: 'center',
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.trip.dateTime', 'Date & Time'),
      dataIndex: 'tripDateTime',
      key: 'tripDateTime',
      render: (date: string) => (
        <>
          {formatDate(date, 'date.short')}, {formatDate(date, 'time.short')}
        </>
      ),
      sorter: (a, b) => dayjs(a.tripDateTime).unix() - dayjs(b.tripDateTime).unix(),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.trip.direction', 'Direction'),
      dataIndex: 'tripDirection',
      key: 'tripDirection',
      render: (direction: string) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          {getDirectionIcon(direction)}
          <span>{getDirectionLabel(direction)}</span>
        </div>
      ),
      filters: [
        { text: getTranslationFromI18nKeyAndLabel('expense.trip.direction.go', 'Outbound'), value: 'GO' },
        { text: getTranslationFromI18nKeyAndLabel('expense.trip.direction.back', 'Return'), value: 'BACK' },
      ],
      onFilter: (value, record) => record.tripDirection === value,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.trip.pointType', 'Point Type'),
      dataIndex: 'pointType',
      key: 'pointType',
      render: (pointType: string) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          {getPointTypeIcon(pointType)}
          <span>{getPointTypeLabel(pointType)}</span>
        </div>
      ),
      filters: [
        { text: getTranslationFromI18nKeyAndLabel('expense.trip.pointType.startPoint', 'Start Point'), value: 'START_POINT' },
        { text: getTranslationFromI18nKeyAndLabel('expense.trip.pointType.endPoint', 'End Point'), value: 'END_POINT' },
        { text: getTranslationFromI18nKeyAndLabel('expense.trip.pointType.destinationPoint', 'Destination'), value: 'DESTINATION_POINT' },
        { text: getTranslationFromI18nKeyAndLabel('expense.trip.pointType.regionArrival', 'Region Arrival'), value: 'REGION_ARRIVAL' },
      ],
      onFilter: (value, record) => record.pointType === value,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.trip.address', 'Address'),
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => <Paragraph ellipsis={{ rows: 2, tooltip: text }}>{text}</Paragraph>,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.trip.country', 'Country'),
      dataIndex: ['country', 'value'],
      key: 'country',
      render: (text: string) => <Pill type="waiting" label={text} data-testid="country-pill" />,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.trip.travelRegion', 'Travel Region'),
      dataIndex: ['travelRegion', 'value'],
      key: 'travelRegion',
      render: (text: string) => <Pill type="task" label={text} data-testid="travel-region-pill" />,
    },
  ];

  // Timeline view of the trip
  const renderTripTimeline = () => {
    return (
      <Timeline
        mode="left"
        className="gba:mt-6"
        items={sortedTrips.map((trip) => ({
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
                <Pill type="waiting" label={trip.country.value} data-testid="timeline-country-pill" />
                <Pill type="task" label={trip.travelRegion.value} data-testid="timeline-travel-region-pill" />
              </div>
            </div>
          ),
          color: trip.tripDirection === 'GO' ? 'blue' : 'orange',
        }))}
      />
    );
  };

  // Render view mode toggle buttons
  const renderViewModeToggle = () => {
    return (
      <Space className="gba:ml-2" data-testid="trip-view-toggle-buttons">
        <Button 
          type={viewMode === 'table' ? 'primary' : 'default'}
          icon={<PiTable />}
          onClick={() => setViewMode('table')}
          data-testid="trip-table-view-button"
        >
          {getTranslationFromI18nKeyAndLabel('expense.plan.trip.tableView', 'Table')}
        </Button>
        <Button 
          type={viewMode === 'timeline' ? 'primary' : 'default'}
          icon={<PiChartLine />}
          onClick={() => setViewMode('timeline')}
          data-testid="trip-timeline-view-button"
        >
          {getTranslationFromI18nKeyAndLabel('expense.plan.trip.timelineView', 'Timeline')}
        </Button>
      </Space>
    );
  };

  return (
    <div className="gba:space-y-6 gba:pl-6 gba:pr-6" data-testid="expense-plan-trip">
      <Card 
        title={
          <div className="gba:flex gba:items-center gba:justify-between">
            <span>
              {getTranslationFromI18nKeyAndLabel('expense.plan.trip', 'Trip Information')}
            </span>
            {renderViewModeToggle()}
          </div>
        } 
        className="gba:border-none"
        data-testid={`expense-plan-trip-${viewMode}-view`}
      >
        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={sortedTrips.map((item, index) => ({ ...item, key: index }))}
            pagination={false}
            size="middle"
            scroll={{ x: 'max-content' }}
          />
        ) : (
          renderTripTimeline()
        )}
      </Card>
    </div>
  );
};

export default ExpensePlanTrip;
