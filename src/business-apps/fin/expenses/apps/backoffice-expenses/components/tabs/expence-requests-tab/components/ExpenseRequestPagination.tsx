import React from 'react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@newwork/nw-design-system'

interface ExpenseRequestPaginationProps {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (pagination: any) => void
}

const ExpenseRequestPagination: React.FC<ExpenseRequestPaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange
}) => {
  if (totalItems <= 0) {
    return null
  }

  const totalPages = Math.ceil(totalItems / pageSize)

  return (
    <div className="gba:flex gba:justify-between gba:items-center gba:mt-4 gba:px-4">
      <div className="gba:text-sm gba:text-gray-600">
        {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} items`}
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange({ current: currentPage - 1, pageSize })}
              className={currentPage <= 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
            .map((page, index, array) => (
              <React.Fragment key={page}>
                {index > 0 && array[index - 1] !== page - 1 && (
                  <PaginationItem>
                    <span className="gba:px-2">...</span>
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => onPageChange({ current: page, pageSize })}
                    className={page === currentPage ? 'gba:bg-blue-500 gba:text-white' : 'gba:cursor-pointer'}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              </React.Fragment>
            ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange({ current: currentPage + 1, pageSize })}
              className={currentPage >= totalPages ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export default ExpenseRequestPagination
