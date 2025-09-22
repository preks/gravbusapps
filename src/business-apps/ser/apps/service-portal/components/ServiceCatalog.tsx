import React, { useMemo } from 'react';
import { 
  LauncherLayout, 
  type NavigationCardInput, 
  type LauncherSectionConfig,
  type QuickActionData,
  type KpiData
} from '@newwork/nw-design-system';
import { getCategoryIcon } from '../../../utils/iconMapping';
import { useDesksForUser, useServicePortalCategories, useSharedFlowTemplates } from '../../../hooks';
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
  // Fetch dynamic categories from catalog
  const {
    categories: catalogCategories,
    categoryGroups,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useServicePortalCategories({ accessToken });

  // Check if user has access to any service desk
  const {
    availableDesks,
    isLoading: deskAccessLoading,
    error: deskAccessError,
  } = useDesksForUser({ accessToken, userInfo });

  // Fetch all templates to count services per category
  const {
    templates: allFlowTemplates,
    isLoading: templatesLoading,
    error: templatesError,
  } = useSharedFlowTemplates({ accessToken, userInfo }, { 
    enabled: true,
    limit: 100
  });

  // Function to count templates for a specific category
  const getTemplateCountForCategory = (categoryId: string): number => {
    if (!allFlowTemplates || allFlowTemplates.length === 0) {
      return 0;
    }

    const expectedCategoryRef = `ServicePortalCategory:1:${categoryId.toUpperCase()}`;
    
    return allFlowTemplates.filter(template => {
      // Check if template has tags and serviceCategory
      if (!template.tags || !template.tags.serviceCategory) {
        return false;
      }
      
      // Check if any of the template's service categories match our category
      const templateCategories = Array.isArray(template.tags.serviceCategory) 
        ? template.tags.serviceCategory 
        : [template.tags.serviceCategory];
      
      return templateCategories.includes(expectedCategoryRef);
    }).length;
  };

  // Function to count uncategorized templates
  const getUncategorizedTemplatesCount = (): number => {
    if (!allFlowTemplates || allFlowTemplates.length === 0) {
      return 0;
    }

    return allFlowTemplates.filter(template => {
      // Count templates without tags or serviceCategory
      if (!template.tags || !template.tags.serviceCategory) {
        return true;
      }
      
      // Also count templates with serviceCategory that doesn't match any existing category
      const templateCategories = Array.isArray(template.tags.serviceCategory) 
        ? template.tags.serviceCategory 
        : [template.tags.serviceCategory];
      
      // Check if any template category matches existing categories
      const hasValidCategory = templateCategories.some(templateCategory => {
        return catalogCategories.some(category => {
          const expectedCategoryRef = `ServicePortalCategory:1:${category.id.toUpperCase()}`;
          return templateCategory === expectedCategoryRef;
        });
      });
      
      return !hasValidCategory;
    }).length;
  };

  // Transform category groups into sections
  const sections: LauncherSectionConfig[] = useMemo(() => {
    const regularSections = categoryGroups.map(group => {
      // Transform group categories to navigation cards
      const groupCards = group.categories.map((category, index): NavigationCardInput => {
        const variants = ['ext1', 'ext2', 'ext3', 'ext4', 'ext5', 'ext6', 'ext7', 'ext8'] as const;
        const templateCount = getTemplateCountForCategory(category.id);
        
        return {
          id: category.id,
          title: category.name,
          description: category.description || 'Available services in this category',
          icon: getCategoryIcon(category.icon || category.id),
          stats: {
            value: templateCount,
            label: templateCount === 1 ? 'Service' : 'Services'
          },
          primaryAction: {
            label: 'View Services',
            onClick: () => onCategorySelect(category.id)
          },
          variant: variants[index % variants.length], // Cycle through variants for visual variety
        };
      });

      return {
        id: group.id,
        title: group.name,
        description: group.description,
        cards: groupCards
      };
    });

    // Add uncategorized section if there are uncategorized templates
    const uncategorizedCount = getUncategorizedTemplatesCount();
    if (uncategorizedCount > 0) {
      const uncategorizedSection = {
        id: 'uncategorized-section',
        title: 'Uncategorized Services',
        description: 'Services that are not assigned to any category',
        cards: [{
          id: 'uncategorized',
          title: 'Uncategorized',
          description: 'Templates without category tags or with invalid categories',
          icon: getCategoryIcon('uncategorized'),
          stats: {
            value: uncategorizedCount,
            label: uncategorizedCount === 1 ? 'Service' : 'Services'
          },
          primaryAction: {
            label: 'View Services',
            onClick: () => onCategorySelect('uncategorized')
          },
          variant: 'ext8' as const, // Use a distinct variant for uncategorized
        }]
      };
      
      regularSections.push(uncategorizedSection);
    }

    return regularSections;
  }, [categoryGroups, catalogCategories, onCategorySelect, allFlowTemplates]);

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
    // Count total templates with tags (real services)
    const totalServices = allFlowTemplates ? allFlowTemplates.filter(template => 
      template.tags && template.tags.serviceCategory
    ).length : 0;

    return [
      {
        id: 'total-services',
        title: 'Available Services',
        value: totalServices,
        icon: ChartLine
      },
      {
        id: 'categories',
        title: 'Service Categories',
        value: catalogCategories.length,
        icon: ClockCounterClockwise
      },
      {
        id: 'avg-resolution',
        title: 'Avg. Resolution Time',
        value: '2.3 days',
        icon: ClockCounterClockwise
      }
    ];
  }, [catalogCategories, allFlowTemplates]);

  // Show loading state while fetching categories
  if (categoriesLoading) {
    return (
      <div data-testid="service-catalog-loading" className="gba:flex gba:items-center gba:justify-center gba:min-h-96">
        <div className="gba:text-center">
          <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-600 gba:mx-auto gba:mb-4"></div>
          <p className="gba:text-gray-600">Loading service categories...</p>
        </div>
      </div>
    );
  }

  // Show error state if categories failed to load
  if (categoriesError) {
    return (
      <div data-testid="service-catalog-error" className="gba:flex gba:items-center gba:justify-center gba:min-h-96">
        <div className="gba:text-center gba:max-w-md">
          <div className="gba:text-red-500 gba:text-6xl gba:mb-4">⚠️</div>
          <h3 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-2">Failed to Load Categories</h3>
          <p className="gba:text-gray-600 gba:mb-4">{categoriesError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no categories available
  if (!categoriesLoading && categoryGroups.length === 0) {
    return (
      <div data-testid="service-catalog-empty" className="gba:flex gba:items-center gba:justify-center gba:min-h-96">
        <div className="gba:text-center gba:max-w-md">
          <div className="gba:text-gray-400 gba:text-6xl gba:mb-4">📂</div>
          <h3 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-2">No Service Categories</h3>
          <p className="gba:text-gray-600">No service categories are currently available in the catalog.</p>
        </div>
      </div>
    );
  }
  
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