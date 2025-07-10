import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Form } from "antd";
import { Button } from "@newwork/gravity-ui-catalog";
import dayjs from "dayjs";
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from "@/common/utils/windowUtils";
import { BusinessAppContextProps } from "@/business-apps/types";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import { ICONS } from "../../../utils/icons";
import LocationContainer from "../components/LocationContainer/LocationContainer";
import LocationForm from "../components/LocationForm/LocationForm";
import "./TripScreen.css";
import { DestinationLimit, LocationData } from "../utils/types";
import { getMaxLimits, getMinLimits, getMinMaxLimits, validateAndSanitizeLocation } from "../utils/locationTimeUtils";
import { getExpenseRulesDataQuery, getRequestsAbsences } from "../ExpenseRequestWizardQueries";
import { useExpenseRequestWizardContext } from "../context/ExpenseRequestWizardContext";
import { showToast } from "../../../utils/notificationUtils";
import LoadScreen from "./LoadScreen";
import { fetchEmployeeRule } from "../ExpenseRequestWizardQueries";
import { formatDateTimeToISO, getOverlapWarningMessage } from '../utils/dateOverlapUtils';
import { ABSENCE_STATUS, EXCLUDED_STATUSES, TRIP_REQUEST_TYPE } from "../constants/constants";
import RejectionComment from "../components/RejectionComment";
import { EVENTS } from "../../../utils/constants";

/**
 * Address types enum
 */
const ADDRESS_TYPES_ENUM = {
  value: {
    PRIMARY: "PRIMARY",
    SECONDARY: "SECONDARY"
  }
};


/**
 * TripScreen component props
 */
interface TripScreenProps extends BusinessAppContextProps {
  additionalData?: { 
    mdi_modulePayload?: {
      tripData?: any;
    };
    [key: string]: any;
  };
}

/**
 * TripScreen component
 * @param props - Business app context props
 * @returns TripScreen component
 */
export const TripScreen: React.FC<TripScreenProps> = (props) => {
  const { accessToken, additionalData } = props;
  const [form] = Form.useForm();
  const graphqlClient = useGraphqlClient(accessToken);
  const { expenseRequestData, employeeRuleId, submitActionTripData, setEmployeeRuleId, updateTripFormValidation } = useExpenseRequestWizardContext();
  
  // Get userInfo from props
  const { userInfo } = props;
  
  // Initial location data
  const initialStartLocation: LocationData = {
    id: "start-location",
    name: "Start Location",
    isAbroad: false,
    location: "",
    departureDate: undefined,
    departureTime: undefined,
    isCollapsed: false,
    travelRegionRef: undefined,
  };

  const initialEndLocation: LocationData = {
    id: "end-location",
    name: "End Location",
    isAbroad: false,
    location: "",
    departureDate: undefined,
    departureTime: undefined,
    isCollapsed: false,
    travelRegionRef: undefined,
  };
  
  // State for locations
  const [startLocation, setStartLocation] = useState<LocationData>(initialStartLocation);
  const [endLocation, setEndLocation] = useState<LocationData>(initialEndLocation);
  
  // State for query data
  const [expenseRulesData, setExpenseRulesData] = useState<any>(null);
  
  // Track if start and end locations are synced
  const [locationsAreSynced, setLocationsAreSynced] = useState<boolean>(false);
  
  // State for warnings and errors
  const [startLocationOverlap, setStartLocationOverlap] = useState<{ message: string, isError: boolean } | null>(null);
  const [endLocationOverlap, setEndLocationOverlap] = useState<{ message: string, isError: boolean } | null>(null);
  const [employeeRuleError, setEmployeeRuleError] = useState<string | null>(null);
  const [ruleConflictError, setRuleConflictError] = useState<string | null>(null);
  
  // GraphQL client is already declared at the top of the component
  
  /**
   * Validate employee rule when start date/time changes
   * @param startDate - Start date
   * @param startTime - Start time
   */
  const validateEmployeeRule = async (startDate: Date | undefined, startTime: Date | undefined) => {
    // Clear any previous errors
    setEmployeeRuleError(null);
    setRuleConflictError(null);
    
    // Only proceed if we have a start date
    if (!startDate) {
      return true;
    }
    
    // Get employee ID from userInfo.employeeDetails
    const employeeId = userInfo?.employeeDetails?.employeeId;
    
    if (!accessToken || !employeeId) {
      console.error('Missing required data for employee rule validation:', { 
        hasAccessToken: !!accessToken, 
        hasEmployeeId: !!employeeId
      });
      return false;
    }
    
    try {
      // Create ISO date string from date and time
      let dateString = startDate.toISOString();
      
      // If time is provided, incorporate it into the date
      if (startTime) {
        const timeObj = new Date(startTime);
        const dateObj = new Date(startDate);
        dateObj.setHours(timeObj.getHours(), timeObj.getMinutes(), timeObj.getSeconds());
        dateString = dateObj.toISOString();
      }
      
      // Fetch employee rule
      const ruleData = await fetchEmployeeRule(employeeId, dateString, accessToken);
      
      // If no rule data returned, show error
      if (!ruleData) {
        const errorMessage = getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_item.missing_expense_rule_message', 
          'There is no rule set for your user, please reach out to your administrator.'
        );
        setEmployeeRuleError(errorMessage);
        return false;
      }
      
      // If we have rule data, update the employee rule ID
      if (ruleData.id) {
        setEmployeeRuleId(ruleData.id);
        
        // Check for rule conflicts
        const hasConflict = await checkRuleConflicts(ruleData.id);
        if (hasConflict) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error validating employee rule:', error);
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_item.missing_expense_rule_message', 
        'There is no rule set for your user, please reach out to your administrator.'
      );
      setEmployeeRuleError(errorMessage);
      return false;
    }
  };
  
  /**
   * Check for conflicts between the new rule and existing expense plan/items
   * @param newRuleId - The new rule ID to check against
   * @returns True if there's a conflict, false otherwise
   */
  const checkRuleConflicts = async (newRuleId: string): Promise<boolean> => {
    // Clear any previous conflict error
    setRuleConflictError(null);
    
    if (!expenseRequestData) {
      return false;
    }
    
    // Get request data
    const requestValue = expenseRequestData.ExpenseRequestByPk;
    if (!requestValue) {
      return false;
    }
    
    // Step 1: Check for conflicts with expense plan
    if (requestValue.expensePlan) {
      const planValue = requestValue.expensePlan;
      
      if (planValue.expenseRuleId && planValue.expenseRuleId !== newRuleId) {
        // Rule conflict between request and plan
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
    
    /**
     * Merge two arrays of objects by ID, keeping the last occurrence of each ID
     * @param array1 - First array
     * @param array2 - Second array
     * @returns Merged array with unique IDs
     */
    function mergeUniqueById<T extends { id: string }>(array1: T[], array2: T[]): T[] {
      const map = new Map<string, T>();
      [...array1, ...array2].forEach(item => map.set(item.id, item));
      return Array.from(map.values());
    }
    
    // Step 2: Combine and check expense items from both sources
    
    // Map items from expenseRequestData.ExpenseItem if available
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
    
    // Map items from additionalData
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
    
    // Combine items using mergeUniqueById to avoid duplicates based on id
    const items = mergeUniqueById(requestItems, additionalItems);
    
    // Check for rule conflicts in items
    const mismatchedItem = items.find((item: {id: string, code: string, title: string, ruleId: string}) => item.ruleId && item.ruleId !== newRuleId);
    
    if (mismatchedItem) {
      // Rule conflict between request and item
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
  
  /**
   * Check for absences and overlapping requests
   * @param startDate - Start date
   * @param startTime - Start time
   * @param endDate - End date
   * @param endTime - End time
   * @param isEndLocation - Whether this is for end location (true) or start location (false)
   */
  const checkAbsencesAndRequests = async (
    startDate: Date | undefined,
    startTime: Date | undefined,
    endDate: Date | undefined,
    endTime: Date | undefined,
    isEndLocation: boolean = false
  ) => {
    // Only proceed if we have at least start date
    if (!startDate) {
      return;
    }
    
    // First validate employee rule if this is for start location
    if (!isEndLocation) {
      const isRuleValid = await validateEmployeeRule(startDate, startTime);
      if (!isRuleValid) {
        // If rule validation failed, don't continue with overlap checks
        return;
      }
    }
    
    // Check for overlaps between dates
    
    // Get employee ID from userInfo.employeeDetails
    const employeeId = userInfo?.employeeDetails?.employeeId;
    
    if (!accessToken || !employeeId || !expenseRequestData) {
      console.error('Missing required data:', { 
        hasAccessToken: !!accessToken, 
        hasEmployeeId: !!employeeId, 
        hasExpenseRequestData: !!expenseRequestData 
      });
      return;
    }
    
    try {
      // Get active user locale
      const activeUserLocale = getCurrentActiveUserLocale();
      
      // Get expense request ID and plan ID
      const expenseId = expenseRequestData?.ExpenseRequestByPk?.id;
      const expensePlanId = expenseRequestData?.ExpenseRequestByPk?.expensePlanId;
      
      if (!expenseId) {
        console.error('Missing expense ID');
        return;
      }
      
      // Format start and end date/time to ISO strings
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
      
      // Execute GraphQL query to check for overlaps
      
      // Execute getRequestsAbsences query
      try {
        const response = await graphqlClient.request(getRequestsAbsences, variables);
        
        // Process the response to get warning message
        const overlapWarning = getOverlapWarningMessage(response, expensePlanId);
        
        // Set the appropriate warning based on which location is being checked
        if (isEndLocation) {
          setEndLocationOverlap(overlapWarning);
        } else {
          setStartLocationOverlap(overlapWarning);
        }
      } catch (error) {
        console.error('GraphQL request failed:', error);
      }
    } catch (error) {
      console.error('Error checking absences and requests:', error);
    }
  };
  
  /**
   * Gets a valid locality from employee addresses
   * @param employeeAddresses - Array of employee addresses
   * @returns Valid locality or empty string
   */
  const getValidLocality = (employeeAddresses: any[]) => {
    if (!Array.isArray(employeeAddresses) || employeeAddresses.length === 0) {
      return "";
    }
    
    // Try to find primary address with locality
    const primary = employeeAddresses.find(address => 
      address.type === ADDRESS_TYPES_ENUM.value.PRIMARY);
    if (primary && primary.locality && primary.locality.trim()) {
      return primary.locality;
    }
    
    // Try to find secondary address with locality
    const secondary = employeeAddresses.find(address => 
      address.type === ADDRESS_TYPES_ENUM.value.SECONDARY && 
      address.locality && address.locality.trim());
    
    return secondary ? secondary.locality : "";
  };
  
  /**
   * Sets default localities based on employee addresses
   */
  const setLocalitiesDefault = () => {
    try {
      // Get employee addresses from expenseRequestData
      const employeeAddresses = expenseRequestData?.EmployeeAddress || [];
      
      // Get valid locality
      const localityToSet = getValidLocality(employeeAddresses);
      
      if (localityToSet) {
        // Update start location
        setStartLocation(prevLocation => ({
          ...prevLocation,
          location: localityToSet
        }));
        
        // Update end location
        setEndLocation(prevLocation => ({
          ...prevLocation,
          location: localityToSet
        }));
        
        // Set locations as synced
        setLocationsAreSynced(true);
      }
    } catch (error) {
      console.error('Error setting default localities:', error);
    }
  };
  
  /**
   * Handle start location change with syncing logic
   * @param updatedLocation - Updated location data
   */
  const handleStartLocationChange = (updatedLocation: LocationData) => {
    const sanitizedLocation = validateAndSanitizeLocation(updatedLocation, startLimits);
    
    // Check if locations were synced before the change
    const wereSynced = locationsAreSynced && 
      startLocation.location === endLocation.location;
    
    // If changing isAbroad from true to false, set travelRegionRef to homeRegionRule if available
    if (startLocation.isAbroad && !updatedLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0) {
      sanitizedLocation.travelRegionRef = expenseRulesData.homeRegionRule[0].travelRegionRef;
    }
    
    setStartLocation(sanitizedLocation);
    
    // If locations were synced, update end location with the same value
    if (wereSynced) {
      setEndLocation(prevEndLocation => ({
        ...prevEndLocation,
        location: sanitizedLocation.location
      }));
    } else {
      // Check if the new start location is the same as the end location
      setLocationsAreSynced(sanitizedLocation.location === endLocation.location);
    }
    
    // We now handle overlap checks directly in the LocationForm onUpdate handler
  };
  
  /**
   * Handle end location change with syncing logic
   * @param updatedLocation - Updated location data
   */
  const handleEndLocationChange = (updatedLocation: LocationData) => {
    const sanitizedLocation = validateAndSanitizeLocation(updatedLocation, endLimits);
    
    // If changing isAbroad from true to false, set travelRegionRef to homeRegionRule if available
    if (endLocation.isAbroad && !updatedLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0) {
      sanitizedLocation.travelRegionRef = expenseRulesData.homeRegionRule[0].travelRegionRef;
    }
    
    setEndLocation(sanitizedLocation);
    
    // Check if the new end location is the same as the start location
    setLocationsAreSynced(sanitizedLocation.location === startLocation.location);
    
    // We don't need to call checkAbsencesAndRequests here as it's already called in the onUpdate handler
  };
  
  /**
   * Loads trip data from external sources and sets up the component
   */
  // Load initial trip data from external sources if available
  const loadInitialTripData = async () => {
    if (!additionalData) return;
    
    try {
      if ((additionalData && additionalData.mdi_modulePayload?.tripData) || 
          (expenseRequestData.ExpenseRequestByPk.expensePlan)) {
        
        let myData: any = [];
        if (additionalData.mdi_modulePayload?.tripData) {
          myData = additionalData.mdi_modulePayload.tripData;
        } else if (expenseRequestData.ExpenseRequestByPk.expensePlan) {
          myData = expenseRequestData.ExpenseRequestByPk.expensePlan;
        }
        
        const startObject = myData.expenseRequestTrip?.find((item: any) => item.pointType === 'START_POINT');
        
        if (startObject && startObject.tripDateTime && dayjs(startObject.tripDateTime).isValid()) {
          // Format date for employee rule query
          const formattedDate = dayjs(startObject.tripDateTime).format('YYYY-MM-DDTHH:mm:ss.SSSZZ');
          
          // Get employee ID
          const employeeId = userInfo?.employeeDetails?.employeeId;
          if (!employeeId) {
            showToast(
              getTranslationFromI18nKeyAndLabel("lowcoder:expense_request_wizard.missing_employee_id", "Missing employee ID"),
              "error"
            );
            return;
          }
          
          // Refetch employee rule with the start date
          const employeeRuleData = await fetchEmployeeRule(employeeId, formattedDate, accessToken);
          
          if (employeeRuleData && employeeRuleData.expenseRuleId) {
            // Update the employee rule ID in the context
            setEmployeeRuleId(employeeRuleData.expenseRuleId);
            
            // Refetch expense rules data
            const activeUserLocale = getCurrentActiveUserLocale();
            const rulesResponse = await graphqlClient.request(getExpenseRulesDataQuery, {
              expenseRuleId: employeeRuleData.expenseRuleId,
              activeUserLocale
            });
            
            setExpenseRulesData(rulesResponse);
            
            // TODO: Run setByExternalCustomComponent function when it's created
            // This function will be implemented later
          } else {
            // TODO: Run setByExternalCustomComponent function when it's created
            // This function will be implemented later
          }
        } else {
          // TODO: Run setByExternalCustomComponent function when it's created
          // This function will be implemented later
        }
      } else {
        // Run setLocalitiesDefault function to set locations based on employee addresses
        setLocalitiesDefault();
      }
    } catch (error) {
      console.error('Error loading initial trip data:', error);
      showToast(
        getTranslationFromI18nKeyAndLabel("lowcoder:expense_request_wizard.error_loading_trip_data", "Error loading trip data"),
        "error"
      );
    }
  };

  // State for destinations

  const [destinations, setDestinations] = useState<LocationData[]>([
    {
      id: "destination-1",
      name: "Destination",
      isAbroad: false,
      location: "",
      departureDate: undefined,
      departureTime: undefined,
      isCollapsed: false,
      travelRegionRef: undefined,
    },
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
  // Toggle collapse for locations
  const toggleLocationCollapse = (
    setLocation: React.Dispatch<React.SetStateAction<LocationData>>
  ) => {
    setLocation((prev) => ({
      ...prev,
      isCollapsed: !prev.isCollapsed,
    }));
  };

  // Toggle collapse for destination
  const toggleDestinationCollapse = (id: string) => {
    setDestinations((prev) =>
      prev.map((dest) =>
        dest.id === id ? { ...dest, isCollapsed: !dest.isCollapsed } : dest
      )
    );
  };

  // Update destination with validation
  const updateDestination = (id: string, field: string, value: any) => {
    setDestinations((prev) =>
      prev.map((destination) => {
        if (destination.id !== id) return destination;

        // Create updated destination
        const updatedDestination = { ...destination, [field]: value };
        
        // If changing isAbroad from true to false, set travelRegionRef to homeRegionRule if available
        if (field === 'isAbroad' && destination.isAbroad && !value && expenseRulesData?.homeRegionRule?.length > 0) {
          updatedDestination.travelRegionRef = expenseRulesData.homeRegionRule[0].travelRegionRef;
        }

        // Get limits for this destination
        const limits = getMinMaxLimits(
          startLocation,
          endLocation,
          prev,
          destination
        );

        // Validate and sanitize the updated destination
        return validateAndSanitizeLocation(updatedDestination, limits);
      })
    );
  };

  // Add new destination
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

  // Remove destination
  const removeDestination = (id: string) => {
    setDestinations((prev) => prev.filter((dest) => dest.id !== id));
  };

  // No longer need summary generation since we're not showing summaries when collapsed
  
  // Check for overlaps when component mounts
  useEffect(() => {
    if (accessToken && userInfo?.employeeId && expenseRequestData) {
      // Check start location overlaps
      if (startLocation.departureDate || startLocation.departureTime) {
        checkAbsencesAndRequests(
          startLocation.departureDate,
          startLocation.departureTime,
          endLocation.departureDate,
          endLocation.departureTime,
          false // This is for start location
        );
      }
      
      // Check end location overlaps
      if (endLocation.departureDate || endLocation.departureTime) {
        checkAbsencesAndRequests(
          startLocation.departureDate,
          startLocation.departureTime,
          endLocation.departureDate,
          endLocation.departureTime,
          true // This is for end location
        );
      }
    }
  }, [accessToken, userInfo, expenseRequestData, startLocation.departureDate, startLocation.departureTime, endLocation.departureDate, endLocation.departureTime]);

  // Fetch expense rules data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !employeeRuleId || !expenseRequestData) return;
      
      try {
        // Get active user locale
        const activeUserLocale = getCurrentActiveUserLocale();
        
        // Get expense request ID
        const expenseId = expenseRequestData?.ExpenseRequestByPk?.id;
        if (!expenseId) {
          showToast(
            getTranslationFromI18nKeyAndLabel("lowcoder:expense_request_wizard.missing_expense_id", "Missing expense ID"),
            "error"
          );
          return;
        }

        // Execute getExpenseRulesDataQuery
        const rulesResponse = await graphqlClient.request(getExpenseRulesDataQuery, {
          expenseRuleId: employeeRuleId,
          activeUserLocale
        });
        
        // Store the responses in state
        setExpenseRulesData(rulesResponse);
        
        // After fetching the basic data, load trip data from external sources if available
        if (additionalData) {
          await loadInitialTripData();
        } else {
          // If no external data, set default localities based on employee addresses
          setLocalitiesDefault();
        }
      } catch (error) {
        console.error('Error fetching trip data:', error);
        showToast(
          getTranslationFromI18nKeyAndLabel("lowcoder:expense_request_wizard.error_fetching_data", "Error fetching trip data"),
          "error"
        );
      }
    };
    
    fetchData();
  }, [accessToken, employeeRuleId, expenseRequestData, additionalData, setEmployeeRuleId]);
  // Validate trip form data
  const validateTripForm = useCallback(() => {
    // Check for any error messages from rules
    if (employeeRuleError || ruleConflictError) {
      updateTripFormValidation(false);
      return false;
    }
    
    // Check for overlapping absences or requests (warning messages)
    if (startLocationOverlap || endLocationOverlap) {
      updateTripFormValidation(false);
      return false;
    }
    
    // Validate start location
    if (
      !startLocation.location || 
      !startLocation.departureDate || 
      !startLocation.departureTime ||
      (startLocation.isAbroad && !startLocation.travelRegionRef)
    ) {
      updateTripFormValidation(false);
      return false;
    }
    
    // Validate destinations
    for (let i = 0; i < destinations.length; i++) {
      const destination = destinations[i];
      
      // Basic validation for all destinations
      if (!destination.location || (destination.isAbroad && !destination.travelRegionRef)) {
        updateTripFormValidation(false);
        return false;
      }
      
      // Check date and time for all destinations except the last one
      if (i < destinations.length - 1) {
        if (!destination.departureDate || !destination.departureTime) {
          updateTripFormValidation(false);
          return false;
        }
      }
    }
    
    // Validate end location
    if (
      !endLocation.location || 
      !endLocation.departureDate || 
      !endLocation.departureTime ||
      (endLocation.isAbroad && !endLocation.travelRegionRef)
    ) {
      updateTripFormValidation(false);
      return false;
    }
    
    // All validations passed
    updateTripFormValidation(true);
    return true;
  }, [startLocation, destinations, endLocation, employeeRuleError, ruleConflictError, startLocationOverlap, endLocationOverlap, updateTripFormValidation]);
  
  // Run validation whenever relevant fields change
  useEffect(() => {
    validateTripForm();
  }, [startLocation, destinations, endLocation, employeeRuleError, ruleConflictError, startLocationOverlap, endLocationOverlap, validateTripForm]);

  // Function to handle form submission using the context's saveTripData function
  const handleSave = () => {
    // Call the saveTripData function from context
    submitActionTripData(startLocation, destinations, endLocation, expenseRulesData, EVENTS.SAVE);
  };

  const handleNext = () => {
    // Validate form before proceeding
    if (validateTripForm()) {
      // Call the saveTripData function from context
      submitActionTripData(startLocation, destinations, endLocation, expenseRulesData, EVENTS.NEXT);
    }
  };
  
  // Add event listener for the custom save event
  useEffect(() => {
    const saveEventHandler = () => {
      handleSave();
    };
    
    // Add event listener
    document.addEventListener('expense-request-save-trip', saveEventHandler);
    
    // Clean up event listener on unmount
    return () => {
      document.removeEventListener('expense-request-save-trip', saveEventHandler);
    };
  }, []);

  // Add event listener for the custom next event
  useEffect(() => {
    const nextEventHandler = () => {
      handleNext();
    };
    
    // Add event listener
    document.addEventListener('expense-request-next-trip', nextEventHandler);
    
    // Clean up event listener on unmount
    return () => {
      document.removeEventListener('expense-request-next-trip', nextEventHandler);
    };
  }, []);

  // Show loading screen if data is still loading
  if (!expenseRequestData) {
    return <LoadScreen accessToken={accessToken} userInfo={userInfo} />;
  }
  
  /**
   * Get the latest rejection comment if available
   * @returns Latest rejection comment or null
   */
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
  
  // Get the latest rejection comment
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
              title={getTranslationFromI18nKeyAndLabel(
                "lowcoder:expense_request_wizard.trip_screen.start_location",
                "Start Location"
              )}
              icon={ICONS.PIN_ICON}
              isCollapsed={startLocation.isCollapsed}
              onToggleCollapse={() => toggleLocationCollapse(setStartLocation)}
            >
              <LocationForm
                locationData={startLocation}
                onUpdate={(field, value) => {
                  // Create updated location object
                  const updatedLocation = { ...startLocation, [field]: value };
                  
                  // Update the start location with the new value
                  handleStartLocationChange(updatedLocation);
                  
                  // After updating start location, validate all destinations
                  if (field === 'departureDate' || field === 'departureTime') {
                    // Check for overlaps directly here
                    checkAbsencesAndRequests(
                      field === 'departureDate' ? value : startLocation.departureDate,
                      field === 'departureTime' ? value : startLocation.departureTime,
                      endLocation.departureDate,
                      endLocation.departureTime,
                      false // This is for start location
                    );
                    
                    // Update destinations with new limits
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
                travelRegions={expenseRulesData?.AllowanceRegionRuleDetail || []}
                overlapWarning={endLocation.departureDate ? null : startLocationOverlap }
                showFutureWarning={true}
                errorMessage={employeeRuleError || ruleConflictError}
              />
            </LocationContainer>
          </div>

          {/* Destinations */}
          {destinations.map((destination, index) => (
            <div key={destination.id} className="gba:locationContainerWrapper gba:withDivider" data-testid={`destination-wrapper-${destination.id}`}>
              <LocationContainer
                title={getTranslationFromI18nKeyAndLabel(
                  "lowcoder:expense_request_wizard.trip_screen.destination",
                  "Destination"
                )}
                icon={ICONS.PIN_ICON}
                isCollapsed={destination.isCollapsed}
                onToggleCollapse={() => toggleDestinationCollapse(destination.id)}
                onRemove={() => removeDestination(destination.id)}
                showRemoveButton={destinations.length > 1}
              >
                <LocationForm
                  locationData={destination}
                  onUpdate={(field, value) =>
                    updateDestination(destination.id, field, value)
                  }
                  index={index}
                  showDateTimeFields={index < destinations.length - 1}
                  dateTimeLimits={destinationLimits[destination.id] ?? {}}
                  travelRegions={expenseRulesData?.AllowanceRegionRuleDetail || []}
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
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:expense_request_wizard.trip_screen.add_destination",
                "Add Destination"
              )}
            </Button>
          </div>

          {/* End Location */}
          <div className="gba:locationContainerWrapper" data-testid="end-location-wrapper">
            <LocationContainer
              title={getTranslationFromI18nKeyAndLabel(
                "lowcoder:expense_request_wizard.trip_screen.end_location",
                "End Location"
              )}
              icon={ICONS.PIN_ICON}
              isCollapsed={endLocation.isCollapsed}
              onToggleCollapse={() => toggleLocationCollapse(setEndLocation)}
            >
              <LocationForm
                locationData={endLocation}
                onUpdate={(field, value) => {
                  // Create updated location object
                  const updatedLocation = { ...endLocation, [field]: value };
                  
                  // Update the end location with the new value
                  handleEndLocationChange(updatedLocation);
                  
                  // After updating end location, validate all destinations
                  if (field === 'departureDate' || field === 'departureTime') {
                    // Check for overlaps directly here
                    checkAbsencesAndRequests(
                      startLocation.departureDate,
                      startLocation.departureTime,
                      field === 'departureDate' ? value : endLocation.departureDate,
                      field === 'departureTime' ? value : endLocation.departureTime,
                      true // This is for end location
                    );
                    
                    // Update destinations with new limits
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
                travelRegions={expenseRulesData?.AllowanceRegionRuleDetail || []}
                overlapWarning={startLocation.departureDate && endLocation.departureDate ? (endLocationOverlap || startLocationOverlap) : null}
                showFutureWarning={true}
              />
            </LocationContainer>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default TripScreen;
