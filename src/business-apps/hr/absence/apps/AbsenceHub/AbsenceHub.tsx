import { Button, Tabs } from "antd";
import {
  CalendarOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  TrophyOutlined,
  HeartOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import { StatsCard } from "./components/StatsCard";
import { UpcomingAbsenceCard } from "./components/UpcomingAbsenceCard";
import AbsenceListCard from "./components/AbsenceListCard";
import type { TabsProps } from "antd";
import type {
  AbsenceItem,
  StatItem,
  AbsenceListCardAbsence,
} from "./types/absenceTypes";
import "./styles/absenceHub.css";
import "./styles/absenceListCard.css";
import AbsenceCalendar from "../AbsenceCalendar";
import EntitlementCard from "./components/EntitlementCard";
import StatisticsTab from "./components/StatisticsTab";
import type { Entitlement } from "./types/entitlementTypes";
import { BusinessAppContextProps } from "../../../../../common/BusinessAppContext";
import { useState } from "react";

const absenceList: AbsenceListCardAbsence[] = [
  {
    type: "Vacation",
    status: "Approved",
    title: "Winter holidays",
    dates: "Dec 20 - Dec 31, 2023",
    duration: "12 days",
    description: "Annual family trip",
    requestedInfo:
      "Requested on Nov 15, 2023 · Approved on Nov 20, 2023 by John Doe",
    icon: <PaperClipOutlined style={{ color: "#27ae60" }} />,
    typeColor: "green",
    statusColor: "approved",
    onViewDetails: () => {},
  },
  {
    type: "Sick Leave",
    status: "Approved",
    title: "Flu",
    dates: "Oct 5 - Oct 7, 2023",
    duration: "3 days",
    description: "Doctor's note provided",
    requestedInfo:
      "Requested on Oct 5, 2023 · Approved on Oct 5, 2023 by John Doe",
    icon: <HeartOutlined style={{ color: "#e53935" }} />,
    typeColor: "red",
    statusColor: "approved",
    onViewDetails: () => {},
  },
  {
    type: "Special Leave",
    status: "Pending",
    title: "Family matters",
    dates: "Feb 15 - Feb 16, 2024",
    duration: "2 days",
    description: "Personal family emergency",
    requestedInfo: "Requested on Jan 25, 2024",
    icon: <TrophyOutlined style={{ color: "#fb8c00" }} />,
    typeColor: "yellow",
    statusColor: "pending",
    onViewDetails: () => {},
  },
];

const upcomingAbsences: AbsenceItem[] = [
  {
    id: 1,
    type: "Vacation",
    icon: <PaperClipOutlined style={{ color: "#27ae60" }} />,
    dates: "7/15/2025 - 7/25/2025",
    description: "Summer vacation",
    timeUntil: "In 37 days",
    bgColor: "gba:absenceCard--green",
  },
  {
    id: 2,
    type: "Sick Leave",
    icon: <HeartOutlined style={{ color: "#e53935" }} />,
    dates: "8/5/2025 - 8/6/2025",
    description: "Medical appointment",
    timeUntil: "In 58 days",
    bgColor: "gba:absenceCard--red",
  },
  {
    id: 3,
    type: "Work Leave",
    icon: <PaperClipOutlined style={{ color: "#1976d2" }} />,
    dates: "9/12/2025 - 9/15/2025",
    description: "Conference attendance",
    timeUntil: "In 95 days",
    bgColor: "gba:absenceCard--blue",
  },
];

const entitlements: Entitlement[] = [
  {
    type: "Relocation",
    color: "purple",
    used: 2,
    year: 2025,
  },
  {
    type: "Remote",
    color: "blue",
    used: 0,
    year: 2025,
  },
  {
    type: "Business Trip",
    color: "blue",
    used: 6,
    total: 15,
    pending: 5,
    available: 9,
    year: 2025,
  },
  {
    type: "Annual Leave",
    color: "green",
    used: 9,
    total: 30,
    pending: 8,
    available: 21,
    year: 2025,
  },
  {
    type: "Child Illness",
    color: "orange",
    used: 0,
    year: 2025,
  },
  {
    type: "Childbirth",
    color: "orange",
    used: 1,
    total: 5,
    available: 4,
    year: 2025,
  },
  {
    type: "Health Care",
    color: "red",
    used: 0,
    year: 2025,
  },
];

const stats: StatItem[] = [
  {
    title: "Sick Leave",
    used: 3,
    total: 10,
    progress: 30,
    icon: <HeartOutlined style={{ color: "#e53935" }} />,
    color: "red",
    textColor: "text-red-800",
    daysLeft: 7,
  },
  {
    title: "Vacation",
    used: 12,
    total: 25,
    progress: 48,
    icon: <PaperClipOutlined style={{ color: "#27ae60" }} />,
    color: "green",
    textColor: "text-green-800",
    daysLeft: 8,
  },
  {
    title: "Special Leave",
    used: 1,
    total: 5,
    progress: 20,
    icon: <TrophyOutlined style={{ color: "#fb8c00" }} />,
    color: "orange",
    textColor: "text-orange-800",
    daysLeft: 4,
  },
  {
    title: "Work Leave",
    used: 8,
    total: 15,
    progress: 53,
    icon: <PaperClipOutlined style={{ color: "#1976d2" }} />,
    color: "blue",
    textColor: "text-blue-800",
    daysLeft: 5,
  },
];

const items: TabsProps["items"] = [
  {
    key: "calendar",
    label: (
      <span className="gba:tabLabel">
        <CalendarOutlined className="gba:tabIcon" />
        Calendar
      </span>
    ),
  },
  {
    key: "absence-list",
    label: (
      <span className="gba:tabLabel">
        <UnorderedListOutlined className="gba:tabIcon" />
        Absence List
      </span>
    ),
  },
  {
    key: "entitlements",
    label: (
      <span className="gba:tabLabel">
        <PaperClipOutlined className="gba:tabIcon" />
        Entitlements
      </span>
    ),
  },
  {
    key: "statistics",
    label: (
      <span className="gba:tabLabel">
        <BarChartOutlined className="gba:tabIcon" />
        Statistics
      </span>
    ),
  },
];

export const AbsenceHub = (props: BusinessAppContextProps) => {
  const [activeTab, setActiveTab] = useState("calendar");
  const [activeFilter, setActiveFilter] = useState("All");
  const filterOptions = [
    "All",
    "Sick Leave",
    "Vacation",
    "Special Leave",
    "Work Leave",
  ];

  const onChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div className="gba:container">
      <div className="gba:header">
        <div className="gba:font-bold gba:text-2xl">Absence Overview</div>
        <div className="gba:text-gray-500">View and manage your absences</div>
      </div>

      <div className="gba:tabsContainer">
        <Tabs
          activeKey={activeTab}
          items={items}
          onChange={onChange}
          className="gba:tabs"
          type="card"
        />
      </div>

      <div className="gba:content">
        {activeTab === "statistics" ? (
          <StatisticsTab />
        ) : (
          <>
            <div className="gba:calendarContainer">
            {activeTab === "calendar" && (
              <>
                <div className="gba:filters">
                  {filterOptions.map((filter) => (
                    <Button
                      key={filter}
                      type={activeFilter === filter ? "primary" : "default"}
                      className="gba:filterButton"
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </Button>
                ))}
              </div>
              <AbsenceCalendar
                accessToken={props.accessToken}
                userInfo={props.userInfo}
                showIconTitle={false}
                showTabsSwitch={false}
              />
            </>
          )}
          {activeTab === "absence-list" && (
            <div className="gba:absenceList">
              <h3 className="gba:absenceListTitle">Absence History</h3>
              <div className="gba:absenceListCards">
                {absenceList.length > 0 ? (
                  absenceList.map((absence, idx) => (
                    <AbsenceListCard key={idx} absence={absence} />
                  ))
                ) : (
                  <div
                    className="gba:absenceListEmpty"
                    data-testid="absence-list-empty"
                  >
                    No absences found.
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "entitlements" && (
            <div className="gba:entitlementsList">
              {entitlements.map((ent, idx) => (
                <EntitlementCard key={idx} entitlement={ent} />
              ))}
            </div>
          )}
        </div>
        {activeTab !== "entitlements" && (
          <div className="gba:sidebar">
            <div className="gba:cardsContainer">
              <div className="gba:timeOffBalanceCard">
                <h3 className="gba:cardTitle">Time Off Balance</h3>
                <div className="gba:statsGrid">
                  {stats.map((stat, index) => (
                    <StatsCard key={index} stat={stat} />
                  ))}
                </div>
              </div>
              <div className="gba:timeOffBalanceCard">
                <h3 className="gba:cardTitle">Upcoming Time Off</h3>
                <div className="gba:upcomingList">
                  {upcomingAbsences.map((absence) => (
                    <UpcomingAbsenceCard key={absence.id} absence={absence} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default AbsenceHub;
