import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { DataFilter } from '@/components/data-filter/DataFilter';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useContactListData } from './hooks/useContactListData';
import { useContactStatistics } from './hooks/useContactStatistics';
import { useContactFilters } from './hooks/useContactFilters';
import ContactStatistics from './components/ContactStatistics';
import ContactTable from './components/ContactTable';
import { Contact } from './types';
import { Alert, Button, Modal, Form, Input, Select, message } from 'antd';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';

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
  const [sortField, setSortField] = useState('createdAt');
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
  
  const contactStatistics = useContactStatistics({
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
  }, [context.accessToken, contactListData, contactStatistics, pageSize]);

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

  const handleSort = useCallback((field: string, order: 'ASC' | 'DESC') => {
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
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
    setIsAddModalVisible(true);
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

  if (contactListData.error && !contactListData.loading) {
    return (
      <div data-testid="contact-list-content">
        <div data-testid="contact-statistics-section" className="gba:mb-6">
          <ContactStatistics
            statistics={contactStatistics.statistics}
            isLoading={contactStatistics.isLoading}
            error={contactStatistics.error}
            onRetry={handleRetryStatistics}
          />
        </div>
        
        <Alert
          message="Error Loading Contacts"
          description={contactListData.error instanceof Error ? contactListData.error.message : String(contactListData.error)}
          type="error"
          showIcon
          action={
            <Button icon={<ReloadOutlined />} onClick={handleRetryData}>
              Retry
            </Button>
          }
          data-testid="contact-list-error"
        />
      </div>
    );
  }

  return (
    <div data-testid="contact-list-content">
      <div data-testid="contact-statistics-section" className="gba:mb-6">
        <ContactStatistics
          statistics={contactStatistics.statistics}
          isLoading={contactStatistics.isLoading}
          error={contactStatistics.error}
          onRetry={handleRetryStatistics}
        />
      </div>

      <DataContainer
        dataControllerProps={{
          search: contactFilters.search,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: contactFilters.selectedFilters,
          setFilter: () => {}, // No-op for now
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
            label: 'Add Contact',
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