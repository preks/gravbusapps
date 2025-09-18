'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { Employee, EmployeeAbsenceEntitlement } from '../../hooks/useEmployeeData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Button, Card } from '@newwork/gravity-ui-catalog';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Tabs, Pagination, Spin, Tooltip } from 'antd';
import {
  CalendarOutlined,
  UnorderedListOutlined,
  PaperClipOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import updateLocale from 'dayjs/plugin/updateLocale';

// Register dayjs plugins
dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);
dayjs.extend(customParseFormat);
dayjs.extend(updateLocale);
import {
  formatDate,
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel,
  getCatalogValue,
} from '../../../../../../../common/utils/windowUtils';
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext';
import { AppActionMenu } from '@/components/app-action-menu';
import { PiPencilSimple } from 'react-icons/pi';

// Types for absence data
interface AbsenceListCardAbsence {
  type: string;
  status: string;
  title: string;
  startDate: string;
  endDate: string;
  duration: string;
  description: string;
  icon: React.ReactNode;
  typeColor: string;
  statusColor: string;
  requestDate: string;
}

interface Entitlement {
  type: string;
  color: string;
  used: number;
  total: number;
  pending: number;
  available: number;
  icon: React.ReactNode;
  checkEntitlement?: boolean;
}

interface AbsencesTabProps {
  employee: Employee;
  employeeAbsenceEntitlement: EmployeeAbsenceEntitlement[];
  accessToken: string;
  employeeId?: string; // Optional employeeId override for permissions check
  userInfo?: UserInfoProps; // Current user info for self-view check
  isSelfView?: boolean; // Whether user is viewing their own profile
  shownTab?: string;
}

// GraphQL queries for absences and entitlements
const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences($employeeId: uuid!, $activeUserLocale: String!) {
    EmployeeAbsence(where: { employee: { id: { _eq: $employeeId } } }) {
      description
      id
      endDate
      startDate
      status
      type {
        id
        value   
        objectValue
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
      }
      workingDays
      workingHours
      createdAt
    }
  }
`;

/**
 * Absences Tab Component
 * Displays absence entitlements, history, and calendar for the employee
 */
const AbsencesTab: React.FC<AbsencesTabProps> = ({
  employee,
  employeeAbsenceEntitlement,
  accessToken,
  shownTab,
}) => {
  const [activeTab, setActiveTab] = useState<string>(shownTab ?? 'calendar');
  const [absenceList, setAbsenceList] = useState<AbsenceListCardAbsence[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedStartDate, setSelectedStartDate] = useState<dayjs.Dayjs | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<dayjs.Dayjs | null>(null);

  // Function to generate tooltip content for absence segments
  const getAbsenceTooltipContent = (absence: AbsenceListCardAbsence) => {
    const startDate = dayjs(absence.startDate);
    const endDate = dayjs(absence.endDate);
    const duration = endDate.diff(startDate, 'day') + 1;

    return (
      <div className="gba:max-w-xs gba:p-2">
        <div className="gba:font-semibold gba:text-sm gba:mb-2 gba:flex gba:items-center gba:gap-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: absence.statusColor || '#6b7280' }}
          />
          {absence.type}
        </div>
        <div className="gba:space-y-1 gba:text-xs">
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">Status:</span>
            <span style={{ color: absence.statusColor || '#6b7280' }} className="gba:font-medium">
              {absence.status}
            </span>
          </div>
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">Start:</span>
            <span>{startDate.format('MMM DD, YYYY')}</span>
          </div>
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">End:</span>
            <span>{endDate.format('MMM DD, YYYY')}</span>
          </div>
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">Duration:</span>
            <span>
              {duration} {duration === 1 ? 'day' : 'days'}
            </span>
          </div>
          {absence.description && (
            <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border-gray-200">
              <div className="gba:font-medium gba:mb-1">Description:</div>
              <div className="gba:text-gray-600 gba:break-words">{absence.description}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper function to create a new dayjs instance (like clone)
  const cloneDayjs = (date: dayjs.Dayjs) => dayjs(date.valueOf());

  // Paginated absence list
  const paginatedAbsenceList = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return absenceList.slice(startIndex, startIndex + pageSize);
  }, [absenceList, currentPage, pageSize]);

  // Handle tab change
  const onTabChange = (key: string) => {
    setActiveTab(key);
  };

  useEffect(() => {
    if (shownTab) {
      setActiveTab(shownTab);
    }
  }, [shownTab]);

  const employeeId = employee?.id;
  const client = useGraphqlClient(accessToken);

  // Fetch absence data
  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);

    client
      .request(GET_EMPLOYEE_ABSENCES, {
        employeeId,
        activeUserLocale: getCurrentActiveUserLocale(),
      })
      .then((absenceRes) => {
        const absences = absenceRes?.EmployeeAbsence || [];

        setAbsenceList(
          absences.map((absence: any) => ({
            type: getCatalogValue(absence.type) || '',
            status: (() => {
              switch ((absence.status || '').toUpperCase()) {
                case 'PENDING':
                  return getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_statuses.pending',
                    'Pending',
                  );
                case 'APPROVED':
                  return getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_statuses.approved',
                    'Approved',
                  );
                case 'REJECTED':
                  return getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_statuses.rejected',
                    'Rejected',
                  );
                case 'CANCELLED':
                  return getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absences_overview_entry_screen.cancelled_status',
                    'Cancelled',
                  );
                default:
                  return absence.status;
              }
            })(),
            title: getCatalogValue(absence.type) || '',
            startDate: absence.startDate,
            endDate: absence.endDate,
            duration: absence.workingDays
              ? `${absence.workingDays} ${absence.workingDays === 1 ? 'day' : 'days'}`
              : '',
            description: absence.description || '',
            icon: (
              <PaperClipOutlined
                style={{
                  color: absence.type?.objectValue?.color
                    ? `#${absence.type.objectValue.color}`
                    : '#1976d2',
                }}
              />
            ),
            typeColor: absence.type?.objectValue?.color ? absence.type.objectValue.color : 'blue',
            statusColor: (() => {
              switch ((absence.status || '').toLowerCase()) {
                case 'pending':
                  return '#f59e0b'; // Orange for pending
                case 'approved':
                  return '#10b981'; // Green for approved
                case 'rejected':
                  return '#ef4444'; // Red for rejected
                case 'cancelled':
                  return '#6b7280'; // Gray for cancelled
                default:
                  return '#6b7280'; // Gray for unknown
              }
            })(),
            requestDate: absence.createdAt,
          })),
        );

        // Transform entitlements from props
        setEntitlements(
          employeeAbsenceEntitlement.map((ent) => ({
            type: getTypeValue(ent.type),
            color: ent.type?.objectValue?.color || '1976d2',
            used: ent.approved,
            total: ent.total,
            pending: ent.pending,
            available: ent.available,
            icon: (
              <PaperClipOutlined
                style={{ color: `#${ent.type?.objectValue?.color || '1976d2'}` }}
              />
            ),
            checkEntitlement: ent.type?.objectValue?.checkEntitlement,
          })),
        );
      })
      .catch(() => setError('Failed to load absence data.'))
      .finally(() => setLoading(false));
  }, [employeeId, accessToken, employeeAbsenceEntitlement]);

  // Function to get the catalog value
  const getTypeValue = (type: any) => {
    if (type?.translations?.length > 0) {
      return type.translations[0].value;
    }
    return type?.value || 'Unknown';
  };

  const tabsItems = [
    {
      key: 'calendar',
      label: (
        <span className="gba:tabLabel">
          <CalendarOutlined className="gba:tabIcon" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.calendar', 'Calendar')}
        </span>
      ),
      children: (
        <div className="gba:calendarContainer" data-testid="absencehub-calendar-container">
          {loading ? (
            <div className="gba:loading gba:flex gba:justify-center gba:items-center gba:py-8">
              <Spin size="large" />
            </div>
          ) : error ? (
            <div className="gba:error gba:text-red-500 gba:py-8 gba:text-center">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.error_loading',
                'Failed to load absence data.',
              )}
            </div>
          ) : (
            <div className="gba:calendar-content">
              <div
                className="gba:calendar-view gba:bg-white gba:rounded gba:border gba:shadow-sm"
                data-testid="absence-calendar-view"
              >
                {/* Calendar Header (hidden when shownTab is provided) */}

                <div className="gba:calendar-header gba:flex gba:justify-between gba:items-center gba:p-4 gba:border-b">
                  <div className="gba:calendar-month-year gba:font-medium gba:text-lg">
                    {currentDate.format('MMMM YYYY')}
                  </div>
                  <div className="gba:calendar-nav gba:flex gba:gap-2">
                    <Button
                      variant="secondary"
                      className="gba:px-3 gba:py-1"
                      data-testid="calendar-prev-month"
                      onClick={() => setCurrentDate(cloneDayjs(currentDate).subtract(1, 'month'))}
                    >
                      <LeftOutlined className="gba:mr-1" />
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_hub.previous',
                        'Previous',
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      className="gba:px-3 gba:py-1"
                      data-testid="calendar-today"
                      onClick={() => setCurrentDate(dayjs())}
                    >
                      {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.today', 'Today')}
                    </Button>
                    <Button
                      variant="secondary"
                      className="gba:px-3 gba:py-1"
                      data-testid="calendar-next-month"
                      onClick={() => setCurrentDate(cloneDayjs(currentDate).add(1, 'month'))}
                    >
                      {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.next', 'Next')}
                      <RightOutlined className="gba:ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="gba:calendar-grid gba:p-4">
                  {/* Weekday Headers */}
                  <div className="gba:grid gba:grid-cols-7 gba:gap-1 gba:mb-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div
                        key={day}
                        className="gba:text-center gba:font-medium gba:text-gray-600 gba:py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="gba:grid gba:grid-cols-7 gba:gap-1">
                    {/* Generate days for the current month with proper offset */}
                    {(() => {
                      const daysInMonth = currentDate.daysInMonth();
                      const firstDayOfMonth = currentDate.startOf('month');
                      const startOfCalendar = firstDayOfMonth.startOf('week');

                      // Calculate how many days to display (either 35 or 42 depending on the month)
                      const daysToDisplay =
                        Math.ceil((daysInMonth + firstDayOfMonth.day()) / 7) * 7;

                      return Array.from({ length: daysToDisplay }).map((_, idx) => {
                        // Create a new dayjs object for each day to avoid mutation issues
                        const currentDay = cloneDayjs(startOfCalendar).add(idx, 'day');
                        const isCurrentMonth = currentDay.month() === currentDate.month();
                        const isToday =
                          currentDay.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');

                        // (kept purposely minimal; we compute overlappingAbsences later for indicators)

                        const isSelectedStart = selectedStartDate
                          ? currentDay.isSame(selectedStartDate, 'day')
                          : false;
                        const isSelectedEnd = selectedEndDate
                          ? currentDay.isSame(selectedEndDate, 'day')
                          : false;
                        const isInSelectedRange =
                          selectedStartDate && selectedEndDate
                            ? currentDay.isAfter(selectedStartDate, 'day') &&
                              currentDay.isBefore(selectedEndDate, 'day')
                            : false;

                        return (
                          <div
                            key={idx}
                            className={`gba:calendar-day gba:p-2 gba:h-16 gba:border gba:rounded 
                              ${isSelectedStart || isSelectedEnd ? 'gba:bg-blue-200 gba:border-blue-500' : isInSelectedRange ? 'gba:bg-blue-50' : isToday ? 'gba:bg-blue-50 gba:border-blue-300' : 'gba:bg-white'} 
                              ${!isCurrentMonth ? 'gba:opacity-40' : 'gba:cursor-pointer'}`}
                            data-testid={`calendar-day-${currentDay.date()}`}
                            onClick={() => {
                              if (!isCurrentMonth) return;
                              if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
                                setSelectedStartDate(currentDay.startOf('day'));
                                setSelectedEndDate(null);
                                return;
                              }
                              if (currentDay.isBefore(selectedStartDate, 'day')) {
                                setSelectedStartDate(currentDay.startOf('day'));
                                setSelectedEndDate(null);
                              } else if (currentDay.isSame(selectedStartDate, 'day')) {
                                setSelectedEndDate(currentDay.startOf('day'));
                              } else {
                                setSelectedEndDate(currentDay.startOf('day'));
                              }
                            }}
                          >
                            <div
                              className={`gba:day-number gba:text-right 
                              ${isSelectedStart || isSelectedEnd ? 'gba:font-bold gba:text-blue-700' : isToday ? 'gba:font-bold gba:text-blue-600' : ''} 
                              ${!isCurrentMonth ? 'gba:text-gray-400' : ''}`}
                            >
                              {currentDay.date()}
                            </div>
                            {isCurrentMonth &&
                              (() => {
                                const overlappingAbsences = absenceList.filter(
                                  (absence: AbsenceListCardAbsence) => {
                                    const absenceStart = dayjs(absence.startDate);
                                    const absenceEnd = dayjs(absence.endDate);
                                    return currentDay.isBetween(
                                      absenceStart,
                                      absenceEnd,
                                      null,
                                      '[]',
                                    );
                                  },
                                );

                                if (overlappingAbsences.length === 0) return null;

                                // Render small colored segments for each overlapping absence (max 3)
                                const maxSegments = 3;
                                const segments = overlappingAbsences.slice(0, maxSegments);
                                const segmentWidth = `${100 / segments.length}%`;

                                return (
                                  <div className="gba:flex gba:gap-1 gba:mt-1">
                                    {segments.map((a: AbsenceListCardAbsence, idx: number) => (
                                      <Tooltip
                                        key={`seg-${idx}`}
                                        title={getAbsenceTooltipContent(a)}
                                        placement="top"
                                        mouseEnterDelay={0.3}
                                        overlayStyle={{ zIndex: 9999 }}
                                      >
                                        <div
                                          className="gba:flex gba:items-center gba:justify-center gba:rounded-full gba:cursor-help gba:transition-all gba:duration-200 hover:gba:h-6 gba:min-h-4 gba:px-1"
                                          style={{
                                            width: segmentWidth,
                                            backgroundColor: a.statusColor || '#6b7280',
                                          }}
                                        >
                                          <span className="gba:text-xs gba:font-medium gba:text-white gba:truncate gba:leading-none gba:absence-segment-text">
                                            {a.type}
                                          </span>
                                        </div>
                                      </Tooltip>
                                    ))}
                                  </div>
                                );
                              })()}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Status Legend */}
                <div className="gba:calendar-legend gba:px-4 gba:py-3 gba:border-t gba:bg-gray-50">
                  <div className="gba:flex gba:items-center gba:gap-6 gba:flex-wrap">
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <div
                        className="gba:w-3 gba:h-3 gba:rounded-full"
                        style={{ backgroundColor: '#10b981' }}
                      />
                      <span className="gba:text-xs gba:ml-1">Approved</span>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <div
                        className="gba:w-3 gba:h-3 gba:rounded-full"
                        style={{ backgroundColor: '#f59e0b' }}
                      />
                      <span className="gba:text-xs gba:ml-1">Pending</span>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <div
                        className="gba:w-3 gba:h-3 gba:rounded-full"
                        style={{ backgroundColor: '#ef4444' }}
                      />
                      <span className="gba:text-xs gba:ml-1">Rejected</span>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <div
                        className="gba:w-3 gba:h-3 gba:rounded-full"
                        style={{ backgroundColor: '#6b7280' }}
                      />
                      <span className="gba:text-xs gba:ml-1">Cancelled</span>
                    </div>
                  </div>
                </div>

                <div className="gba:calendar-footer gba:p-4 gba:border-t gba:text-center gba:text-sm gba:text-gray-500">
                  {selectedStartDate && selectedEndDate ? (
                    <span data-testid="selected-range">
                      {selectedStartDate.format('MMM D, YYYY')} -{' '}
                      {selectedEndDate.format('MMM D, YYYY')}
                    </span>
                  ) : selectedStartDate ? (
                    <span data-testid="select-end-prompt">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_hub.select_end_date',
                        'Select an end date',
                      )}
                    </span>
                  ) : (
                    getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_hub.calendar_note',
                      'Click on a day to view or add absences',
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'absence-list',
      label: (
        <span className="gba:tabLabel">
          <UnorderedListOutlined className="gba:tabIcon" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.absence_list', 'Absence List')}
        </span>
      ),
      children: (
        <div className="gba:absenceList" data-testid="absencehub-absence-list">
          {loading ? (
            <div
              className="gba:loading-skeleton gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
              data-testid="absencehub-loading"
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="gba:h-40 gba:bg-gray-100 gba:rounded gba:animate-pulse"
                ></div>
              ))}
            </div>
          ) : error ? (
            <div
              className="gba:error-container gba:text-center gba:py-8"
              data-testid="absencehub-error"
            >
              <div className="gba:text-red-500 gba:text-lg gba:mb-2">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.error_loading',
                  'Failed to load absence data.',
                )}
              </div>
              <div className="gba:text-gray-500">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.try_again_later',
                  'Please try again later or contact support if the problem persists.',
                )}
              </div>
            </div>
          ) : (
            <>
              {absenceList.length > 0 ? (
                <div
                  className="gba:absenceListCards gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
                  data-testid="absencehub-absence-list-cards"
                >
                  {paginatedAbsenceList.map((absence, idx) => (
                    <div
                      key={idx + (currentPage - 1) * pageSize}
                      className="gba:absence-card gba:border gba:rounded gba:p-4 gba:shadow-sm gba:bg-white gba:hover:shadow-md gba:transition-shadow"
                      data-testid={`absence-card-${idx}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                        <div
                          className="gba:icon-container gba:p-2 gba:rounded-full"
                          style={{ backgroundColor: `${absence.typeColor}20` }}
                        >
                          <span className="gba:icon">{absence.icon}</span>
                        </div>
                        <h4 className="gba:text-lg gba:font-medium">{absence.title}</h4>
                      </div>

                      <div className="gba:absence-details gba:mt-3">
                        <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                          <div className="gba:text-gray-500">
                            {formatDate(absence.startDate, 'date.long')} -{' '}
                            {formatDate(absence.endDate, 'date.long')}
                          </div>
                          <div
                            className="gba:status-badge gba:px-3 gba:py-1 gba:rounded gba:text-sm"
                            style={{ backgroundColor: absence.statusColor }}
                          >
                            {absence.status}
                          </div>
                        </div>

                        <div className="gba:mb-2">
                          <span className="gba:text-gray-500 gba:mr-1">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_hub.duration',
                              'Duration',
                            )}
                            :
                          </span>
                          <span>{absence.duration}</span>
                        </div>

                        {absence.description && (
                          <div className="gba:mb-2 gba:text-gray-700">
                            <span className="gba:text-gray-500 gba:mr-1">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:absence_hub.description',
                                'Description',
                              )}
                              :
                            </span>
                            <span>{absence.description}</span>
                          </div>
                        )}

                        <div className="gba:text-gray-400 gba:text-sm gba:mt-3 gba:text-right">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_hub.requested_on',
                            'Requested on',
                          )}
                          : {formatDate(absence.requestDate, 'date.short')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="gba:absenceListEmpty gba:text-center gba:py-8 gba:text-gray-500"
                  data-testid="absencehub-absence-list-empty"
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_hub.no_absences_found',
                    'No absences found.',
                  )}
                </div>
              )}

              {absenceList.length > pageSize && (
                <div
                  className="gba:absenceListPagination gba:mt-6 gba:flex gba:justify-center"
                  data-testid="absencehub-absence-list-pagination"
                >
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={absenceList.length}
                    showSizeChanger
                    pageSizeOptions={['10', '20', '50']}
                    onChange={(page: number, size?: number) => {
                      setCurrentPage(page);
                      if (size) setPageSize(size);
                    }}
                    showTotal={(total: number, range: [number, number]) =>
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_hub.pagination',
                        '{{range0}}-{{range1}} of {{total}}',
                        { range0: range[0], range1: range[1], total },
                      )
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: 'entitlements',
      label: (
        <span className="gba:tabLabel">
          <PaperClipOutlined className="gba:tabIcon" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.entitlements', 'Entitlements')}
        </span>
      ),
      children: (
        <div className="gba:entitlements-content">
          {loading ? (
            <div
              className="gba:loading-skeleton gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
              data-testid="entitlements-loading"
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="gba:h-40 gba:bg-gray-100 gba:rounded gba:animate-pulse"
                ></div>
              ))}
            </div>
          ) : error ? (
            <div
              className="gba:error-container gba:text-center gba:py-8"
              data-testid="entitlements-error"
            >
              <div className="gba:text-red-500 gba:text-lg gba:mb-2">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.error_loading',
                  'Failed to load entitlements data.',
                )}
              </div>
              <div className="gba:text-gray-500">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.try_again_later',
                  'Please try again later or contact support if the problem persists.',
                )}
              </div>
            </div>
          ) : entitlements.length === 0 ? (
            <div
              className="gba:no-entitlements gba:text-center gba:text-gray-500 gba:py-8"
              data-testid="no-entitlements"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.no_entitlements',
                'No entitlements found',
              )}
            </div>
          ) : (
            <div
              className="gba:entitlements-grid gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
              data-testid="entitlements-grid"
            >
              {entitlements.map((entitlement, idx) => (
                <div
                  key={`${entitlement.type}-${idx}`}
                  className="gba:entitlement-card gba:border gba:rounded gba:p-4 gba:shadow-sm gba:bg-white gba:hover:shadow-md gba:transition-shadow"
                  data-testid={`entitlement-card-${idx}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                    <div
                      className="gba:icon-container gba:p-2 gba:rounded-full"
                      style={{ backgroundColor: `#${entitlement.color}20` }}
                    >
                      <span className="gba:icon">{entitlement.icon}</span>
                    </div>
                    <h4 className="gba:text-lg gba:font-medium">{entitlement.type}</h4>
                  </div>

                  <div className="gba:entitlement-details gba:mt-4">
                    <div className="gba:flex gba:justify-between gba:mb-1">
                      <span className="gba:text-gray-500">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used', 'Used')}
                      </span>
                      <span className="gba:font-medium">
                        {entitlement.used} / {entitlement.total}
                      </span>
                    </div>

                    <div className="gba:progress-bar gba:bg-gray-200 gba:rounded-full gba:h-2 gba:mb-3">
                      <div
                        className="gba:progress gba:h-full gba:rounded-full"
                        style={{
                          width: `${entitlement.total > 0 ? (entitlement.used / entitlement.total) * 100 : 0}%`,
                          backgroundColor: `#${entitlement.color}`,
                        }}
                      ></div>
                    </div>

                    <div className="gba:flex gba:justify-between gba:items-center">
                      <span className="gba:text-gray-500">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_hub.available',
                          'Available',
                        )}
                      </span>
                      <span className="gba:font-medium gba:text-lg gba:text-green-600">
                        {entitlement.available}
                      </span>
                    </div>

                    {entitlement.pending > 0 && (
                      <div className="gba:flex gba:justify-between gba:mt-2 gba:items-center">
                        <span className="gba:text-amber-500">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_hub.pending',
                            'Pending',
                          )}
                        </span>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <span className="gba:text-amber-500 gba:font-medium">
                            {entitlement.pending}
                          </span>
                          <span className="gba:text-xs gba:text-gray-500">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_hub.days_pending',
                              'days in approval',
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {entitlement.checkEntitlement && (
                      <div className="gba:entitlement-note gba:mt-3 gba:text-xs gba:text-gray-500 gba:border-t gba:pt-2">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_hub.entitlement_note',
                          'Entitlement is checked before approval',
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ].filter((item) => (shownTab ? item.key === shownTab : true));

  // tabsItems prepared above based on shownTab

  // shownTab provided -> render only content of that tab

  return (
    <div className="gba:absences-tab gba:space-y-8">
      {/* Absence Overview Headline with Action Button */}
      {!shownTab && (
        <div
          className="gba:flex gba:justify-between gba:items-start"
          data-testid="absencehub-header"
        >
          <div className="gba:absence-header">
            <div className="gba:font-bold gba:text-2xl" data-testid="absencehub-title">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_absences.absence_overview',
                'Absence Overview',
              )}
            </div>
            <div className="gba:text-gray-500 gba:text-lg" data-testid="absencehub-description">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.absence_description',
                'View and manage your absences',
              )}
            </div>
          </div>

          {/* Request Absence Button */}
          <div>
            <AppActionMenu
              data-testid="employee-absence-request-button"
              contextsArray={[FlowContextName.employeeAbsenceRecord]}
              externalContextData={{
                employeeId: employee.id,
                absenceType: employeeAbsenceEntitlement.find(
                  (e) => e.type?.id === 'AbsenceType:v1:A001',
                )?.type?.id,
                flowType: 'vacation',
                startDate: selectedStartDate?.format('YYYY-MM-DD'),
                endDate: selectedEndDate?.format('YYYY-MM-DD'),
              }}
              prefixDataTestId="employee-absence-request"
              accessToken={accessToken}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <PiPencilSimple className="gba:h-5 gba:w-5" />
                Request Absence
              </div>
            </AppActionMenu>
          </div>
        </div>
      )}

      {/* Absence Charts Section */}
      {loading ? (
        <div className="gba:loading gba:flex gba:justify-center gba:items-center gba:py-8">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="gba:error gba:text-red-500 gba:py-8 gba:text-center">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.error_loading',
            'Failed to load absence data.',
          )}
        </div>
      ) : (
        <div className="gba:charts-section gba:mb-8" data-testid="absence-charts-section">
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-6">
            {/* Chart 1: Annual Leave Used vs Total */}
            <Card
              variant="outlined"
              className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all gba:p-4"
              data-testid="annual-leave-chart"
            >
              <div className="gba:text-lg gba:font-medium gba:mb-2">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.annual_leave',
                  'Annual Leave',
                )}
              </div>
              <div className="gba:text-sm gba:text-gray-500 gba:mb-4">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.annual_leave_description',
                  'Used vs. Total Annual Leave',
                )}
              </div>
              {(() => {
                const annualLeaveEntitlement = Array.isArray(entitlements)
                  ? entitlements.find(
                      (e) =>
                        e?.type?.toLowerCase()?.includes('annual') ||
                        e?.type?.toLowerCase()?.includes('vacation') ||
                        e?.type?.toLowerCase()?.includes('leave'),
                    )
                  : undefined;
                const used = annualLeaveEntitlement?.used || 0;
                const total = annualLeaveEntitlement?.total || 0;
                const remaining = total - used;

                // Chart color scheme
                const chartColors = ['#22c55e', '#f97316'];

                const data = [
                  { name: 'Remaining Days', value: remaining, color: chartColors[0] },
                  { name: 'Used Days', value: used, color: chartColors[1] },
                ];

                return (
                  <>
                    <div className="gba:h-[180px] gba:border gba:border-gray-200 gba:rounded-md">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            fill="#8884d8"
                          >
                            {data.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={chartColors[index % chartColors.length]}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value, name) => [`${value} days`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="gba:flex gba:justify-center gba:items-center gba:gap-2 gba:mt-2">
                      <div className="gba:flex gba:items-center gba:gap-1.5">
                        <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-[#22c55e]"></div>
                        <span className="gba:text-sm">
                          {remaining}{' '}
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_hub.remaining',
                            'Remaining',
                          )}
                        </span>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-1.5">
                        <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-[#f97316]"></div>
                        <span className="gba:text-sm">
                          {used}{' '}
                          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used', 'Used')}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </Card>

            {/* Chart 2: Absence Distribution by Type (use catalog/backoffice colors) */}
            <Card
              variant="outlined"
              className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all gba:p-4"
              data-testid="absence-distribution-chart"
            >
              <div className="gba:text-lg gba:font-medium gba:mb-2">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.absence_distribution',
                  'Absence Distribution',
                )}
              </div>
              <div className="gba:text-sm gba:text-gray-500 gba:mb-4">
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.by_type', 'By Type')}
              </div>
              {(() => {
                // Group absences by type and count days
                const absenceByType: Record<string, number> = {};
                absenceList.forEach((absence) => {
                  if (
                    (absence.status || '').toLowerCase() === 'approved' ||
                    (absence.status || '').toLowerCase() === 'action required'
                  ) {
                    const type = absence.type || 'Other';
                    if (!absenceByType[type]) {
                      absenceByType[type] = 0;
                    }
                    const duration = parseInt(absence.duration) || 0;
                    absenceByType[type] += duration;
                  }
                });

                // Build a color map from catalog colors collected on items (fallback to grey)
                const typeColorMap: Record<string, string> = {};
                Object.keys(absenceByType).forEach((type) => {
                  const item = absenceList.find((a) => (a.type || 'Other') === type);
                  let color = item?.typeColor || '#6b7280';
                  if (color && typeof color === 'string') {
                    // Ensure hex color starts with '#'
                    if (!color.startsWith('#') && /^([0-9A-Fa-f]{6})$/.test(color)) {
                      color = `#${color}`;
                    }
                  } else {
                    color = '#6b7280';
                  }
                  typeColorMap[type] = color;
                });

                const keys = Object.keys(absenceByType);
                const data = keys.map((type) => ({
                  name: type,
                  value: absenceByType[type],
                  color: typeColorMap[type],
                }));

                return (
                  <>
                    <div className="gba:h-[180px] gba:border gba:border-gray-200 gba:rounded-md">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            fill="#8884d8"
                          >
                            {data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value, name) => [`${value} days`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:mt-2">
                      {data.map((entry, index) => (
                        <div
                          key={`legend-${index}`}
                          className="gba:flex gba:items-center gba:gap-1.5"
                        >
                          <div
                            className="gba:w-3 gba:h-3 gba:rounded-full"
                            style={{ backgroundColor: entry.color }}
                          ></div>
                          <span className="gba:text-sm">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </Card>

            {/* Chart 3: Absences by Status */}
            <Card
              variant="outlined"
              className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all gba:p-4"
              data-testid="absences-by-status-chart"
            >
              <div className="gba:text-lg gba:font-medium gba:mb-2">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.absence_status',
                  'Absence Status',
                )}
              </div>
              <div className="gba:text-sm gba:text-gray-500 gba:mb-4">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.status_distribution',
                  'Status Distribution',
                )}
              </div>
              {(() => {
                // Group absences by status
                const absenceByStatus: Record<string, number> = {};
                absenceList.forEach((absence) => {
                  const status = absence.status || 'Unknown';
                  if (!absenceByStatus[status]) {
                    absenceByStatus[status] = 0;
                  }
                  const duration = parseInt(absence.duration) || 0;
                  absenceByStatus[status] += duration;
                });

                // Define consistent colors for chart
                const chartColors = [
                  'rgba(13, 188, 123, 1)', // Green - Approved
                  'rgba(255, 158, 2, 1)', // Orange - Pending
                  'rgba(222, 29, 73, 1)', // Red - Rejected
                  'rgba(141, 145, 153, 1)', // Gray - Cancelled
                  '#94a3b8', // Light Gray - Unknown
                ];

                const statusColorMap: Record<string, number> = {
                  Approved: 0,
                  Pending: 1,
                  Rejected: 2,
                  Cancelled: 3,
                  Unknown: 4,
                };

                const data = Object.keys(absenceByStatus).map((status) => ({
                  name: status,
                  value: absenceByStatus[status],
                  color:
                    chartColors[statusColorMap[status] !== undefined ? statusColorMap[status] : 4],
                }));

                return (
                  <>
                    <div className="gba:h-[180px] gba:border gba:border-gray-200 gba:rounded-md">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            fill="#8884d8"
                          >
                            {data.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  chartColors[
                                    statusColorMap[entry.name] !== undefined
                                      ? statusColorMap[entry.name]
                                      : 4
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value, name) => [`${value} days`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:mt-2">
                      {data.map((entry, index) => (
                        <div
                          key={`legend-${index}`}
                          className="gba:flex gba:items-center gba:gap-1.5"
                        >
                          <div
                            className="gba:w-3 gba:h-3 gba:rounded-full"
                            style={{ backgroundColor: entry.color }}
                          ></div>
                          <span className="gba:text-sm">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </Card>
          </div>
        </div>
      )}

      {(shownTab === 'calendar' || shownTab === 'absence-list' || shownTab === 'entitlements') && (
        <div className="gba:flex gba:justify-end gba:mt-4" data-testid="absencehub-inline-action">
          <AppActionMenu
            data-testid="employee-absence-request-inline-button"
            contextsArray={[FlowContextName.employeeAbsenceRecord]}
            externalContextData={{
              employeeId: employee.id,
              absenceType: employeeAbsenceEntitlement.find(
                (e) => e.type?.id === 'AbsenceType:v1:A001',
              )?.type?.id,
              flowType: 'vacation',
              startDate: selectedStartDate?.format('YYYY-MM-DD'),
              endDate: selectedEndDate?.format('YYYY-MM-DD'),
            }}
            prefixDataTestId="employee-absence-request-inline"
            accessToken={accessToken}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
              <PiPencilSimple className="gba:h-5 gba:w-5" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.request_absence',
                'Request Absence',
              )}
            </div>
          </AppActionMenu>
        </div>
      )}

      {/* Absence Hub Integration */}
      <div className="gba:absence-hub-integration" data-testid="absence-hub-integration">
        {shownTab ? (
          <div className="gba:tabsContainer" data-testid="absencehub-tabs-container">
            {tabsItems[0]?.children}
          </div>
        ) : (
          <div className="gba:tabsContainer" data-testid="absencehub-tabs-container">
            <Tabs
              activeKey={activeTab}
              data-testid="absencehub-tabs"
              items={tabsItems}
              onChange={onTabChange}
              className="gba:tabs"
              type="card"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AbsencesTab;
