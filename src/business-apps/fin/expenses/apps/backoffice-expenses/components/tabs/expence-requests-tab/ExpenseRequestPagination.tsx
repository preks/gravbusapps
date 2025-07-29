import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@newwork/nw-design-system';

interface ExpenseRequestPaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export const ExpenseRequestPagination: React.FC<ExpenseRequestPaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  
  if (totalPages <= 1) {
    return null;
  }

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="gba:flex gba:justify-center gba:mt-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => onPageChange(currentPage - 1, pageSize)}
              className={currentPage <= 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
            />
          </PaginationItem>
          
          {generatePageNumbers().map((page, index) => (
            <PaginationItem key={index}>
              {page === '...' ? (
                <span className="gba:px-3 gba:py-2">...</span>
              ) : (
                <PaginationLink
                  onClick={() => onPageChange(page as number, pageSize)}
                  className={
                    page === currentPage 
                      ? 'gba:bg-primary gba:text-primary-foreground' 
                      : 'gba:cursor-pointer'
                  }
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => onPageChange(currentPage + 1, pageSize)}
              className={currentPage >= totalPages ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}; 