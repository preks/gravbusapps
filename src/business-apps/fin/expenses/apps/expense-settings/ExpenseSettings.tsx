import React, { useState, useEffect } from 'react';
import { PageLayout } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { 
  PiSquaresFour, 
  PiCalculator, 
  PiCar, 
  PiGlobe 
} from 'react-icons/pi';
import { Gear } from '@phosphor-icons/react';

// Tab components
import ExpenseSettingsDashboard from './components/dashboard/ExpenseSettingsDashboard';
import CalculationRulesView from './components/calculation-rules/CalculationRulesView';
import MileageRulesView from './components/mileage-rules/MileageRulesView';
import TravelRegionRulesView from './components/travel-region-rules/TravelRegionRulesView';

export interface ExpenseSettingsProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  className?: string;
}

const ExpenseSettings: React.FC<ExpenseSettingsProps> = (context) => {
  const { prefixDataTestId = '', className = '' } = context;

  // Define main view options for headerSubViews
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <PiSquaresFour />,
      label: getTranslationFromI18nKeyAndLabel('expense-settings:dashboard', 'Dashboard')
    },
    {
      key: 'calculation-rules',
      icon: <PiCalculator />,
      label: getTranslationFromI18nKeyAndLabel('expense-settings:calculation_rules', 'Calculation Rules')
    },
    {
      key: 'mileage-rules',
      icon: <PiCar />,
      label: getTranslationFromI18nKeyAndLabel('expense-settings:mileage_rules', 'Mileage Rules')
    },
    {
      key: 'travel-region-rules',
      icon: <PiGlobe />,
      label: getTranslationFromI18nKeyAndLabel('expense-settings:travel_region_rules', 'Travel Region Rules')
    }
  ];

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewFromUrl = urlParams.get('view');

    // Validate that the view exists in our options
    if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl;
    }

    // Default to first view
    return viewOptions[0].key;
  };

  const [activeView, setActiveView] = useState<string>(getInitialView());

  // Update URL when view changes
  const updateUrl = (view: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('view', view);

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    updateUrl(view);
  };

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('view')) {
      updateUrl(activeView);
    }
  }, [activeView]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView();
      setActiveView(newView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Render content based on active view
  const renderViewContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div data-testid={`${prefixDataTestId}-dashboard-view`}>
            <ExpenseSettingsDashboard {...context} />
          </div>
        );
      case 'calculation-rules':
        return (
          <CalculationRulesView 
            {...context}
            prefixDataTestId={prefixDataTestId}
          />
        );
      case 'mileage-rules':
        return (
          <MileageRulesView 
            {...context}
            prefixDataTestId={prefixDataTestId}
          />
        );
      case 'travel-region-rules':
        return (
          <TravelRegionRulesView 
            {...context}
            prefixDataTestId={prefixDataTestId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      data-testid={`${prefixDataTestId}-expense-settings`}
      className={className}
    >
      <PageLayout
        headerPhosphorIcon={{
          icon: Gear,
          variant: "strategy",
          size: "lg",
          label: "Expense Settings"
        }}
        headerTitle={getTranslationFromI18nKeyAndLabel('expense-settings:page_title', 'Expense Settings')}
        headerDescription={getTranslationFromI18nKeyAndLabel('expense-settings:page_description', 'Configure expense rules, assignments, and calculation settings')}
        headerSubViews={{
          value: activeView,
          onValueChange: handleViewChange,
          items: viewOptions.map((option) => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">
          {renderViewContent()}
        </div>
      </PageLayout>
    </div>
  );
};

export default ExpenseSettings; 