import React, { useMemo } from 'react';
import { 
  LauncherLayout, 
  type NavigationCardInput, 
  type LauncherSectionConfig,
  type QuickActionData,
  type KpiData
} from '@newwork/nw-design-system';
// ServiceCategory type used in prop interfaces
import { getSortedCategories } from '../../../data';
import { getCategoryIcon } from '../../../utils/iconMapping';
import { useDesksForUser } from '../../../hooks/useDesksForUser';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  ClockCounterClockwise,
  Notepad,
  ChartLine
} from '@phosphor-icons/react';

export interface ServiceCatalogProps extends BusinessAppContextProps {
  onCategorySelect: (categoryId: string) => void;
  onMyRequestsClick: () => void;
  onServiceDeskClick?: () => void;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({
  onCategorySelect,
  onMyRequestsClick,
  onServiceDeskClick,
  accessToken,
  userInfo
}) => {
  // Check if user has access to any service desk
  const {
    availableDesks,
    isLoading: deskAccessLoading,
    error: deskAccessError,
  } = useDesksForUser({ accessToken, userInfo });

  // Transform service categories into NavigationCard format
  const serviceCategoryCards: NavigationCardInput[] = useMemo(() => {
    const variants = ['ext1', 'ext2', 'ext3', 'ext4', 'ext5', 'ext6', 'ext7', 'ext8'] as const;
    const sortedCategories = getSortedCategories();
    
    return sortedCategories.map((category, index): NavigationCardInput => ({
      id: category.id,
      title: category.name,
      description: category.description || 'Available services in this category',
      icon: getCategoryIcon(category.id),
      stats: {
        value: Math.floor(Math.random() * 8) + 3, // Random 3-10 services
        label: 'Services'
      },
      primaryAction: {
        label: 'View Services',
        onClick: () => onCategorySelect(category.id)
      },
      variant: variants[index % variants.length], // Cycle through variants for visual variety
    }));
  }, [onCategorySelect]);

  // Group categories into logical sections
  const sections: LauncherSectionConfig[] = useMemo(() => {
    // Flow Templates section (always first)
    const flowTemplatesCategories = serviceCategoryCards.filter(card => 
      ['flow-templates'].includes(card.id)
    );
    
    const coreCategories = serviceCategoryCards.filter(card => 
      ['hr', 'it', 'finance', 'legal'].includes(card.id)
    );
    
    const businessCategories = serviceCategoryCards.filter(card => 
      ['travel', 'procurement', 'facilities'].includes(card.id)
    );
    
    const supportCategories = serviceCategoryCards.filter(card => 
      !['flow-templates', 'hr', 'it', 'finance', 'legal', 'travel', 'procurement', 'facilities'].includes(card.id)
    );

    return [
      // Flow Templates section (first)
      {
        id: 'flow-templates',
        title: 'Dynamic Workflow Templates',
        description: 'Live templates from workflow engine with automatic form generation',
        cards: flowTemplatesCategories
      },
      {
        id: 'core-services',
        title: 'Core Business Services',
        description: 'Essential services for daily operations',
        cards: coreCategories
      },
      {
        id: 'business-operations',
        title: 'Business Operations',
        description: 'Services for travel, procurement, and facilities',
        cards: businessCategories
      },
      {
        id: 'support-services',
        title: 'Support & Compliance',
        description: 'Specialized support and administrative services',
        cards: supportCategories
      }
    ].filter(section => section.cards.length > 0); // Only show sections with cards
  }, [serviceCategoryCards]);

  // Quick actions for common tasks (conditionally include Service Desk)
  const quickActions: QuickActionData[] = useMemo(() => {
    const actions: QuickActionData[] = [
      {
        id: 'my-requests',
        label: 'My Requests',
        icon: ClockCounterClockwise,
        onClick: onMyRequestsClick,
        variant: 'ext1'
      }
    ];

    // Only show Service Desk if user has access to at least one desk
    if (!deskAccessLoading && !deskAccessError && availableDesks.length > 0) {
      actions.push({
        id: 'service-desk',
        label: 'Service Desk',
        icon: ClockCounterClockwise,
        onClick: onServiceDeskClick || (() => {
          // Navigate to Service Desk app using platform navigation with proper app parameter
          window.location.href = '/ser/apps/service-desk?app=ServiceDesk';
        }),
        variant: 'ext2'
      });
    }

    // Help Center is always available
    actions.push({
      id: 'knowledge-base',
      label: 'Help Center',
      icon: Notepad,
      onClick: () => {
        // TODO: Open knowledge base
        alert('Help Center - Coming Soon!\nThis will contain service documentation and FAQs.');
      },
      variant: 'ext3'
    });

    return actions;
  }, [onMyRequestsClick, onServiceDeskClick, deskAccessLoading, deskAccessError, availableDesks]);

  // Header KPIs showing service statistics
  const headerKpis: KpiData[] = useMemo(() => {
    const sortedCategories = getSortedCategories();
    return [
      {
        id: 'total-services',
        title: 'Available Services',
        value: sortedCategories.reduce((sum) => sum + (Math.floor(Math.random() * 8) + 3), 0),
        icon: ChartLine
      },
      {
        id: 'categories',
        title: 'Service Categories',
        value: sortedCategories.length,
        icon: ClockCounterClockwise
      },
      {
        id: 'avg-resolution',
        title: 'Avg. Resolution Time',
        value: '2.3 days',
        icon: ClockCounterClockwise
      }
    ];
  }, []);

  return (
    <div data-testid="service-catalog-container">
      <LauncherLayout
        title="Service Portal"
        description="Browse and request services across your organization"
        headerKpis={headerKpis}
        sections={sections}
        quickActions={quickActions}
        quickActionsTitle="Quick Actions"
        quickActionsDescription="Frequently used functions and shortcuts"
      />
    </div>
  );
};