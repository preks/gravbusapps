import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { PiGlobe, PiMapPin } from 'react-icons/pi';
import TravelRegionRulesList from './TravelRegionRulesList';

export interface TravelRegionRulesViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const TravelRegionRulesView: React.FC<TravelRegionRulesViewProps> = (context) => {
  const { prefixDataTestId = '' } = context;

  // Get tab from URL query parameters
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    return tabFromUrl === 'regions' ? 'regions' : 'allowances';
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
      data-testid={`${prefixDataTestId}-travel-region-rules-view`}
      className="gba:p-6"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2 gba:max-w-md">
          <TabsTrigger 
            value="allowances" 
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="travel-region-rules-allowances-tab"
          >
            <PiGlobe />
            {getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.allowances.title', 'Allowances')}
          </TabsTrigger>
          <TabsTrigger 
            value="regions" 
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="travel-region-rules-regions-tab"
          >
            <PiMapPin />
            {getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.regions.title', 'Regions')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="allowances" className="gba:mt-6">
          <TravelRegionRulesList
            {...context}
            viewType="allowances"
            prefixDataTestId={prefixDataTestId}
          />
        </TabsContent>
        
        <TabsContent value="regions" className="gba:mt-6">
          <TravelRegionRulesList
            {...context}
            viewType="regions"
            prefixDataTestId={prefixDataTestId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TravelRegionRulesView; 