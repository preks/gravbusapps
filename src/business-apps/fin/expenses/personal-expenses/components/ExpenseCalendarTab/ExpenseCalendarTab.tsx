import React, { useState, useEffect } from 'react';
import { Calendar, Button, Typography, Space, Tag, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseItems, ExpenseItem } from '../../hooks/useGetExpenseItems';
// The mcp0_graphql-execute-query tool is invoked by the AI (Cascade).

interface CalendarExpenseItem {
  id: string;
  title: string;
  expenseDate: Dayjs;
  totalAmount: number;
  currencyCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | string; // Allow string for API flexibility
}

const getStatusColor = (status: CalendarExpenseItem['status']): string => {
  switch (status) {
    case 'PENDING': return 'orange';
    case 'APPROVED': return 'blue';
    case 'PAID': return 'green';
    case 'REJECTED': return 'red';
    default: return 'default';
  }
};

const ExpenseCalendarTab: React.FC<BusinessAppContextProps> = (props) => {
  const { items: rawExpenseItems, isLoading, error: hookError, fetchItems: fetchHookItems } = useGetExpenseItems(props);
  const [calendarItems, setCalendarItems] = useState<CalendarExpenseItem[]>([]);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  useEffect(() => {
    const employeeId = props.userInfo?.employeeDetails?.employeeId;

    if (!employeeId) {
      setFetchError(new Error('Employee ID is not available. Please try again later or contact support if the error persists.'));
      setCalendarItems([]);
      // isLoading will be handled by the hook
      return;
    }
    // Call fetchItems from the hook.
    // For the calendar, we typically want all items for the employee for a broad date range.
    // The hook's fetchItems takes (searchTerm, page, pageSize, filter).
    // We'll call it without specific filters for now, assuming the hook handles fetching all relevant items.
    // The hook itself uses employeeId from contextProps, so no need to pass it here.
    fetchHookItems(); 
  }, [props.userInfo, fetchHookItems]);

  // useEffect to handle errors from the hook
  useEffect(() => {
    if (hookError) {
      setFetchError(new Error(`Error from useGetExpenseItems: ${hookError}`));
      setCalendarItems([]);
    } else {
      setFetchError(null); // Clear previous errors if current fetch is successful
    }
  }, [hookError]);

  // useEffect to transform rawExpenseItems from hook to calendarItems
  useEffect(() => {
    if (rawExpenseItems) {
      const transformedItems: CalendarExpenseItem[] = rawExpenseItems.map((item: ExpenseItem) => ({
        id: item.id,
        title: item.title,
        expenseDate: dayjs(item.expenseDate), // Ensure date is parsed to Dayjs
        totalAmount: item.totalAmount,
        currencyCode: item.currencyRef ? item.currencyRef.split(':').pop() || 'N/A' : 'N/A', // Use currencyRef from hook's item
        status: item.status || 'UNKNOWN', // Status should now be available from hook's item
      }));
      setCalendarItems(transformedItems);
    }
  }, [rawExpenseItems]);

  const onSelect = (date: Dayjs, info: { source: 'year' | 'month' | 'date' | 'customize' }) => {
    console.log('[onSelect]', 'Selected date:', date.format('YYYY-MM-DD'), 'Source:', info.source);
  };

  const dateCellRender = (currentDate: Dayjs) => {
    const itemsForDate = calendarItems.filter((item: CalendarExpenseItem) =>
      item.expenseDate.isSame(currentDate, 'day')
    );

    if (itemsForDate.length === 0) {
      return null;
    }

    return (
      <ul className="gba-events-list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {itemsForDate.map((item: CalendarExpenseItem) => (
          <li key={item.id} className="gba-event-item-card" style={{ marginBottom: '4px', padding: '4px', border: '1px solid #f0f0f0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
            <div style={{ fontSize: '0.8em', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
            <div style={{ fontSize: '0.75em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{item.totalAmount.toFixed(2)} {item.currencyCode}</span>
              <Tag color={getStatusColor(item.status)} style={{ margin: 0, fontSize: '0.7em', padding: '0 4px' }}>{item.status}</Tag>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="gba-expense-calendar-tab">
      {isLoading && <div style={{ textAlign: 'center', padding: '20px' }}><Spin size="large" /></div>}
      {fetchError && <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}><p>Error loading expenses: {fetchError.message}</p></div>}
      {!isLoading && !fetchError && (
        <Calendar
          onSelect={onSelect}
          dateCellRender={dateCellRender}
          headerRender={({ value, onChange }) => {
            const currentMonth = value.format('MMMM');
            const currentYear = value.format('YYYY');
            return (
              <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>{`${currentMonth} ${currentYear}`}</Typography.Title>
                <Space>
                  <Button shape="circle" icon={<LeftOutlined />} onClick={() => onChange(value.subtract(1, 'month'))} aria-label="Previous month" />
                  <Button shape="circle" icon={<RightOutlined />} onClick={() => onChange(value.add(1, 'month'))} aria-label="Next month" />
                </Space>
              </div>
            );
          }}
        />
      )}
    </div>
  );
};

export default ExpenseCalendarTab;
