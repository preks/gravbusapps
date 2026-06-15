import React, { useState } from 'react'
import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import { AbsenceTableData } from '../types/absenceTypes'

interface AbsenceDetailsTableProps {
  tableData: AbsenceTableData
  dataTestId: string
}

const AbsenceDetailsTable: React.FC<AbsenceDetailsTableProps> = ({ tableData, dataTestId }) => {
  const [activeTab, setActiveTab] = useState<string>('costCenter')

  const renderUsage = (percentage: number) => (
    <div className="gba:flex gba:flex-col gba:gap-1">
      <progress className="gba:h-2 gba:w-20" max={100} value={percentage} />
      <span className="gba:text-xs gba:text-muted-foreground">{percentage}%</span>
    </div>
  )

  return (
    <div data-testid={`${dataTestId}-details-table`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:mb-4">
        <TabsList>
          <TabsTrigger value="costCenter" data-testid={`${dataTestId}-cost-center-tab`}>
            Cost Center Analysis
          </TabsTrigger>
          <TabsTrigger value="employee" data-testid={`${dataTestId}-employee-tab`}>
            Employee Details
          </TabsTrigger>
          <TabsTrigger value="absenceType" data-testid={`${dataTestId}-absence-type-tab`}>
            Absence Type Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="costCenter">
          <Card className="gba:p-4">
            <h4 className="gba:mb-4 gba:text-lg gba:font-semibold">
              Cost Center Breakdown ({tableData.byCostCenter.length} centers)
            </h4>
            <Table data-testid={`${dataTestId}-cost-center-table`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Cost Center</TableHead>
                  <TableHead>Vacation</TableHead>
                  <TableHead>Sick Leave</TableHead>
                  <TableHead>Special Leave</TableHead>
                  <TableHead>Work Leave</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.byCostCenter.map(row => (
                  <TableRow key={row.costCenter}>
                    <TableCell><Badge variant="secondary">{row.costCenter}</Badge></TableCell>
                    <TableCell className="gba:font-bold gba:text-info">{row.vacation} days</TableCell>
                    <TableCell className="gba:font-bold gba:text-destructive">{row.sickLeave} days</TableCell>
                    <TableCell className="gba:font-bold gba:text-info">{row.specialLeave} days</TableCell>
                    <TableCell className="gba:font-bold gba:text-success">{row.workLeave} days</TableCell>
                    <TableCell><Badge variant="secondary">{row.total} days</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="employee">
          <Card className="gba:p-4">
            <h4 className="gba:mb-4 gba:text-lg gba:font-semibold">
              Employee Absence Summary ({tableData.byEmployee.length} employees)
            </h4>
            <Table data-testid={`${dataTestId}-employee-table`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Vacation</TableHead>
                  <TableHead>Sick Leave</TableHead>
                  <TableHead>Special</TableHead>
                  <TableHead>Work</TableHead>
                  <TableHead>Total Days</TableHead>
                  <TableHead>Usage %</TableHead>
                  <TableHead>Balance Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.byEmployee.map(row => (
                  <TableRow key={row.employee.id}>
                    <TableCell>
                      <div className="gba:font-bold">{row.employee.displayName}</div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        ID: {row.employee.businessKey || row.employee.id.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell className="gba:font-bold gba:text-info">{row.vacation} days</TableCell>
                    <TableCell className="gba:font-bold gba:text-destructive">{row.sickLeave} days</TableCell>
                    <TableCell className="gba:font-bold gba:text-info">{row.specialLeave} days</TableCell>
                    <TableCell className="gba:font-bold gba:text-success">{row.workLeave} days</TableCell>
                    <TableCell><Badge variant="secondary">{row.totalDays} days</Badge></TableCell>
                    <TableCell>{renderUsage(row.usagePercentage)}</TableCell>
                    <TableCell>
                      <div className="gba:flex gba:flex-wrap gba:gap-1">
                        {row.balanceInfo.slice(0, 3).map(balance => (
                          <Badge
                            key={`${row.employee.id}-${balance.type}`}
                            variant="outline"
                            title={`${balance.type}: ${balance.used}/${balance.allocated} used, ${balance.remaining} remaining`}
                          >
                            {balance.type}: {balance.remaining} left
                          </Badge>
                        ))}
                        {row.balanceInfo.length > 3 && <Badge variant="secondary">+{row.balanceInfo.length - 3} more</Badge>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="absenceType">
          <Card className="gba:p-4">
            <h4 className="gba:mb-4 gba:text-lg gba:font-semibold">
              Absence Type Breakdown ({tableData.byAbsenceType.length} types)
            </h4>
            <Table data-testid={`${dataTestId}-absence-type-table`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Absence Type</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Total Days</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Avg Days/Employee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.byAbsenceType.map(row => (
                  <TableRow key={row.type.id}>
                    <TableCell>
                      <div className="gba:font-bold gba:text-info">{row.type.value}</div>
                      <div className="gba:text-xs gba:text-muted-foreground">Code: {row.type.code}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{row.group.value}</Badge></TableCell>
                    <TableCell className="gba:font-bold">{row.totalDays}</TableCell>
                    <TableCell><Badge variant="secondary">{row.employeeCount} employees</Badge></TableCell>
                    <TableCell className="gba:font-bold gba:text-success">
                      {row.averageDaysPerEmployee.toFixed(1)} days
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AbsenceDetailsTable
