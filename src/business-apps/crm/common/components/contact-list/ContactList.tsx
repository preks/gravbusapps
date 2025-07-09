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
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
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
    accessToken: context.accessToken,
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

  const handlePageChange = useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
    contactListData.loadPage(page, size);
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
      <Alert
        message="Error Loading Contacts"
        description={contactListData.error.message}
        type="error"
        showIcon
        action={
          <Button icon={<ReloadOutlined />} onClick={handleRetryData}>
            Retry
          </Button>
        }
        data-testid="contact-list-error"
      />
    );
  }

  return (
    <div className="gba:w-full gba:h-screen gba:flex gba:flex-row gba:relative gba:bg-white">
      <PageLayout
        variant="default"
        headerIcon={<PlusOutlined size={24} className="gba:text-primary" />}
        headerLabel="Contact List"
        contentContainer={
          <div data-testid="contact-content-wrapper">
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
                    total={contactListData.total}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onRowClick={handleContactClick}
                    onEdit={handleContactEdit}
                    onSort={handleSort}
                    onPageChange={handlePageChange}
                  />
                </div>
              }
              floatingDetails={false}
            />

            {/* Add Contact Modal */}
            <Modal
              title="Add New Contact"
              open={isAddModalVisible}
              onCancel={() => setIsAddModalVisible(false)}
              footer={null}
              data-testid="contact-add-modal"
            >
              <Form layout="vertical">
                <Form.Item label="First Name" required>
                  <Input placeholder="Enter first name" />
                </Form.Item>
                <Form.Item label="Last Name" required>
                  <Input placeholder="Enter last name" />
                </Form.Item>
                <Form.Item label="Email">
                  <Input type="email" placeholder="Enter email address" />
                </Form.Item>
                <Form.Item label="Phone">
                  <Input placeholder="Enter phone number" />
                </Form.Item>
                <Form.Item label="Job Title">
                  <Input placeholder="Enter job title" />
                </Form.Item>
                <Form.Item label="Contact Type">
                  <Select placeholder="Select contact type">
                    <Select.Option value="Primary">Primary</Select.Option>
                    <Select.Option value="Secondary">Secondary</Select.Option>
                    <Select.Option value="Technical">Technical</Select.Option>
                    <Select.Option value="Financial">Financial</Select.Option>
                    <Select.Option value="Executive">Executive</Select.Option>
                  </Select>
                </Form.Item>
              </Form>
            </Modal>
          </div>
        }
      />
    </div>
  );
};

export default ContactList; 