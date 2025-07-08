"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { useLeadListData } from './hooks/useLeadListData';
import { LeadTable } from './components/LeadTable';
import { PiFunnelSimple, PiUsersFour } from 'react-icons/pi';
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
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const initialLoadDone = useRef(false);

  // Handle adding a new lead
  const handleAddLead = useCallback(() => {
    startProcess({
      domain: 'customer-relations',
      processName: 'createLead',
      builderType: 'NATIVE_SCREEN',
      payload: {}
    });
  }, []);

  // Get lead data with search
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
    search,
    accessToken
  });
  
  // Trigger initial data loading when component mounts
  useEffect(() => {
    if (!initialLoadDone.current && accessToken) {
      initialLoadDone.current = true;
      loadPage(1);
    }
  }, [loadPage, accessToken]);

  // Trigger search when search term changes
  useEffect(() => {
    if (initialLoadDone.current) {
      loadPage(1); // Reset to first page when search changes
    }
  }, [search, loadPage]);

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
  }, []);

  return (
    <div className="gba:w-full gba:h-screen gba:flex gba:flex-row gba:relative gba:bg-white">
      <PageLayout
        variant="default"
        headerIcon={<PiFunnelSimple size={24} className="gba:text-primary" />}
        headerLabel={t('lead.list_title', 'Lead List')}
        contentContainer={
          <DataContainer
            dataControllerProps={{
              search,
              setSearch: handleSearchChange,
              debounceDelay: 500,
              filter: [], // No filters for now
              setFilter: () => {}, // No filters for now
              filterLabelMap: {}, // No filters for now
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
              filterGroups: [], // No filter groups for now
              onFilterChange: () => {}, // No filter change for now
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
                  onSelectLead={handleSelectLead}
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
                        <div><strong>Owner:</strong> {selectedLead.ownerEmployee?.fullName || 
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
        }
      />
    </div>
  );
};

export default LeadList; 