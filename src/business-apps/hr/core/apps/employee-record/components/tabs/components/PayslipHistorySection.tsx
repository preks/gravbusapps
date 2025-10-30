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
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast
} from '@newwork/nw-design-system'
import { PiDownload, PiMagnifyingGlass, PiEye } from 'react-icons/pi'
import { EmployeePayslip } from '../../../types/compensationTypes'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../common/utils/windowUtils'
import { getPayslipStatusLabel, getPayslipStatusVariant } from '../../../types/compensationEnums'
import { sanitizeFilename } from '../../../../../../../../common/utils/textUtils'

interface PayslipHistorySectionProps {
  payslips: EmployeePayslip[]
  loading: boolean
}

/**
 * Payslip History Section Component
 * Displays employee payslip history with search, filter, and download capabilities
 */
const PayslipHistorySection: React.FC<PayslipHistorySectionProps> = ({ payslips, loading }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 3

  // Format currency for display
  const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

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
      filtered = filtered.filter(p => p.fiscalYear === parseInt(selectedYear))
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

  // Handle view - opens document in new tab for viewing
  const handleView = (payslip: EmployeePayslip) => {
    if (!payslip.documentUrl) {
      toast.warning(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:compensation.payslip.no_document',
          'Payslip document is not available at the moment.'
        )
      )
      return
    }
    window.open(payslip.documentUrl, '_blank', 'noopener,noreferrer')
  }

  // Handle download - triggers actual file download
  const handleDownload = (payslip: EmployeePayslip) => {
    if (!payslip.documentUrl) {
      toast.warning(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:compensation.payslip.no_document',
          'Payslip document is not available at the moment.'
        )
      )
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
      toast.warning(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:compensation.payslip.download_failed',
          'Failed to download payslip. Please try again.'
        )
      )
    }
  }

  return (
    <Card data-testid="payslip-history-section">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.payslip_history', 'Payslip History')}
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-3">
            {/* Search Input */}
            <div className="gba:relative gba:w-64">
              <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                data-testid="payslip-history-search-input"
                placeholder="Search payslips..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-9"
              />
            </div>

            {/* Year Filter */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="gba:w-32" data-testid="payslip-history-year-filter">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value="all">All Years</SelectItem>
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
      <CardContent>
        {loading ? (
          <div className="gba:text-center gba:text-muted-foreground gba:py-8">Loading payslip history...</div>
        ) : filteredPayslips.length === 0 ? (
          <div className="gba:text-center gba:text-muted-foreground gba:py-8">
            {searchQuery || selectedYear !== 'all'
              ? 'No payslips found matching your filters'
              : 'No payslips available'}
          </div>
        ) : (
          <>
            <Table data-testid="payslip-history-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-[150px]">Month</TableHead>
                  <TableHead className="gba:w-[100px]">Year</TableHead>
                  <TableHead className="gba:w-[150px]">Gross Amount</TableHead>
                  <TableHead className="gba:w-[120px]">Status</TableHead>
                  <TableHead className="gba:w-[80px] gba:text-center">View</TableHead>
                  <TableHead className="gba:w-[80px] gba:text-center">Download</TableHead>
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
                          {formatCurrency(payslip.grossAmount, payslip.currency.code)}
                        </div>
                      </TableCell>
                      <TableCell className="gba:w-[120px]">
                        <Badge variant={getPayslipStatusVariant(payslip.status)}>
                          {getPayslipStatusLabel(payslip.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="gba:w-[80px] gba:text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(payslip)}
                          data-testid={`payslip-view-button-${payslip.id}`}
                          title="View Payslip"
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
                          title="Download Payslip"
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
        )}
      </CardContent>
    </Card>
  )
}

export default PayslipHistorySection
