import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { DataFilter } from '@/components/data-filter/DataFilter';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useContactListData } from './hooks/useContactListData';
import { useContactStatisticsWithTrend } from './hooks/useContactStatisticsWithTrend';
import { useContactFilters } from './hooks/useContactFilters';
import { ContactStatisticsWithTrend } from './components/ContactStatistics';
import ContactTable from './components/ContactTable';
import { Contact } from './types';
import { Alert, Button, Modal, Form, Input, Select, message } from 'antd';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { PlusOutlined } from '@ant-design/icons';
import { startProcess } from '@/common/utils/start-process';

interface ContactListProps extends BusinessAppContextProps {
  sourceApp?: string;
}

const ContactList: React.FC<ContactListProps> = (context) => {
  const { sourceApp } = context;
  const locale = getCurrentActiveUserLocale();
  
  // State management
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const initialLoadDone = useRef(false);
  
  // Filters
  const contactFilters = useContactFilters(context);
  const appliedFilters = contactFilters.getFilters();
  
  // Data hooks
  const contactListData = useContactListData({
    search: appliedFilters.search,
    sortField,
    sortOrder,
    context: context,
    sourceApp,
    contactTypes: appliedFilters.contactTypes,
    jobTitles: appliedFilters.jobTitles,
    createdAfter: appliedFilters.createdAfter,
    createdBefore: appliedFilters.createdBefore
  });
  
  const contactStatistics = useContactStatisticsWithTrend({
    ...context,
    sourceApp
  });

  // Initial load effect
  useEffect(() => {
    if (!initialLoadDone.current && context.accessToken) {
      initialLoadDone.current = true;
      contactListData.loadPage(1, pageSize);
      contactStatistics.refetch();
    }
  }, [context.accessToken, pageSize]);

  // Auto-reload when filters change
  useEffect(() => {
    if (initialLoadDone.current && context.accessToken) {
      setCurrentPage(1);
      contactListData.loadPage(1, pageSize);
    }
  }, [
    JSON.stringify(appliedFilters.contactTypes),
    JSON.stringify(appliedFilters.jobTitles),
    appliedFilters.createdAfter,
    appliedFilters.createdBefore,
    context.accessToken,
    pageSize
  ]);

  // Auto-reload when search changes
  useEffect(() => {
    if (initialLoadDone.current && context.accessToken) {
      setCurrentPage(1);
      contactListData.loadPage(1, pageSize);
    }
  }, [appliedFilters.search, context.accessToken, pageSize]);

  // Auto-reload when sort changes
  useEffect(() => {
    if (initialLoadDone.current && context.accessToken) {
      contactListData.loadPage(currentPage, pageSize);
    }
  }, [sortField, sortOrder, context.accessToken, currentPage, pageSize]);

  // Handlers
  const handleContactClick = useCallback((contact: Contact) => {
    setSelectedContactId(contact.id);
    // TODO: Open contact detail side panel
    console.log('Contact clicked:', contact);
  }, []);

  const handleContactEdit = useCallback((contact: Contact) => {
    setSelectedContactId(contact.id);
    // TODO: Open contact edit modal
    console.log('Edit contact:', contact);
  }, []);

  const handleSort = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    // When order is empty, clear sorting completely
    if (order === '') {
      setSortField('');
      setSortOrder('DESC'); // Keep DESC as default for state type, but field will be empty
      setCurrentPage(1);
    } else {
      setSortField(field);
      setSortOrder(order);
      setCurrentPage(1);
    }
    contactListData.loadPage(1, pageSize);
  }, [contactListData, pageSize]);

  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    const targetPageSize = pageSize || 20;
    setCurrentPage(page);
    setPageSize(targetPageSize);
    contactListData.loadPage(page, targetPageSize);
  }, [contactListData]);

  const handleSearch = useCallback((searchTerm: string) => {
    contactFilters.setSearch(searchTerm);
    setCurrentPage(1);
    contactListData.loadPage(1, pageSize);
  }, [contactFilters, contactListData, pageSize]);

  const handleAddContact = useCallback(() => {
    startProcess({
      domain: 'customer-relations',
      processName: 'createContact',
      builderType: 'NATIVE_SCREEN',
      payload: {}
    });
  }, []);

  const handleRetryStatistics = useCallback(() => {
    contactStatistics.refetch();
  }, [contactStatistics]);

  const handleRetryData = useCallback(() => {
    contactListData.loadPage(currentPage, pageSize);
  }, [contactListData, currentPage, pageSize]);

  // Filter configuration
  const filterConfig = {
    groups: contactFilters.filterGroups,
    selectedFilters: contactFilters.selectedFilters,
    onAddFilter: contactFilters.addFilter,
    onRemoveFilter: contactFilters.removeFilter,
    labelMap: contactFilters.filterLabelMap,
    searchValue: contactFilters.search,
    onSearchChange: handleSearch,
    showDateRangeFilter: true,
    onDateRangeChange: contactFilters.handleDateRangeChange
  };

  // If there's an error loading contacts, show error state
  if (contactListData.error) {
    return (
      <div data-testid="contact-list-error">
        
        <Alert
          message="Error Loading Contacts"
          description={contactListData.error instanceof Error ? contactListData.error.message : String(contactListData.error)}
          type="error"
          showIcon
          data-testid="contact-list-error"
        />
      </div>
    );
  }

  return (
    <div data-testid="contact-list-content">
      <div data-testid="contact-statistics-section" className="gba:mb-6">
        {contactStatistics.trendData ? (
          <ContactStatisticsWithTrend
            trendData={contactStatistics.trendData}
            isLoading={contactStatistics.isLoading}
            error={contactStatistics.error}
            onRetry={handleRetryStatistics}
          />
        ) : (
          <div>Loading statistics...</div>
        )}
      </div>

      <DataContainer
        dataControllerProps={{
          search: contactFilters.search,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: contactFilters.selectedFilters,
          setFilter: (filters: string[]) => {
            // This is called by DataController's "Clear all filters" button or individual filter removal
            if (filters.length === 0) {
              // Clear all filters
              contactFilters.clearAllFilters();
            } else {
              // Handle individual filter removal - find which filters were removed and remove them
              const removedFilters = contactFilters.selectedFilters.filter(f => !filters.includes(f));
              removedFilters.forEach(filterId => contactFilters.removeFilter(filterId));
            }
          },
          filterLabelMap: contactFilters.filterLabelMap,
          dateRange: {
            createdAfter: contactFilters.createdAfter,
            createdBefore: contactFilters.createdBefore,
            onClear: () => contactFilters.handleDateRangeChange(undefined, undefined)
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Contacts</span>
                <span className="gba:text-gray-500">({contactListData.total})</span>
              </div>
            </div>
          ),
          addButton: {
            onClick: handleAddContact,
            label: 'Add',
            'data-testid': 'add-contact-button'
          },
        }}
        dataFilterProps={{
          filterGroups: contactFilters.filterGroups,
          onFilterChange: (filterId: string, selected: boolean) => {
            selected ? contactFilters.addFilter(filterId) : contactFilters.removeFilter(filterId);
          }
        }}
        dataBody={
          <div data-testid="contact-table-container">
            <ContactTable
              {...context}
              contacts={contactListData.contacts}
              loading={contactListData.loading}
              error={contactListData.error}
              hasMore={contactListData.hasMore}
              loadMore={contactListData.loadMore}
              loadPage={contactListData.loadPage}
              retry={contactListData.retry}
              total={contactListData.total}
              pageSize={pageSize}
              currentPage={currentPage}
              sortField={sortField}
              sortOrder={sortOrder}
              onSelectContact={handleContactClick}
              onPaginationChange={handlePageChange}
              onSortingChange={handleSort}
              selectedContactId={selectedContactId}
            />
          </div>
        }
      />
    </div>
  );
};

export default ContactList; 