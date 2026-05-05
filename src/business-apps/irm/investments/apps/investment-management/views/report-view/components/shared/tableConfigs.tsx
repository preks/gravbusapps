import React from 'react'
import { ChartPieIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { createInvestmentReportColumns } from '@/business-apps/irm/investments/records/investment-record/components/shared/columnDefinitions'
import { getAggregatedReportFields } from '../../utils/reportListColumnTransformer'
import { shouldUseLiquidFundTypeSections } from '../../utils/subSectionHelpers'
import { InvestmentReportTableConfig, ColumnConfig } from './types'

const DEFAULT_REPORT_ACTION_TEST_ID = 'investment-reports-update'

const getCatalogLabel = (entry: any): string => entry?.value || entry?.code || '-'

const getLiquidFundType = (record: any): any => {
  return (
    record.liquidFundInvestmentReport?.[0]?.investmentLiquidFundType ||
    record.investment?.liquidFundInvestment?.[0]?.investmentLiquidFundType ||
    record.investment?.liquidFundInvestment?.investmentLiquidFundType
  )
}

const renderTextCell = (label: string) => (
  <div className="gba:flex gba:items-center gba:h-8">
    <span className="gba:truncate gba:block" title={label}>
      {label}
    </span>
  </div>
)

const createAllSectionColumns = (includeLiquidFundType: boolean): ColumnConfig[] => {
  const columns: ColumnConfig[] = [
    {
      key: 'investmentType',
      title: 'Investment Type',
      width: '180px',
      getTextValue: (record: any) => getCatalogLabel(record.investment?.investmentType),
      render: (record: any) => renderTextCell(getCatalogLabel(record.investment?.investmentType))
    }
  ]

  if (includeLiquidFundType) {
    columns.push({
      key: 'investmentLiquidFundType',
      title: 'Liquid Fund Type',
      width: '180px',
      getTextValue: (record: any) => getCatalogLabel(getLiquidFundType(record)),
      render: (record: any) => renderTextCell(getCatalogLabel(getLiquidFundType(record)))
    })
  }

  return columns
}

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

    const isAllSection = investmentType === 'all'
    const groupEntry = catalogData?.investmentGroups?.find((entry: any) => entry.code === investmentGroup)
    const includeLiquidFundType = isAllSection && shouldUseLiquidFundTypeSections(groupEntry, catalogData)
    const allSectionColumns = isAllSection ? createAllSectionColumns(includeLiquidFundType) : []
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

    if (!dynamicColumns || dynamicColumns.length === 0) return [...staticColumns, ...allSectionColumns]

    return [...staticColumns, ...allSectionColumns, ...dynamicColumns]
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
