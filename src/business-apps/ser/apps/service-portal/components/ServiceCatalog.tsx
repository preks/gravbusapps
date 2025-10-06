import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { 
  LauncherLayout, 
  type NavigationCardInput, 
  type LauncherSectionConfig,
  type QuickActionData,
  type KpiData
} from '@newwork/nw-design-system';
import { getCategoryIcon } from '../../../utils/iconMapping';
import { useDesksForUser, useServicePortalCategories, useSharedFlowTemplates, useMyRequestsCount } from '../../../hooks';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { SERVICE_PORTAL_CONFIG } from '../../../config/servicePortalConfig';
import { navigateTo } from '@/common/utils/navigationUtils';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { 
  ClockCounterClockwise,
  ChartLine,
  MagnifyingGlass,
  X,
  Sparkle
} from '@phosphor-icons/react';

export interface ServiceCatalogProps extends BusinessAppContextProps {
  onCategorySelect: (categoryId: string) => void;
  onMyRequestsClick: () => void;
  onServiceDeskClick?: () => void;
}

// AI Button Icon Component - Animated Gradient Sparkle
const AnimatedGradientSparkle = React.forwardRef<SVGSVGElement, { className?: string }>((props, ref) => {
  const { className, ...restProps } = props;
  const maskId = React.useId();

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      preserveAspectRatio="xMidYMid meet"
      className={`gba:block ${className || ''}`}
      {...restProps}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
        >
          {/* IMPORTANT: add a class containing 'size-' to bypass global [&_svg]:size-4 override */}
          <Sparkle
            weight="fill"
            color="#ffffff"
            size={256}
            className="size-internal"
          />
        </mask>
      </defs>
      {/* CSS-driven gradient animation via foreignObject + mask */}
      <foreignObject
        x="0"
        y="0"
        width="256"
        height="256"
        mask={`url(#${maskId})`}
      >
        <div className="gba:w-full gba:h-full gba:bg-gradient-to-r gba:from-purple-500 gba:via-pink-500 gba:to-blue-500 gba:animate-pulse" />
      </foreignObject>
    </svg>
  );
});

AnimatedGradientSparkle.displayName = "AnimatedGradientSparkle";

// Chat opening function - extracted from AIOnboardingTooltip.tsx
const openAIChat = () => {
  console.log('🤖 [AI Help Center] Opening AI chat...');
  
  // Trigger the existing chat system - targeting the specific gravity-platform chat button
  try {
    console.log('🤖 [AI Help Center] Attempting to open gravity-platform chat...');
    
    // Method 1: Target the specific chat button structure from gravity-platform
    const specificChatSelectors = [
      // Exact match for the gravity-platform chat button
      'button[title="Open AI Assistant"]',
      // Backup selectors based on the HTML structure
      'button.fixed.bottom-4.right-4.z-30',
      '.fixed.bottom-4.right-4 button',
      // Generic chat selectors as fallback
      '[title*="AI Assistant"]',
      '[title*="Chat"]',
      '[class*="fixed"][class*="bottom-4"][class*="right-4"]'
    ];

    let chatOpened = false;
    
    // Debug: Log all buttons found
    console.log('🤖 [Debug] Searching for chat buttons...');
    specificChatSelectors.forEach((selector, index) => {
      const elements = document.querySelectorAll(selector);
      console.log(`🤖 [Debug] Selector ${index + 1} "${selector}": Found ${elements.length} elements`);
      elements.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        console.log(`  Element ${i + 1}:`, {
          visible: rect.width > 0 && rect.height > 0,
          rect: { width: rect.width, height: rect.height },
          title: el.getAttribute('title'),
          classes: el.className
        });
      });
    });
    
    for (const selector of specificChatSelectors) {
      const chatButton = document.querySelector(selector);
      if (chatButton && chatButton instanceof HTMLElement) {
        // Verify it's visible and clickable
        const rect = chatButton.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          console.log(`🤖 Found chat button with selector: ${selector}`);
          console.log('🤖 Button details:', {
            title: chatButton.getAttribute('title'),
            classes: chatButton.className,
            rect: { width: rect.width, height: rect.height }
          });
          
          // Add visual highlight before clicking
          chatButton.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.8)';
          setTimeout(() => {
            chatButton.style.boxShadow = '';
          }, 1000);
          
          chatButton.click();
          console.log('🤖 ✅ Successfully clicked gravity-platform chat button!');
          chatOpened = true;
          break;
        }
      }
    }

    // Method 2: If specific selectors fail, try broader search
    if (!chatOpened) {
      console.log('🤖 [Debug] Trying fallback selectors...');
      const fallbackSelectors = [
        '[data-testid*="chat"]',
        '[class*="chat"]', 
        '[id*="chat"]',
        'button[class*="fixed"][class*="bottom"]',
        '.fixed button[title*="Assistant"]'
      ];

      for (const selector of fallbackSelectors) {
        const chatElement = document.querySelector(selector);
        if (chatElement && chatElement instanceof HTMLElement) {
          const rect = chatElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            chatElement.click();
            console.log(`🤖 ✅ Clicked fallback chat element: ${selector}`);
            chatOpened = true;
            break;
          }
        }
      }
    }

    // Method 3: Dispatch custom events for gravity-platform chat system
    if (!chatOpened) {
      console.log('🤖 [Debug] Dispatching custom events...');
      const events = [
        'openAIChat',
        'showAIAssistant', 
        'toggleChat',
        'openGravityChat'
      ];

      events.forEach(eventName => {
        window.dispatchEvent(new CustomEvent(eventName, { 
          detail: { 
            source: 'ai-help-center-button',
            prefilledMessage: 'Hi! I need help finding the right service or assistance with my request.',
            context: 'service-portal-help-center',
            platform: 'gravity-platform'
          }
        }));
        console.log(`🤖 Dispatched event: ${eventName}`);
      });
      
      console.log('🤖 Dispatched gravity-platform chat events');
      chatOpened = true;
    }

    if (chatOpened) {
      console.log('🤖 ✅ Chat integration successful with gravity-platform!');
    } else {
      console.log('🤖 ❌ No chat button found, showing fallback message');
      alert('Chat button not found. Please look for the chat icon in the bottom-right corner of your screen.');
    }
    
  } catch (error) {
    console.error('🤖 ❌ Error opening chat:', error);
    // Fallback: show a message or redirect to a help page
    alert('Chat system is temporarily unavailable. Please try again later.');
  }
};

// Search input component defined outside to prevent re-creation and focus loss
const SearchInput = React.memo<{
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchClear: () => void;
  clearTimestamp: number;
}>(({ searchQuery, onSearchChange, onSearchClear, clearTimestamp }) => (
  <div className="gba:relative gba:w-full" data-testid="service-portal-search">
    <div className="gba:relative">
      <MagnifyingGlass 
        className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-gray-400 gba:pointer-events-none" 
        data-testid="search-icon"
      />
      <DebouncedInput
        key={`search-input-${clearTimestamp}`}
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search services and categories..."
        className="gba:w-full gba:pl-10 gba:pr-10 gba:py-2.5 gba:text-sm gba:bg-white/50 gba:border gba:border-gray-200 gba:rounded-lg gba:transition-all gba:duration-200 focus:gba:border-blue-500 focus:gba:ring-2 focus:gba:ring-blue-100 focus:gba:bg-white/60 hover:gba:border-gray-300"
        debounceDelay={300}
        ariaLabel="Search services and categories"
        data-testid="search-input"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSearchClear();
          }}
          className="gba:absolute gba:right-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:p-1 gba:text-gray-400 hover:gba:text-gray-600 gba:transition-colors gba:duration-200 gba:rounded-full hover:gba:bg-gray-100 gba:cursor-pointer"
          aria-label="Clear search"
          data-testid="search-clear"
        >
          <X className="gba:w-3 gba:h-3" />
        </button>
      )}
    </div>
  </div>
));

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({
  onCategorySelect,
  onMyRequestsClick,
  onServiceDeskClick,
  accessToken,
  userInfo
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [clearTimestamp, setClearTimestamp] = useState(0);

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
  } = useSharedFlowTemplates({ accessToken, userInfo }, { 
    enabled: true,
    limit: SERVICE_PORTAL_CONFIG.DEFAULT_TEMPLATE_LIMIT,
    filterByApp: SERVICE_PORTAL_CONFIG.FILTER_BY_SERVICES_APP
  });

  // Get count of user's requests for badge display
  const {
    count: myRequestsCount,
    isLoading: requestsCountLoading,
    error: requestsCountError
  } = useMyRequestsCount({ accessToken, userInfo });


  // Search functions
  const searchInText = (text: string, query: string): boolean => {
    return text.toLowerCase().includes(query.toLowerCase());
  };

  const getMatchingTemplatesForCategory = (categoryId: string, query: string) => {
    if (!allFlowTemplates || allFlowTemplates.length === 0) {
      return [];
    }

    const expectedCategoryRef = `ServicePortalCategory:1:${categoryId.toUpperCase()}`;
    
    return allFlowTemplates.filter(template => {
      // First check if template belongs to this category
      let belongsToCategory = false;
      
      if (categoryId === 'uncategorized') {
        // For uncategorized, check if template has no valid category
        if (!template.tags || !template.tags.serviceCategory) {
          belongsToCategory = true;
        } else {
          const templateCategories = Array.isArray(template.tags.serviceCategory) 
            ? template.tags.serviceCategory 
            : [template.tags.serviceCategory];
          
          const hasValidCategory = templateCategories.some(templateCategory => {
            return catalogCategories.some(category => {
              const expectedRef = `ServicePortalCategory:1:${category.id.toUpperCase()}`;
              return templateCategory === expectedRef;
            });
          });
          
          belongsToCategory = !hasValidCategory;
        }
      } else {
        // For regular categories
        if (template.tags && template.tags.serviceCategory) {
          const templateCategories = Array.isArray(template.tags.serviceCategory) 
            ? template.tags.serviceCategory 
            : [template.tags.serviceCategory];
          
          belongsToCategory = templateCategories.includes(expectedCategoryRef);
        }
      }
      
      if (!belongsToCategory) return false;
      
      // If no search query, return all templates in category
      if (!query.trim()) return true;
      
      // Search in template name, description, and steps
      const matchesName = searchInText(template.name || '', query);
      const matchesDescription = searchInText(template.description || '', query);
      
      // Search in steps
      const matchesSteps = template.steps?.some(step => 
        searchInText(step.title || '', query) || 
        searchInText(step.message || '', query)
      ) || false;
      
      return matchesName || matchesDescription || matchesSteps;
    });
  };

  const doesCategoryMatchSearch = (category: any, query: string): boolean => {
    if (!query.trim()) return true;
    
    return searchInText(category.name || '', query) || 
           searchInText(category.description || '', query);
  };

  // Transform category groups into sections with search filtering
  const sections: LauncherSectionConfig[] = useMemo(() => {
    const regularSections = categoryGroups.map(group => {
      // Filter and transform group categories to navigation cards based on search
      const groupCards = group.categories
        .filter(category => {
          // Check if category name/description matches search
          const categoryMatches = doesCategoryMatchSearch(category, searchQuery);
          
          // Check if category has matching templates
          const matchingTemplates = getMatchingTemplatesForCategory(category.id, searchQuery);
          const hasMatchingTemplates = matchingTemplates.length > 0;
          
          // Show category if it matches search OR has matching templates
          return categoryMatches || hasMatchingTemplates;
        })
        .map((category, index): NavigationCardInput => {
    const variants = ['ext1', 'ext2', 'ext3', 'ext4', 'ext5', 'ext6', 'ext7', 'ext8'] as const;
          
          // Count matching templates for this category
          const matchingTemplates = getMatchingTemplatesForCategory(category.id, searchQuery);
          const templateCount = matchingTemplates.length;
    
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

      // Only return group if it has cards
      return groupCards.length > 0 ? {
        id: group.id,
        title: group.name,
        description: group.description,
        cards: groupCards
      } : null;
    }).filter(Boolean) as LauncherSectionConfig[];

    // Add uncategorized section if there are matching uncategorized templates
    const matchingUncategorizedTemplates = getMatchingTemplatesForCategory('uncategorized', searchQuery);
    if (matchingUncategorizedTemplates.length > 0) {
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
            value: matchingUncategorizedTemplates.length,
            label: matchingUncategorizedTemplates.length === 1 ? 'Service' : 'Services'
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
  }, [categoryGroups, catalogCategories, onCategorySelect, allFlowTemplates, searchQuery]);

  // Add beautiful badge to My Requests icon via DOM manipulation
  useEffect(() => {
    // Create pulse animation using JavaScript
    const createPulseAnimation = (badge: HTMLElement) => {
      let scale = 1;
      let growing = true;
      
      const animate = () => {
        if (growing) {
          scale += 0.001;
          if (scale >= 1.05) growing = false;
        } else {
          scale -= 0.001;
          if (scale <= 1) growing = true;
        }
        
        badge.style.transform = `scale(${scale})`;
        badge.style.boxShadow = growing 
          ? `0 ${2 + scale}px ${4 + scale * 4}px rgba(239, 68, 68, ${0.4 + scale * 0.2}), 0 0 0 1.5px white`
          : `0 2px 4px rgba(239, 68, 68, 0.4), 0 0 0 1.5px white`;
      };
      
      const intervalId = setInterval(animate, 16); // ~60fps
      return intervalId;
    };

    const addBadgeToMyRequestsIcon = () => {
      const myRequestsTile = document.querySelector('[data-testid="quick-action-my-requests"]');
      
      // Remove existing badge and event listeners if any
      const existingBadge = myRequestsTile?.querySelector('.my-requests-badge');
      if (existingBadge && myRequestsTile) {
        // Remove event listeners and animation to prevent memory leaks
        const oldHandlers = (myRequestsTile as any)._badgeHandlers;
        if (oldHandlers) {
          myRequestsTile.removeEventListener('mouseenter', oldHandlers.hover);
          myRequestsTile.removeEventListener('mouseleave', oldHandlers.leave);
          if (oldHandlers.animationId) {
            clearInterval(oldHandlers.animationId);
          }
        }
        existingBadge.remove();
      }
      
      if (myRequestsTile && !requestsCountLoading && !requestsCountError && myRequestsCount > 0) {
        // Don't add 'has-badge' class to avoid CSS pseudo-element conflicts
        // myRequestsTile.classList.add('has-badge');
        
        // Find the icon container (IconAvatar or similar)
        const iconContainer = myRequestsTile.querySelector('[class*="IconAvatar"]') || 
                             myRequestsTile.querySelector('[data-testid*="icon-avatar"]') ||
                             myRequestsTile.querySelector('svg')?.parentElement ||
                             myRequestsTile.querySelector('.nw\\:flex.nw\\:flex-col .nw\\:flex:first-child');
        
        if (iconContainer) {
          // Create badge element
          const badge = document.createElement('div');
          badge.className = 'my-requests-badge';
          badge.textContent = myRequestsCount.toString();
          badge.style.cssText = `
            position: absolute;
            top: -3px;
            right: -3px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            border-radius: 50%;
            min-width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 700;
            font-family: system-ui, -apple-system, sans-serif;
            box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4), 0 0 0 1.5px white;
            z-index: 30;
            padding: 0 2px;
            line-height: 1;
            transition: all 0.2s ease;
          `;
          
          // Start JavaScript-based pulse animation
          const animationId = createPulseAnimation(badge);
          
          // Add hover effect to the tile that affects the badge
          const handleTileHover = () => {
            clearInterval(animationId);
            badge.style.transform = 'scale(1.1)';
            badge.style.boxShadow = '0 4px 10px rgba(239, 68, 68, 0.5), 0 0 0 1.5px white';
          };
          
          const handleTileLeave = () => {
            const newAnimationId = createPulseAnimation(badge);
            // Update stored animation ID
            (myRequestsTile as any)._badgeHandlers.animationId = newAnimationId;
          };
          
          myRequestsTile.addEventListener('mouseenter', handleTileHover);
          myRequestsTile.addEventListener('mouseleave', handleTileLeave);
          
          // Store handlers for cleanup
          (myRequestsTile as any)._badgeHandlers = {
            hover: handleTileHover,
            leave: handleTileLeave,
            animationId: animationId
          };
          
          // Make icon container relative if it isn't already
          const computedStyle = window.getComputedStyle(iconContainer);
          if (computedStyle.position === 'static') {
            (iconContainer as HTMLElement).style.position = 'relative';
          }
          
          // Add badge to icon container
          iconContainer.appendChild(badge);
          
          console.log('🎯 [ServiceCatalog] Badge added to My Requests icon:', { count: myRequestsCount });
        }
      } else if (myRequestsTile) {
        // Remove badge class from tile (if it was added)
        myRequestsTile.classList.remove('has-badge');
      }
    };

    // Add badge after component renders
    const timeoutId = setTimeout(addBadgeToMyRequestsIcon, 150);
    return () => clearTimeout(timeoutId);
  }, [myRequestsCount, requestsCountLoading, requestsCountError]);

  // Quick actions for common tasks (conditionally include Service Desk)
  const quickActions: QuickActionData[] = useMemo(() => {
    const actions: QuickActionData[] = [
      {
        id: 'my-requests',
        label: 'My Requests', // Clean label - badge added via CSS
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
          // Navigate to Service Desk app using URL from navigationUtils.ts mapping
          // This URL exists in PLATFORM_URL_TO_APP_MAPPING: '/platform/sales-demo/service-desk': 'ser/apps/service-desk'
          navigateTo('/platform/sales-demo/service-desk');
        }),
        variant: 'ext2'
      });
    }

    // Help Center is always available - now with AI-powered assistance
    actions.push({
      id: 'knowledge-base',
      label: 'Ask AI Assistant',
      icon: AnimatedGradientSparkle,
      onClick: () => {
        // Open AI chat using the same logic as AIOnboardingTooltip
        openAIChat();
      },
      variant: 'ext3'
    });

    return actions;
  }, [onMyRequestsClick, onServiceDeskClick, deskAccessLoading, deskAccessError, availableDesks, myRequestsCount, requestsCountLoading, requestsCountError]);

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

  // Handle search change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    console.log('🧹 [ServiceCatalog] Clearing search query');
    setSearchQuery('');
    setClearTimestamp(Date.now()); // Force component remount to clear internal state
  }, []);


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
    <div data-testid="service-catalog-container" className="gba:relative">
      <LauncherLayout
        title="Service Portal"
        description="Browse and request services across your organization"
        headerKpis={headerKpis}
        sections={sections}
        quickActions={quickActions}
        quickActionsTitle="Quick Actions"
        quickActionsDescription="Frequently used functions and shortcuts"
      />
      
      {/* Search input overlay positioned in Quick Actions area - as an additional item */}
      <div className="gba:absolute gba:top-0 gba:left-0 gba:right-0 gba:z-10 gba:pointer-events-none">
        <div className="gba:pt-58">
          <div className="layout-content">
            {/* Search input positioned as additional Quick Action item */}
            <div className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:md:grid-cols-4 gba:lg:grid-cols-6 gba:gap-2 gba:pointer-events-none">
              {/* Skip existing Quick Action buttons (My Requests, Service Desk, Help Center) - let clicks pass through */}
              <div className="gba:pointer-events-none"></div>
              <div className="gba:pointer-events-none"></div>
              <div className="gba:pointer-events-none"></div>
              {/* Empty space to push search input to the right */}
              <div className="gba:pointer-events-none"></div>
              {/* Search input only - right aligned - ONLY this area captures clicks */}
              <div className="gba:col-span-2 gba:pointer-events-auto">
                <div className="gba:bg-transparent gba:rounded-lg gba:p-6 gba:h-full gba:flex gba:flex-col gba:justify-center gba:min-h-20">
                  <SearchInput 
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                    onSearchClear={handleSearchClear}
                    clearTimestamp={clearTimestamp}
                  />
                  {/* Search results summary - directly under input */}
                  {searchQuery && (
                    <div className="gba:mt-2">
                      <p className="gba:text-xs gba:text-gray-500 gba:text-right" data-testid="search-results-summary">
                        {sections.length === 0 ? (
                          <span className="gba:text-orange-500">
                            No services found for "{searchQuery}"
                          </span>
                        ) : (
                          <>
                            {(() => {
                              let totalServices = 0;
                              let totalCategories = 0;
                              
                              // Calculate totals by going through each section and card
                              sections.forEach(section => {
                                section.cards.forEach(card => {
                                  const matchingTemplates = getMatchingTemplatesForCategory(card.id, searchQuery);
                                  if (matchingTemplates.length > 0) {
                                    totalServices += matchingTemplates.length;
                                    totalCategories += 1;
                                  }
                                });
                              });
                              
                              return `Found ${totalServices} service${totalServices === 1 ? '' : 's'} in ${totalCategories} categor${totalCategories === 1 ? 'y' : 'ies'} matching "${searchQuery}"`;
                            })()}
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};