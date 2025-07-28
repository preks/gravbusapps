import React, { useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Button
} from '@newwork/nw-design-system';
import { 
  LauncherLayout, 
  type LauncherSectionConfig, 
  type NavigationCardData, 
  type QuickActionData,
  type KpiData 
} from '@/business-apps/common/components/launcher-layout/LauncherLayout';
import { investmentAreas, investmentQuickActions, categoryLabels, getInvestmentAreasByCategory } from './utils/investmentAreas';
import { InvestmentArea, InvestmentQuickAction } from './types';
import BackgroundImage from '@/assets/images/background.png';
import { useInvestmentDashboardStats } from './hooks/useInvestmentDashboardStats';
import { startProcess } from '@/common/utils/start-process';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import * as RemixIcons from '@remixicon/react';
// Import PhosphorIcons for LauncherLayout
import { 
  UserPlus, 
  Target, 
  Building,
  AddressBook,
  FileText,
  ChartBar,
  Upload,
  Wallet,
  TrendUp
} from '@phosphor-icons/react';

interface InvestmentLauncherProps extends BusinessAppContextProps {}

// Map RemixIcon names to PhosphorIcon components
const iconMap = {
  'RiUserAddLine': UserPlus,
  'RiTargetLine': Target,
  'RiBuildingLine': Building,
  'RiContactsLine': AddressBook,
  'RiFileTextLine': FileText,
  'RiBarChartLine': ChartBar,
  'RiUploadLine': Upload,
  'RiFundsLine': Wallet
};

const InvestmentLauncher: React.FC<InvestmentLauncherProps> = (context) => {
  const { stats, isLoading, error, refetch } = useInvestmentDashboardStats(context);
  
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num / 100);
  };

  // Convert stats to KpiData format for header
  const headerKpis = useMemo((): KpiData[] => {
    if (error) return [];
    
    return [
      {
        id: 'total-portfolio-value',
        title: 'Total Portfolio Value',
        value: isLoading ? '...' : formatCurrency(stats.totalPortfolioValue),
        color: 'default'
      },
      {
        id: 'asset-types',
        title: 'Asset Types',
        value: isLoading ? '...' : formatNumber(stats.assetTypes),
        color: 'success'
      },
      {
        id: 'average-roi',
        title: 'Average ROI',
        value: isLoading ? '...' : formatPercentage(stats.averageROI),
        color: 'primary'
      }
    ];
  }, [stats, isLoading, error]);

  // Convert quick actions to LauncherLayout format
  const launcherQuickActions = useMemo((): QuickActionData[] => {
    return investmentQuickActions.map(action => ({
      id: action.id,
      label: action.label,
      icon: iconMap[action.icon as keyof typeof iconMap] || TrendUp,
      onClick: () => handleQuickAction(action),
      variant: 'secondary'
    }));
  }, []);

  // Generate sections based on investment areas
  const sections = useMemo((): LauncherSectionConfig[] => {
    // Convert areas to NavigationCardData format
    const cards: NavigationCardData[] = investmentAreas.map(area => {
      // Get area stats
      const getAreaStats = (areaId: string) => {
        switch (areaId) {
          case 'leads':
            return { 
              value: formatNumber(stats.totalLeads), 
              label: 'Total Leads'
            };
          case 'opportunities':
            return { 
              value: formatNumber(stats.totalOpportunities), 
              label: 'Total Opportunities'
            };
          case 'accounts':
            return { 
              value: formatNumber(stats.totalAccounts), 
              label: 'Total Accounts'
            };
          case 'contacts':
            return { 
              value: formatNumber(stats.totalContacts), 
              label: 'Total Contacts'
            };
          case 'investments':
            return { 
              value: formatNumber(stats.totalInvestments), 
              label: 'Total Investments'
            };
          case 'analytics-reporting':
            return { 
              value: formatNumber(stats.assetTypes), 
              label: 'Data Points'
            };
          default:
            return { value: '0', label: 'Items' };
        }
      };

      const areaStats = getAreaStats(area.id);

      // Get actions based on area type
      const getAreaActions = (areaId: string) => {
        switch (areaId) {
          case 'leads':
            return [
              {
                label: 'Active Leads',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'leads', 
                    salesLeadStatus: 'SalesLeadStatus:v1:OPEN' 
                  });
                  navigateTo(url);
                }
              },
              {
                label: 'Converted Leads',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'leads', 
                    salesLeadStatus: 'SalesLeadStatus:v1:CONVERTED' 
                  });
                  navigateTo(url);
                }
              }
            ];
          case 'opportunities':
            return [
              {
                label: 'Pipeline Management',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'opportunities', 
                    subView: 'pipeline' 
                  });
                  navigateTo(url);
                }
              },
              {
                label: 'Active Opportunities',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'opportunities', 
                    status: 'OPPORTUNITY_OPEN' 
                  });
                  navigateTo(url);
                }
              }
            ];
          case 'accounts':
            return [
              {
                label: 'Customers',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'accounts' });
                  navigateTo(url);
                }
              },
              {
                label: 'Inactive Accounts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'accounts', 
                    status: 'inactive' 
                  });
                  navigateTo(url);
                }
              }
            ];
          case 'contacts':
            return [
              {
                label: 'Founder Contacts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'contacts', 
                    contactType: 'FOUNDER_CONTACT' 
                  });
                  navigateTo(url);
                }
              },
              {
                label: 'Primary Contacts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'contacts', 
                    contactType: 'PRIMARY_CONTACT' 
                  });
                  navigateTo(url);
                }
              },
              {
                label: 'Secondary Contacts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'contacts', 
                    contactType: 'SECONDARY_CONTACT' 
                  });
                  navigateTo(url);
                }
              }
            ];
          case 'investments':
            return [
              {
                label: 'Equity Investments',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'investments', 
                    subView: 'equity' 
                  });
                  navigateTo(url);
                }
              },
              {
                label: 'Private Equity Investments',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'investments', 
                    subView: 'private-equity' 
                  });
                  navigateTo(url);
                }
              },
              {
                label: 'Liquid Funds Investments',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'investments', 
                    subView: 'liquid-funds' 
                  });
                  navigateTo(url);
                }
              },
              {
                label: 'Real Estate Investments',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'investments', 
                    subView: 'real-estate' 
                  });
                  navigateTo(url);
                }
              }
            ];
          case 'analytics-reporting':
            return [
              {
                label: 'Performance Analytics',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'analytics', 
                    type: 'performance' 
                  });
                  navigateTo(url);
                }
              },
              {
                label: 'Portfolio Reports',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { 
                    view: 'analytics', 
                    type: 'portfolio' 
                  });
                  navigateTo(url);
                }
              }
            ];
          default:
            return [];
        }
      };

      const actions = getAreaActions(area.id);

      // Get variant based on category
      const getVariant = (category: string) => {
        switch (category) {
          case 'crm': return 'ext1';
          case 'portfolio': return 'ext2';
          case 'analytics': return 'ext3';
          default: return 'default';
        }
      };

      return {
        id: area.id,
        title: area.title,
        description: area.description,
        icon: iconMap[area.icon as keyof typeof iconMap] || TrendUp,
        stats: areaStats,
        actions,
        primaryAction: {
          label: 'View Details',
          onClick: () => handleNavigationClick(area)
        },
        variant: getVariant(area.category)
      };
    });

    return [{
      id: 'core-investment-modules',
      title: 'Core Investment Modules',
      description: 'Essential investment management and portfolio analytics functions',
      cards
    }];
  }, [stats]);

  const handleNavigationClick = (area: InvestmentArea) => {
    // Navigate to platform investment relations with specific view
    if (area.id === 'leads') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'leads' });
      navigateTo(url);
    } else if (area.id === 'opportunities') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'opportunities' });
      navigateTo(url);
    } else if (area.id === 'accounts') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'accounts' });
      navigateTo(url);
    } else if (area.id === 'contacts') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'contacts' });
      navigateTo(url);
    } else if (area.id === 'investments') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'investments' });
      navigateTo(url);
    } else if (area.id === 'analytics-reporting') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'analytics' });
      navigateTo(url);
    }
  };

  const handleQuickAction = (action: InvestmentQuickAction) => {
    if (action.action === 'create-lead') {
      startProcess({
        domain: 'customer-relations',
        processName: 'createLead',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'save-opportunity') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveOpportunity',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'save-contact') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveContact',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'create-account') {
      startProcess({
        domain: 'customer-relations',
        processName: 'createAccount',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'create-opportunity') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveOpportunity',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'create-contact') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveContact',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'create-investment') {
      startProcess({
        domain: 'investment-relations',
        processName: 'createInvestment',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'generate-report') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'dashboard' });
      navigateTo(url);
    } else {
      // TODO: Implement other quick actions when functionality is available
    }
  };

  // Show error state if stats loading failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="max-w-md mx-auto p-6">
          <Alert variant="destructive" className="bg-card/90 backdrop-blur-md">
            <RemixIcons.RiErrorWarningLine className="h-4 w-4" />
            <AlertTitle>Error Loading Stats</AlertTitle>
            <AlertDescription>
              {error} 
              <div className="mt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={refetch}
                >
                  <RemixIcons.RiRefreshLine className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <LauncherLayout
      title="Investment Relations Management Hub"
      description="Comprehensive portfolio management, investment tracking, and performance analytics"
      icon={TrendUp}
      headerKpis={headerKpis}
      sections={sections}
      quickActions={launcherQuickActions}
      quickActionsTitle="Quick Actions"
      quickActionsDescription="Frequently used investment and business management functions"
    />
  );
};

export default InvestmentLauncher; 