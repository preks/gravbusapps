import React, { useState, useMemo } from 'react';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useOpportunityFormContext } from '../context/OpportunityFormContext';
import SearchableSelect from './SearchableSelect';
import { SelectOption } from '../types';
import { useAccounts, AccountData } from '../hooks/useAccounts';
import { useLeads, LeadData } from '../hooks/useLeads';

const prefixDataTestId = 'OpportunityForm';

const RelationshipInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
    businessAppContext,
  } = useOpportunityFormContext();

  // Use the GraphQL hooks for accounts and leads
  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    hasMore: accountsHasMore,
    searchAccounts,
    loadMore: loadMoreAccounts
  } = useAccounts({ accessToken: businessAppContext.accessToken });

  const {
    leads,
    loading: leadsLoading,
    error: leadsError,
    hasMore: leadsHasMore,
    searchLeads,
    loadMore: loadMoreLeads
  } = useLeads({ accessToken: businessAppContext.accessToken });

  // Convert account data to SelectOption format
  const accountOptions: SelectOption[] = useMemo(() => {
    return accounts.map((account: AccountData) => {
      const ownerName = account.ownerEmployee 
        ? `${account.ownerEmployee.firstName} ${account.ownerEmployee.lastName}`.trim()
        : '';
      
      const label = account.name || 'Unnamed Account';
      
      return {
        id: account.id,
        value: account.id,
        label: label, // Show only the account name
        name: account.name || 'Unnamed Account',
        extraInfo: {
          businessKey: account.businessKey,
          email: account.email,
          website: account.website,
          owner: ownerName
        }
      };
    });
  }, [accounts]);

  // Convert lead data to SelectOption format
  const leadOptions: SelectOption[] = useMemo(() => {
    return leads.map((lead: LeadData) => {
      // Filter out corrupted lastName that contains catalog references
      const cleanLastName = lead.lastName && !lead.lastName.includes(':') ? lead.lastName : '';
      const cleanFirstName = lead.firstName && !lead.firstName.includes(':') ? lead.firstName : '';
      
      // Build display name with priority order - ALWAYS show LEAD information, never contact
      let displayName = '';
      
      if (lead.name) {
        // Use the lead's name field if available
        displayName = lead.name;
      } else if (cleanFirstName || cleanLastName) {
        // Use the lead's personal name
        displayName = [cleanFirstName, cleanLastName].filter(Boolean).join(' ');
      } else if (lead.companyName) {
        // Use the lead's company name
        displayName = lead.companyName;
      } else if (lead.email) {
        // Use the lead's email as fallback
        displayName = lead.email;
      } else {
        // Final fallback
        displayName = 'Unnamed Lead';
      }
      
      const ownerName = lead.ownerEmployee 
        ? `${lead.ownerEmployee.firstName} ${lead.ownerEmployee.lastName}`.trim()
        : '';
      
      return {
        id: lead.id,
        value: lead.id,
        label: displayName, // Show only clean lead name
        name: displayName,
        extraInfo: {
          firstName: cleanFirstName,
          lastName: cleanLastName,
          companyName: lead.companyName,
          position: lead.position,
          email: lead.email,
          phoneNumber: lead.phoneNumber,
          accountName: lead.account?.name,
          contactName: lead.contact ? [lead.contact.firstName, lead.contact.lastName].filter(Boolean).join(' ') : undefined,
          contactEmail: lead.contact?.email,
          status: lead.leadStatus?.value,
          source: lead.leadSource?.value,
          owner: ownerName
        }
      };
    });
  }, [leads]);

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-green-200 gba:to-emerald-200 gba:hover:from-green-300 gba:hover:to-emerald-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #bbf7d0, #a7f3d0)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #86efac, #6ee7b7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #bbf7d0, #a7f3d0)';
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'RelationshipInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-green-500 gba:rounded-full"></div>
          Relationship Information
        </h3>
        {isExpanded ? (
          <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
        ) : (
          <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="gba:p-6 gba:space-y-6">
          
          {/* Account and Lead - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <SearchableSelect
                label="Account"
                name="account"
                value={formValues.account}
                placeholder="Search for Account..."
                options={accountOptions}
                loading={accountsLoading}
                hasMore={accountsHasMore}
                onSearch={searchAccounts}
                onLoadMore={loadMoreAccounts}
                onChange={(value) => setFormValues({ 
                  account: value,
                  accountId: value // Update legacy field too
                })}
                data-testid={formatDataTestId(prefixDataTestId, 'AccountSelect')}
                error={accountsError}
              />
              <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                Select the account this opportunity is related to
              </div>
            </div>

            <div className="gba:w-full">
              <SearchableSelect
                label="Lead"
                name="lead"
                value={formValues.lead}
                placeholder="Search for Lead..."
                options={leadOptions}
                loading={leadsLoading}
                hasMore={leadsHasMore}
                onSearch={searchLeads}
                onLoadMore={loadMoreLeads}
                onChange={(value) => setFormValues({ 
                  lead: value,
                  leadId: value // Update legacy field too
                })}
                data-testid={formatDataTestId(prefixDataTestId, 'LeadSelect')}
                error={leadsError}
              />
              <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                Select the lead that generated this opportunity
              </div>
            </div>
          </div>

          {/* Display selected relationship info */}
          {(formValues.account || formValues.lead) && (
            <div className="gba:mt-6 gba:p-4 gba:bg-gray-50 gba:rounded-lg gba:border gba:border-gray-200">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-3">Selected Relationships:</h4>
              
              {formValues.account && (
                <div className="gba:mb-2 gba:flex gba:items-center">
                  <span className="gba:text-sm gba:font-medium gba:text-green-700">Account:</span>
                  <a
                    href={`/platform/crm/account-record?accountId=${formValues.account}&source=customer-relations`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:text-sm gba:text-blue-600 gba:ml-2 gba:hover:text-blue-800 gba:hover:underline gba:transition-colors gba:cursor-pointer"
                    data-testid={formatDataTestId(prefixDataTestId, 'SelectedAccountLink')}
                  >
                    {accountOptions.find(opt => opt.id === formValues.account)?.name || formValues.account}
                  </a>
                </div>
              )}
              
              {formValues.lead && (
                <div className="gba:mb-2 gba:flex gba:items-center">
                  <span className="gba:text-sm gba:font-medium gba:text-blue-700">Lead:</span>
                  <a
                    href={`/platform/crm/lead-record?leadId=${formValues.lead}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:text-sm gba:text-blue-600 gba:ml-2 gba:hover:text-blue-800 gba:hover:underline gba:transition-colors gba:cursor-pointer"
                    data-testid={formatDataTestId(prefixDataTestId, 'SelectedLeadLink')}
                  >
                    {leadOptions.find(opt => opt.id === formValues.lead)?.name || formValues.lead}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RelationshipInformationSection; 