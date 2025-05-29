import React, { useEffect, useState } from "react";
import { Card, Typography, Tooltip } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { RiBarChartLine, RiPieChart2Line, RiMedalLine } from "@remixicon/react";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { CatalogEntry } from "@/common/types/CatalogTypes";

const { Title } = Typography;

interface EmployeeAbsence {
  id: string;
  employee: {
    id: string;
    lastName: string;
    firstName: string;
    pictureThumbnail: string;
    employeePosition: {
      organizationalUnit: {
        name: string;
      };
    };
  };
  type: {
    objectValue: string;
    translations: {
      localeCode: string;
      value: string;
    }[];
    id: string;
    value: string;
    parentEntryId: string;
    groupName?: string;
  };
  startDate: string;
  endDate: string;
  calendarDays: number;
  effectiveDays: number;
  status: string;
}

const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences($page: Int!, $limit: Int!) {
    EmployeeAbsence(
      offset: $page
      limit: $limit
    ) {
      id
      startDate
      endDate
      employee {
        id
        lastName
        firstName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            name
          }
        }
      }
      type {
        objectValue
        translations {
          localeCode
          value
        }
        id
        value
        parentEntryId
      }
      calendarDays
      effectiveDays
      status
    }
  }
`;

const KPISection: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [absences, setAbsences] = useState<EmployeeAbsence[]>([]);
  const [absenceGroups, setAbsenceGroups] = useState<{
    [typeId: string]: string;
  }>({});
  const [organizedAbsences, setOrganizedAbsences] = useState<{
    [month: string]: { [type: string]: number };
  }>({});

  const graphQLClient = useGraphqlClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  const getMonthName = (date: string): string => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return monthNames[new Date(date).getMonth()];
  };

  useEffect(() => {
    const fetchAbsences = async () => {
      try {
        setLoading(true);
        const catalogData = await catalogClient.getCatalogEntriesList({
          catalogIdentifier: "AbsenceGroup",
          version: "v1",
        });
        const groupsMap: { [key: string]: string } = {};
        catalogData.data.forEach((entry: CatalogEntry) => {
          groupsMap[entry.id] = entry.value;
        });
        setAbsenceGroups(groupsMap);

        const result = await graphQLClient.request<{
          EmployeeAbsence: EmployeeAbsence[];
        }>(GET_EMPLOYEE_ABSENCES, { page: 0, limit: 100 });

        const enrichedAbsences = result.EmployeeAbsence.map((absence) => ({
          ...absence,
          type: {
            ...absence.type,
            groupName: groupsMap[absence.type.parentEntryId] || "Unknown",
          },
        }));
        setAbsences(enrichedAbsences);

        const grouped: { [month: string]: { [type: string]: number } } = {};
        enrichedAbsences.forEach((absence) => {
          const month = getMonthName(absence.startDate);
          const type = absence.type.groupName || "Unknown";
          if (!grouped[month]) grouped[month] = {};
          if (!grouped[month][type]) grouped[month][type] = 0;
          grouped[month][type] += 1;
        });
        setOrganizedAbsences(grouped);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchAbsences();
  }, [accessToken]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let months = Object.keys(organizedAbsences);
  months = months.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b));

  const uniqueGroups = new Set<string>();
  months.forEach((month) => {
    Object.keys(organizedAbsences[month]).forEach((group) => {
      uniqueGroups.add(group);
    });
  });
  const barChartData = months.map((month) => {
    const monthData: any = { month };
    uniqueGroups.forEach((group) => {
      monthData[group] = organizedAbsences[month][group] || 0;
    });
    return monthData;
  });

  const pieDataMap: { [group: string]: number } = {};
  absences.forEach((absence) => {
    const group = absence.type.groupName || "Unknown";
    if (!pieDataMap[group]) pieDataMap[group] = 0;
    pieDataMap[group] += absence.effectiveDays;
  });
  const pieChartData = Object.keys(pieDataMap).map((group) => ({
    name: group,
    value: pieDataMap[group],
  }));

  const colorPalette = [
    "#fb7185",
    "#34d399",
    "#a78bfa",
    "#38bdf8",
    "#fbbf24",
    "#8b5cf6",
  ];
  const groupColors: { [key: string]: string } = {};
  Array.from(uniqueGroups).forEach((group, index) => {
    groupColors[group] = colorPalette[index % colorPalette.length];
  });
  pieChartData.forEach((item, index) => {
    groupColors[item.name] = colorPalette[index % colorPalette.length];
  });

  const totalAbsenceDays = absences.reduce(
    (sum, absence) => sum + absence.effectiveDays,
    0
  );
  const vacationDays = pieDataMap["Vacation"] || 0;
  const vacationShare = ((vacationDays / totalAbsenceDays) * 100).toFixed(1);
  const maxAbsenceDays = Math.max(...absences.map((abs) => abs.effectiveDays));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="hover:shadow-md transition-shadow">
        <div className="flex flex-row items-center justify-between pb-2">
  <div>
    <Title level={5} className="text-sm font-medium">Absence Trends</Title>
    <p className="text-xs text-muted-foreground">Monthly absence days by group</p>
    <div className="text-2xl font-bold pt-2 text-left">{totalAbsenceDays}</div>
    <div className="text-xs text-muted-foreground text-left pb-3">Total Absence Days</div>
  </div>
  <RiBarChartLine className="h-6 w-6 text-gray-500 ml-2" />
</div>
        <div className="p-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip
  content={({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 12, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
          {payload.map((entry, idx) => (
  typeof entry.value === 'number' && entry.value > 0 && (
    <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
      <span style={{ width: 12, height: 12, background: entry.color, display: 'inline-block', borderRadius: 3, marginRight: 6 }} />
      <span>{entry.dataKey}: {entry.value} days</span>
    </div>
  )
))}
        </div>
      );
    }
    return null;
  }}
/>
              <Legend />
              {Array.from(uniqueGroups).map((group) => (
                <Bar
                  key={group}
                  dataKey={group}
                  fill={groupColors[group]}
                  stackId="a"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <div className="flex flex-row items-center justify-between pb-2">
          <div>
            <Title level={5} className="text-sm font-medium">
              Absence Distribution
            </Title>
            <p className="text-xs text-muted-foreground">
              Total absence days by group
            </p>
          </div>
          <RiPieChart2Line className="h-6 w-6 text-gray-500" />
        </div>
        <div className="text-2xl font-bold pt-2 text-left">
          {vacationShare}%
        </div>
        <div className="text-xs text-muted-foreground text-left pb-3">
          Vacation Share
        </div>
        <div className="p-4 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={index} fill={groupColors[entry.name]} />
                ))}
              </Pie>
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const entry = payload[0];
                    const group = entry.name;
                    const value = entry.value;
                    const percent =
                      totalAbsenceDays > 0
                        ? Math.round((Number(value) / totalAbsenceDays) * 100)
                        : 0;
                    return (
                      <div
                        style={{
                          background: "white",
                          borderRadius: 8,
                          boxShadow: "0 2px 8px #0001",
                          padding: 12,
                          fontSize: 13,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{group}:</span>{" "}
                        {value} days ({percent}%)
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 8,
              justifyContent: "center",
            }}
          >
            {pieChartData.map((entry) => {
              const percent =
                totalAbsenceDays > 0
                  ? Math.round((Number(entry.value) / totalAbsenceDays) * 100)
                  : 0;
              return (
                <span
                  key={entry.name}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      background: groupColors[entry.name],
                      display: "inline-block",
                      borderRadius: 3,
                      marginRight: 4,
                    }}
                  />
                  <span>
                    {entry.name}: {percent}%
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="hover:shadow-md transition-shadow flex flex-col justify-between text-left min-h-[370px]">
        <div className="flex flex-row items-center justify-between pb-2">
          <div>
            <Title level={5} className="text-sm font-medium">
              Top Absentees
            </Title>
            <p className="text-xs text-muted-foreground">
              Employees with most absence days
            </p>
          </div>
          <span className="text-xl">
            <RiMedalLine className="h-6 w-6 text-gray-500 rotate-90" />
          </span>
        </div>
        <div className="text-2xl font-bold pt-2">{maxAbsenceDays}</div>
        <div className="text-xs text-muted-foreground pb-3">
          Max Absence Days
        </div>

        <div className="space-y-2">
          {(() => {
            const employeeMap: {
              [id: string]: {
                name: string;
                department: string;
                total: number;
                colorIdx: number;
                absences: EmployeeAbsence[];
              };
            } = {};
            absences.forEach((abs) => {
              const id = abs.employee.id;
              if (!employeeMap[id]) {
                employeeMap[id] = {
                  name: `${abs.employee.firstName} ${abs.employee.lastName}`,
                  department:
                    abs.employee.employeePosition?.organizationalUnit?.name ||
                    "",
                  total: 0,
                  colorIdx: Object.keys(employeeMap).length,
                  absences: [],
                };
              }
              employeeMap[id].total += abs.effectiveDays;
              employeeMap[id].absences.push(abs);
            });

            const top = Object.values(employeeMap)
              .sort((a, b) => b.total - a.total)
              .slice(0, 5);

            return top.map((emp, idx) => (
              <div
                key={emp.name + idx}
                className="flex flex-row items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium leading-tight">
                    {emp.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {emp.department} &bull; {emp.total} days
                  </div>
                </div>
                <div className="flex flex-row gap-2 pr-1">
                  {[
                    { color: "#fb7185", group: "Sick Leave" },
                    { color: "#34d399", group: "Vacation" },
                    { color: "#a78bfa", group: "Special Leave" },
                    { color: "#38bdf8", group: "Work Leave" },
                  ].map(({ color, group }, i) => {
                    const days = emp.absences
                      .filter((a) => a.type.groupName === group)
                      .reduce((sum, a) => sum + a.effectiveDays, 0);
                    return (
                      <Tooltip
                        key={i}
                        title={`${group}: ${days} days`}
                        placement="top"
                      >
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: color,
                            opacity: 0.85,
                            cursor: "pointer",
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      </Card>
    </div>
  );
};

export default KPISection;
