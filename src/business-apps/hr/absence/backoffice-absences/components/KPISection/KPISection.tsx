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
import { RiBarChartLine, RiPieChart2Line, RiBarChart2Line } from "@remixicon/react";
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
  query GetEmployeeAbsences( $startDate: timestamp!,  $endDate: timestamp!) {
    EmployeeAbsence(
      where: {
        _and: [
          { startDate: { _gte: $startDate } },
          { endDate: { _lte: $endDate } },
          { status: { _in: ["PENDING", "APPROVED", "REJECTED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) {
      id
      startDate
      endDate
      employee {
        id
        lastName
        firstName
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
  const [absenceGroups, setAbsenceGroups] = useState<{ [typeId: string]: string }>({});
  const [organizedAbsences, setOrganizedAbsences] = useState<{
    [month: string]: { [type: string]: number };
  }>({});
  const [departmentData, setDepartmentData] = useState<Array<{
    department: string;
    absences: number;
  }>>([]);

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

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

        const result = await graphQLClient.request<{
          EmployeeAbsence: EmployeeAbsence[];
        }>(GET_EMPLOYEE_ABSENCES, { 
          startDate: firstDayOfMonth.toISOString(),
          endDate: lastDayOfMonth.toISOString()
        });


        const enrichedAbsences = result.EmployeeAbsence.map((absence) => ({
          ...absence,
          type: {
            ...absence.type,
            groupName: groupsMap[absence.type.parentEntryId] || "Unknown",
          },
        }));
        setAbsences(enrichedAbsences);

        const departmentMap: { [key: string]: number } = {};

        enrichedAbsences.forEach((absence) => {
          const dept = absence.employee.employeePosition?.organizationalUnit?.name || 'No Department';
          
          departmentMap[dept] = (departmentMap[dept] || 0) + (absence.effectiveDays || 0);
        });


        const deptData = Object.entries(departmentMap)
          .map(([department, absences]) => ({
            department,
            absences: Math.round(absences * 10) / 10
          }))
          .sort((a, b) => b.absences - a.absences)
          .slice(0, 5);

        setDepartmentData(deptData);

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

  const statusTypeData: {
    [status: string]: {
      totalDays: number;
      types: { [type: string]: { days: number; count: number } };
    };
  } = {
    'APPROVED': { totalDays: 0, types: {} },
    'PENDING': { totalDays: 0, types: {} },
    'REJECTED': { totalDays: 0, types: {} }
  };
  
  absences.forEach((absence) => {
    const status = absence.status?.toUpperCase() || 'PENDING';
    const typeName = absence.type.groupName || 'Other';
    const days = absence.effectiveDays || 0;
    
    if (status in statusTypeData) {
      statusTypeData[status].totalDays += days;
      
      if (!statusTypeData[status].types[typeName]) {
        statusTypeData[status].types[typeName] = { days: 0, count: 0 };
      }
      statusTypeData[status].types[typeName].days += days;
      statusTypeData[status].types[typeName].count += 1;
    }
  });
  
  const pieChartData = Object.entries(statusTypeData)
    .filter(([_, data]) => data.totalDays > 0)
    .map(([status, data]) => ({
      name: status.charAt(0) + status.slice(1).toLowerCase(),
      value: data.totalDays,
      status: status,
      typeBreakdown: data.types
    }));


  const statusColors: {[key: string]: string} = {
    'APPROVED': '#34d399', 
    'PENDING': '#fbbf24',   
    'REJECTED': '#f87171'   
  };
  
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

  const totalAbsenceDays = pieChartData.reduce(
    (sum, entry) => sum + entry.value,
    0
  );
  const approvedDays = pieChartData.find(entry => entry.status === 'APPROVED')?.value || 0;
  const approvedShare = totalAbsenceDays > 0 ? ((approvedDays / totalAbsenceDays) * 100).toFixed(1) : '0.0';

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
      <Card className="hover:shadow-md transition-shadow">
      <div className="gba:flex gba:flex-row gba:items-start gba:justify-between">
        <div>
          <Title level={5} className="gba:!mb-0 gba:!text-sm gba:!font-medium gba:pb-2">Absence Trends</Title>
          <p className="gba:text-xs gba:text-muted-foreground">Monthly absence days by group</p>
          <div className="gba:mt-2 gba:text-2xl gba:font-bold">{totalAbsenceDays}</div>
          <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">Total Absence Days</div>
        </div>
        <RiBarChartLine className="gba:h-6 gba:w-6 gba:text-gray-500 gba:mt-1" />
      </div>
        <div className="gba:p-4 gba:h-[300px]">
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

      <Card className="gba:hover:shadow-md gba:transition-shadow">
        <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2">
          <div>
            <Title level={5} className="gba:text-sm gba:font-medium">
            Absence Approvals
            </Title>
            <p className="gba:text-xs gba:text-muted-foreground">
            Status of absence requests
            </p>
          </div>
          <RiPieChart2Line className="gba:h-6 gba:w-6 gba:text-gray-500" />
        </div>
        <div className="gba:text-2xl gba:font-bold gba:pt-2 gba:text-left">
          {approvedShare}%
        </div>
        <div className="gba:text-xs gba:text-muted-foreground gba:text-left gba:pb-3">
          Approved Rate
        </div>
        <div className="gba:p-4 gba:h-[200px]">
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
                  <Cell 
                    key={index} 
                    fill={statusColors[entry.status] || '#94a3b8'} 
                  />
                ))}
              </Pie>
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const entry = payload[0].payload;
                    const totalDays = entry.value;
                    const percent = totalAbsenceDays > 0 
                      ? Math.round((totalDays / totalAbsenceDays) * 100) 
                      : 0;
                    
                    const typeBreakdown = Object.entries<{days: number, count: number}>(
                      (entry as any).typeBreakdown || {}
                    ).sort((a, b) => b[1].days - a[1].days);
                    
                    return (
                      <div
                        style={{
                          background: "white",
                          borderRadius: 8,
                          boxShadow: "0 2px 8px #0001",
                          padding: 12,
                          fontSize: 13,
                          minWidth: 200,
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>
                          {entry.name}: {totalDays} days ({percent}%)
                        </div>
                        
                        {typeBreakdown.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 12 }}>
                              Breakdown:
                            </div>
                            {(typeBreakdown as Array<[string, {days: number, count: number}]>).map(([type, data]) => {
                              const typePercent = totalDays > 0 
                                ? Math.round((data.days / totalDays) * 100) 
                                : 0;
                              return (
                                <div key={type} style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  fontSize: 12,
                                  marginTop: 4
                                }}>
                                  <span>{type}:</span>
                                  <span>{data.days} days ({typePercent}%)</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
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
                      background: statusColors[entry.status] || '#94a3b8',
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

      <Card className="gba:hover:shadow-md gba:transition-shadow">
        <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2">
          <div>
            <Title level={5} className="gba:text-sm gba:font-medium">
              Department Insights
            </Title>
            <p className="gba:text-xs gba:text-muted-foreground">
              Absences by department in {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} (1st - {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()})
            </p>
          </div>
          <RiBarChart2Line className="gba:h-4 gba:w-4" />
        </div>
        
        <div className="gba:mb-3">
          <div className="gba:text-2xl gba:font-bold">
            {departmentData.length > 0 ? Math.max(...departmentData.map(item => item.absences)) : 0}
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">Max Absence Days</p>
        </div>
        
        {departmentData.length > 0 ? (
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentData}                layout="vertical"
                margin={{ top: 20, right: 0, left: -90, bottom: 10 }}
                barCategoryGap={12}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  type="number" 
                  allowDecimals={false} 
                  fontSize={10} 
                  tickMargin={5}
                  tickLine={false}
                  axisLine={{ stroke: '#d9d9d9' }}
                />
                <YAxis 
                  dataKey="department" 
                  type="category" 
                  width={200}
                  fontSize={11} 
                  tickMargin={8}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={{
                    fontSize: 11,
                  }}
                  tickFormatter={(value) => {
                    return value === 'No Department' ? 'Other' : value;
                  }}
                />
                <RechartsTooltip 
                  cursor={{ fill: '#f3f4f6' }} 
                  formatter={(value: number) => [`${value} days`, 'Absence Days']}
                  labelFormatter={(label) => `Department: ${label === 'No Department' ? 'Other' : label}`}
                />
                <Bar 
                  dataKey="absences" 
                  fill="#38bdf8" 
                  radius={[4, 4, 4, 4]}
                  barSize={16}
                  minPointSize={3}
                  background={{ fill: '#f3f4f6' }}
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#38bdf8" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-[180px] gba:bg-gray-50 gba:rounded-md">
            <p className="gba:text-xs gba:text-gray-500">Loading insights data...</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default KPISection;
