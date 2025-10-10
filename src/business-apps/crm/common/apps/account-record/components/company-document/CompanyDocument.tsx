import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { Table, Row, Col, Card, Typography, Spin } from 'antd'
import type { ColumnType, ColumnGroupType } from 'antd/es/table'
import { useState, useEffect } from 'react'
import { FileTextOutlined } from '@ant-design/icons'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useDocumentById } from './hooks/useDocumentById'

interface CompanyDocumentProps extends BusinessAppContextProps {
  accountId: string
  documentId: string
}

function CompanyDocumentComponent({ accountId, documentId, accessToken }: CompanyDocumentProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(documentId || null)
  const {
    document: selectedDocumentData,
    loading: documentLoading,
    error: documentError
  } = useDocumentById(accessToken, documentId)

  // Set selected document ID if documents are loaded and no document is selected yet
  useEffect(() => {
    if (selectedDocId) {
      setSelectedDocId(selectedDocId)
    }
  }, [selectedDocId])

  const rawMetadata = selectedDocumentData?.additionalProperties
  const metadata = rawMetadata?.financial_report_v1?.metadata || {}

  const documentMetadata = {
    repCurrency: metadata.rep_currency || '-',
    hasProForma: metadata.has_pro_forma || '-',
    fiscalYearEnd: metadata.fiscal_year_end || '-',
    latestFinancials: metadata.latest_financials || '-',
    accountingStandard: metadata.accounting_standard || '-'
  }

  const { Text } = Typography

  const DocumentMetadataHeader = () => {
    return (
      <div className="gba:mb-6" data-testid="document-metadata-header">
        <Card className="gba:shadow-sm">
          <Row gutter={[24, 16]} align="middle">
            {/* Rep. Currency */}
            <Col xs={12} sm={8} md={4}>
              <div>
                <Text type="secondary" className="gba:block">
                  Rep. Currency
                </Text>
                <Text strong>{documentMetadata.repCurrency}</Text>
              </div>
            </Col>

            {/* Has Pro Forma */}
            <Col xs={12} sm={8} md={4}>
              <div>
                <Text type="secondary" className="gba:block">
                  Has Pro Forma
                </Text>
                <Text strong>{documentMetadata.hasProForma}</Text>
              </div>
            </Col>

            {/* Fiscal Year End */}
            <Col xs={12} sm={8} md={5}>
              <div>
                <Text type="secondary" className="gba:block">
                  Fiscal Year End
                </Text>
                <Text strong>{documentMetadata.fiscalYearEnd}</Text>
              </div>
            </Col>

            {/* Latest Financials */}
            <Col xs={12} sm={8} md={5}>
              <div>
                <Text type="secondary" className="gba:block">
                  Latest Financials
                </Text>
                <Text strong>{documentMetadata.latestFinancials}</Text>
              </div>
            </Col>

            {/* Accounting Standard */}
            <Col xs={12} sm={8} md={6}>
              <div>
                <Text type="secondary" className="gba:block">
                  Accounting Standard
                </Text>
                <Text strong>{documentMetadata.accountingStandard}</Text>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    )
  }

  const getHeaderCellStyle = (category: string) => {
    const baseStyle = {
      fontWeight: 600,
      backgroundColor: '#f0f0f0'
    }

    switch (category) {
      case 'CURRENT PERIOD':
        return { ...baseStyle, backgroundColor: '#e6f7ff', borderRight: '1px solid #1890ff' }
      case 'FYTD':
        return { ...baseStyle, backgroundColor: '#f6ffed', borderRight: '1px solid #52c41a' }
      case 'FULL FISCAL YEAR':
        return { ...baseStyle, backgroundColor: '#fff7e6', borderRight: '1px solid #fa8c16' }
      default:
        return baseStyle
    }
  }

  type FinancialDataRow = {
    key: string
    metric: string
    current: any
    fytd: any
    ffy: any
  }

  const columns: (ColumnGroupType<FinancialDataRow> | ColumnType<FinancialDataRow>)[] = [
    {
      title: '',
      dataIndex: 'metric',
      key: 'metric',
      fixed: 'left' as const,
      width: 150,
      onHeaderCell: () => ({ style: { fontWeight: 600 } })
    },
    {
      title: 'CURRENT PERIOD',
      children: [
        { title: 'Actual', dataIndex: ['current', 'actual'], key: 'cp_actual' },
        { title: 'Budget', dataIndex: ['current', 'budget'], key: 'cp_budget' },
        { title: 'Act vs Bud', dataIndex: ['current', 'actual_vs_budget'], key: 'cp_vs_budget' },
        { title: 'Act FV', dataIndex: ['current', 'actual_fv'], key: 'cp_fv' }
      ],
      onHeaderCell: () => ({ style: getHeaderCellStyle('CURRENT PERIOD') })
    },
    {
      title: '',
      dataIndex: 'spacer1',
      key: 'spacer1',
      width: 10,
      render: () => null,
      onCell: () => ({
        style: {
          padding: 0,
          background: '#f9f9f9',
          borderLeft: '1px solid #d9d9d9',
          borderRight: '1px solid #d9d9d9'
        }
      }),
      onHeaderCell: () => ({
        style: {
          padding: 0,
          background: '#f9f9f9',
          borderLeft: '1px solid #d9d9d9',
          borderRight: '1px solid #d9d9d9'
        }
      })
    },
    {
      title: 'FYTD',
      children: [
        { title: 'Actual', dataIndex: ['fytd', 'actual'], key: 'fytd_actual' },
        { title: 'Budget', dataIndex: ['fytd', 'budget'], key: 'fytd_budget' },
        { title: 'Act vs Bud', dataIndex: ['fytd', 'actual_vs_budget'], key: 'fytd_vs_budget' },
        { title: 'Act PY', dataIndex: ['fytd', 'actual_py'], key: 'fytd_py' }
      ],
      onHeaderCell: () => ({ style: getHeaderCellStyle('FYTD') })
    },
    {
      title: '',
      dataIndex: 'spacer2',
      key: 'spacer2',
      width: 10,
      render: () => null,
      onCell: () => ({
        style: {
          padding: 0,
          background: '#f9f9f9',
          borderLeft: '1px solid #d9d9d9',
          borderRight: '1px solid #d9d9d9'
        }
      }),
      onHeaderCell: () => ({
        style: {
          padding: 0,
          background: '#f9f9f9',
          borderLeft: '1px solid #d9d9d9',
          borderRight: '1px solid #d9d9d9'
        }
      })
    },
    {
      title: 'FULL FISCAL YEAR',
      children: [
        { title: 'Latest Est', dataIndex: ['ffy', 'latest_estimates'], key: 'ffy_le' },
        { title: 'Budget', dataIndex: ['ffy', 'budget'], key: 'ffy_budget' },
        { title: 'LE vs Bud', dataIndex: ['ffy', 'le_vs_budget'], key: 'ffy_vs_budget' },
        { title: 'Acq Plan', dataIndex: ['ffy', 'acq_plan'], key: 'ffy_acq_plan' },
        { title: 'Acq Plan NY', dataIndex: ['ffy', 'acq_plan_ny'], key: 'ffy_acq_plan_ny' },
        { title: 'LE vs Acq Plan', dataIndex: ['ffy', 'le_vs_acq_plan'], key: 'ffy_vs_acq_plan' },
        { title: 'Actual LTM', dataIndex: ['ffy', 'actual_ltm'], key: 'ffy_ltm' },
        { title: 'Actual PY', dataIndex: ['ffy', 'actual_py'], key: 'ffy_py' },
        { title: 'Acq', dataIndex: ['ffy', 'acq'], key: 'ffy_acq' }
      ],
      onHeaderCell: () => ({ style: getHeaderCellStyle('FULL FISCAL YEAR') })
    }
  ]

  const financialData = {
    'Net Sales': 'net_sales',
    'Gross Profit': 'gross_profit',
    'Reported EBITDA': 'reported_ebitda',
    'Adjusted EBITDA': 'adjusted_ebitda',
    'EBITDAC Margin %': 'ebitdac_margin_pct',
    'OCF - Capex': 'ocf_minus_capex',
    'Cash Conversion %': 'cash_conversion_pct',
    'Adjusted Net Debt': 'adjusted_net_debt',
    'Net Debt / EBITDA': 'net_debt_to_ebitda',
    Liquidity: 'liquidity'
  }

  const raw = selectedDocumentData?.additionalProperties
  const report = raw?.financial_report_v1?.table || {}

  // Transform data into rows for the table
  const dataSource = Object.entries(financialData).map(([label, key]) => {
    const metricData = report[key]

    if (!metricData) {
      return {
        key,
        metric: label,
        current: null,
        fytd: null,
        ffy: {}
      }
    }

    const currentPeriodData = metricData.current_period || {}
    const currentActual = currentPeriodData.actual
    const currentBudget = currentPeriodData.budget
    const currentActualFV = currentPeriodData.actual_fv
    const currentActualVsBudget = currentPeriodData.actual_vs_budget

    const fytdData = metricData.fytd || {}
    const fytdActual = fytdData.actual
    const fytdBudget = fytdData.budget
    const fytdActualPY = fytdData.actual_py
    const fytdActualVsBudget = fytdData.actual_vs_budget

    const ffyData = metricData.full_fiscal_year || {}
    const additionalFFYData = metricData.additional_full_year_data || {}

    return {
      key,
      metric: label,
      current: {
        actual: currentActual,
        budget: currentBudget,
        actual_fv: currentActualFV,
        actual_vs_budget: currentActualVsBudget
      },
      fytd: {
        actual: fytdActual,
        budget: fytdBudget,
        actual_py: fytdActualPY,
        actual_vs_budget: fytdActualVsBudget
      },
      ffy: {
        ...ffyData,
        ...additionalFFYData
      }
    }
  })

  const documentName = getTranslationFromI18nKeyAndLabel('CompanyDocument', 'Company Document')

  return (
    <PageLayout
      headerIcon={<FileTextOutlined />}
      headerLabel={documentName}
      contentContainer={
        <div className="gba:p-4" data-testid="company-document-container">
          {documentLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
              <Spin size="large" tip="Loading document data..." />
            </div>
          ) : documentError ? (
            <div className="gba:text-red-500 gba:p-4">Error loading document: {documentError?.message}</div>
          ) : (
            <div className="gba:mt-6">
              <DocumentMetadataHeader />

              <Table
                columns={columns}
                dataSource={dataSource}
                bordered
                scroll={{ x: 'max-content' }}
                pagination={false}
                className="gba:financial-report-table"
                data-testid="financial-report-table"
                rowClassName={() => 'gba:financial-report-row'}
              />
            </div>
          )}
        </div>
      }
    />
  )
}

export { CompanyDocumentComponent as CompanyDocument }
export default CompanyDocumentComponent
