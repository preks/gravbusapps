import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Badge } from '@newwork/nw-design-system'
import { PencilSimple, Eye, DownloadSimple, FileText, Calendar, CurrencyDollar } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import type { InvestmentReport } from '@/common/data/investment'
import dayjs from 'dayjs'

interface ReportListProps {
  reports: InvestmentReport[]
  onEdit: (reportId: string) => void
  prefixDataTestId: string
  showPagination?: boolean
}

export const ReportList: React.FC<ReportListProps> = ({ reports, onEdit, prefixDataTestId, showPagination = true }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const paginatedReports = showPagination
    ? reports.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : reports

  const totalPages = Math.ceil(reports.length / pageSize)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    return dayjs(dateString).format('MMM DD, YYYY')
  }

  const getReportScopeLabel = (scope: string | undefined) => {
    if (!scope) return '-'
    return getTranslationFromI18nKeyAndLabel(`report.scope.${scope.toLowerCase()}`, scope.replace(/_/g, ' '))
  }

  const getStatusBadge = (status: string | undefined) => {
    const statusConfig = {
      ACTIVE: {
        variant: 'default' as const,
        label: getTranslationFromI18nKeyAndLabel('report.status.active', 'Active')
      },
      ARCHIVED: {
        variant: 'secondary' as const,
        label: getTranslationFromI18nKeyAndLabel('report.status.archived', 'Archived')
      },
      DRAFT: { variant: 'outline' as const, label: getTranslationFromI18nKeyAndLabel('report.status.draft', 'Draft') }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (reports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <FileText size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
          {getTranslationFromI18nKeyAndLabel('report.list.empty.title', 'No Reports Found')}
        </h3>
        <p style={{ margin: 0, color: '#6b7280' }}>
          {getTranslationFromI18nKeyAndLabel(
            'report.list.empty.description',
            'No investment reports match your current filters.'
          )}
        </p>
      </div>
    )
  }

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'ReportList')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: '200px' }}>
              {getTranslationFromI18nKeyAndLabel('report.list.header.investment', 'Investment')}
            </TableHead>
            <TableHead style={{ width: '120px' }}>
              {getTranslationFromI18nKeyAndLabel('report.list.header.date', 'Date')}
            </TableHead>
            <TableHead style={{ width: '120px' }}>
              {getTranslationFromI18nKeyAndLabel('report.list.header.scope', 'Scope')}
            </TableHead>
            <TableHead style={{ width: '120px' }}>
              {getTranslationFromI18nKeyAndLabel('report.list.header.status', 'Status')}
            </TableHead>
            <TableHead style={{ width: '150px' }}>
              {getTranslationFromI18nKeyAndLabel('report.list.header.marketValue', 'Market Value')}
            </TableHead>
            <TableHead style={{ width: '100px' }}>
              {getTranslationFromI18nKeyAndLabel('report.list.header.actions', 'Actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedReports.map(report => (
            <TableRow key={report.id} data-testid={formatDataTestId(prefixDataTestId, `ReportRow-${report.id}`)}>
              <TableCell>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} style={{ color: '#6b7280' }} />
                  <div>
                    <div style={{ fontWeight: '500' }}>
                      {report.investment?.name ||
                        getTranslationFromI18nKeyAndLabel('report.list.unknown.investment', 'Unknown Investment')}
                    </div>
                    {report.investment?.code && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{report.investment.code}</div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} style={{ color: '#6b7280' }} />
                  {formatDate(report.date)}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getReportScopeLabel(report.scope)}</Badge>
              </TableCell>
              <TableCell>{getStatusBadge('ACTIVE')}</TableCell>
              <TableCell>
                {report.investmentMarketValue ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CurrencyDollar size={14} style={{ color: '#6b7280' }} />
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      notation: 'compact',
                      maximumFractionDigits: 1
                    }).format(report.investmentMarketValue)}
                  </div>
                ) : (
                  <span style={{ color: '#9ca3af' }}>-</span>
                )}
              </TableCell>
              <TableCell>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    data-testid={formatDataTestId(prefixDataTestId, `ViewButton-${report.id}`)}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement view functionality
                      console.log('View report:', report.id)
                    }}
                    style={{ padding: '4px 8px' }}
                  >
                    <Eye size={14} />
                  </Button>
                  <Button
                    data-testid={formatDataTestId(prefixDataTestId, `EditButton-${report.id}`)}
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(report.id)}
                    style={{ padding: '4px 8px' }}
                  >
                    <PencilSimple size={14} />
                  </Button>
                  <Button
                    data-testid={formatDataTestId(prefixDataTestId, `DownloadButton-${report.id}`)}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement download functionality
                      console.log('Download report:', report.id)
                    }}
                    style={{ padding: '4px 8px' }}
                  >
                    <DownloadSimple size={14} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '24px'
          }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {getTranslationFromI18nKeyAndLabel('pagination.previous', 'Previous')}
          </Button>

          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {getTranslationFromI18nKeyAndLabel('pagination.pageInfo', 'Page {current} of {total}', {
              current: currentPage,
              total: totalPages
            })}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            {getTranslationFromI18nKeyAndLabel('pagination.next', 'Next')}
          </Button>
        </div>
      )}
    </div>
  )
}
