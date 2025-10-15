import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { PiFileText, PiUsers } from 'react-icons/pi';
import ExpenseCalculationRules from '@/business-apps/fin/expenses/apps/expense-calculation-rules/ExpenseCalculationRules';
import CalculationRuleAssignmentList from './CalculationRuleAssignmentList';
import { useExpenseSettingsIntegration } from '../../hooks/useExpenseSettingsIntegration';

export interface CalculationRulesViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const CalculationRulesView: React.FC<CalculationRulesViewProps> = (context) => {
  const { prefixDataTestId = '' } = context;

  // Get tab from URL query parameters
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    return tabFromUrl === 'assignments' ? 'assignments' : 'rules';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());

  // Data integration hook (for assignments tab)
  const {
    assignments,
    rules,
    isLoading,
    refetch,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    validateAssignment,
    searchAssignments
  } = useExpenseSettingsIntegration(context);

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

  // Handle navigation to calculation rule record
  const handleNavigateToRule = (ruleId: string, page?: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('ruleId', ruleId);
    if (page) {
      urlParams.set('page', page);
    }
    
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    // Trigger a popstate event to notify the parent component of the URL change
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div 
      data-testid={`${prefixDataTestId}-calculation-rules-view`}
      className="gba:p-6"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2 gba:max-w-md">
          <TabsTrigger 
            value="rules" 
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="calculation-rules-rules-tab"
          >
            <PiFileText />
            {getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.rules.title', 'Rules')}
          </TabsTrigger>
          <TabsTrigger 
            value="assignments" 
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="calculation-rules-assignments-tab"
          >
            <PiUsers />
            {getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.assignments.title', 'Assignments')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rules" className="gba:mt-6">
          <ExpenseCalculationRules {...context} />
        </TabsContent>
        
        <TabsContent value="assignments" className="gba:mt-6">
          <CalculationRuleAssignmentList
            {...context}
            assignments={assignments}
            rules={rules}
            isLoading={isLoading}
            onCreate={createAssignment}
            onUpdate={updateAssignment}
            onDelete={deleteAssignment}
            onValidate={validateAssignment}
            onSearch={searchAssignments}
            onRefresh={refetch}
            onNavigateToRule={handleNavigateToRule}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalculationRulesView; 