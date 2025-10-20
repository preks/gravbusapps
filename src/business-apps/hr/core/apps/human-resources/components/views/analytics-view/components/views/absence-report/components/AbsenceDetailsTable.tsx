import React, { useState } from 'react'
import { Table, Card, Tabs, Tag, Progress, Tooltip } from 'antd'
import { AbsenceTableData } from '../types/absenceTypes'

const { TabPane } = Tabs

interface AbsenceDetailsTableProps {
  tableData: AbsenceTableData
  dataTestId: string
}

const AbsenceDetailsTable: React.FC<AbsenceDetailsTableProps> = ({ tableData, dataTestId }) => {
  const [activeTab, setActiveTab] = useState<string>('costCenter')

  const costCenterColumns = [
    {
      title: 'Cost Center',
      dataIndex: 'costCenter',
      key: 'costCenter',
      render: (text: string) => <Tag color="var(--nw-info)">{text}</Tag>
    },
    {
      title: 'Vacation',
      dataIndex: 'vacation',
      key: 'vacation',
      render: (days: number) => <span className="gba:text-info gba:font-bold">{days} days</span>,
      sorter: (a: any, b: any) => a.vacation - b.vacation
    },
    {
      title: 'Sick Leave',
      dataIndex: 'sickLeave',
      key: 'sickLeave',
      render: (days: number) => <span className="gba:text-destructive gba:font-bold">{days} days</span>,
      sorter: (a: any, b: any) => a.sickLeave - b.sickLeave
    },
    {
      title: 'Special Leave',
      dataIndex: 'specialLeave',
      key: 'specialLeave',
      render: (days: number) => <span className="gba:text-info gba:font-bold">{days} days</span>,
      sorter: (a: any, b: any) => a.specialLeave - b.specialLeave
    },
    {
      title: 'Work Leave',
      dataIndex: 'workLeave',
      key: 'workLeave',
      render: (days: number) => <span className="gba:text-success gba:font-bold">{days} days</span>,
      sorter: (a: any, b: any) => a.workLeave - b.workLeave
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => (
        <Tag color="var(--nw-info)" className="gba:text-sm gba:py-1 gba:px-2">
          {total} days
        </Tag>
      ),
      sorter: (a: any, b: any) => a.total - b.total,
      defaultSortOrder: 'descend' as const
    }
  ]

  const employeeColumns = [
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
      render: (employee: any) => (
        <div>
          <div className="gba:font-bold">{employee.displayName}</div>
          <div className="gba:text-xs gba:text-muted-foreground">
            ID: {employee.businessKey || employee.id.slice(0, 8)}
          </div>
        </div>
      ),
      width: 200
    },
    {
      title: 'Vacation',
      dataIndex: 'vacation',
      key: 'vacation',
      render: (days: number) => <span className="gba:text-info gba:font-bold">{days} days</span>,
      sorter: (a: any, b: any) => a.vacation - b.vacation,
      width: 100
    },
    {
      title: 'Sick Leave',
      dataIndex: 'sickLeave',
      key: 'sickLeave',
      render: (days: number) => <span className="gba:text-destructive gba:font-bold">{days} days</span>,
      sorter: (a: any, b: any) => a.sickLeave - b.sickLeave,
      width: 100
    },
    {
      title: 'Special',
      dataIndex: 'specialLeave',
      key: 'specialLeave',
      render: (days: number) => <span className="gba:text-info gba:font-bold">{days} days</span>,
      sorter: (a: any, b: any) => a.specialLeave - b.specialLeave,
      width: 80
    },
    {
      title: 'Work',
      dataIndex: 'workLeave',
      key: 'workLeave',
      render: (days: number) => <span className="gba:text-success gba:font-bold">{days} days</span>,
      sorter: (a: any, b: any) => a.workLeave - b.workLeave,
      width: 80
    },
    {
      title: 'Total Days',
      dataIndex: 'totalDays',
      key: 'totalDays',
      render: (total: number) => (
        <Tag color="var(--nw-info)" className="gba:text-sm">
          {total} days
        </Tag>
      ),
      sorter: (a: any, b: any) => a.totalDays - b.totalDays,
      width: 100
    },
    {
      title: 'Usage %',
      dataIndex: 'usagePercentage',
      key: 'usagePercentage',
      render: (percentage: number) => (
        <div className="gba:w-20">
          <Progress
            percent={percentage}
            size="small"
            strokeColor={
              percentage > 80 ? 'var(--nw-destructive)' : percentage > 60 ? 'var(--nw-warning)' : 'var(--nw-success)'
            }
          />
        </div>
      ),
      sorter: (a: any, b: any) => a.usagePercentage - b.usagePercentage,
      width: 120
    },
    {
      title: 'Balance Info',
      dataIndex: 'balanceInfo',
      key: 'balanceInfo',
      render: (balanceInfo: any[]) => (
        <div>
          {balanceInfo.slice(0, 3).map((balance, index) => (
            <Tooltip
              key={index}
              title={`${balance.type}: ${balance.used}/${balance.allocated} used, ${balance.remaining} remaining`}
            >
              <Tag color="geekblue" className="gba:mb-0.5 gba:text-xs">
                {balance.type}: {balance.remaining} left
              </Tag>
            </Tooltip>
          ))}
          {balanceInfo.length > 3 && (
            <Tag color="default" className="gba:text-xs">
              +{balanceInfo.length - 3} more
            </Tag>
          )}
        </div>
      ),
      width: 200
    }
  ]

  const absenceTypeColumns = [
    {
      title: 'Absence Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: any) => (
        <div>
          <div className="gba:font-bold gba:text-info">{type.value}</div>
          <div className="gba:text-xs gba:text-muted-foreground">Code: {type.code}</div>
        </div>
      ),
      width: 200
    },
    {
      title: 'Group',
      dataIndex: 'group',
      key: 'group',
      render: (group: any) => {
        const colors: Record<string, string> = {
          RECR: 'blue',
          HEALTH: 'red',
          SPCL: 'purple',
          WORK: 'green'
        }
        return <Tag color={colors[group.code] || 'default'}>{group.value}</Tag>
      },
      filters: [
        { text: 'Vacation', value: 'Vacation' },
        { text: 'Sick Leave', value: 'Sick Leave' },
        { text: 'Special Leave', value: 'Special Leave' },
        { text: 'Work Leave', value: 'Work Leave' }
      ],
      onFilter: (value: any, record: any) => record.group.value === value,
      width: 120
    },
    {
      title: 'Total Days',
      dataIndex: 'totalDays',
      key: 'totalDays',
      render: (days: number) => <span className="gba:font-bold gba:text-base">{days}</span>,
      sorter: (a: any, b: any) => a.totalDays - b.totalDays,
      defaultSortOrder: 'descend' as const,
      width: 100
    },
    {
      title: 'Employees',
      dataIndex: 'employeeCount',
      key: 'employeeCount',
      render: (count: number) => <Tag color="var(--nw-info)">{count} employees</Tag>,
      sorter: (a: any, b: any) => a.employeeCount - b.employeeCount,
      width: 120
    },
    {
      title: 'Avg Days/Employee',
      dataIndex: 'averageDaysPerEmployee',
      key: 'averageDaysPerEmployee',
      render: (avg: number) => <span className="gba:text-success gba:font-bold">{avg.toFixed(1)} days</span>,
      sorter: (a: any, b: any) => a.averageDaysPerEmployee - b.averageDaysPerEmployee,
      width: 150
    }
  ]

  return (
    <div data-testid={`${dataTestId}-details-table`}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="large" className="gba:mb-4">
        <TabPane tab={<span data-testid={`${dataTestId}-cost-center-tab`}>Cost Center Analysis</span>} key="costCenter">
          <Card title={`Cost Center Breakdown (${tableData.byCostCenter.length} centers)`} size="small">
            <Table
              columns={costCenterColumns}
              dataSource={tableData.byCostCenter}
              rowKey="costCenter"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} cost centers`
              }}
              size="small"
              scroll={{ x: 800 }}
              data-testid={`${dataTestId}-cost-center-table`}
            />
          </Card>
        </TabPane>

        <TabPane tab={<span data-testid={`${dataTestId}-employee-tab`}>Employee Details</span>} key="employee">
          <Card title={`Employee Absence Summary (${tableData.byEmployee.length} employees)`} size="small">
            <Table
              columns={employeeColumns}
              dataSource={tableData.byEmployee}
              rowKey={record => record.employee.id}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} employees`
              }}
              size="small"
              scroll={{ x: 1000 }}
              data-testid={`${dataTestId}-employee-table`}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={<span data-testid={`${dataTestId}-absence-type-tab`}>Absence Type Analysis</span>}
          key="absenceType"
        >
          <Card title={`Absence Type Breakdown (${tableData.byAbsenceType.length} types)`} size="small">
            <Table
              columns={absenceTypeColumns}
              dataSource={tableData.byAbsenceType}
              rowKey={record => record.type.id}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} absence types`
              }}
              size="small"
              scroll={{ x: 800 }}
              data-testid={`${dataTestId}-absence-type-table`}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}

export default AbsenceDetailsTable
