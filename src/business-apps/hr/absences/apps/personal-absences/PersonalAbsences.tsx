import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@newwork/nw-design-system";
import {
  Calendar,
  List,
  BarChart3,
  Paperclip,
  ChevronDown,
} from "lucide-react";
import { StatsCard } from "./components/StatsCard";
import { UpcomingAbsenceCard } from "./components/UpcomingAbsenceCard";
import AbsenceListCard from "./components/AbsenceListCard";
import type {
  AbsenceItem,
  StatItem,
  AbsenceListCardAbsence,
} from "./types/absenceTypes";
import AbsenceCalendar from "./components/absence-calendar/AbsenceCalendar";
import EntitlementCard from "./components/EntitlementCard";
import StatisticsTab from "./components/StatisticsTab";
import type { Entitlement } from "./types/entitlementTypes";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useState, useEffect } from "react";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import {
  GET_EMPLOYEE_ABSENCES,
  GET_EMPLOYEE_ENTITLEMENTS,
} from "./queries/graphql";
import { getAbsenceGroups } from "@/business-apps/hr/core/forms/create-new-absence/queries/getAbsenceGroups";
import dayjs from "dayjs";
import AbsenceTypeFilter from "./components/AbsenceTypeFilter";
import {
  formatDate,
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel,
  getCatalogValue,
} from "@/common/utils/windowUtils";
import { PiCalendarBlank } from "react-icons/pi";
import { startProcess } from "@/common/utils/start-process";

export const PersonalAbsences = (props: BusinessAppContextProps) => {
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
  const [absenceGroups, setAbsenceGroups] = useState<any[]>([]);
  const [loadingAbsenceGroups, setLoadingAbsenceGroups] = useState(false);

  const { accessToken, userInfo } = props;
  const employeeId = userInfo?.employeeDetails?.employeeId;
  const client = useGraphqlClient(accessToken);

  useEffect(() => {
    const fetchAbsenceGroups = async () => {
      if (!accessToken) return;

      setLoadingAbsenceGroups(true);
      try {
        const result = await client.request(getAbsenceGroups, {
          activeUserLocale: getCurrentActiveUserLocale(),
        });
        setAbsenceGroups(result?.CatalogEntry || []);
      } catch (error) {
        console.error("Failed to fetch absence groups:", error);
      } finally {
        setLoadingAbsenceGroups(false);
      }
    };

    fetchAbsenceGroups();
  }, [accessToken, client]);

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
              <Paperclip
                className="gba:w-4 gba:h-4"
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
              icon: (
                <Paperclip
                  className="gba:w-4 gba:h-4"
                  style={{ color: "#1976d2" }}
                />
              ),
              dates: `${dayjs(a.startDate).format("MM/DD/YYYY")} - ${dayjs(
                a.endDate
              ).format("MM/DD/YYYY")}`,
              description: a.description,
              timeUntil: (() => {
                const days = dayjs(a.startDate).diff(dayjs(), "day");
                if (days === 0) return "Today";
                if (days === 1) return "Tomorrow";
                if (days < 0) return "Started";
                return `in ${days} days`;
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
                <Paperclip
                  className="gba:w-4 gba:h-4"
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
              icon: (
                <Paperclip
                  className="gba:w-4 gba:h-4"
                  style={{ color: "#1976d2" }}
                />
              ),
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

  const getProcessNameForAbsenceGroup = (absenceGroupId: string): string => {
    const processMapping: { [key: string]: string } = {
      "sick-leave": "createEmployeeSickLeave",
      "special-leave": "createEmployeeSpecialLeave",
      vacation: "createEmployeeVacation",
      "work-leave": "createEmployeeWorkLeave",
    };

    const absenceGroup = absenceGroups.find(
      (group) => group.id === absenceGroupId
    );
    if (absenceGroup) {
      const displayName =
        getAbsenceGroupDisplayValue(absenceGroup).toLowerCase();

      if (displayName.includes("sick") || displayName.includes("illness")) {
        return "createEmployeeSickLeave";
      } else if (
        displayName.includes("special") ||
        displayName.includes("personal")
      ) {
        return "createEmployeeSpecialLeave";
      } else if (
        displayName.includes("vacation") ||
        displayName.includes("holiday") ||
        displayName.includes("annual")
      ) {
        return "createEmployeeVacation";
      } else if (
        displayName.includes("work") ||
        displayName.includes("training") ||
        displayName.includes("conference")
      ) {
        return "createEmployeeWorkLeave";
      }
    }

    return processMapping[absenceGroupId] || "createEmployeeVacation";
  };

  const handleCreateAbsence = (absenceType: string) => {
    const processName = getProcessNameForAbsenceGroup(absenceType);

    startProcess({
      domain: "employee-time",
      processName: processName,
      payload: { employeeId: employeeId, absenceType: absenceType },
      builderType: "NATIVE_SCREEN",
    });
  };

  const getAbsenceGroupDisplayValue = (absenceGroup: any) => {
    const translation = absenceGroup.translations?.find(
      (t: any) => t.localeCode === getCurrentActiveUserLocale()
    );
    return translation?.value || absenceGroup.id;
  };

  const createAbsenceMenuItems = () => {
    return absenceGroups.map((group) => ({
      key: group.id,
      label: getAbsenceGroupDisplayValue(group),
      onClick: () => handleCreateAbsence(group.id),
    }));
  };

  return (
    <div
      className="gba:absence-container"
      data-testid="personal-absences-container"
    >
      <div
        className="gba:absence-header"
        data-testid="personal-absences-header"
      >
        <div
          className="gba:font-bold gba:text-2xl gba:flex gba:items-center gba:gap-x-2"
          data-testid="personal-absences-title"
        >
          <PiCalendarBlank color="#a3519aff" />
          <span>
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_absences.absence_overview",
              "Absence Overview"
            )}
          </span>
        </div>
      </div>

      <div data-testid="personal-absences-tabs-container">
        <Tabs
          value={activeTab}
          onValueChange={onChange}
          data-testid="personal-absences-tabs"
        >
          <TabsList>
            <TabsTrigger value="calendar">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:absence_hub.calendar",
                  "Calendar"
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="absence-list">
              <div className="gba:flex gba:items-center gba:gap-2">
                <List className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:absence_hub.absence_list",
                  "Absence List"
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="entitlements">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Paperclip className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:absence_hub.entitlements",
                  "Entitlements"
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="statistics">
              <div className="gba:flex gba:items-center gba:gap-2">
                <BarChart3 className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:absence_hub.statistics",
                  "Statistics"
                )}
              </div>
            </TabsTrigger>
          </TabsList>

          <div className="gba:w-full" data-testid="personal-absences-content">
            {loading && (
              <div
                className="gba:loading"
                data-testid="personal-absences-loading"
              >
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:absence_hub.loading",
                  "Loading..."
                )}
              </div>
            )}
            {error && (
              <div className="gba:error" data-testid="personal-absences-error">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:absence_hub.error_loading",
                  "Failed to load absence data."
                )}
              </div>
            )}
            {!loading && !error && (
              <>
                <TabsContent value="statistics">
                  <StatisticsTab absences={absenceList} />
                </TabsContent>

                <div className="gba:flex gba:gap-6 gba:w-full">
                  <div className="gba:flex-1 gba:min-w-0">
                    <TabsContent value="calendar">
                      <div
                        className="gba:calendarContainer"
                        data-testid="personal-absences-calendar-container"
                      >
                        <div
                          className="gba:flex gba:items-center gba:justify-between gba:mb-4"
                          data-testid="absence-type-filter-row"
                        >
                          <AbsenceTypeFilter
                            filterOptions={filterOptions}
                            activeFilter={activeFilter}
                            onFilterChange={(filter) => {
                              setActiveFilter(filter);
                              setCurrentPage(1);
                            }}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                disabled={
                                  loadingAbsenceGroups ||
                                  absenceGroups.length === 0
                                }
                                data-testid="personal-absences-create-dropdown-calendar"
                              >
                                {getTranslationFromI18nKeyAndLabel(
                                  "absence.create",
                                  "Create Absence",
                                  getCurrentActiveUserLocale()
                                )}
                                <ChevronDown className="gba:ml-2 gba:h-4 gba:w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {createAbsenceMenuItems().map((item) => (
                                <DropdownMenuItem
                                  key={item.key}
                                  onClick={item.onClick}
                                >
                                  {item.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
                      </div>
                    </TabsContent>
                    <TabsContent value="absence-list">
                      <div
                        className="gba:absenceList"
                        data-testid="personal-absences-absence-list"
                      >
                        <div
                          className="gba:flex gba:items-center gba:justify-between gba:mb-4"
                          data-testid="absence-type-filter-row"
                        >
                          <AbsenceTypeFilter
                            filterOptions={filterOptions}
                            activeFilter={activeFilter}
                            onFilterChange={(filter) => {
                              setActiveFilter(filter);
                              setCurrentPage(1);
                            }}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                disabled={
                                  loadingAbsenceGroups ||
                                  absenceGroups.length === 0
                                }
                                data-testid="personal-absences-create-dropdown-list"
                              >
                                {getTranslationFromI18nKeyAndLabel(
                                  "absence.create",
                                  "Create Absence",
                                  getCurrentActiveUserLocale()
                                )}
                                <ChevronDown className="gba:ml-2 gba:h-4 gba:w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {createAbsenceMenuItems().map((item) => (
                                <DropdownMenuItem
                                  key={item.key}
                                  onClick={item.onClick}
                                >
                                  {item.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <h3
                          className="gba:absenceListTitle"
                          data-testid="personal-absences-absence-history-title"
                        >
                          {getTranslationFromI18nKeyAndLabel(
                            "lowcoder:absence_hub.absence_history",
                            "Absence History"
                          )}
                        </h3>
                        <div
                          className="gba:absenceListCards"
                          data-testid="personal-absences-absence-list-cards"
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
                              data-testid="personal-absences-absence-list-empty"
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
                            data-testid="personal-absences-absence-list-pagination"
                            style={{
                              marginTop: 24,
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <div className="gba:flex gba:items-center gba:gap-4">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  setCurrentPage(Math.max(1, currentPage - 1))
                                }
                                disabled={currentPage === 1}
                              >
                                Previous
                              </Button>
                              <span className="gba:text-sm gba:text-gray-600">
                                {getTranslationFromI18nKeyAndLabel(
                                  "lowcoder:absence_hub.pagination",
                                  "{{range0}}-{{range1}} of {{total}}",
                                  {
                                    range0: (currentPage - 1) * pageSize + 1,
                                    range1: Math.min(
                                      currentPage * pageSize,
                                      filteredAbsenceList.length
                                    ),
                                    total: filteredAbsenceList.length,
                                  }
                                )}
                              </span>
                              <Button
                                variant="outline"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={
                                  currentPage * pageSize >=
                                  filteredAbsenceList.length
                                }
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="entitlements">
                      <div
                        className="gba:entitlementsList"
                        data-testid="personal-absences-entitlements-list"
                      >
                        {entitlements.map((ent, idx) => (
                          <EntitlementCard key={idx} entitlement={ent} />
                        ))}
                      </div>
                    </TabsContent>
                  </div>

                  {activeTab !== "entitlements" &&
                    activeTab !== "statistics" && (
                      <div
                        className="gba:sidebar gba:w-80 gba:flex-shrink-0"
                        data-testid="personal-absences-sidebar"
                      >
                        <div
                          className="gba:cardsContainer"
                          data-testid="personal-absences-cards-container"
                        >
                          <div className="gba:timeOffBalanceCard">
                            <h3
                              className="gba:cardTitle"
                              data-testid="personal-absences-timeoff-balance-title"
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                "lowcoder:absence_hub.time_off_balance",
                                "Time Off Balance"
                              )}
                            </h3>
                            <div
                              className="gba:statsGrid"
                              data-testid="personal-absences-stats-grid"
                            >
                              {filteredStats.map((stat, index) => (
                                <StatsCard key={index} stat={stat} />
                              ))}
                            </div>
                          </div>
                          <div className="gba:timeOffBalanceCard">
                            <h3
                              className="gba:cardTitle"
                              data-testid="personal-absences-upcoming-title"
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                "lowcoder:absence_hub.upcoming_time_off",
                                "Upcoming Time Off"
                              )}
                            </h3>
                            <div
                              className="gba:upcomingList"
                              data-testid="personal-absences-upcoming-list"
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
                </div>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default PersonalAbsences;
