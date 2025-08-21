import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PageLayout,
  Card,
  Separator,
} from "@newwork/nw-design-system";
import {
  Calendar,
  List,
  BarChart3,
  Paperclip,
  ChevronDown,
  TrendingUp,
  Clock,
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
import { useState, useEffect, useCallback, useMemo } from "react";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import {
  GET_EMPLOYEE_ABSENCES,
  GET_EMPLOYEE_ENTITLEMENTS,
} from "./queries/graphql";
import { getAbsenceGroups } from "@/business-apps/hr/core/forms/create-new-absence/queries/getAbsenceGroups";
import dayjs from "dayjs";
import AbsenceTypeFilter from "./components/AbsenceTypeFilter";
import {
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel,
  getCatalogValue,
} from "@/common/utils/windowUtils";
import { PiCalendarBlank } from "react-icons/pi";
import { startProcess } from "@/common/utils/start-process";

export const PersonalAbsences = (props: BusinessAppContextProps) => {
  const [activeTab, setActiveTab] = useState("calendar");
  const year = dayjs().year();
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
            type: absence.type ? getCatalogValue(absence.type) || "" : "",
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
            title: absence.type ? getCatalogValue(absence.type) || "" : "",
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
              type: a.type ? getCatalogValue(a.type) || "" : "",
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
              type: ent.type ? getCatalogValue(ent.type) || "" : "",
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
              title: ent.type ? getCatalogValue(ent.type) || "" : "",
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

  const filterOptions = useMemo(
    () => [
      "All",
      ...Array.from(new Set(absenceList.map((a) => a.type).filter(Boolean))),
    ],
    [absenceList]
  );

  const onChange = (key: string) => {
    setActiveTab(key);
  };

  const filteredAbsenceList = useMemo(
    () =>
      activeFilter === "All"
        ? absenceList
        : absenceList.filter((a) => a.type === activeFilter),
    [activeFilter, absenceList]
  );

  const paginatedAbsenceList = useMemo(
    () =>
      filteredAbsenceList.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [filteredAbsenceList, currentPage, pageSize]
  );

  const filteredStats = useMemo(
    () =>
      activeFilter === "All"
        ? stats
        : stats.filter((s) => s.title === activeFilter),
    [activeFilter, stats]
  );

  const filteredUpcomingAbsences = useMemo(
    () =>
      activeFilter === "All"
        ? upcomingAbsences
        : upcomingAbsences.filter((a) => a.type === activeFilter),
    [activeFilter, upcomingAbsences]
  );

  const getAbsenceGroupDisplayValue = useCallback((absenceGroup: any) => {
    const translation = absenceGroup.translations?.find(
      (t: any) => t.localeCode === getCurrentActiveUserLocale()
    );
    return translation?.value || absenceGroup.id;
  }, []);

  const getProcessNameForAbsenceGroup = useCallback(
    (absenceGroupId: string): string => {
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
    },
    [absenceGroups, getAbsenceGroupDisplayValue]
  );

  const handleCreateAbsence = useCallback(
    (absenceType: string) => {
      const processName = getProcessNameForAbsenceGroup(absenceType);

      startProcess({
        domain: "employee-time",
        processName: processName,
        payload: { employeeId: employeeId, absenceType: absenceType },
        builderType: "NATIVE_SCREEN",
      });
    },
    [getProcessNameForAbsenceGroup, employeeId]
  );

  const createAbsenceMenuItems = useCallback(() => {
    return absenceGroups.map((group) => ({
      key: group.id,
      label: getAbsenceGroupDisplayValue(group),
      onClick: () => handleCreateAbsence(group.id),
    }));
  }, [absenceGroups]);

  const viewOptions = [
    {
      key: "calendar",
      icon: <Calendar className="gba:w-4 gba:h-4" />,
      label: getTranslationFromI18nKeyAndLabel(
        "lowcoder:absence_hub.calendar",
        "Calendar"
      ),
    },
    {
      key: "absence-list",
      icon: <List className="gba:w-4 gba:h-4" />,
      label: getTranslationFromI18nKeyAndLabel(
        "lowcoder:absence_hub.absence_list",
        "Absence List"
      ),
    },
    {
      key: "entitlements",
      icon: <Paperclip className="gba:w-4 gba:h-4" />,
      label: getTranslationFromI18nKeyAndLabel(
        "lowcoder:absence_hub.entitlements",
        "Entitlements"
      ),
    },
    {
      key: "statistics",
      icon: <BarChart3 className="gba:w-4 gba:h-4" />,
      label: getTranslationFromI18nKeyAndLabel(
        "lowcoder:absence_hub.statistics",
        "Statistics"
      ),
    },
  ];

  const renderTabContent = useCallback(() => {
    if (loading) {
      return (
        <div className="gba:loading" data-testid="personal-absences-loading">
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:absence_hub.loading",
            "Loading..."
          )}
        </div>
      );
    }

    if (error) {
      return (
        <div className="gba:error" data-testid="personal-absences-error">
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:absence_hub.error_loading",
            "Failed to load absence data."
          )}
        </div>
      );
    }

    switch (activeTab) {
      case "statistics":
        return (
          <div className="layout-content gap-md" data-testid="personal-absences-statistics-container">
            {/* Header section */}
            <div className="gba:flex gba:items-center gba:justify-between gba:pb-6 gba:border-b">
              <div>
                <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.statistics_analytics",
                    "Statistics & Analytics"
                  )}
                </h2>
                <p className="gba:text-muted-foreground gba:mt-1">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.statistics_description",
                    "Analyze your absence patterns and usage trends"
                  )}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loadingAbsenceGroups || absenceGroups.length === 0}
                    data-testid="personal-absences-create-dropdown-statistics"
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
                    <DropdownMenuItem key={item.key} onClick={item.onClick}>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Statistics content */}
            <Card className="gba:p-6">
              <StatisticsTab absences={absenceList} />
            </Card>
          </div>
        );

      case "calendar":
        return (
          <div className="layout-content gap-md" data-testid="personal-absences-calendar-container">
            {/* Calendar header with filter and action */}
            <div className="gba:flex gba:items-center gba:justify-between gba:pb-6 gba:border-b">
              <div>
                <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.calendar_view",
                    "Calendar View"
                  )}
                </h2>
                <p className="gba:text-muted-foreground gba:mt-1">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.calendar_description",
                    "View and manage your absences in a calendar format"
                  )}
                </p>
              </div>
              <div className="gba:flex gba:items-center gba:gap-3">
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
                      variant="default"
                      disabled={
                        loadingAbsenceGroups || absenceGroups.length === 0
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
                      <DropdownMenuItem key={item.key} onClick={item.onClick}>
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Calendar and sidebar layout */}
            <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-4 gba:gap-6">
              {/* Main calendar */}
              <div className="lg:gba:col-span-3">
                <Card className="gba:p-6">
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
                </Card>
              </div>

              {/* Sidebar */}
              <div className="gba:space-y-6" data-testid="personal-absences-sidebar">
                {/* Time Off Balance */}
                <Card className="gba:p-6">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                    <TrendingUp className="gba:w-5 gba:h-5 gba:text-primary" />
                    <h3 className="gba:font-semibold gba:text-lg gba:text-foreground" data-testid="personal-absences-timeoff-balance-title">
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:absence_hub.time_off_balance",
                        "Time Off Balance"
                      )}
                    </h3>
                  </div>
                  <div className="gba:space-y-3" data-testid="personal-absences-stats-grid">
                    {filteredStats.map((stat, index) => (
                      <StatsCard key={index} stat={stat} />
                    ))}
                  </div>
                </Card>

                {/* Upcoming Time Off */}
                <Card className="gba:p-6">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                    <Clock className="gba:w-5 gba:h-5 gba:text-primary" />
                    <h3 className="gba:font-semibold gba:text-lg gba:text-foreground" data-testid="personal-absences-upcoming-title">
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:absence_hub.upcoming_time_off",
                        "Upcoming Time Off"
                      )}
                    </h3>
                  </div>
                  <div className="gba:space-y-3" data-testid="personal-absences-upcoming-list">
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
                      <div className="gba:text-center gba:py-6 gba:text-muted-foreground" data-testid="upcoming-absence-empty">
                        <Clock className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
                        <p className="gba:text-sm">
                          {getTranslationFromI18nKeyAndLabel(
                            "lowcoder:absence_hub.no_upcoming_absences",
                            "No upcoming absences"
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        );

      case "absence-list":
        return (
          <div className="layout-content gap-md" data-testid="personal-absences-absence-list-container">
            {/* Header section */}
            <div className="gba:flex gba:items-center gba:justify-between gba:pb-6 gba:border-b">
              <div>
                <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.absence_history",
                    "Absence History"
                  )}
                </h2>
                <p className="gba:text-muted-foreground gba:mt-1">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.absence_list_description",
                    "View all your absence requests and their current status"
                  )}
                </p>
              </div>
              <div className="gba:flex gba:items-center gba:gap-3">
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
                      variant="default"
                      disabled={
                        loadingAbsenceGroups || absenceGroups.length === 0
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
                      <DropdownMenuItem key={item.key} onClick={item.onClick}>
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Main content layout */}
            <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-4 gba:gap-6">
              {/* Absence list */}
              <div className="lg:gba:col-span-3">
                <Card className="gba:p-6">
                  {filteredAbsenceList.length > 0 ? (
                    <div className="gba:space-y-4" data-testid="personal-absences-absence-list-cards">
                      {paginatedAbsenceList.map((absence, idx) => (
                        <AbsenceListCard
                          key={idx + (currentPage - 1) * pageSize}
                          absence={absence}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="gba:text-center gba:py-12" data-testid="personal-absences-absence-list-empty">
                      <List className="gba:w-16 gba:h-16 gba:mx-auto gba:mb-4 gba:text-muted-foreground" />
                      <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">
                        {getTranslationFromI18nKeyAndLabel(
                          "lowcoder:absence_hub.no_absences_title",
                          "No Absences Found"
                        )}
                      </h3>
                      <p className="gba:text-muted-foreground gba:max-w-md gba:mx-auto">
                        {getTranslationFromI18nKeyAndLabel(
                          "lowcoder:absence_hub.no_absences_found",
                          "You haven't submitted any absence requests yet."
                        )}
                      </p>
                    </div>
                  )}
                  
                  {/* Pagination */}
                  {filteredAbsenceList.length > pageSize && (
                    <>
                      <Separator className="gba:my-6" />
                      <div className="gba:flex gba:items-center gba:justify-between" data-testid="personal-absences-absence-list-pagination">
                        <div className="gba:text-sm gba:text-muted-foreground">
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
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage(Math.max(1, currentPage - 1))
                            }
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={
                              currentPage * pageSize >= filteredAbsenceList.length
                            }
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </div>

              {/* Sidebar - same as calendar */}
              <div className="gba:space-y-6" data-testid="personal-absences-sidebar">
                {/* Time Off Balance */}
                <Card className="gba:p-6">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                    <TrendingUp className="gba:w-5 gba:h-5 gba:text-primary" />
                    <h3 className="gba:font-semibold gba:text-lg gba:text-foreground" data-testid="personal-absences-timeoff-balance-title">
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:absence_hub.time_off_balance",
                        "Time Off Balance"
                      )}
                    </h3>
                  </div>
                  <div className="gba:space-y-3" data-testid="personal-absences-stats-grid">
                    {filteredStats.map((stat, index) => (
                      <StatsCard key={index} stat={stat} />
                    ))}
                  </div>
                </Card>

                {/* Upcoming Time Off */}
                <Card className="gba:p-6">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                    <Clock className="gba:w-5 gba:h-5 gba:text-primary" />
                    <h3 className="gba:font-semibold gba:text-lg gba:text-foreground" data-testid="personal-absences-upcoming-title">
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:absence_hub.upcoming_time_off",
                        "Upcoming Time Off"
                      )}
                    </h3>
                  </div>
                  <div className="gba:space-y-3" data-testid="personal-absences-upcoming-list">
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
                      <div className="gba:text-center gba:py-6 gba:text-muted-foreground" data-testid="upcoming-absence-empty">
                        <Clock className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
                        <p className="gba:text-sm">
                          {getTranslationFromI18nKeyAndLabel(
                            "lowcoder:absence_hub.no_upcoming_absences",
                            "No upcoming absences"
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        );

      case "entitlements":
        return (
          <div className="layout-content gap-md" data-testid="personal-absences-entitlements-container">
            {/* Header section */}
            <div className="gba:flex gba:items-center gba:justify-between gba:pb-6 gba:border-b">
              <div>
                <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.your_entitlements",
                    "Your Entitlements"
                  )}
                </h2>
                <p className="gba:text-muted-foreground gba:mt-1">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.entitlements_description",
                    `Track your leave balances and usage for ${year}`
                  )}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loadingAbsenceGroups || absenceGroups.length === 0}
                    data-testid="personal-absences-create-dropdown-entitlements"
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
                    <DropdownMenuItem key={item.key} onClick={item.onClick}>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Entitlements grid */}
            {entitlements.length === 0 ? (
              <div className="gba:text-center gba:py-12" data-testid="entitlements-empty-state">
                <div className="gba:w-16 gba:h-16 gba:mx-auto gba:mb-4 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
                  <Paperclip className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
                </div>
                <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.no_entitlements_title",
                    "No Entitlements Found"
                  )}
                </h3>
                <p className="gba:text-muted-foreground gba:max-w-md gba:mx-auto">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:absence_hub.no_entitlements_description",
                    "Your absence entitlements will appear here once they are configured by your HR team."
                  )}
                </p>
              </div>
            ) : (
              <div 
                className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-6"
                data-testid="personal-absences-entitlements-grid"
              >
                {entitlements.map((ent, idx) => (
                  <EntitlementCard key={`${ent.type}-${idx}`} entitlement={ent} />
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }, [
    loading,
    error,
    activeTab,
    absenceList,
    filterOptions,
    activeFilter,
    setActiveFilter,
    setCurrentPage,
    loadingAbsenceGroups,
    absenceGroups.length,
    createAbsenceMenuItems,
    props.accessToken,
    props.userInfo,
    filteredAbsenceList,
    paginatedAbsenceList,
    currentPage,
    pageSize,
    entitlements,
    filteredStats,
    filteredUpcomingAbsences,
  ]);

  return (
    <div data-testid="personal-absences-container">
      <PageLayout
        headerIcon={
          <PiCalendarBlank
            className="gba:w-6 gba:h-6"
            style={{ color: "#a3519aff" }}
          />
        }
        headerTitle={getTranslationFromI18nKeyAndLabel(
          "lowcoder:hr_absences.absence_overview",
          "Absence Overview"
        )}
        headerSubViews={{
          value: activeTab,
          onValueChange: onChange,
          items: viewOptions.map((option) => ({
            value: option.key,
            label: option.label,
            icon: option.icon,
          })),
        }}
        className="gba:min-h-screen"
      >
        <div
          className="gba:h-full gba:overflow-auto gba:p-4"
          data-testid="personal-absences-content"
        >
          {renderTabContent()}
        </div>
      </PageLayout>
    </div>
  );
};

export default PersonalAbsences;
