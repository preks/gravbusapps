import React, { useState, useEffect } from 'react';
import { Calendar, Button, Typography, Space, Tag, Spin, message, Alert } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseItems, ExpenseItem } from '../../hooks/useGetExpenseItems';
import { useGetExpensePlans, ExpensePlan } from '../../hooks/useGetExpensePlans';
import { useGetExpenseRequests, ExpenseRequest } from '../../hooks/useGetExpenseRequests';

interface CalendarExpenseItem {
  id: string;
  title: string;
  expenseDate: Dayjs;    // For single day items, or start date for multi-day
  endDate?: Dayjs;       // For multi-day items, optional
  totalAmount: number;
  currencyCode: string;
  status: string;
  type: 'expense' | 'plan' | 'request';
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
  const {
    items: rawExpenseItems,
    isLoading: isLoadingExpenses,
    error: fetchExpensesErrorHook,
    fetchItems: fetchExpenseHookItems,
  } = useGetExpenseItems(props);
  const [calendarItems, setCalendarItems] = useState<CalendarExpenseItem[]>([]);
  const [expensesError, setExpensesError] = useState<string | null>(null);

  const {
    items: rawExpensePlans,
    isLoading: isLoadingPlans,
    error: fetchPlansErrorHook,
    fetchItems: fetchPlansHookItems,
  } = useGetExpensePlans(props);
  const [calendarPlanItems, setCalendarPlanItems] = useState<CalendarExpenseItem[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);

  const {
    items: rawExpenseRequests,
    isLoading: isLoadingRequests,
    error: fetchRequestsErrorHook,
    fetchItems: fetchRequestsHookItems,
  } = useGetExpenseRequests(props);
  const [calendarRequestItems, setCalendarRequestItems] = useState<CalendarExpenseItem[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenseHookItems().catch(err => {
      console.error('Failed to fetch expense items:', err);
      setExpensesError(err.message || 'Failed to fetch expense items');
    });
  }, [fetchExpenseHookItems]);

  useEffect(() => {
    if (fetchExpensesErrorHook) {
      setExpensesError(fetchExpensesErrorHook);
      message.error(`Error fetching expense items: ${fetchExpensesErrorHook}`);
    } else {
      setExpensesError(null);
    }
  }, [fetchExpensesErrorHook]);

  useEffect(() => {
    fetchPlansHookItems().catch(err => {
      console.error('Failed to fetch expense plans:', err);
      setPlansError(err.message || 'Failed to fetch expense plans');
    });
  }, [fetchPlansHookItems]);

  useEffect(() => {
    if (fetchPlansErrorHook) {
      setPlansError(fetchPlansErrorHook);
      message.error(`Error fetching expense plans: ${fetchPlansErrorHook}`);
    } else {
      setPlansError(null);
    }
  }, [fetchPlansErrorHook]);

  useEffect(() => {
    if (rawExpenseItems) {
      const transformedItems: CalendarExpenseItem[] = rawExpenseItems.map((item: ExpenseItem) => ({
        id: item.id,
        title: item.title,
        expenseDate: dayjs(item.expenseDate),
        totalAmount: item.totalAmount,
        currencyCode: item.currencyRef ? item.currencyRef.split(':').pop() || 'N/A' : 'N/A',
        status: item.status || 'UNKNOWN',
        type: 'expense',
      }));
      setCalendarItems(transformedItems);
    }
  }, [rawExpenseItems]);

  useEffect(() => {
    if (rawExpensePlans) {
      const transformedPlans: CalendarExpenseItem[] = rawExpensePlans
        .map((plan: ExpensePlan) => {
          if (plan.startDate && plan.endDate) {
            return {
              id: plan.id,
              title: plan.title,
              expenseDate: dayjs(plan.startDate),
              endDate: dayjs(plan.endDate),
              totalAmount: plan.totalAmount,
              currencyCode: plan.currency?.value ? plan.currency.value.split(':').pop() || 'N/A' : 'N/A',
              status: plan.status || 'UNKNOWN',
              type: 'plan',
            } as CalendarExpenseItem;
          } else if (plan.planDate) {
            return {
              id: plan.id,
              title: plan.title,
              expenseDate: dayjs(plan.planDate),
              totalAmount: plan.totalAmount,
              currencyCode: plan.currency?.value ? plan.currency.value.split(':').pop() || 'N/A' : 'N/A',
              status: plan.status || 'UNKNOWN',
              type: 'plan',
            } as CalendarExpenseItem;
          }
          return null;
        })
        .filter((item): item is CalendarExpenseItem => item !== null);

      setCalendarPlanItems(transformedPlans);
    }
  }, [rawExpensePlans]);

  useEffect(() => {
    fetchRequestsHookItems().catch(err => {
      console.error('Failed to fetch expense requests:', err);
      setRequestsError(err.message || 'Failed to fetch expense requests');
    });
  }, [fetchRequestsHookItems]);

  useEffect(() => {
    if (fetchRequestsErrorHook) {
      setRequestsError(fetchRequestsErrorHook);
      message.error(`Error fetching expense requests: ${fetchRequestsErrorHook}`);
    } else {
      setRequestsError(null);
    }
  }, [fetchRequestsErrorHook]);

  useEffect(() => {
    if (rawExpenseRequests) {
      const transformedRequests: CalendarExpenseItem[] = rawExpenseRequests
        .map((request: ExpenseRequest) => {
          let calendarItem: CalendarExpenseItem | null = null;
          if (request.startDate && request.endDate) {
            // Multi-day request
            calendarItem = {
              id: request.id,
              title: request.title,
              expenseDate: dayjs(request.startDate),
              endDate: dayjs(request.endDate),
              totalAmount: request.totalAmount,
              currencyCode: request.currencyRef ? request.currencyRef.split(':').pop() || 'N/A' : 'N/A',
              status: request.status || 'UNKNOWN',
              type: 'request',
            };
          } else if (request.requestDate) {
            // Single-day request using requestDate
            calendarItem = {
              id: request.id,
              title: request.title,
              expenseDate: dayjs(request.requestDate),
              totalAmount: request.totalAmount,
              currencyCode: request.currencyRef ? request.currencyRef.split(':').pop() || 'N/A' : 'N/A',
              status: request.status || 'UNKNOWN',
              type: 'request',
            };
          }
          // If not multi-day and no requestDate, it will return null and be filtered out by the subsequent .filter().
          return calendarItem;
        })
        .filter((item): item is CalendarExpenseItem => item !== null);
      setCalendarRequestItems(transformedRequests);
    }
  }, [rawExpenseRequests]);

  const onSelect = (date: Dayjs, info: { source: 'year' | 'month' | 'date' | 'customize' }) => {
    console.log('[onSelect]', 'Selected date:', date.format('YYYY-MM-DD'), 'Source:', info.source);
  };

  const dateCellRender = (value: Dayjs) => {
    const itemsForDate = [...calendarItems, ...calendarPlanItems, ...calendarRequestItems].filter(
      (item: CalendarExpenseItem) => {
        if (item.endDate && (item.type === 'plan' || item.type === 'request')) { // Multi-day plan or request
          // Ensure value is between or equal to expenseDate and endDate
          return (value.isSame(item.expenseDate, 'day') || value.isAfter(item.expenseDate, 'day')) &&
                 (value.isSame(item.endDate, 'day') || value.isBefore(item.endDate, 'day'));
        } else { // Single-day expense or plan
          return item.expenseDate.isSame(value, 'day');
        }
      }
    );

    if (itemsForDate.length === 0) {
      return null;
    }

    return (
      <ul className="gba-events-list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {itemsForDate.map((item: CalendarExpenseItem) => (
          <li key={item.id} className="gba-event-item-card" style={{ marginBottom: '4px', padding: '4px', border: '1px solid #f0f0f0', borderRadius: '4px', backgroundColor: item.type === 'plan' ? '#e6f7ff' : item.type === 'request' ? '#e6fffb' : '#fafafa' }}>
            <div style={{ fontSize: '0.8em', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
            {(item.type === 'expense' || !item.endDate || value.isSame(item.expenseDate, 'day')) && (
              <div style={{ fontSize: '0.75em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{(item.totalAmount ?? 0).toFixed(2)} {item.currencyCode}</span>
                <Tag color={getStatusColor(item.status)} style={{ margin: 0, fontSize: '0.7em', padding: '0 4px' }}>{item.status}</Tag>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="gba-expense-calendar-tab">
      {(isLoadingExpenses || isLoadingPlans || isLoadingRequests) && <div style={{ textAlign: 'center', padding: '20px' }}><Spin tip="Loading data..." size="large" /></div>}
      {(expensesError || plansError || requestsError) && <div style={{ textAlign: 'center', padding: '20px' }}><Alert message={`Error: ${(expensesError || '') + (plansError || '') + (requestsError || '')}`} type="error" /></div>}
      {!(isLoadingExpenses || isLoadingPlans || isLoadingRequests) && !(expensesError || plansError || requestsError) && (
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
