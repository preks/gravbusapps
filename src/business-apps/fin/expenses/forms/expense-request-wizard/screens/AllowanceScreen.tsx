import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Pagination } from 'antd';
import { useExpenseRequestWizardContext } from '../context/ExpenseRequestWizardContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/business-apps/types';
import AllowanceContainer from '../components/AllowanceContainer';
import { CostCenter } from '../utils/types';
import { getTravelRegionsAndUser, getUserCostCenters, getUserProjects } from '../ExpenseRequestWizardQueries';
import { getAllowanceItemsFunction } from '../utils/itemsScreenUtils';
import { createAllowanceScreenLogObject } from '../utils/allowanceScreenUtils';
import { EVENTS } from '../../../utils/constants';
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState';
import { showToast } from '../../../utils/notificationUtils';

const { Title } = Typography;

/**
 * AllowanceScreen component props
 */
interface AllowanceScreenProps extends BusinessAppContextProps {
  additionalData?: { 
    mdi_modulePayload?: {
      tripData?: any;
    };
    [key: string]: any;
  };
}

/**
 * AllowanceScreen component for expense request wizard
 * @param props - Component props
 * @returns AllowanceScreen component
 */
const AllowanceScreen: React.FC<AllowanceScreenProps> = (props) => {
  const { accessToken, userInfo } = props;
  const graphQLClient = useGraphqlClient(accessToken);
  const { 
    employeeRuleId, 
    expenseRequestData, 
    currentTitle,
    updateTripFormValidation
  } = useExpenseRequestWizardContext();
  
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(props.additionalData);
  
  const [, setTravelRegionsData] = useState<any>(null);
  const [, setCostCentersData] = useState<any>(null);
  const [defaultCostCenter, setDefaultCostCenter] = useState<string>("");
  const [defaultProject, setDefaultProject] = useState<string>("");
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [listDataArray, setListDataArray] = useState<any[]>([]);
  const [collapsedStates, setCollapsedStates] = useState<Record<number, boolean>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [structureIdArray, setStructureIdArray] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const itemListLimit = 4;
  
  useEffect(() => {
    const fetchTravelRegionsAndCostCenters = async () => {
      if (!employeeRuleId) return;
      
      try {
        const employeeIdValue = userInfo?.employeeDetails?.employeeId;
        const locale = getCurrentActiveUserLocale()
        const travelRegionsResponse = await graphQLClient.request(getTravelRegionsAndUser, {
          expenseRuleId: employeeRuleId,
          employeeId: employeeIdValue,
          activeUserLocale: locale
        });
        
        setTravelRegionsData(travelRegionsResponse);
        if (travelRegionsResponse?.EmployeePosition && 
            travelRegionsResponse.EmployeePosition.length > 0 && 
            travelRegionsResponse.EmployeePosition[0].structureId) {
          
          const structureId = travelRegionsResponse.EmployeePosition[0].structureId;
          
          const costCentersResponse = await graphQLClient.request(getUserCostCenters, {
            structureId
          });
          
          setCostCentersData(costCentersResponse);
          if (travelRegionsResponse.EmployeePosition[0].costCenterId) {
            setDefaultCostCenter(travelRegionsResponse.EmployeePosition[0].costCenterId || "");
          } 
          if (costCentersResponse?.userCostCenters && 
                     costCentersResponse.userCostCenters.length > 0) {
                      setDefaultCostCenter(travelRegionsResponse.EmployeePosition[0].costCenterId || "");
            const formattedCostCenters = costCentersResponse.userCostCenters.map((cc: any) => ({
              id: cc.id || cc,
              name: cc.name || "",
              structureId: cc.structureId || ''
            }));
            setCostCenters(formattedCostCenters);
          }
        }
      } catch (error) {
        showToast(
          getTranslationFromI18nKeyAndLabel("lowcoder:modify_expense_request.error_fetch_regions_cost_centers",
          "Error fetching travel regions and cost centers"),
          "error")
      }
    };
    
    fetchTravelRegionsAndCostCenters();
  }, [employeeRuleId, graphQLClient, userInfo?.employeeDetails?.employeeId]);
  
  useEffect(() => {
    if (!expenseRequestData?.ExpenseRequestByPk) return;
    
    const requestProject = expenseRequestData.ExpenseRequestByPk;
    const allowanceData = getAllowanceItemsFunction(expenseRequestData.ExpenseItem);
    const tripData = requestProject.ExpenseItem?.expenseRequestTrip || [];
    
    // Set default project if it exists in the expense request
    if (requestProject.project) {
      setDefaultProject(requestProject.project.id || "");
    }
    
    const processedData = allowanceData.map((element) => {
      let updatedElement = { ...element };
      
      // Set default cost center for all allowances if it exists
      if (!updatedElement.costCenterId && defaultCostCenter) {
        updatedElement.costCenterId = defaultCostCenter;
      }
      
      // Set default project for all allowances if it exists
      if (!updatedElement.projectId && requestProject.project) {
        updatedElement.projectId = requestProject.project.id || "";
      }
      
      if (!updatedElement.projectId && requestProject && updatedElement.expenseDate && requestProject.validTo && 
          updatedElement.expenseDate <= requestProject.validTo) {
        updatedElement.projectId = requestProject.id || "";
      }
      
      const tripMatch = tripData.find((trip: any) => trip.tripOrder === element.itemOrder);
      updatedElement.travelRegionRef = tripMatch ? tripMatch.travelRegionRef : null;
      
      const allowanceRegionRuleDetailMatch = tripData.find((trip: any) => trip.tripOrder === element.itemOrder);
      updatedElement.allowanceRegionRuleDetailId = (allowanceRegionRuleDetailMatch && allowanceRegionRuleDetailMatch.allowanceRegionRuleDetailId) 
        ? allowanceRegionRuleDetailMatch.allowanceRegionRuleDetailId 
        : null;
      
      return updatedElement;
    }).sort((a,b)=> a.itemOrder - b.itemOrder);
    setListDataArray(processedData);
    
    const initialCollapsedStates: Record<number, boolean> = {};
    processedData.forEach((_, index) => {
      initialCollapsedStates[index] = false;
    });
    setCollapsedStates(initialCollapsedStates);
    
    if (costCenters.length > 0) {
      updateStructureIdArrayFromListData(processedData);
    }
    
  }, [expenseRequestData, defaultCostCenter]);
  
  const handleToggleCollapse = (index: number) => {
    setCollapsedStates(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  const fetchProjects = async (structureIds: string[]) => {
    if (!structureIds.length) {
      setProjects([]);
      return;
    }
    
    try {
      const projectsResponse = await graphQLClient.request(getUserProjects, {
        structureIdArray: structureIds
      });
      
      if (projectsResponse?.Project) {
        setProjects(projectsResponse.Project);
      }
    } catch (error) {
      showToast(
      getTranslationFromI18nKeyAndLabel("lowcoder:modify_expense_request.error_fetch_projects",
      "Error fetching projects"),
      "error")
    }
  };
  useEffect(() => {
    if (structureIdArray.length > 0) {
      fetchProjects(structureIdArray);
    }
  }, [structureIdArray]);

  useEffect(() => {
    if (costCenters.length > 0 && listDataArray.length > 0) {
      updateStructureIdArrayFromListData(listDataArray);
    }
  }, [costCenters, listDataArray]);
  
  const handleCostCenterChange = (index: number, value: string | undefined) => {
    setListDataArray(prev => {
      const newArray = [...prev];
      newArray[index] = {
        ...newArray[index],
        costCenterId: value || undefined,
        projectId: undefined // Clear project when cost center changes
      };
      const updatedArray = [...newArray];
      setTimeout(() => {
        updateStructureIdArrayFromListData(updatedArray);
      }, 0);
      
      return newArray;
    });
  };
  
  const handleProjectChange = (index: number, value: string | undefined) => {
    setListDataArray(prev => {
      const newArray = [...prev];
      newArray[index] = {
        ...newArray[index],
        projectId: value || undefined
      };
      return newArray;
    });
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  const totalItems = listDataArray.length;
  const startIndex = (currentPage - 1) * itemListLimit;
  const endIndex = Math.min(startIndex + itemListLimit, totalItems);
  const paginatedItems = listDataArray.slice(startIndex, endIndex);
  
  const updateStructureIdArrayFromListData = (dataArray: any[]) => {
    const structureIds: string[] = [];
    
    dataArray.forEach(item => {
      if (item.costCenterId) {
        const costCenter = costCenters.find(cc => cc.id === item.costCenterId);
        if (costCenter?.structureId && !structureIds.includes(costCenter.structureId)) {
          structureIds.push(costCenter.structureId);
        }
      }
    });
    
    if (structureIds.length > 0) {
      setStructureIdArray(structureIds);
    }
  };
  
  // Check if all allowance items have a cost center selected
  const isFormValid = useMemo(() => {
    return listDataArray.every(item => item.costCenterId);
  }, [listDataArray]);
  
  // Update the wizard context with the form validation state
  useEffect(() => {
    updateTripFormValidation(isFormValid);
  }, [isFormValid, updateTripFormValidation]);
  
  // Set up event listeners for save and next actions from the wizard footer
  useEffect(() => {
    // Save event handler
    const handleSaveEvent = () => {
      if (expenseRequestData?.ExpenseRequestByPk) {
        const logObject = createAllowanceScreenLogObject(
          expenseRequestData.ExpenseRequestByPk,
          employeeRuleId,
          currentTitle,
          listDataArray,
          expenseRequestData,
          EVENTS.SAVE
        );
        dispatchProcessContinueEventIfEnabled(EVENTS.SAVE, logObject);
      }
    };
    
    // Next event handler
    const handleNextEvent = () => {
      if (expenseRequestData?.ExpenseRequestByPk) {
        const logObject = createAllowanceScreenLogObject(
          expenseRequestData.ExpenseRequestByPk,
          employeeRuleId,
          currentTitle,
          listDataArray,
          expenseRequestData,
          EVENTS.NEXT
        );
        dispatchProcessContinueEventIfEnabled(EVENTS.NEXT, logObject);
      }
    };
    
    // Add event listeners
    document.addEventListener('expense-request-save-allowance', handleSaveEvent);
    document.addEventListener('expense-request-next-allowance', handleNextEvent);
    
    // Clean up event listeners
    return () => {
      document.removeEventListener('expense-request-save-allowance', handleSaveEvent);
      document.removeEventListener('expense-request-next-allowance', handleNextEvent);
    };
  }, [expenseRequestData, employeeRuleId, currentTitle, listDataArray]);
  
  return (
    <div className="gba:allowanceScreenContainer" data-testid="expense-request-wizard-allowance-screen">
      {listDataArray.length === 0 ? (
        <Title level={4} className="gba:screenTitle gba:text-center gba:text-2xl gba:font-medium gba:pt-6" data-testid="expense-request-wizard-allowance-screen-title">
          {getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.no_allowances_text', 'No allowances created')}
        </Title>
      ) : (
        <>
          <div className="gba:allowanceList" data-testid="expense-request-wizard-allowance-list">
            {paginatedItems.map((item, index) => (
              <AllowanceContainer
                key={`allowance-${startIndex + index}`}
                item={item}
                index={startIndex + index}
                isCollapsed={collapsedStates[startIndex + index] || false}
                onToggleCollapse={() => handleToggleCollapse(startIndex + index)}
                costCenters={costCenters}
                defaultCostCenter={defaultCostCenter}
                onCostCenterChange={handleCostCenterChange}
                projects={projects}
                defaultProject={defaultProject}
                onProjectChange={handleProjectChange}
              />
            ))}
          </div>
          
          {totalItems > itemListLimit && (
            <div className="gba:paginationContainer gba:mt-4 gba:flex gba:justify-center" data-testid="expense-allowance-pagination-container">
              <Pagination
                current={currentPage}
                onChange={handlePageChange}
                total={totalItems}
                pageSize={itemListLimit}
                showSizeChanger={false}
                data-testid="expense-allowance-pagination"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AllowanceScreen;



