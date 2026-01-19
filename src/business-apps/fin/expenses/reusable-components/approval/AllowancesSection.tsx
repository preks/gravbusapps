import React, { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AllowanceItem {
  id: string
  expenseDate?: string
  totalAmount: number
}

interface AllowancesSectionProps {
  allowanceItems: AllowanceItem[]
  currencyCode: string
  formatCurrency: (amount: number, currencyCode: string) => string
  prefixDataTestId?: string
}

const AllowancesSection: React.FC<AllowancesSectionProps> = ({
  allowanceItems,
  currencyCode,
  formatCurrency,
  prefixDataTestId = 'approve-expense'
}) => {
  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString)
    const days = [
      getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.sunday', 'Sunday'),
      getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.monday', 'Monday'),
      getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.tuesday', 'Tuesday'),
      getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.wednesday', 'Wednesday'),
      getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.thursday', 'Thursday'),
      getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.friday', 'Friday'),
      getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.saturday', 'Saturday')
    ]
    return days[date.getDay()]
  }

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4
  const totalPages = Math.ceil(allowanceItems.length / itemsPerPage)
  const showPagination = allowanceItems.length > itemsPerPage

  // Calculate start and end indices for current page
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = allowanceItems.slice(startIndex, endIndex)

  if (allowanceItems.length === 0) {
    return null
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div data-testid={`${prefixDataTestId}-allowances`}>
      {/* Title - Grayed out full width */}
      <div className="gba:bg-gray-100 gba:p-3 gba:rounded-sm gba:mb-4 gba:w-full">
        <span className="gba:text-foreground gba:text-sm gba:font-semibold gba:pl-3">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_request.allowances_header',
            'Estimated Allowances'
          )}
          ({allowanceItems.length})
        </span>
      </div>

      {/* Allowances List */}
      {currentItems.length > 0
        ? currentItems.map((item, index) => (
            <div
              key={item.id}
              className="gba:mb-3 gba:pl-6"
              data-testid={`${prefixDataTestId}-allowance-${startIndex + index}`}
            >
              <div className="gba:font-semibold gba:text-foreground">
                {item.expenseDate && getDayOfWeek(item.expenseDate)}
              </div>
              <div className="gba:flex gba:justify-between gba:items-center">
                <div className="gba:text-muted-foreground">{item.expenseDate && formatDate(item.expenseDate)}</div>
                <div className="gba:font-semibold gba:text-foreground">
                  {formatCurrency(item.totalAmount, currencyCode)}
                </div>
              </div>
            </div>
          ))
        : ''}

      {/* Pagination */}
      {showPagination && (
        <div data-testid={`${prefixDataTestId}-allowances-pagination`}>
          <div className="gba:flex gba:justify-center gba:text-sm gba:text-muted-foreground gba:mb-2 gba:block w-full">
            {`${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} ${currentPage} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'Of')} ${totalPages} (Showing ${currentItems.length} of ${allowanceItems.length} items)`}
          </div>
          <div className="gba:flex gba:justify-center gba:items-center gba:gap-2 gba:mt-4 gba:mb-2 gba:block w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              data-testid={`${prefixDataTestId}-allowances-prev-page`}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.previous', 'Previous')}
            </Button>

            <div className="gba:flex gba:items-center gba:gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="gba:min-w-[32px] gba:h-[32px] gba:p-0"
                  data-testid={`${prefixDataTestId}-allowances-page-${page}`}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              data-testid={`${prefixDataTestId}-allowances-next-page`}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.next', 'Next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AllowancesSection
