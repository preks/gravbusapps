import React, { useEffect, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useAdvancePayments, useAdvancePaymentFilters } from '../hooks/useAdvancePayments';
import { AdvancePaymentData } from '../hooks/useAdvancePayments';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface AdvancePaymentsExampleProps extends BusinessAppContextProps {
  employeeId: string;
}

const AdvancePaymentsExample: React.FC<AdvancePaymentsExampleProps> = ({ 
  employeeId, 
  accessToken 
}) => {
  const [advancePayments, setAdvancePayments] = useState<AdvancePaymentData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const { fetchAdvancePayments, isLoading, error } = useAdvancePayments({ 
    accessToken 
  });
  
  const { 
    filters, 
    updateFilters, 
    clearFilters, 
    hasActiveFilters 
  } = useAdvancePaymentFilters();

  const loadAdvancePayments = async () => {
    try {
      const result = await fetchAdvancePayments({
        employeeId,
        limit: 20,
        offset: (currentPage - 1) * 20,
        searchTerm: searchTerm || '%',
        filters
      });

      setAdvancePayments(result.AdvancePayment);
      setTotalCount(result.AdvancePaymentAggregate.aggregate.count);
    } catch (err) {
      console.error('Failed to load advance payments:', err);
    }
  };

  useEffect(() => {
    loadAdvancePayments();
  }, [employeeId, currentPage, searchTerm, filters]);

  const handleStatusFilterChange = (statuses: string[]) => {
    updateFilters({ statusFilter: statuses });
  };

  const handleAmountRangeChange = (min?: number, max?: number) => {
    updateFilters({ 
      amountRange: { min, max } 
    });
  };

  const handleAdvanceRangeChange = (min?: number, max?: number) => {
    updateFilters({ 
      advanceRange: { min, max } 
    });
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div data-testid="advance-payments-example">
      <div data-testid="advance-payments-filters">
        <h3>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.filters','Filters')}</h3>
        
        {/* Status Filter */}
        <div data-testid="status-filter">
          <label>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.status_filter','Status:')}</label>
          <select 
            multiple 
            value={filters.statusFilter || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              handleStatusFilterChange(selected);
            }}
            data-testid="status-filter-select"
          >
            <option value="PENDING">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.pending','Pending')}</option>
            <option value="APPROVED">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.approved','Approved')}</option>
            <option value="PAID">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.paid','Paid')}</option>
            <option value="REJECTED">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rejected','Rejected')}</option>
          </select>
        </div>

        {/* Amount Range Filter */}
        <div data-testid="amount-range-filter">
          <label>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount_range_filter','Amount Range:')}</label>
          <input 
            type="number" 
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.min_amount','Min amount')}
            onChange={(e) => handleAmountRangeChange(
              e.target.value ? Number(e.target.value) : undefined, 
              filters.amountRange?.max
            )}
            data-testid="amount-min-input"
          />
          <input 
            type="number" 
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.max_amount','Max amount')}
            onChange={(e) => handleAmountRangeChange(
              filters.amountRange?.min, 
              e.target.value ? Number(e.target.value) : undefined
            )}
            data-testid="amount-max-input"
          />
        </div>

        {/* Advance Range Filter */}
        <div data-testid="advance-range-filter">
          <label>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.advance_range_filter','Advance Range:')}</label>
          <input 
            type="number" 
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.min_advance','Min advance')}
            onChange={(e) => handleAdvanceRangeChange(
              e.target.value ? Number(e.target.value) : undefined, 
              filters.advanceRange?.max
            )}
            data-testid="advance-min-input"
          />
          <input 
            type="number" 
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.max_advance','Max advance')}
            onChange={(e) => handleAdvanceRangeChange(
              filters.advanceRange?.min, 
              e.target.value ? Number(e.target.value) : undefined
            )}
            data-testid="advance-max-input"
          />
        </div>

        {/* Search */}
        <div data-testid="search-filter">
          <label>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.search_filter','Search:')}</label>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.search_advance_payments','Search advance payments...')}
            data-testid="search-input"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            data-testid="clear-filters-button"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.clear_filters','Clear Filters')}
          </button>
        )}
      </div>

      {/* Results */}
      <div data-testid="advance-payments-results">
        {isLoading ? (
          <div data-testid="loading-spinner">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.loading','Loading...')}</div>
        ) : error ? (
                      <div data-testid="error-message">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.error','Error:')} {error}</div>
        ) : (
          <>
            <div data-testid="results-summary">
              Showing {advancePayments.length} of {totalCount} advance payments
            </div>
            
            <div data-testid="advance-payments-list">
              {advancePayments.map(payment => (
                <div key={payment.id} data-testid={`payment-item-${payment.id}`}>
                  <h4>{payment.code}</h4>
                  <p>{payment.description}</p>
                  <p>Amount: {payment.amount} {payment.currency.code}</p>
                  <p>Status: {payment.status}</p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div data-testid="pagination">
              <button 
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                data-testid="prev-page-button"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.previous','Previous')}
              </button>
              <span data-testid="current-page">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page','Page')} {currentPage}</span>
              <button 
                disabled={advancePayments.length < 20}
                onClick={() => handlePageChange(currentPage + 1)}
                data-testid="next-page-button"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.next','Next')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancePaymentsExample; 