import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system';
import * as RemixIcons from '@remixicon/react';
import { InvestmentNavigationCardProps } from '../types';

const InvestmentNavigationCard: React.FC<InvestmentNavigationCardProps> = ({ area, onClick, stats }) => {
  // Get the icon component dynamically
  const IconComponent = (RemixIcons as any)[area.icon] || RemixIcons.RiQuestionLine;

  const handleClick = () => {
    onClick(area);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(area);
    }
  };

  // Handle navigation to specific views with URL parameters (identical to CRM)
  const handleButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    
    // Navigate to investment relations with specific view - fast navigation without page refresh
    if (area.id === 'leads') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'leads');
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (area.id === 'opportunities') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'opportunities');
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (area.id === 'accounts') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'accounts');
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (area.id === 'contacts') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'contacts');
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (area.id === 'investments') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'investments');
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Handle investment type navigation
  const handleInvestmentTypeClick = (investmentType: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    
    // Navigate to specific investment view
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'investments');
    url.searchParams.set('investmentType', investmentType);
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Category-based styling
  const getCategoryStyles = (category: string, areaId: string) => {
    // Special handling for leads and opportunities to use green
    if (areaId === 'leads' || areaId === 'opportunities') {
      return {
        iconBg: 'gba:bg-green-50',
        iconColor: 'gba:text-green-500',
        statsBg: '#10B981',
        statsText: 'gba:text-white'
      };
    }
    
    // Special handling for investments to use amber/gold
    if (areaId === 'investments') {
      return {
        iconBg: 'gba:bg-amber-50',
        iconColor: 'gba:text-amber-600',
        statsBg: '#F59E0B',
        statsText: 'gba:text-white'
      };
    }
    
    switch (category) {
      case 'crm':
        return {
          iconBg: 'gba:bg-blue-50',
          iconColor: 'gba:text-blue-500',
          statsBg: '#3B82F6',
          statsText: 'gba:text-white'
        };
      case 'portfolio':
        return {
          iconBg: 'gba:bg-green-50',
          iconColor: 'gba:text-green-500',
          statsBg: '#10B981',
          statsText: 'gba:text-white'
        };
      case 'analytics':
        return {
          iconBg: 'gba:bg-purple-50',
          iconColor: 'gba:text-purple-500',
          statsBg: '#8B5CF6',
          statsText: 'gba:text-white'
        };
      default:
        return {
          iconBg: 'gba:bg-gray-50',
          iconColor: 'gba:text-gray-600',
          statsBg: '#6B7280',
          statsText: 'gba:text-white'
        };
    }
  };

  const styles = getCategoryStyles(area.category, area.id);

  // Get stats based on area type
  const getAreaStats = (areaId: string) => {
    switch (areaId) {
      case 'leads':
        return { 
          number: stats?.totalLeads ? new Intl.NumberFormat('en-US').format(stats.totalLeads) : '0', 
          label: 'Total Leads' 
        };
      case 'opportunities':
        return { 
          number: stats?.totalOpportunities ? new Intl.NumberFormat('en-US').format(stats.totalOpportunities) : '0', 
          label: 'Total Opportunities' 
        };
      case 'accounts':
        return { 
          number: stats?.totalAccounts ? new Intl.NumberFormat('en-US').format(stats.totalAccounts) : '0', 
          label: 'Total Accounts' 
        };
      case 'contacts':
        return { 
          number: stats?.totalContacts ? new Intl.NumberFormat('en-US').format(stats.totalContacts) : '0', 
          label: 'Total Contacts' 
        };
      case 'investments':
        return { 
          number: stats?.totalInvestments ? new Intl.NumberFormat('en-US').format(stats.totalInvestments) : '0', 
          label: 'Total Investments' 
        };
      case 'analytics-reporting':
        return { 
          number: '24', 
          label: 'Active Reports' 
        };
      default:
        return { number: '0', label: 'Items' };
    }
  };

  const areaStats = getAreaStats(area.id);

  // Get button color based on area type
  const getButtonColor = (areaId: string) => {
    switch (areaId) {
      case 'leads':
      case 'opportunities':
        return '#10B981'; // Green for sales
      case 'accounts':
      case 'contacts':
        return '#3B82F6'; // Blue for customer management
      case 'investments':
        return '#F59E0B'; // Amber/gold for investments
      case 'analytics-reporting':
        return '#8B5CF6'; // Purple for analytics
      default:
        return '#6B7280'; // Gray for others
    }
  };

  const buttonColor = getButtonColor(area.id);

  return (
    <Card 
      className="gba:group gba:cursor-pointer gba:transition-all gba:duration-300 gba:h-full gba:min-h-96 gba:bg-white/95 gba:backdrop-blur-md gba:border gba:border-white/30 hover:gba:shadow-2xl hover:gba:border-white/50 hover:gba:bg-white hover:gba:scale-105 gba:rounded-xl gba:overflow-hidden gba:flex gba:flex-col"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Navigate to ${area.title}: ${area.description}`}
      data-testid={`investment-navigation-card-${area.id}`}
    >
      <CardHeader className="gba:pb-4 gba:flex-shrink-0">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
          <div className={`gba:p-2 gba:rounded-lg ${styles.iconBg} gba:flex-shrink-0`}>
            <IconComponent 
              className={`gba:h-6 gba:w-6 ${styles.iconColor}`}
              data-testid={`investment-navigation-card-icon-${area.id}`}
            />
          </div>
          <div className="gba:text-right">
            <div className="gba:text-lg gba:font-bold gba:text-gray-900">{areaStats.number}</div>
            <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">{areaStats.label}</div>
          </div>
        </div>
        
        <CardTitle className="gba:text-base gba:font-semibold gba:text-gray-900 gba:mb-1">
          {area.title}
        </CardTitle>
        <CardDescription className="gba:text-sm gba:text-gray-600 gba:leading-relaxed gba:line-clamp-2">
          {area.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="gba:pt-0 gba:flex gba:flex-col gba:flex-grow">
        {/* Action Items - Takes available space */}
        <div className="gba:space-y-2 gba:flex-grow">
          {area.id === 'leads' && (
            <>
              <div 
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  const url = new URL(window.location.href);
                  url.searchParams.set('view', 'leads');
                  url.searchParams.set('leadStatus', 'open');
                  window.history.pushState({}, '', url.toString());
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                <span className="gba:text-gray-600">Active Leads</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div 
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  const url = new URL(window.location.href);
                  url.searchParams.set('view', 'leads');
                  url.searchParams.set('leadStatus', 'converted');
                  window.history.pushState({}, '', url.toString());
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                <span className="gba:text-gray-600">Converted Leads</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
          
          {area.id === 'opportunities' && (
            <>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded">
                <span className="gba:text-gray-600">Pipeline Management</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded">
                <span className="gba:text-gray-600">Active Opportunities</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
          
          {area.id === 'accounts' && (
            <>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded">
                <span className="gba:text-gray-600">Customers</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded">
                <span className="gba:text-gray-600">Inactive Accounts</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
          
          {area.id === 'contacts' && (
            <>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded">
                <span className="gba:text-gray-600">Primary Contacts</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded">
                <span className="gba:text-gray-600">Secondary Contacts</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
          
          {area.id === 'investments' && (
            <>
              <div 
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={(e) => handleInvestmentTypeClick('equity', e)}
              >
                <span className="gba:text-gray-600">Equity Investments</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div 
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={(e) => handleInvestmentTypeClick('real-estate', e)}
              >
                <span className="gba:text-gray-600">Real Estate</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div 
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={(e) => handleInvestmentTypeClick('private-equity', e)}
              >
                <span className="gba:text-gray-600">Private Equity</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div 
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={(e) => handleInvestmentTypeClick('liquid-funds', e)}
              >
                <span className="gba:text-gray-600">Liquid Funds</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
          
          {area.id === 'analytics-reporting' && (
            <>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded">
                <span className="gba:text-gray-600">Performance Analytics</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded">
                <span className="gba:text-gray-600">Portfolio Reports</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
        </div>

        {/* Button - Always at bottom */}
        <button
          className="gba:w-full gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:text-white gba:border-0 gba:rounded-lg gba:transition-colors gba:duration-200 gba:flex-shrink-0 gba:mt-4"
          style={{ backgroundColor: buttonColor }}
          onClick={handleButtonClick}
          data-testid={`investment-navigation-card-button-${area.id}`}
        >
          {area.id === 'leads' && 'View All Leads'}
          {area.id === 'opportunities' && 'View All Opportunities'}
          {area.id === 'accounts' && 'View All Accounts'}
          {area.id === 'contacts' && 'View All Contacts'}
          {area.id === 'investments' && 'View All Investments'}
          {area.id === 'analytics-reporting' && 'View Analytics'}
        </button>
      </CardContent>
    </Card>
  );
};

export default InvestmentNavigationCard; 