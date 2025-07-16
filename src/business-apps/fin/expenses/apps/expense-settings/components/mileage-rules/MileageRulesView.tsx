import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { PiCar, PiMapPin } from 'react-icons/pi';
import MileageRulesList from './MileageRulesList';

export interface MileageRulesViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const MileageRulesView: React.FC<MileageRulesViewProps> = (context) => {
  const { prefixDataTestId = '' } = context;

  // Get tab from URL query parameters
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    return tabFromUrl === 'vehicle-types' ? 'vehicle-types' : 'rates';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());

  // Update URL when tab changes
  const updateUrl = (tab: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('tab', tab);

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    updateUrl(tab);
  };

  // Ensure URL always has tab parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('tab')) {
      updateUrl(activeTab);
    }
  }, [activeTab]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab();
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div 
      data-testid={`${prefixDataTestId}-mileage-rules-view`}
      className="gba:p-6"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2 gba:max-w-md">
          <TabsTrigger 
            value="rates" 
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="mileage-rules-rates-tab"
          >
            <PiCar />
            {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.rates.title', 'Mileage Rates')}
          </TabsTrigger>
          <TabsTrigger 
            value="vehicle-types" 
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="mileage-rules-vehicle-types-tab"
          >
            <PiMapPin />
            {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.vehicleTypes.title', 'Vehicle Types')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rates" className="gba:mt-6">
          <MileageRulesList
            {...context}
            viewType="rates"
            prefixDataTestId={prefixDataTestId}
          />
        </TabsContent>
        
        <TabsContent value="vehicle-types" className="gba:mt-6">
          <MileageRulesList
            {...context}
            viewType="vehicle-types"
            prefixDataTestId={prefixDataTestId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MileageRulesView; 