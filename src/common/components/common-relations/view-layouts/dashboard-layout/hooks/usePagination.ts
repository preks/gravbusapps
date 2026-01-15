import { useState, useCallback } from 'react'

export interface UsePaginationProps {
  totalCount: number
  pageSize: number
  onPageChange?: (page: number, pageSize: number) => void
}

export interface UsePaginationReturn {
  currentPage: number
  pageSize: number
  totalPages: number
  handleNextPage: () => void
  handlePrevPage: () => void
  getPaginationInfo: () => {
    startItem: number
    endItem: number
    totalItems: number
  }
}

/**
 * Shared pagination hook for dashboard widgets
 */
export const usePagination = ({ totalCount, pageSize, onPageChange }: UsePaginationProps): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.ceil(totalCount / pageSize)

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      onPageChange?.(nextPage, pageSize)
    }
  }, [currentPage, totalPages, pageSize, onPageChange])

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1
      setCurrentPage(prevPage)
      onPageChange?.(prevPage, pageSize)
    }
  }, [currentPage, pageSize, onPageChange])

  const getPaginationInfo = useCallback(() => {
    return {
      startItem: (currentPage - 1) * pageSize + 1,
      endItem: Math.min(currentPage * pageSize, totalCount),
      totalItems: totalCount
    }
  }, [currentPage, pageSize, totalCount])

  return {
    currentPage,
    pageSize,
    totalPages,
    handleNextPage,
    handlePrevPage,
    getPaginationInfo
  }
}
