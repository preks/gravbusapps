import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetLeadById, LeadQueryResult } from '../queries/LeadQueries';
import { LeadFormValues } from '../types';

interface UseLeadDataProps {
  businessAppContext: BusinessAppContextProps;
}

interface UseLeadDataReturn {
  leadData: LeadQueryResult | null;
  isLoading: boolean;
  error: string | null;
  mapLeadToFormValues: (lead: LeadQueryResult) => Partial<LeadFormValues>;
}

export const useLeadData = ({ businessAppContext }: UseLeadDataProps): UseLeadDataReturn => {
  const [leadData, setLeadData] = useState<LeadQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchLeadById } = useGetLeadById(businessAppContext);

  // Function to map lead data to form values
  const mapLeadToFormValues = useCallback((lead: LeadQueryResult): Partial<LeadFormValues> => {
    return {
      // System fields
      id: lead.id,
      version: lead.version,
      
      // Contact Information
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phoneNumber || '',
      
      // Company Information
      company: lead.companyName || '',
      companyEmail: lead.companyEmail || '',
      companyPhone: lead.companyPhone || '',
      website: lead.companyWebsite || '',
      
      // Lead Information
      owner: lead.ownerEmployeeId || '',
      leadStatus: lead.leadStatus?.id || '',
      leadSource: lead.leadSource?.id || '',
      rating: lead.leadRating?.id || '',
      
      // Address Information
      country: lead.country?.id || '',
      
      // Company relationship
      accountId: lead.account?.id || '',
    };
  }, []);

  // Load lead data when leadId is provided in additionalData
  useEffect(() => {
    const loadLeadData = async () => {
      const leadId = businessAppContext.additionalData?.leadId;
      
      if (!leadId || !businessAppContext.accessToken) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const lead = await fetchLeadById(leadId);
        if (lead) {
          setLeadData(lead);
        } else {
          setError('Lead not found');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load lead data';
        setError(errorMessage);
        console.error('Error loading lead data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeadData();
  }, [businessAppContext.additionalData?.leadId, businessAppContext.accessToken, fetchLeadById]);

  return {
    leadData,
    isLoading,
    error,
    mapLeadToFormValues,
  };
}; 