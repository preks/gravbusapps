import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Form } from "antd";
import { Button } from "@newwork/gravity-ui-catalog";
import dayjs from "dayjs";
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale, formatDate } from "@/common/utils/windowUtils";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import { ICONS } from "../../../utils/icons";
import LocationContainer from "../components/LocationContainer/LocationContainer";
import LocationForm from "../components/LocationForm/LocationForm";
import "./TripScreen.css";
import { DestinationLimit, LocationData, TripScreenProps } from "../utils/types";
import { getMaxLimits, getMinLimits, getMinMaxLimits, validateAndSanitizeLocation } from "../utils/locationTimeUtils";
import { getExpenseRulesDataQuery, getRequestsAbsences } from "../ExpenseRequestWizardQueries";
import { useExpenseRequestWizardContext } from "../context/ExpenseRequestWizardContext";
import { showToast } from "../../../utils/notificationUtils";
import LoadScreen from "./LoadScreen";
import { fetchEmployeeRule } from "../ExpenseRequestWizardQueries";
import { formatDateTimeToISO, getOverlapWarningMessage } from '../utils/dateOverlapUtils';
import { ABSENCE_STATUS,  defaultDestination, defaultEndLocation, defaultStartLocation, EXCLUDED_STATUSES, TRIP_REQUEST_TYPE } from "../constants/constants";
import RejectionComment from "../components/RejectionComment";
import { EVENTS } from "../../../utils/constants";
import { mergeUniqueById } from '../../../utils/functionUtils';
import { setByExternalCustomComponent, setLocalitiesDefault } from '../utils/tripScreenUtils';

/**
 * Filters travel regions based on expense items' currency
 * @param items - Expense items with currency information
 * @param mainRule - Home region rule
 * @param otherRules - All available travel regions
 * @returns Filtered travel regions and flag indicating if all items use the same currency
 */
const filterRules = (items: any[], mainRule: any, otherRules: any[]) => {
  if (!items || !items.length || !mainRule || !otherRules) {
    return { sameRuleCurrency: false, valuesArray: otherRules || [] };
  }

  const ruleCurrency = mainRule.currency?.id;
  if (!ruleCurrency) {
    return { sameRuleCurrency: false, valuesArray: otherRules || [] };
  }

  const allMatch = items.every(item => item.currencyId === ruleCurrency || item.currency === ruleCurrency);

  if (allMatch) {
    return {
      sameRuleCurrency: true,
      valuesArray: otherRules.filter((rule) => rule.currency?.id === ruleCurrency)
    };
  }

  return {
    sameRuleCurrency: false,
    valuesArray: otherRules.filter(rule => 
      items.some(item => {
        const itemCurrency = item.currencyId || item.currency;
        return itemCurrency === rule.currency?.id;
      })
    )
  };
};


export const TripScreen: React.FC<TripScreenProps> = (props) => {
  const { accessToken, additionalData } = props;
  const [form] = Form.useForm();
  const graphqlClient = useGraphqlClient(accessToken);
  const { expenseRequestData, employeeRuleId, submitActionTripData, setEmployeeRuleId, updateTripFormValidation } = useExpenseRequestWizardContext();
  const { userInfo } = props;
  
  // Get expense items from additionalData if available
  const getExpenseItems = () => {
    if (additionalData?.psi_taskPayload?.initialParameters?.expenseItems) {
      return additionalData.psi_taskPayload.initialParameters.expenseItems;
    }
    return [];
  };
  
  // Get expense items
  const expenseItems = getExpenseItems();
  
  /**
   * Get filtered travel regions based on abroad status and expense items currency
   * @param isAbroad - Whether the location is abroad
   * @returns Filtered travel regions
   */
  const getFilteredTravelRegions = (isAbroad: boolean) => {
    // First filter by abroad status
    const baseRegions = isAbroad
      ? (expenseRulesData?.AllowanceRegionRuleDetail || []).filter((region: any) => region.home === false)
      : (expenseRulesData?.AllowanceRegionRuleDetail || []);
    
    // Then filter by expense items currency if items exist
    if (expenseItems && expenseItems.length > 0 && expenseRulesData?.homeRegionRule?.length > 0) {
      return filterRules(
        expenseItems, 
        expenseRulesData.homeRegionRule[0], 
        baseRegions
      ).valuesArray;
    }
    
    return baseRegions;
  };
  
  const initialStartLocation: LocationData = defaultStartLocation

  const initialEndLocation: LocationData = defaultEndLocation
  
  const [startLocation, setStartLocation] = useState<LocationData>(initialStartLocation);
  const [endLocation, setEndLocation] = useState<LocationData>(initialEndLocation);
  
  const [expenseRulesData, setExpenseRulesData] = useState<any>(null);
  
  const [locationsAreSynced, setLocationsAreSynced] = useState<boolean>(false);
  
  const [startLocationOverlap, setStartLocationOverlap] = useState<{ message: string, isError: boolean } | null>(null);
  const [endLocationOverlap, setEndLocationOverlap] = useState<{ message: string, isError: boolean } | null>(null);
  const [employeeRuleError, setEmployeeRuleError] = useState<string | null>(null);
  const [ruleConflictError, setRuleConflictError] = useState<string | null>(null);

  const validateEmployeeRule = async (startDate: Date | undefined, startTime: Date | undefined) => {
    setEmployeeRuleError(null);
    setRuleConflictError(null);
    
    if (!startDate) {
      return true;
    }
    
    const employeeId = userInfo?.employeeDetails?.employeeId;
    
    if (!accessToken || !employeeId) {
      return false;
    }
    
    try {
      let dateString = startDate.toISOString();
      
      if (startTime) {
        const timeObj = new Date(startTime);
        const dateObj = new Date(startDate);
        dateObj.setHours(timeObj.getHours(), timeObj.getMinutes(), timeObj.getSeconds());
        dateString = dateObj.toISOString();
      }
      
      const ruleData = await fetchEmployeeRule(employeeId, dateString, accessToken);
      
      if (!ruleData) {
        const errorMessage = getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_item.missing_expense_rule_message', 
          'There is no rule set for your user, please reach out to your administrator.'
        );
        setEmployeeRuleError(errorMessage);
        return false;
      }
      
      if (ruleData.id) {
        setEmployeeRuleId(ruleData.id);
        const hasConflict = await checkRuleConflicts(ruleData.id);
        if (hasConflict) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_item.missing_expense_rule_message', 
        'There is no rule set for your user, please reach out to your administrator.'
      );
      setEmployeeRuleError(errorMessage);
      return false;
    }
  };
  
  const checkRuleConflicts = async (newRuleId: string): Promise<boolean> => {
    setRuleConflictError(null);
    if (!expenseRequestData) {
      return false;
    }
    
    const requestValue = expenseRequestData.ExpenseRequestByPk;
    if (!requestValue) {
      return false;
    }
    
    if (requestValue.expensePlan) {
      const planValue = requestValue.expensePlan;
      
      if (planValue.expenseRuleId && planValue.expenseRuleId !== newRuleId) {
        const errorMessage = getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.request_and_plan_rule_conflict_message', 
          `The expense request uses the rule ${requestValue.code} ${requestValue.title}, but the expense plan uses the rule ${planValue.code} ${planValue.title}. They don't fit. Please reach out to your supervisor or expense expert.`,
          {
            codeRequest: requestValue.code,
            nameRequest: requestValue.title,
            codePlan: planValue.code,
            namePlan: planValue.title,
            interpolation: {
              escapeValue: false
            }
          }
        );
        setRuleConflictError(errorMessage);
        return true;
      }
    }
    

    const requestItems: Array<{id: string, code: string, title: string, ruleId: string}> = [];
    if (expenseRequestData.ExpenseItem && Array.isArray(expenseRequestData.ExpenseItem)) {
      expenseRequestData.ExpenseItem.forEach((item: any) => {
        if (item) {
          requestItems.push({
            id: item.id,
            code: item.code || '',
            title: item.title || '',
            ruleId: item.expenseRuleId || ''
          });
        }
      });
    }
    
    const additionalItems: Array<{id: string, code: string, title: string, ruleId: string}> = [];
    if (additionalData?.psi_taskPayload?.initialParameters?.expenseItems && 
        Array.isArray(additionalData.psi_taskPayload.initialParameters.expenseItems)) {
      additionalData.psi_taskPayload.initialParameters.expenseItems.forEach((item: any) => {
        additionalItems.push({
          id: item.id,
          code: item.code || '',
          title: item.title || '',
          ruleId: item.expenseRuleId || ''
        });
      });
    }
    
    const items = mergeUniqueById(requestItems, additionalItems);
    
    const mismatchedItem = items.find((item: {id: string, code: string, title: string, ruleId: string}) => item.ruleId && item.ruleId !== newRuleId);
    
    if (mismatchedItem) {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'lowcoder:modify_expense_request.request_and_item_rule_conflict_message', 
        `The expense request uses the rule ${requestValue.code} ${requestValue.title}, but the expense item uses the rule ${mismatchedItem.code} ${mismatchedItem.title}. They don't fit. Please reach out to your supervisor or expense expert.`,
        {
          codeRequest: requestValue.code,
          nameRequest: requestValue.title,
          codeItem: mismatchedItem.code,
          nameItem: mismatchedItem.title,
          interpolation: {
            escapeValue: false
          }
        }
      );
      
      setRuleConflictError(errorMessage);
      return true;
    }
    
    return false;
  };
  
  const checkAbsencesAndRequests = async (
    startDate: Date | undefined,
    startTime: Date | undefined,
    endDate: Date | undefined,
    endTime: Date | undefined,
    isEndLocation: boolean = false
  ) => {
    if (!startDate) {
      return;
    }
    
    if (!isEndLocation) {
      const isRuleValid = await validateEmployeeRule(startDate, startTime);
      if (!isRuleValid) {
        return;
      }
    }

    const employeeId = userInfo?.employeeDetails?.employeeId;
    
    if (!accessToken || !employeeId || !expenseRequestData) {
      return;
    }
    
    try {
      const activeUserLocale = getCurrentActiveUserLocale();
      const expenseId = expenseRequestData?.ExpenseRequestByPk?.id;
      const expensePlanId = expenseRequestData?.ExpenseRequestByPk?.expensePlanId;
      
      if (!expenseId) {
        return;
      }
      
      const startTimeValue = formatDateTimeToISO(startDate, startTime, formatDateTimeToISO(endDate, endTime));
      const endTimeValue = formatDateTimeToISO(endDate, endTime, formatDateTimeToISO(startDate, startTime));
      
      const variables = {
        employeeId: employeeId,
        requestType:TRIP_REQUEST_TYPE,
        absenceStatus: ABSENCE_STATUS,
        statusArray: EXCLUDED_STATUSES,
        requestId: expenseId,
        activeUserLocale,
        startTimeValue,
        endTimeValue
      };
      try {
        const response = await graphqlClient.request(getRequestsAbsences, variables);
        const overlapWarning = getOverlapWarningMessage(response, expensePlanId);
        if (isEndLocation) {
          setEndLocationOverlap(overlapWarning);
        } else {
          setStartLocationOverlap(overlapWarning);
        }
      } catch (error) {
        showToast(
          getTranslationFromI18nKeyAndLabel("lowcoder:modify_expense_request.error_fetching_expense_data", "Error fetching expense data"),
          "error"
        );
      }
    } catch (error) {
      showToast(
        getTranslationFromI18nKeyAndLabel("lowcoder:modify_expense_request.error_fetching_expense_data", "Error fetching expense data"),
        "error"
      );
    }
  };
  
  
const handleStartLocationChange = (updatedLocation: LocationData) => {
    const sanitizedLocation = validateAndSanitizeLocation(updatedLocation, startLimits);
    
    const wereSynced = locationsAreSynced && 
      startLocation.location === endLocation.location;
   
      if (startLocation.isAbroad && !updatedLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0) {
      sanitizedLocation.travelRegionRef = expenseRulesData.homeRegionRule[0].travelRegionRef;
    }
    setStartLocation(sanitizedLocation);
    if (wereSynced) {
      setEndLocation(prevEndLocation => ({
        ...prevEndLocation,
        location: sanitizedLocation.location
      }));
    } else {
      setLocationsAreSynced(sanitizedLocation.location === endLocation.location);
    }
  };

  const handleEndLocationChange = (updatedLocation: LocationData) => {
    const sanitizedLocation = validateAndSanitizeLocation(updatedLocation, endLimits);
    if (endLocation.isAbroad && !updatedLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0) {
      sanitizedLocation.travelRegionRef = expenseRulesData.homeRegionRule[0].travelRegionRef;
    }
    setEndLocation(sanitizedLocation);
    setLocationsAreSynced(sanitizedLocation.location === startLocation.location);
  };
  
  const loadInitialTripData = async () => {
    try {
      
      if ((expenseRequestData?.ExpenseRequestByPk?.expenseRequestTrip &&
        Array.isArray(expenseRequestData.ExpenseRequestByPk.expenseRequestTrip) && 
        expenseRequestData.ExpenseRequestByPk.expenseRequestTrip.length !== 0) || 
          (expenseRequestData.ExpenseRequestByPk.expensePlan)) {
        
        let myData: any = [];
        if (expenseRequestData?.ExpenseRequestByPk?.expenseRequestTrip &&
          Array.isArray(expenseRequestData.ExpenseRequestByPk.expenseRequestTrip) && 
          expenseRequestData.ExpenseRequestByPk.expenseRequestTrip.length !== 0) {
          myData = expenseRequestData.ExpenseRequestByPk.expenseRequestTrip;
        } else if (expenseRequestData.ExpenseRequestByPk.expensePlan) {
          myData = expenseRequestData.ExpenseRequestByPk.expensePlan;
        }
        const startObject = myData.expenseRequestTrip?.find((item: any) => item.pointType === 'START_POINT');
        
        if (startObject && startObject.tripDateTime && dayjs(startObject.tripDateTime).isValid()) {
          const formattedDate = dayjs(startObject.tripDateTime).format('YYYY-MM-DDTHH:mm:ss.SSSZZ');
          
          const employeeId = userInfo?.employeeDetails?.employeeId;
          if (!employeeId) {
            showToast(
              getTranslationFromI18nKeyAndLabel("lowcoder:modify_expense_request.missing_employee_id", "Missing employee ID"),
              "error"
            );
            return;
          }
          
          const employeeRuleData = await fetchEmployeeRule(employeeId, formattedDate, accessToken);
          
          if (employeeRuleData && employeeRuleData.expenseRuleId) {
            setEmployeeRuleId(employeeRuleData.expenseRuleId);
            const activeUserLocale = getCurrentActiveUserLocale();
            const rulesResponse = await graphqlClient.request(getExpenseRulesDataQuery, {
              expenseRuleId: employeeRuleData.expenseRuleId,
              activeUserLocale
            });
            
            setExpenseRulesData(rulesResponse);
            
            // Prefill trip data from expense request
            setByExternalCustomComponent(expenseRequestData, rulesResponse, setStartLocation, setDestinations, setEndLocation);
          } else {
            // Still try to prefill with available data even if rule is missing
            setByExternalCustomComponent(expenseRequestData, null, setStartLocation, setDestinations, setEndLocation);
          }
        } else {
          // Try to prefill with available data even if start object is invalid
          setByExternalCustomComponent(expenseRequestData, expenseRulesData, setStartLocation, setDestinations, setEndLocation)
        }
      } else {
        setLocalitiesDefault(expenseRequestData, setStartLocation, setEndLocation, setLocationsAreSynced);
      }
    } catch (error) {
      showToast(
        getTranslationFromI18nKeyAndLabel("lowcoder:modify_expense_request.error_load_trip_data", "Error loading initial trip data"),
        "error"
      );
    }
  };
  const [destinations, setDestinations] = useState<LocationData[]>([
    defaultDestination,
  ]);

  const startLimits = useMemo(
    () => getMaxLimits(destinations, endLocation),
    [destinations, endLocation]
  );

  const endLimits = useMemo(
    () => getMinLimits(startLocation, destinations),
    [startLocation, destinations]
  );

  
  const destinationLimits: DestinationLimit = useMemo(
    () =>
      destinations.reduce((acc, destination) => {
        const limits = getMinMaxLimits(
          startLocation,
          endLocation,
          destinations,
          destination
        );

        return {
          ...acc,
          [destination.id]: limits,
        };
      }, {}),
    [startLocation, destinations,endLocation]
  );
  const toggleLocationCollapse = (
    setLocation: React.Dispatch<React.SetStateAction<LocationData>>
  ) => {
    setLocation((prev) => ({
      ...prev,
      isCollapsed: !prev.isCollapsed,
    }));
  };

  const toggleDestinationCollapse = (id: string) => {
    setDestinations((prev) =>
      prev.map((dest) =>
        dest.id === id ? { ...dest, isCollapsed: !dest.isCollapsed } : dest
      )
    );
  };

  const updateDestination = (id: string, field: string, value: any) => {
    setDestinations((prev) =>
      prev.map((destination) => {
        if (destination.id !== id) return destination;

        const updatedDestination = { ...destination, [field]: value };
        if (field === 'isAbroad' && destination.isAbroad && !value && expenseRulesData?.homeRegionRule?.length > 0) {
          updatedDestination.travelRegionRef = expenseRulesData.homeRegionRule[0].travelRegionRef;
        }

        const limits = getMinMaxLimits(
          startLocation,
          endLocation,
          prev,
          destination
        );

        return validateAndSanitizeLocation(updatedDestination, limits);
      })
    );
  };

  const addDestination = () => {
    const newId = `destination-${destinations.length + 1}`;
    setDestinations((prev) => [
      ...prev,
      {
        id: newId,
        name: "Destination",
        isAbroad: false,
        location: "",
        departureDate: undefined,
        departureTime: undefined,
        isCollapsed: false,
        travelRegionRef: undefined,
      },
    ]);
  };

  const removeDestination = (id: string) => {
    setDestinations((prev) => prev.filter((dest) => dest.id !== id));
  };

  useEffect(() => {
    if (accessToken && userInfo?.employeeId && expenseRequestData) {
      if (startLocation.departureDate || startLocation.departureTime) {
        checkAbsencesAndRequests(
          startLocation.departureDate,
          startLocation.departureTime,
          endLocation.departureDate,
          endLocation.departureTime,
          false 
        );
      }
      
      if (endLocation.departureDate || endLocation.departureTime) {
        checkAbsencesAndRequests(
          startLocation.departureDate,
          startLocation.departureTime,
          endLocation.departureDate,
          endLocation.departureTime,
          true
        );
      }
    }
  }, [accessToken, userInfo, expenseRequestData, startLocation.departureDate, startLocation.departureTime, endLocation.departureDate, endLocation.departureTime]);

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !employeeRuleId || !expenseRequestData) return;
      
      try {
        const activeUserLocale = getCurrentActiveUserLocale();
        
        const expenseId = expenseRequestData?.ExpenseRequestByPk?.id;
        if (!expenseId) {
          showToast(
            getTranslationFromI18nKeyAndLabel("lowcoder:create_expense_request.error_missing_user_info", "Missing user information"),
            "error"
          );
          return;
        }

        const rulesResponse = await graphqlClient.request(getExpenseRulesDataQuery, {
          expenseRuleId: employeeRuleId,
          activeUserLocale
        });
        
        setExpenseRulesData(rulesResponse);
        
        await loadInitialTripData()
      } catch (error) {
        showToast(
          getTranslationFromI18nKeyAndLabel("lowcoder:modify_expense_request.error_fetching_expense_data", "Error fetching expense data"),
          "error"
        );
      }
    };
    
    fetchData();
  }, [accessToken, employeeRuleId, expenseRequestData, additionalData, setEmployeeRuleId]);
  const validateTripForm = useCallback(() => {
    if (employeeRuleError || ruleConflictError) {
      updateTripFormValidation(false);
      return false;
    }
    
    if (startLocationOverlap || endLocationOverlap) {
      updateTripFormValidation(false);
      return false;
    }
    
    if (
      !startLocation.location || 
      !startLocation.departureDate || 
      !startLocation.departureTime ||
      (startLocation.isAbroad && !startLocation.travelRegionRef)
    ) {
      updateTripFormValidation(false);
      return false;
    }
    
    for (let i = 0; i < destinations.length; i++) {
      const destination = destinations[i];
      
      if (!destination.location || (destination.isAbroad && !destination.travelRegionRef)) {
        updateTripFormValidation(false);
        return false;
      }
      
      if (i < destinations.length - 1) {
        if (!destination.departureDate || !destination.departureTime) {
          updateTripFormValidation(false);
          return false;
        }
      }
    }
    
    if (
      !endLocation.location || 
      !endLocation.departureDate || 
      !endLocation.departureTime ||
      (endLocation.isAbroad && !endLocation.travelRegionRef)
    ) {
      updateTripFormValidation(false);
      return false;
    }
    
    updateTripFormValidation(true);
    return true;
  }, [startLocation, destinations, endLocation, employeeRuleError, ruleConflictError, startLocationOverlap, endLocationOverlap, updateTripFormValidation]);
  
  useEffect(() => {
    validateTripForm();
  }, [startLocation, destinations, endLocation, employeeRuleError, ruleConflictError, startLocationOverlap, endLocationOverlap, validateTripForm]);

  const handleSave = () => {
    submitActionTripData(startLocation, destinations, endLocation, expenseRulesData, EVENTS.SAVE);
  };

  const handleNext = () => {
    if (validateTripForm()) {
      submitActionTripData(startLocation, destinations, endLocation, expenseRulesData, EVENTS.NEXT);
    }
  };
  
  useEffect(() => {
    const saveEventHandler = () => {
      handleSave();
    };
    document.addEventListener('expense-request-save-trip', saveEventHandler);
    return () => {
      document.removeEventListener('expense-request-save-trip', saveEventHandler);
    };
  }, [startLocation, destinations, endLocation, expenseRulesData]);

  useEffect(() => {
    const nextEventHandler = () => {
      handleNext();
    };
    document.addEventListener('expense-request-next-trip', nextEventHandler);
    return () => {
      document.removeEventListener('expense-request-next-trip', nextEventHandler);
    };
  }, [startLocation, destinations, endLocation, expenseRulesData, validateTripForm]);

  if (!expenseRequestData) {
    return <LoadScreen accessToken={accessToken} userInfo={userInfo} />;
  }

  const getLatestRejectComment = () => {
    if (expenseRequestData && 
        expenseRequestData.ExpenseRequestByPk && 
        expenseRequestData.ExpenseRequestByPk.expenseRequestComment) {
      const filteredArray = expenseRequestData.ExpenseRequestByPk.expenseRequestComment
        .filter((comment: any) => comment.commentType && comment.commentType.toUpperCase().includes("REJECT"));
      
      return filteredArray && filteredArray.length > 0 ? 
        [...filteredArray].sort((a: any, b: any) => new Date(b.commentDate).getTime() - new Date(a.commentDate).getTime())[0] : 
        null;
    }
    return null;
  };
  
  const latestRejectComment = getLatestRejectComment();

  return (
    <div
      className="gba:tripScreenContainer"
      data-testid="expense-request-wizard-trip-screen"
    >
      <Form form={form} layout="vertical">
        <div
          className="gba:tripContent"
          data-testid="expense-request-wizard-trip-screen-content"
        >
          {/* Rejection Comment */}
          {latestRejectComment && (
            <RejectionComment comment={latestRejectComment} />
          )}
          {/* Start Location */}
          <div className="gba:locationContainerWrapper gba:withDivider" data-testid="start-location-wrapper">
            <LocationContainer
              title={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.start_location', 'Start Location')}
              icon={ICONS.PIN_ICON}
              isCollapsed={startLocation.isCollapsed}
              onToggleCollapse={() => toggleLocationCollapse(setStartLocation)}
              summary={
                <div data-testid="start-location-summary">
                  <div data-testid="start-location-name">{startLocation.location || '-'}</div>
                  {startLocation.departureDate && (
                    <div data-testid="start-location-datetime">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.transformer_rule', 'Departure')}
                      {formatDate(new Date(startLocation.departureDate), "date.long")}{startLocation.departureTime ? " - " +formatDate(new Date(startLocation.departureTime), "time.short") : ""}
                    </div>
                  )}
                </div>
              }
            >
              <LocationForm
                locationData={startLocation}
                onUpdate={(field, value) => {
                  // Clear travel region when abroad toggle changes
                  const updatedLocation = field === 'isAbroad' 
                    ? { ...startLocation, [field]: value, travelRegionRef: undefined }
                    : { ...startLocation, [field]: value };
                  
                  handleStartLocationChange(updatedLocation);
                  if (field === 'departureDate' || field === 'departureTime') {
                    checkAbsencesAndRequests(
                      field === 'departureDate' ? value : startLocation.departureDate,
                      field === 'departureTime' ? value : startLocation.departureTime,
                      endLocation.departureDate,
                      endLocation.departureTime,
                      false 
                    );
                    setDestinations(prev => 
                      prev.map(destination => {
                        const limits = getMinMaxLimits(
                          updatedLocation,
                          endLocation,
                          prev,
                          destination
                        );
                        return validateAndSanitizeLocation(destination, limits);
                      })
                    );
                  }
                }}
                dateTimeLimits={startLimits}
                travelRegions={getFilteredTravelRegions(startLocation.isAbroad)}
                overlapWarning={endLocation.departureDate ? null : startLocationOverlap }
                showFutureWarning={true}
                errorMessage={employeeRuleError || ruleConflictError}
                locationFormLabels={{
                  inputFieldLabel:getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.start_location', 'Start Location'),
                  dateFieldLabel:getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.departure_date', 'Departure Date'),
                  timeFieldLabel:getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.departure_time', 'Departure Time')
                }}
              />
            </LocationContainer>
          </div>

          {/* Destinations */}
          {destinations.map((destination, index) => (
            <div key={destination.id} className="gba:locationContainerWrapper gba:withDivider" data-testid={`destination-wrapper-${destination.id}`}>
              <LocationContainer
                title={getTranslationFromI18nKeyAndLabel(
                  "lowcoder:create_expense_request.add_request_trip_details.destination_collapsible_title",
                  "Destination"
                )}
                icon={ICONS.PIN_ICON}
                isCollapsed={destination.isCollapsed}
                onToggleCollapse={() => toggleDestinationCollapse(destination.id)}
                onRemove={() => removeDestination(destination.id)}
                showRemoveButton={destinations.length > 1}
                summary={
                  <div data-testid={`destination-summary-${destination.id}`}>
                    <div data-testid={`destination-name-${destination.id}`}>{destination.location || '-'}</div>
                    {destination.departureDate && (
                      <div data-testid={`destination-datetime-${destination.id}`}>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.transformer_rule', 'Departure')}
                        {formatDate(new Date(destination.departureDate), "date.long")}{ destination.departureTime ? " - " + formatDate(new Date(destination.departureTime), "time.short") : ""}
                      </div>
                    )}
                  </div>
                }
              >
                <LocationForm
                  locationData={destination}
                  onUpdate={(field, value) =>
                    updateDestination(destination.id, field, value)
                  }
                  index={index}
                  showDateTimeFields={index < destinations.length - 1}
                  dateTimeLimits={destinationLimits[destination.id] ?? {}}
                  travelRegions={getFilteredTravelRegions(destination.isAbroad)}
                />
              </LocationContainer>
            </div>
          ))}

          {/* Add Destination Button */}
          <div
            className="gba:addDestinationContainer gba:withDivider"
            data-testid="add-destination-container"
          >
            <Button
              variant="ghost"
              onClick={addDestination}
              data-testid="add-destination-button"
            >
              <img
                src={ICONS.ADD_CIRCLE}
                alt={"AddDestinationIcon"}
                style={{ width: "24px", height: "24px" }}
                data-testid="add-destination-icon"
              />
              {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.add_destionation_button', 'Add Destination')}
            </Button>
          </div>

          {/* End Location */}
          <div className="gba:locationContainerWrapper" data-testid="end-location-wrapper">
            <LocationContainer
              title={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.end_location_text', 'End Location')}
              icon={ICONS.PIN_ICON}
              isCollapsed={endLocation.isCollapsed}
              onToggleCollapse={() => toggleLocationCollapse(setEndLocation)}
              summary={
                <div data-testid="end-location-summary">
                  <div data-testid="end-location-name">{endLocation.location || '-'}</div>
                  {endLocation.departureDate && (
                    <div data-testid="end-location-datetime">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_detailed_view.arrival', 'Arrival')}
                      {formatDate(new Date(endLocation.departureDate), "date.long")}{endLocation.departureTime ? " - " +formatDate(new Date(endLocation.departureTime), "time.short") : ""}
                    </div>
                  )}
                </div>
              }
            >
              <LocationForm
                locationData={endLocation}
                onUpdate={(field, value) => {
                  const updatedLocation = { ...endLocation, [field]: value };
                  handleEndLocationChange(updatedLocation);
                  if (field === 'departureDate' || field === 'departureTime') {
                    checkAbsencesAndRequests(
                      startLocation.departureDate,
                      startLocation.departureTime,
                      field === 'departureDate' ? value : endLocation.departureDate,
                      field === 'departureTime' ? value : endLocation.departureTime,
                      true 
                    );
                    
                    setDestinations(prev => 
                      prev.map(destination => {
                        const limits = getMinMaxLimits(
                          startLocation,
                          updatedLocation,
                          prev,
                          destination
                        );
                        return validateAndSanitizeLocation(destination, limits);
                      })
                    );
                  }
                }}
                showDateTimeFields={true}
                dateTimeLimits={endLimits}
                travelRegions={getFilteredTravelRegions(endLocation.isAbroad)}
                overlapWarning={startLocation.departureDate && endLocation.departureDate ? (endLocationOverlap || startLocationOverlap) : null}
                showFutureWarning={true}
                locationFormLabels={{
                  inputFieldLabel:getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.end_location_text', 'End Location'),
                  dateFieldLabel:getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.add_trip_info_to_plan.end_date_label', 'Arrival Date'),
                  timeFieldLabel:getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.add_trip_info_to_plan.end_time_label', 'Arrival Time')
                }}
              />
            </LocationContainer>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default TripScreen;
