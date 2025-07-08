"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { useLeadListData } from './hooks/useLeadListData';
import { useLeadFilters } from './hooks/useLeadFilters';
import { LeadTable } from './components/LeadTable';
import LeadStatistics from './components/LeadStatistics';
import { useLeadStatistics } from './hooks/useLeadStatistics';

import { PiStar, PiUsersFour, PiFunnelSimple } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';
import { Lead } from './types';

/**
 * Lead List page component. Renders the lead list module with a table view.
 * @returns {JSX.Element}
 */
export const LeadList: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props;
  const { t } = useTranslation();

  // Use the centralized lead filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters,
    createdAfter: filterCreatedAfter,
    createdBefore: filterCreatedBefore,
    handleDateRangeChange: filterHandleDateRangeChange
  } = useLeadFilters(props);

  // Get initial values from URL parameters using standard web APIs - ONLY ONCE
  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      search: urlParams.get('search') || '',
      page: parseInt(urlParams.get('page') || '1', 10),
      pageSize: parseInt(urlParams.get('pageSize') || '20', 10),
      sortField: urlParams.get('sortField') || 'createdAt',
      sortOrder: urlParams.get('sortOrder') || 'DESC'
    };
  });

  const [currentPage, setCurrentPage] = useState(initialParams.page);
  const [pageSize, setPageSize] = useState(initialParams.pageSize);
  const [sortField, setSortField] = useState(initialParams.sortField);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(initialParams.sortOrder as 'ASC' | 'DESC');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const initialLoadDone = useRef(false);

  // Initialize search from URL if not already set - ONLY ONCE
  useEffect(() => {
    if (initialParams.search && !search) {
      setSearch(initialParams.search);
    }
  }, []); // Remove dependencies to prevent re-running

  // Update URL parameters using standard web APIs
  const updateURLParams = useCallback((params: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) => {
    const newSearchParams = new URLSearchParams(window.location.search);
    
    if (params.search !== undefined) {
      if (params.search) {
        newSearchParams.set('search', params.search);
      } else {
        newSearchParams.delete('search');
      }
    }
    
    if (params.page !== undefined) {
      if (params.page > 1) {
        newSearchParams.set('page', params.page.toString());
      } else {
        newSearchParams.delete('page');
      }
    }
    
    if (params.pageSize !== undefined) {
      if (params.pageSize !== 20) {
        newSearchParams.set('pageSize', params.pageSize.toString());
      } else {
        newSearchParams.delete('pageSize');
      }
    }
    
    if (params.sortField !== undefined) {
      if (params.sortField !== 'createdAt') {
        newSearchParams.set('sortField', params.sortField);
      } else {
        newSearchParams.delete('sortField');
      }
    }
    
    if (params.sortOrder !== undefined) {
      if (params.sortOrder !== 'DESC') {
        newSearchParams.set('sortOrder', params.sortOrder);
      } else {
        newSearchParams.delete('sortOrder');
      }
    }

    const newURL = `${window.location.pathname}?${newSearchParams.toString()}`;
    window.history.replaceState({}, '', newURL);
  }, []);

  // Handle adding a new lead
  const handleAddLead = useCallback(() => {
    startProcess({
      domain: 'customer-relations',
      processName: 'createLead',
      builderType: 'NATIVE_SCREEN',
      payload: {}
    });
  }, []);

  // Adapter function for DataFilter component
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    selected ? addFilter(filterId) : removeFilter(filterId);
  }, [addFilter, removeFilter]);

  // Function for DataController setFilter requirement
  const handleSetFilter = useCallback((filters: string[]) => {
    // This is called by DataController but we manage filters through addFilter/removeFilter
    // so we can implement this as a no-op or sync with selectedFilters if needed
  }, []);

  // Get lead data with search, sorting, and filters
  const { 
    leads, 
    total, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    loadPage,
    retry 
  } = useLeadListData({
    ...getFilters(),
    sortField,
    sortOrder,
    accessToken
  });

  // Get lead statistics (independent from search/filters)
  const {
    statistics,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useLeadStatistics(props);
  
  // Trigger initial data loading when component mounts
  useEffect(() => {
    if (!initialLoadDone.current && accessToken) {
      initialLoadDone.current = true;
      loadPage(currentPage, pageSize);
    }
  }, [loadPage, accessToken, currentPage, pageSize]);

  // Trigger search when search term changes
  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1);
      updateURLParams({ search, page: 1 });
      loadPage(1, pageSize); // Reset to first page when search changes
    }
  }, [search, loadPage, pageSize, updateURLParams]);

  // Trigger reload when filters change
  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1);
      loadPage(1, pageSize);
    }
  }, [selectedFilters, filterCreatedAfter, filterCreatedBefore, loadPage, pageSize]);

  // Handle lead selection
  const handleSelectLead = useCallback((lead: Lead) => {
    setSelectedLead(lead);
  }, []);

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedLead(null);
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, [setSearch]);

  // Handle pagination change
  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    const targetPageSize = newPageSize || pageSize;
    setCurrentPage(page);
    setPageSize(targetPageSize);
    updateURLParams({ page, pageSize: targetPageSize });
    loadPage(page, targetPageSize);
  }, [pageSize, updateURLParams, loadPage]);

  // Handle sorting change
  const handleSortingChange = useCallback((field: string, order: 'ASC' | 'DESC') => {
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
    updateURLParams({ sortField: field, sortOrder: order, page: 1 });
    loadPage(1, pageSize);
  }, [pageSize, updateURLParams, loadPage]);



  return (
    <div className="gba:w-full gba:h-screen gba:flex gba:flex-row gba:relative gba:bg-white">
      <PageLayout
        variant="default"
        headerIcon={<PiStar size={24} className="gba:text-primary" />}
        headerLabel={t('lead.list_title', 'Lead List')}
        contentContainer={
          <div data-testid="lead-content-wrapper">
            <div data-testid="lead-statistics-section" className="gba:mb-6">
              <LeadStatistics
                statistics={statistics}
                isLoading={statsLoading}
                error={statsError}
                onRetry={refetchStats}
              />
            </div>

          <DataContainer
            dataControllerProps={{
              search,
              setSearch: handleSearchChange,
              debounceDelay: 500,
              filter: selectedFilters,
              setFilter: handleSetFilter,
              filterLabelMap: filterLabelMap,
              dateRange: {
                createdAfter: filterCreatedAfter,
                createdBefore: filterCreatedBefore,
                onClear: () => filterHandleDateRangeChange(undefined, undefined)
              },
              listTitle: (
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <PiUsersFour size={20} />
                    <span>{t('lead.list_title', 'Leads')}</span>
                    <span className="gba:text-gray-500">({total})</span>
                  </div>
                </div>
              ),
              addButton: {
                onClick: handleAddLead,
                label: 'Add',
                'data-testid': 'add-lead-button'
              },
            }}
            dataFilterProps={{
              filterGroups: filterGroups,
              onFilterChange: handleFilterChange,
            }}
            dataBody={
              <div data-testid="lead-table-container">
                <LeadTable
                  leads={leads}
                  loading={loading}
                  error={error}
                  hasMore={hasMore}
                  loadMore={loadMore}
                  loadPage={loadPage}
                  retry={retry}
                  total={total}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSelectLead={handleSelectLead}
                  onPaginationChange={handlePaginationChange}
                  onSortingChange={handleSortingChange}
                  selectedLeadId={selectedLead?.id}
                  accessToken={accessToken}
                />
              </div>
            }
            dataDetails={selectedLead ? {
              title: `${selectedLead.firstName || ''} ${selectedLead.lastName || ''}`.trim() || 'Lead Details',
              icon: <PiFunnelSimple size={20} />,
              content: (
                <div className="gba:p-4">
                  <div className="gba:space-y-4">
                    <div>
                      <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Contact Information</h3>
                      <div className="gba:space-y-2">
                        <div><strong>Name:</strong> {selectedLead.firstName} {selectedLead.lastName}</div>
                        <div><strong>Email:</strong> {selectedLead.email || selectedLead.contact?.email || '-'}</div>
                        <div><strong>Phone:</strong> {selectedLead.phoneNumber || selectedLead.contact?.phone || '-'}</div>
                        <div><strong>Position:</strong> {selectedLead.position || '-'}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Company Information</h3>
                      <div className="gba:space-y-2">
                        <div><strong>Company:</strong> {selectedLead.companyName || selectedLead.account?.name || '-'}</div>
                        <div><strong>Website:</strong> {selectedLead.companyWebsite || '-'}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Lead Information</h3>
                      <div className="gba:space-y-2">
                        <div><strong>Status:</strong> {selectedLead.leadStatus?.value || '-'}</div>
                        <div><strong>Source:</strong> {selectedLead.leadSource?.value || '-'}</div>
                        <div><strong>Rating:</strong> {selectedLead.leadRating?.value || '-'}</div>
                        <div><strong>Owner:</strong> {selectedLead.ownerEmployee?.displayName || 
                          `${selectedLead.ownerEmployee?.firstName || ''} ${selectedLead.ownerEmployee?.lastName || ''}`.trim() || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ),
              onClose: handleCloseDetails
            } : undefined}
            floatingDetails={true}
          />
          </div>
        }
      />
    </div>
  );
};

export default LeadList; 