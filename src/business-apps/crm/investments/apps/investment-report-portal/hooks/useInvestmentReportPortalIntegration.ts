import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  useGetInvestmentReports,
  useGetInvestments,
  useGetInvestmentAccounts,
  useGetInvestmentContacts
} from '@/common/data/investment';
import type { 
  InvestmentReport,
  Investment,
  InvestmentAccount,
  InvestmentContact,
  ReportScope
} from '@/common/data/investment';

export interface PortalFilters {
  search?: string;
  investmentType?: string;
  reportScope?: ReportScope;
  dateRange?: [string, string];
  status?: string;
}

export interface FilteredData {
  reports: InvestmentReport[];
  investments: Investment[];
  accounts: InvestmentAccount[];
  contacts: InvestmentContact[];
}

export const useInvestmentReportPortalIntegration = (context: BusinessAppContextProps) => {
  const [reports, setReports] = useState<InvestmentReport[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([]);
  const [contacts, setContacts] = useState<InvestmentContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize hooks
  const { fetchInvestmentReports } = useGetInvestmentReports(context);
  const { fetchInvestments } = useGetInvestments(context);
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context);
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch data from multiple sources in parallel
      const [reportsResult, investmentsResult, accountsResult, contactsResult] = await Promise.all([
        fetchInvestmentReports(),
        fetchInvestments(),
        fetchInvestmentAccounts(),
        fetchInvestmentContacts()
      ]);
      
      // Extract data from results
      const reportsData = reportsResult?.InvestmentReport || [];
      const investmentsData = investmentsResult?.Investment || [];
      const accountsData = accountsResult?.InvestmentAccount || [];
      const contactsData = contactsResult?.InvestmentContact || [];
      
      // Set state
      setReports(reportsData);
      setInvestments(investmentsData);
      setAccounts(accountsData);
      setContacts(contactsData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading investment report portal data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchInvestmentReports, fetchInvestments, fetchInvestmentAccounts, fetchInvestmentContacts]);

  // Load data on mount and when context changes
  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  // Filter data based on current filters
  const getFilteredData = useCallback((filters: PortalFilters): FilteredData => {
    let filteredReports = [...reports];
    let filteredInvestments = [...investments];
    let filteredAccounts = [...accounts];
    let filteredContacts = [...contacts];

    // Apply search filter
    if (filters.search?.trim()) {
      const searchTerm = filters.search.toLowerCase();
      
      filteredReports = filteredReports.filter(report => 
        report.investment?.name?.toLowerCase().includes(searchTerm) ||
        report.investment?.code?.toLowerCase().includes(searchTerm) ||
        report.investment?.isin?.toLowerCase().includes(searchTerm)
      );
      
      filteredInvestments = filteredInvestments.filter(investment =>
        investment.name.toLowerCase().includes(searchTerm) ||
        investment.code?.toLowerCase().includes(searchTerm) ||
        investment.isin?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply investment type filter
    if (filters.investmentType) {
      filteredReports = filteredReports.filter(report =>
        report.investment?.investmentType?.value === filters.investmentType
      );
      
      filteredInvestments = filteredInvestments.filter(investment =>
        investment.investmentType?.value === filters.investmentType
      );
    }

    // Apply report scope filter
    if (filters.reportScope) {
      filteredReports = filteredReports.filter(report =>
        report.scope === filters.reportScope
      );
    }

    // Apply date range filter
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [startDate, endDate] = filters.dateRange;
      filteredReports = filteredReports.filter(report => {
        if (!report.date) return false;
        const reportDate = new Date(report.date);
        return reportDate >= new Date(startDate) && reportDate <= new Date(endDate);
      });
    }

    return {
      reports: filteredReports,
      investments: filteredInvestments,
      accounts: filteredAccounts,
      contacts: filteredContacts
    };
  }, [reports, investments, accounts, contacts]);

  // Get investments associated with current user context
  const getUserAssociatedInvestments = useCallback(() => {
    // For now, return all investments since we don't have user-investment associations
    // This will be enhanced when the backend provides user-investment relationships
    return investments;
  }, [investments]);

  // Get reports for specific investment
  const getReportsForInvestment = useCallback((investmentId: string) => {
    return reports.filter(report => report.investment?.id === investmentId);
  }, [reports]);

  // Get investment summary statistics
  const getInvestmentStats = useCallback(() => {
    const totalInvestments = investments.length;
    const totalReports = reports.length;
    const totalAccounts = accounts.length;
    const totalContacts = contacts.length;
    
    const reportsByType = reports.reduce((acc, report) => {
      const type = report.investment?.investmentType?.value || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const reportsByScope = reports.reduce((acc, report) => {
      const scope = report.scope || 'Unknown';
      acc[scope] = (acc[scope] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalInvestments,
      totalReports,
      totalAccounts,
      totalContacts,
      reportsByType,
      reportsByScope
    };
  }, [investments, reports, accounts, contacts]);

  return {
    // Data
    reports,
    investments,
    accounts,
    contacts,
    
    // State
    isLoading,
    error,
    
    // Actions
    refetch: loadData,
    
    // Filtered data
    getFilteredData,
    
    // Utility functions
    getUserAssociatedInvestments,
    getReportsForInvestment,
    getInvestmentStats
  };
};

