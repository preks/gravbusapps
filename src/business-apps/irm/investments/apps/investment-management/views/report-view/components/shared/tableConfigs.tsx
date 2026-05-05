import React from 'react'
import { ChartPieIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { createInvestmentReportColumns } from '@/business-apps/irm/investments/records/investment-record/components/shared/columnDefinitions'
import { getAggregatedReportFields } from '../../utils/reportListColumnTransformer'
import { InvestmentReportTableConfig, ColumnConfig } from './types'

const DEFAULT_REPORT_ACTION_TEST_ID = 'investment-reports-update'

const createReportActionsRenderer = (): InvestmentReportTableConfig['actionsRenderer'] => (row, accessToken) => {
  const reportId = row.id
  if (!reportId) return null

  return (
    <AppAction
      variant="table-row"
      contexts={[
        {
          context: FlowContextName.investmentReportEntity,
          contextData: { investmentReportId: reportId }
        }
      ]}
      prefixDataTestId={DEFAULT_REPORT_ACTION_TEST_ID}
      accessToken={accessToken}
      emptyState="enable"
      lazyLoad
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      data-testid={`${DEFAULT_REPORT_ACTION_TEST_ID}-button-${reportId}`}
    />
  )
}

const createStandardColumnGenerator = (): InvestmentReportTableConfig['columnGenerator'] => {
  return ({ investmentGroup, investmentType, sectionKind, catalogData }) => {
    const staticColumns: ColumnConfig[] = [
      {
        key: 'investment',
        title: 'Investment',
        width: '200px',
        getTextValue: (record: any) => record.investment?.name || '-',
        render: (record: any) => (
          <div className="gba:flex gba:items-center gba:gap-2 gba:h-8">
            <ChartPieIcon className="gba:w-4 gba:h-4 gba:shrink-0 gba:text-muted-foreground" />
            <span className="gba:font-medium gba:truncate gba:block" title={record.investment?.name || 'N/A'}>
              {record.investment?.name || 'N/A'}
            </span>
          </div>
        )
      }
    ]

    if (!catalogData) return staticColumns

    const resolvedFields = getAggregatedReportFields(investmentGroup, investmentType, catalogData, sectionKind)
    const liquidFundTypeCode = sectionKind === 'liquidFundType' ? investmentType : undefined
    const dynamicColumns = createInvestmentReportColumns(
      investmentType,
      liquidFundTypeCode,
      catalogData,
      {
        investmentGroup: { code: investmentGroup }
      },
      resolvedFields
    )

    if (!dynamicColumns || dynamicColumns.length === 0) return staticColumns

    return [...staticColumns, ...dynamicColumns]
  }
}

export const DEFAULT_REPORT_TABLE_CONFIG: InvestmentReportTableConfig = {
  emptyStateMessage: {
    title: type => `No ${type} Data Found`,
    description: type => `No investment reports are available for ${type.toLowerCase()} in the selected time period.`
  },
  columnGenerator: createStandardColumnGenerator(),
  actionsRenderer: createReportActionsRenderer(),
  getInvestmentId: row => row.investment?.id,
  getInvestmentName: row => row.investment?.name || 'N/A',
  getReportId: row => row.id
}
