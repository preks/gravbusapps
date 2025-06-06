import { useMemo, useState } from "react";
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Calendar, List, Tag, Typography, Tabs } from "antd";
import dayjs, { Dayjs } from "dayjs";
import "./AbsenceCalendar.css";
import {
  useGetEmployeeAbsences,
  EmployeeAbsence,
} from "../../hooks/useGetEmployeeAbsences";
import { BusinessAppContextProps } from "../../../../common/BusinessAppContext";
import calendarIcon from "../../../../assets/icons/calendarIcon.svg";
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
dayjs.extend(weekday)
dayjs.extend(localeData)

const { Paragraph } = Typography;
const { TabPane } = Tabs;

interface AbsenceCalendarProps extends BusinessAppContextProps {}

const AbsenceCalendar: React.FC<AbsenceCalendarProps> = (props) => {
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [upcomingPageSize, setUpcomingPageSize] = useState(10);
  const [pastPage, setPastPage] = useState(1);
  const [pastPageSize, setPastPageSize] = useState(10);
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs());

  const { userInfo, accessToken } = props;
  const employeeId = userInfo?.employeeDetails?.employeeId;

  const { absences, loading, error } = useGetEmployeeAbsences({
    employeeId,
    accessToken,
  });

  const now = useMemo(() => new Date(), []);

  const mapAbsence = (absence: EmployeeAbsence) => {
    let tagColor: string | undefined = undefined;
    const objectValue =
      absence.type &&
      typeof absence.type === "object" &&
      "objectValue" in absence.type
        ? (absence.type as any).objectValue
        : undefined;
    if (objectValue && typeof objectValue.color === "string") {
      tagColor = `#${objectValue.color.replace(/^#/, "")}`;
    }
    return {
      id: absence.id,
      startDate: absence.startDate?.slice(0, 10),
      endDate: absence.endDate?.slice(0, 10),
      type: absence.type.value,
      status: absence.status,
      tagColor,
      description: absence.description || "",
    };
  };

  const mappedAbsences = Array.isArray(absences)
    ? absences.map(mapAbsence)
    : [];

  const upcomingAbsences = useMemo(
    () =>
      mappedAbsences
        .filter((absence) => absence.endDate && new Date(absence.endDate) >= now)
        .sort((a, b) => {
          const aDate = new Date(a.startDate ?? '').getTime();
          const bDate = new Date(b.startDate ?? '').getTime();
          return aDate - bDate;
        }),
    [mappedAbsences, now]
  );
  const pastAbsences = useMemo(
    () =>
      mappedAbsences
        .filter((absence) => absence.endDate && new Date(absence.endDate) < now)
        .sort((a, b) => {
          const aDate = new Date(a.endDate ?? '').getTime();
          const bDate = new Date(b.endDate ?? '').getTime();
          return bDate - aDate;
        }),
    [mappedAbsences, now]
  );

  const dateCellRender = (value: any) => {
    const dateStr = value.format("YYYY-MM-DD");
    const items = mappedAbsences.filter(
      (absence) => dateStr >= absence.startDate && dateStr <= absence.endDate
    );
    return items.length ? (
      <ul className="absence-calendar-date-list">
        {items.map((item) => (
          <li key={item.id}>
            <Tag
              color={
                item.tagColor ||
                (item.status === "Approved" ? "green" : "orange")
              }
              className={`absence-calendar-tag${item.status === 'PENDING' ? ' absence-pending' : ''}`}
            >
              <div className="absence-calendar-type">{item.type}</div>
            </Tag>
            {item.description && (
              <div className="absence-calendar-description">{item.description}</div>
            )}
          </li>
        ))}
      </ul>
    ) : null;
  };

  if (loading) {
    return (
      <div className="absence-calendar-loading">Loading absences...</div>
    );
  }
  if (error) {
    return (
      <div className="absence-calendar-error">Error loading absences.</div>
    );
  }

  const handlePrevMonth = () =>
    setCalendarValue((prev) => prev.subtract(1, "month"));
  const handleNextMonth = () =>
    setCalendarValue((prev) => prev.add(1, "month"));
  const handleToday = () => setCalendarValue(dayjs());

  return (
    <div className="absence-calendar-root">
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
        <img src={calendarIcon} alt="Calendar Icon" className="gba:w-8 gba:h-8" />
        <span className="gba:text-2xl gba:font-bold">My Absence Calendar</span>
      </div>
      <Tabs defaultActiveKey="calendar" className="absence-calendar-tabs">
        <TabPane tab="Month" key="calendar">
          <div className="calendar-controls-bar">
            <div className="calendar-controls-leftbar">
              <button className="calendar-toggle-btn" onClick={handlePrevMonth}>
                <LeftOutlined className="calendar-icon-thick" />
              </button>
              <button className="calendar-today-btn" onClick={handleToday}>
                Today
              </button>
              <button className="calendar-toggle-btn" onClick={handleNextMonth}>
                <RightOutlined className="calendar-icon-thick" />
              </button>
              <span className="calendar-toggle-group-label">
                {calendarValue.format("MMMM YYYY")}
              </span>
            </div>
          </div>
          <Calendar
            className="absence-calendar"
            cellRender={dateCellRender}
            fullscreen={true}
            value={calendarValue}
            onPanelChange={setCalendarValue}
            onChange={setCalendarValue}
            headerRender={() => null}
          />
        </TabPane>
        <TabPane tab="Upcoming Absences" key="upcoming">
          <Paragraph
            className="gba:font-semibold gba:text-lg"
            style={{ marginBottom: 16 }}
          >
            These are your upcoming absences as recorded in the system.
          </Paragraph>
          <List
            itemLayout="vertical"
            dataSource={upcomingAbsences}
            locale={{ emptyText: "No upcoming absences." }}
            pagination={{
              current: upcomingPage,
              pageSize: upcomingPageSize,
              onChange: (page, pageSize) => {
                setUpcomingPage(page);
                setUpcomingPageSize(pageSize);
              },
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            renderItem={(item) => {
              const isSameDay = item.startDate === item.endDate;
              return (
                <List.Item key={item.id} className="absence-event-item">
                  <div className="absence-event-row">
                    <div className="absence-event-date">
                      {isSameDay
                        ? `Date: ${item.startDate}`
                        : `From: ${item.startDate} - To: ${item.endDate}`}
                    </div>
                    <span>Type: </span>
                    <Tag
                      color={item.tagColor}
                      className={`absence-event-tag${item.status === 'PENDING' ? ' absence-pending' : ''}`}
                    >
                      {item.type}
                    </Tag>
                    <div className="absence-event-status">Status: {item.status}</div>
                    {item.description && <div className="absence-event-description">Note: {item.description}</div>}
                  </div>
                </List.Item>
              );
            }}
          />
        </TabPane>
        <TabPane tab="Past Absences" key="past">
          <Paragraph
           className="gba:font-semibold gba:text-lg"
            style={{ marginBottom: 16 }}
          >
            These are your past absences as recorded in the system.
          </Paragraph>
          <List
            itemLayout="vertical"
            dataSource={pastAbsences}
            locale={{ emptyText: "No past absences." }}
            pagination={{
              current: pastPage,
              pageSize: pastPageSize,
              onChange: (page, pageSize) => {
                setPastPage(page);
                setPastPageSize(pageSize);
              },
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            renderItem={(item) => {
              const isSameDay = item.startDate === item.endDate;
              return (
                <List.Item key={item.id} className="absence-event-item">
                  <div className="absence-event-row">
                    <div className="absence-event-date">
                      {isSameDay
                        ? `Date: ${item.startDate}`
                        : `From: ${item.startDate} - To: ${item.endDate}`}
                    </div>
                    <span>Type: </span>
                    <Tag
                      color={item.tagColor}
                      className={`absence-event-tag${item.status === 'PENDING' ? ' absence-pending' : ''}`}
                    >
                      {item.type}
                    </Tag>
                    <div className="absence-event-status">Status: {item.status}</div> 
                    {item.description && <div className="absence-event-description">Note: {item.description}</div>}
                  </div>
                </List.Item>
              );
            }}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AbsenceCalendar;
export { AbsenceCalendar };
