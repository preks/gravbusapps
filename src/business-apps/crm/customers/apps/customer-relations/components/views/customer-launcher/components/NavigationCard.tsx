import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system';
import * as RemixIcons from '@remixicon/react';
import { NavigationCardProps } from '../types';

const NavigationCard: React.FC<NavigationCardProps> = ({ area, onClick, stats }) => {
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

  const handleButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    
    // Navigate to customer relations with specific view - fast navigation without page refresh
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
    }
  };

  // Category-based styling matching the professional design
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'sales':
        return {
          iconBg: 'gba:bg-green-50',
          iconColor: 'gba:text-green-500',
          statsBg: '#10B981',
          statsText: 'gba:text-white'
        };
      case 'customer':
        return {
          iconBg: 'gba:bg-blue-50',
          iconColor: 'gba:text-blue-500',
          statsBg: '#3B82F6',
          statsText: 'gba:text-white'
        };
      case 'intelligence':
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

  const styles = getCategoryStyles(area.category);

  // Get stats based on area type - use real data when available
  const getAreaStats = (areaId: string) => {
    switch (areaId) {
      case 'leads':
        return { 
          number: stats?.totalLeads ? new Intl.NumberFormat('en-US').format(stats.totalLeads) : '0', 
          label: 'Total Leads', 
          trend: '+12%' 
        };
      case 'opportunities':
        return { 
          number: stats?.totalOpportunities ? new Intl.NumberFormat('en-US').format(stats.totalOpportunities) : '0', 
          label: 'Total Opportunities', 
          trend: '+8%' 
        };
      case 'accounts':
        return { 
          number: stats?.totalAccounts ? new Intl.NumberFormat('en-US').format(stats.totalAccounts) : '0', 
          label: 'Total Accounts', 
          trend: '+5%' 
        };
      case 'contacts':
        return { 
          number: stats?.totalContacts ? new Intl.NumberFormat('en-US').format(stats.totalContacts) : '0', 
          label: 'Total Contacts', 
          trend: '+15%' 
        };
      case 'reports':
        return { number: '23', label: 'Active Reports', trend: 'New' };
      case 'analytics':
        return { number: '8.4k', label: 'Data Points', trend: 'Live' };
      default:
        return { number: '0', label: 'Items', trend: '' };
    }
  };

  const areaStats = getAreaStats(area.id);

  return (
    <Card 
      className="gba:group gba:cursor-pointer gba:transition-all gba:duration-300 gba:h-full gba:bg-white/95 gba:backdrop-blur-md gba:border gba:border-white/30 hover:gba:shadow-2xl hover:gba:border-white/50 hover:gba:bg-white hover:gba:scale-105 gba:rounded-xl gba:overflow-hidden"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Navigate to ${area.title}: ${area.description}`}
      data-testid={`navigation-card-${area.id}`}
    >
      <CardHeader className="gba:pb-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
          <div className={`gba:p-2 gba:rounded-lg ${styles.iconBg} gba:flex-shrink-0`}>
            <IconComponent 
              className={`gba:h-6 gba:w-6 ${styles.iconColor}`}
              data-testid={`navigation-card-icon-${area.id}`}
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
      
      <CardContent className="gba:pt-0">
        {/* Action Items */}
        <div className="gba:space-y-2 gba:mb-4">
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
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className="gba:text-gray-600">Pipeline Management</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className="gba:text-gray-600">Active Opportunities</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
          
          {area.id === 'accounts' && (
            <>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className="gba:text-gray-600">Customers</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className="gba:text-gray-600">Inactive Accounts</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
          
          {area.id === 'contacts' && (
            <>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className="gba:text-gray-600">Primary Contacts</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className="gba:text-gray-600">Secondary Contacts</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
          
          {area.id === 'reports' && (
            <>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className="gba:text-gray-600">Sales Reports</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className="gba:text-gray-600">Custom Reports</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
          
          {area.id === 'analytics' && (
            <>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className="gba:text-gray-600">Performance Analytics</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className="gba:text-gray-600">Predictive Insights</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
        </div>

        {/* Primary Action Button */}
        <button 
          className={`gba:w-full gba:py-2 gba:px-4 ${styles.statsText} gba:text-sm gba:font-medium gba:rounded-md hover:gba:opacity-90 gba:transition-opacity gba:duration-200`}
          style={{ backgroundColor: styles.statsBg }}
          onClick={handleButtonClick}
        >
          {area.id === 'leads' && 'View All Leads'}
          {area.id === 'opportunities' && 'View All Opportunities'}
          {area.id === 'accounts' && 'View All Accounts'}
          {area.id === 'contacts' && 'View All Contacts'}
          {area.id === 'reports' && 'Generate Report'}
          {area.id === 'analytics' && 'View Analytics'}
        </button>
      </CardContent>
    </Card>
  );
};

export default NavigationCard;