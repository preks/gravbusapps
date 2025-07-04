import { Tabs } from "antd";
import {
  CalendarOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import { StatsCard } from "./components/StatsCard";
import { UpcomingAbsenceCard } from "./components/UpcomingAbsenceCard";
import AbsenceListCard from "./components/AbsenceListCard";
import type {
  AbsenceItem,
  StatItem,
  AbsenceListCardAbsence,
} from "./types/absenceTypes";
import AbsenceCalendar from "../AbsenceCalendar";
import EntitlementCard from "./components/EntitlementCard";
import StatisticsTab from "./components/StatisticsTab";
import type { Entitlement } from "./types/entitlementTypes";
import { BusinessAppContextProps } from "../../../../../common/BusinessAppContext";
import { useState, useEffect } from "react";
import { useGraphqlClient } from "../../../../../common/network/graphql/useGraphQLClient";
import {
  GET_EMPLOYEE_ABSENCES,
  GET_EMPLOYEE_ENTITLEMENTS,
} from "./queries/graphql";
import dayjs from "dayjs";
import { Pagination } from "antd";
import AbsenceTypeFilter from "./components/AbsenceTypeFilter";
import {
  formatDate,
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel,
  getCatalogValue,
} from "@/common/utils/windowUtils";

export const AbsenceHub = (props: BusinessAppContextProps) => {
  const [activeTab, setActiveTab] = useState("calendar");
  const [activeFilter, setActiveFilter] = useState("All");
  const [absenceList, setAbsenceList] = useState<AbsenceListCardAbsence[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [upcomingAbsences, setUpcomingAbsences] = useState<AbsenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { accessToken, userInfo } = props;
  const employeeId = userInfo?.employeeDetails?.employeeId;
  const client = useGraphqlClient(accessToken);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      client.request(GET_EMPLOYEE_ABSENCES, {
        employeeId,
        activeUserLocale: getCurrentActiveUserLocale(),
      }),
      client.request(GET_EMPLOYEE_ENTITLEMENTS, {
        employeeId,
        activeUserLocale: getCurrentActiveUserLocale(),
      }),
    ])
      .then(([absenceRes, entitlementRes]) => {
        const absences = absenceRes?.EmployeeAbsence || [];

        setAbsenceList(
          absences.map((absence: any) => ({
            type: getCatalogValue(absence.type) || "",
            status: (() => {
              switch ((absence.status || "").toUpperCase()) {
                case "PENDING":
                  return getTranslationFromI18nKeyAndLabel(
                    "lowcoder:expense_statuses.action_required",
                    "Action Required"
                  );
                case "APPROVED":
                  return getTranslationFromI18nKeyAndLabel(
                    "lowcoder:expense_statuses.approved",
                    "Approved"
                  );
                case "REJECTED":
                  return getTranslationFromI18nKeyAndLabel(
                    "lowcoder:expense_statuses.rejected",
                    "Rejected"
                  );
                case "CANCELLED":
                  return getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absences_overview_entry_screen.cancelled_status",
                    "Cancelled"
                  );
                default:
                  return absence.status;
              }
            })(),
            title: getCatalogValue(absence.type) || "",
            startDate: absence.startDate,
            endDate: absence.endDate,
            duration: absence.workingDays
              ? `${absence.workingDays} ${
                  absence.workingDays === 1 ? "day" : "days"
                }`
              : "",
            description: absence.description || "",
            icon: (
              <PaperClipOutlined
                style={{
                  color: absence.type?.objectValue?.color
                    ? `#${absence.type.objectValue.color}`
                    : "#1976d2",
                }}
              />
            ),
            typeColor: absence.type?.objectValue?.color
              ? absence.type.objectValue.color
              : "blue",
            statusColor: (() => {
              switch ((absence.status || "").toLowerCase()) {
                case "pending":
                  return "rgba(255, 158, 2, 0.55)";
                case "approved":
                  return "rgba(13, 188, 123, 0.55)";
                case "rejected":
                  return "rgba(222, 29, 73, 0.55)";
                case "cancelled":
                  return "rgba(141, 145, 153, 0.55)";
                default:
                  return "rgba(141, 145, 153, 0.55)";
              }
            })(),
            requestDate: absence.createdAt,
          }))
        );

        setUpcomingAbsences(
          absences
            .filter((a: any) => dayjs(a.startDate).isAfter(dayjs()))
            .map((a: any, idx: number) => ({
              id: a.id || idx,
              type: getCatalogValue(a.type),
              icon: <PaperClipOutlined style={{ color: "#1976d2" }} />,
              dates: `${formatDate(a.startDate, "date.long")} - ${formatDate(
                a.endDate,
                "date.long"
              )}`,
              description: a.description,
              timeUntil: (() => {
                const days = dayjs(a.startDate).diff(dayjs(), "day");
                if (days === 0) return "Today";
                if (days === 1) return "Tomorrow";
                if (days < 0) return "Started";
                return `In ${days} days`;
              })(),
              bgColor: a.type?.objectValue?.color,
            }))
        );

        setEntitlements(
          (entitlementRes?.EmployeeAbsenceEntitlement || []).map(
            (ent: any) => ({
              type: getCatalogValue(ent.type),
              color: ent.type?.objectValue?.color || "blue",
              used: ent.approved,
              total: ent.total,
              pending: ent.pending,
              available: ent.available,
              icon: (
                <PaperClipOutlined
                  style={{
                    color: ent.type?.objectValue?.color
                      ? `#${ent.type.objectValue.color}`
                      : "#1976d2",
                  }}
                />
              ),
              checkEntitlement: ent.type?.objectValue?.checkEntitlement,
            })
          )
        );

        setStats(
          (entitlementRes?.EmployeeAbsenceEntitlement || []).map(
            (ent: any) => ({
              title: getCatalogValue(ent.type),
              used: ent.approved,
              total: ent.total,
              progress: ent.total
                ? Math.round((ent.approved / ent.total) * 100)
                : 0,
              icon: <PaperClipOutlined style={{ color: "#1976d2" }} />,
              color: ent.type?.objectValue?.color,
              textColor: ent.type?.objectValue?.color,
              daysLeft: ent.available,
              checkEntitlement: ent.type?.objectValue?.checkEntitlement,
            })
          )
        );
      })
      .catch(() => setError("Failed to load absence data."))
      .finally(() => setLoading(false));
  }, [employeeId, accessToken]);

  const filterOptions = [
    "All",
    ...Array.from(new Set(absenceList.map((a) => a.type).filter(Boolean))),
  ];

  const onChange = (key: string) => {
    setActiveTab(key);
  };

  const filteredAbsenceList =
    activeFilter === "All"
      ? absenceList
      : absenceList.filter((a) => a.type === activeFilter);

  const paginatedAbsenceList = filteredAbsenceList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const filteredStats =
    activeFilter === "All"
      ? stats
      : stats.filter((s) => s.title === activeFilter);

  const filteredUpcomingAbsences =
    activeFilter === "All"
      ? upcomingAbsences
      : upcomingAbsences.filter((a) => a.type === activeFilter);

  return (
    <div className="gba:absence-container" data-testid="absencehub-container">
      <div className="gba:absence-header" data-testid="absencehub-header">
        <div
          className="gba:font-bold gba:text-2xl"
          data-testid="absencehub-title"
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:hr_absences.absence_overview",
            "Absence Overview"
          )}
        </div>
        <div
          className="gba:text-gray-500 gba:text-lg"
          data-testid="absencehub-description"
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:absence_hub.absence_description",
            "View and manage your absences"
          )}
        </div>
      </div>

      <div
        className="gba:tabsContainer"
        data-testid="absencehub-tabs-container"
      >
        <Tabs
          activeKey={activeTab}
          data-testid="absencehub-tabs"
          items={[
            {
              key: "calendar",
              label: (
                <span className="gba:tabLabel">
                  <CalendarOutlined className="gba:tabIcon" />
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.calendar",
                    "Calendar"
                  )}
                </span>
              ),
            },
            {
              key: "absence-list",
              label: (
                <span className="gba:tabLabel">
                  <UnorderedListOutlined className="gba:tabIcon" />
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.absence_list",
                    "Absence List"
                  )}
                </span>
              ),
            },
            {
              key: "entitlements",
              label: (
                <span className="gba:tabLabel">
                  <PaperClipOutlined className="gba:tabIcon" />
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.entitlements",
                    "Entitlements"
                  )}
                </span>
              ),
            },
            {
              key: "statistics",
              label: (
                <span className="gba:tabLabel">
                  <BarChartOutlined className="gba:tabIcon" />
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.statistics",
                    "Statistics"
                  )}
                </span>
              ),
            },
          ]}
          onChange={onChange}
          className="gba:tabs"
          type="card"
        />
      </div>

      <div className="gba:content" data-testid="absencehub-content">
        {loading && (
          <div className="gba:loading" data-testid="absencehub-loading">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.loading",
              "Loading..."
            )}
          </div>
        )}
        {error && (
          <div className="gba:error" data-testid="absencehub-error">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.error_loading",
              "Failed to load absence data."
            )}
          </div>
        )}
        {!loading && !error && (
          <>
            {activeTab === "statistics" && (
              <StatisticsTab absences={absenceList} />
            )}
            {activeTab !== "statistics" && (
              <>
                <div
                  className="gba:calendarContainer"
                  data-testid="absencehub-calendar-container"
                >
                  {activeTab === "calendar" && (
                    <>
                      <AbsenceTypeFilter
                        filterOptions={filterOptions}
                        activeFilter={activeFilter}
                        onFilterChange={(filter) => {
                          setActiveFilter(filter);
                          setCurrentPage(1);
                        }}
                      />
                      <AbsenceCalendar
                        accessToken={props.accessToken}
                        userInfo={props.userInfo}
                        showIconTitle={false}
                        showTabsSwitch={false}
                        filterOptions={filterOptions}
                        activeFilter={activeFilter}
                        onFilterChange={(filter) => {
                          setActiveFilter(filter);
                          setCurrentPage(1);
                        }}
                      />
                    </>
                  )}
                  {activeTab === "absence-list" && (
                    <div
                      className="gba:absenceList"
                      data-testid="absencehub-absence-list"
                    >
                      <AbsenceTypeFilter
                        filterOptions={filterOptions}
                        activeFilter={activeFilter}
                        onFilterChange={(filter) => {
                          setActiveFilter(filter);
                          setCurrentPage(1);
                        }}
                      />
                      <h3
                        className="gba:absenceListTitle"
                        data-testid="absencehub-absence-history-title"
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          "lowcoder:absence_hub.absence_history",
                          "Absence History"
                        )}
                      </h3>
                      <div
                        className="gba:absenceListCards"
                        data-testid="absencehub-absence-list-cards"
                      >
                        {filteredAbsenceList.length > 0 ? (
                          paginatedAbsenceList.map((absence, idx) => (
                            <AbsenceListCard
                              key={idx + (currentPage - 1) * pageSize}
                              absence={absence}
                            />
                          ))
                        ) : (
                          <div
                            className="gba:absenceListEmpty"
                            data-testid="absencehub-absence-list-empty"
                          >
                            {getTranslationFromI18nKeyAndLabel(
                              "lowcoder:absence_hub.no_absences_found",
                              "No absences found."
                            )}
                          </div>
                        )}
                      </div>
                      {filteredAbsenceList.length > pageSize && (
                        <div
                          className="gba:absenceListPagination"
                          data-testid="absencehub-absence-list-pagination"
                          style={{
                            marginTop: 24,
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          <Pagination
                            current={currentPage}
                            pageSize={pageSize}
                            total={filteredAbsenceList.length}
                            showSizeChanger
                            pageSizeOptions={["10", "20", "50"]}
                            onChange={(page: number, size?: number) => {
                              setCurrentPage(page);
                              if (size) setPageSize(size);
                            }}
                            showTotal={(
                              total: number,
                              range: [number, number]
                            ) =>
                              getTranslationFromI18nKeyAndLabel(
                                "lowcoder:absence_hub.pagination",
                                "{{range0}}-{{range1}} of {{total}}",
                                { range0: range[0], range1: range[1], total }
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "entitlements" && (
                    <div
                      className="gba:entitlementsList"
                      data-testid="absencehub-entitlements-list"
                    >
                      {entitlements.map((ent, idx) => (
                        <EntitlementCard key={idx} entitlement={ent} />
                      ))}
                    </div>
                  )}
                </div>
                {activeTab !== "entitlements" && (
                  <div className="gba:sidebar" data-testid="absencehub-sidebar">
                    <div
                      className="gba:cardsContainer"
                      data-testid="absencehub-cards-container"
                    >
                      <div className="gba:timeOffBalanceCard">
                        <h3
                          className="gba:cardTitle"
                          data-testid="absencehub-timeoff-balance-title"
                        >
                          {getTranslationFromI18nKeyAndLabel(
                            "lowcoder:absence_hub.time_off_balance",
                            "Time Off Balance"
                          )}
                        </h3>
                        <div
                          className="gba:statsGrid"
                          data-testid="absencehub-stats-grid"
                        >
                          {filteredStats.map((stat, index) => (
                            <StatsCard key={index} stat={stat} />
                          ))}
                        </div>
                      </div>
                      <div className="gba:timeOffBalanceCard">
                        <h3
                          className="gba:cardTitle"
                          data-testid="absencehub-upcoming-title"
                        >
                          {getTranslationFromI18nKeyAndLabel(
                            "lowcoder:absence_hub.upcoming_time_off",
                            "Upcoming Time Off"
                          )}
                        </h3>
                        <div
                          className="gba:upcomingList"
                          data-testid="absencehub-upcoming-list"
                        >
                          {filteredUpcomingAbsences.length > 0 ? (
                            filteredUpcomingAbsences
                              .slice(0, 5)
                              .map((absence) => (
                                <UpcomingAbsenceCard
                                  key={absence.id}
                                  absence={absence}
                                />
                              ))
                          ) : (
                            <div
                              className="gba:absenceListEmpty"
                              data-testid="upcoming-absence-empty"
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                "lowcoder:absence_hub.no_upcoming_absences",
                                "No upcoming absences"
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AbsenceHub;
