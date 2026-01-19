import React from 'react'
import { Table } from 'antd'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system'
import type { ColumnsType } from 'antd/es/table'
import { ExpenseAllowance } from '../types/expenseRequestRecord.types'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale, formatDate } from '@/common/utils/windowUtils'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

interface ExpenseRequestAllowancesProps {
  expenseAllowances: ExpenseAllowance[]
}

const ExpenseRequestAllowances: React.FC<ExpenseRequestAllowancesProps> = ({ expenseAllowances }) => {
  const activeUserLocale = getCurrentActiveUserLocale()

  // Use shared platform date formatter
  const formatDateDisplay = (dateString: string) => formatDate(dateString, 'date.short')

  // Format amount helper function
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(activeUserLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Boolean indicator component
  const BooleanIndicator = ({ value }: { value: boolean }) =>
    value ? <CheckOutlined className="gba:text-green-500" /> : <CloseOutlined className="gba:text-red-500" />

  const columns: ColumnsType<ExpenseAllowance> = [
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.date', 'Date'),
      dataIndex: 'allowanceDate',
      key: 'allowanceDate',
      render: (date: string) => formatDateDisplay(date),
      sorter: (a, b) => new Date(a.allowanceDate).getTime() - new Date(b.allowanceDate).getTime()
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.travel_region', 'Travel Region'),
      dataIndex: ['travelRegion', 'value'],
      key: 'travelRegion',
      render: (text: string) => <Badge>{text}</Badge>
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.day_rate', 'Day Rate'),
      dataIndex: 'dayRate',
      key: 'dayRate',
      align: 'right',
      render: (amount: number) => <span className="gba:font-semibold">{formatAmount(amount)}</span>
    },
    {
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_deduction.expense_deduction_modal.breakfast_title',
        'Breakfast'
      ),
      dataIndex: 'breakfast',
      key: 'breakfast',
      align: 'center',
      render: (value: boolean) => <BooleanIndicator value={value} />
    },
    {
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_deduction.expense_deduction_modal.lunch_title',
        'Lunch'
      ),
      dataIndex: 'lunch',
      key: 'lunch',
      align: 'center',
      render: (value: boolean) => <BooleanIndicator value={value} />
    },
    {
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_deduction.expense_deduction_modal.dinner_title',
        'Dinner'
      ),
      dataIndex: 'dinner',
      key: 'dinner',
      align: 'center',
      render: (value: boolean) => <BooleanIndicator value={value} />
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.overnight', 'Overnight'),
      dataIndex: 'overnight',
      key: 'overnight',
      align: 'center',
      render: (value: boolean) => <BooleanIndicator value={value} />
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.accommodation', 'Accommodation'),
      dataIndex: 'overnightAccommodation',
      key: 'overnightAccommodation',
      align: 'center',
      render: (value: boolean) => <BooleanIndicator value={value} />
    },
    {
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule_details.tab_container.deduction_limit',
        'Deduction Limit'
      ),
      dataIndex: 'deductionLimit',
      key: 'deductionLimit',
      align: 'right',
      render: (amount: number) => formatAmount(amount)
    }
  ]

  return (
    <Card data-testid="expense-request-allowances">
      <CardHeader>
        <CardTitle>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule_details.calculation_allowance_code_list.calculation_allowance_code_modal.expense_group_placeholders',
            'Allowances'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          columns={columns}
          dataSource={expenseAllowances.map((item, index) => ({ ...item, key: index }))}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'Of')} ${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.items', 'Items')}`
          }}
          size="middle"
          scroll={{ x: 'max-content' }}
          summary={pageData => {
            let totalDayRate = 0
            let totalDeductionLimit = 0

            pageData.forEach(({ dayRate, deductionLimit }) => {
              totalDayRate += dayRate
              totalDeductionLimit += deductionLimit
            })

            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <span className="gba:font-semibold">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.total', 'Total')}
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <span className="gba:font-semibold">{formatAmount(totalDayRate)}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={5} />
                  <Table.Summary.Cell index={8} align="right">
                    <span>{formatAmount(totalDeductionLimit)}</span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )
          }}
        />
      </CardContent>
    </Card>
  )
}

export default ExpenseRequestAllowances
