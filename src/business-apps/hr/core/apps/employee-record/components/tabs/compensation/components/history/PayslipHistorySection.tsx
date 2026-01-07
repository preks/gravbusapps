'use client'

import React, { useState, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast
} from '@newwork/nw-design-system'
import { PiDownload, PiMagnifyingGlass, PiEye } from 'react-icons/pi'
import { EmployeePayslip } from '../../types/compensationTypes'
import { getPayslipStatusLabel, getPayslipStatusVariant } from '../../types/compensationEnums'
import { sanitizeFilename } from '@/common/utils/textUtils'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DebouncedInput } from '@/components/debounced-input'

interface PayslipHistorySectionProps extends BusinessAppContextProps {
  t: (key: string, params?: any) => string
  payslips: EmployeePayslip[]
  loading: boolean
  locale: string
}

/**
 * Payslip History Section Component
 * Displays employee payslip history with search, filter, and download capabilities
 */
const PayslipHistorySection: React.FC<PayslipHistorySectionProps> = ({ t, payslips, loading, locale }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 3

  // Extract unique years from payslips
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(payslips.map(p => p.fiscalYear))).sort((a, b) => b - a)
    return years
  }, [payslips])

  // Filter payslips based on search and year
  const filteredPayslips = useMemo(() => {
    let filtered = [...payslips]

    // Filter by year
    if (selectedYear !== 'all') {
      filtered = filtered.filter(p => p.fiscalYear === Number.parseInt(selectedYear))
    }

    // Filter by search query (month name and year)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => p.monthName.toLowerCase().includes(query))
    }

    return filtered
  }, [payslips, selectedYear, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredPayslips.length / itemsPerPage)
  const paginatedPayslips = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredPayslips.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredPayslips, currentPage])

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedYear])

  /**
   * Render payslip content based on loading state and data availability
   */
  const renderContent = () => {
    // Loading state
    if (loading) {
      return <div className="gba:text-center gba:text-muted-foreground gba:py-8">{t('payslip-loading')}</div>
    }

    // Empty state
    if (filteredPayslips.length === 0) {
      const hasActiveFilters = searchQuery || selectedYear !== 'all'
      const emptyMessage = hasActiveFilters ? t('payslip-no-results') : t('payslip-no-data')
      return <div className="gba:text-center gba:text-muted-foreground gba:py-8">{emptyMessage}</div>
    }

    // Content with table and pagination
    return (
      <>
        <Table data-testid="payslip-history-table">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[150px]">{t('payslip-table-month')}</TableHead>
              <TableHead className="gba:w-[100px]">{t('payslip-table-year')}</TableHead>
              <TableHead className="gba:w-[150px]">{t('payslip-table-gross-amount')}</TableHead>
              <TableHead className="gba:w-[120px]">{t('payslip-table-status')}</TableHead>
              <TableHead className="gba:w-[80px] gba:text-center">{t('payslip-table-view')}</TableHead>
              <TableHead className="gba:w-[80px] gba:text-center">{t('payslip-table-download')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPayslips.map(payslip => {
              return (
                <TableRow key={payslip.id} data-testid={`payslip-history-row-${payslip.id}`}>
                  <TableCell className="gba:w-[150px]">
                    <div className="gba:font-medium">{payslip.payPeriod || '-'}</div>
                  </TableCell>
                  <TableCell className="gba:w-[100px]">
                    <div className="gba:font-medium">{payslip.fiscalYear || '-'}</div>
                  </TableCell>
                  <TableCell className="gba:w-[150px]">
                    <div className="gba:font-semibold gba:text-foreground">
                      {formatCurrencyString(payslip.grossAmount, {
                        currency: payslip.currency.code,
                        locale: locale,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="gba:w-[120px]">
                    <Badge variant={getPayslipStatusVariant(payslip.status)}>
                      {getPayslipStatusLabel(payslip.status, t)}
                    </Badge>
                  </TableCell>
                  <TableCell className="gba:w-[80px] gba:text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(payslip)}
                      data-testid={`payslip-view-button-${payslip.id}`}
                      title={t('payslip-view-tooltip')}
                    >
                      <PiEye className="gba:w-4 gba:h-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="gba:w-[80px] gba:text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(payslip)}
                      data-testid={`payslip-download-button-${payslip.id}`}
                      title={t('payslip-download-tooltip')}
                    >
                      <PiDownload className="gba:w-4 gba:h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:mt-4 gba:pt-4 gba:border-t">
            <div className="gba:text-sm gba:text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredPayslips.length)} of {filteredPayslips.length} payslips
            </div>
            <div className="gba:flex gba:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="payslip-pagination-prev"
              >
                Previous
              </Button>
              <div className="gba:flex gba:items-center gba:gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    data-testid={`payslip-pagination-page-${page}`}
                    className="gba:min-w-[2.5rem]"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="payslip-pagination-next"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  // Handle view - opens document in new tab for viewing
  const handleView = (payslip: EmployeePayslip) => {
    if (!payslip.documentUrl) {
      toast.warning(t('payslip-no-document'))
      return
    }
    window.open(payslip.documentUrl, '_blank', 'noopener,noreferrer')
  }

  // Handle download - triggers actual file download
  const handleDownload = (payslip: EmployeePayslip) => {
    if (!payslip.documentUrl) {
      toast.warning(t('payslip-no-document'))
      return
    }

    try {
      // Generate safe filename
      const filename = sanitizeFilename(`payslip-${payslip.payPeriod || payslip.fiscalYear}.pdf`)

      // Create download link
      const link = document.createElement('a')
      link.href = payslip.documentUrl
      link.download = filename
      link.setAttribute('rel', 'noopener noreferrer')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading payslip:', error)
      toast.warning(t('payslip-download-failed'))
    }
  }

  return (
    <Card data-testid="payslip-history-section">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <CardTitle>{t('payslip-title')}</CardTitle>
          <div className="gba:flex gba:items-center gba:gap-3">
            {/* Search Input */}
            <div className="gba:w-[260px] gba:shrink-0">
              <DebouncedInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('payslip-search-placeholder')}
                debounceDelay={300}
                className="gba:w-full"
                icon={<PiMagnifyingGlass className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
                data-testid="payslip-history-search-input"
              />
            </div>

            {/* Year Filter */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="gba:w-32" data-testid="payslip-history-year-filter">
                <SelectValue placeholder={t('payslip-filter-all-years')} />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value="all">{t('payslip-filter-all-years')}</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  )
}

export default PayslipHistorySection
