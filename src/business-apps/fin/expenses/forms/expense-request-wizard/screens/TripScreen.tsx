import React, { useState, useEffect, useMemo } from "react";
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
import { getExpenseRulesDataQuery } from "../ExpenseRequestWizardQueries";
import { useExpenseRequestWizardContext } from "../context/ExpenseRequestWizardContext";
import { showToast } from "../../../utils/notificationUtils";
import LoadScreen from "./LoadScreen";
import { fetchEmployeeRule } from "../ExpenseRequestWizardQueries";

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
 * TripScreen component for expense request wizard
 * @param props - Component props
 * @returns TripScreen component
 */
const TripScreen: React.FC<TripScreenProps> = (props) => {
  const { accessToken, additionalData } = props;
  const [form] = Form.useForm();
  const graphqlClient = useGraphqlClient(accessToken);
  const { expenseRequestData, employeeRuleId, saveTripData, setEmployeeRuleId } = useExpenseRequestWizardContext();
  
  // Get userInfo from props
  const { userInfo } = props;
  
  // State for query data
  const [expenseRulesData, setExpenseRulesData] = useState<any>(null);
  
  // Track if start and end locations are synced
  const [locationsAreSynced, setLocationsAreSynced] = useState<boolean>(false);
  
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

  // State for locations
  const [startLocation, setStartLocation] = useState<LocationData>({
    id: "start-location",
    name: "Start Location",
    isAbroad: false,
    location: "",
    departureDate: undefined,
    departureTime: undefined,
    isCollapsed: false,
    travelRegionRef: undefined,
  });

  const [endLocation, setEndLocation] = useState<LocationData>({
    id: "end-location",
    name: "End Location",
    isAbroad: false,
    location: "",
    departureDate: undefined,
    departureTime: undefined,
    isCollapsed: false,
    travelRegionRef: undefined,
  });

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

  // Function to handle form submission using the context's saveTripData function
  const handleSave = () => {
    // Call the saveTripData function from context
    saveTripData(startLocation, destinations, endLocation, expenseRulesData);
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
  }, [startLocation, destinations, endLocation, expenseRulesData]);
  
  // Show loading screen if data is still loading
  if (!expenseRequestData) {
    return <LoadScreen accessToken={accessToken} userInfo={userInfo} />;
  }

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
                  // Update the start location with the new value
                  handleStartLocationChange({ ...startLocation, [field]: value });
                  
                  // After updating start location, validate all destinations
                  if (field === 'departureDate' || field === 'departureTime') {
                    setDestinations(prev => 
                      prev.map(destination => {
                        const limits = getMinMaxLimits(
                          { ...startLocation, [field]: value },
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
                  // Update the end location with the new value
                  handleEndLocationChange({ ...endLocation, [field]: value });
                  
                  // After updating end location, validate all destinations
                  if (field === 'departureDate' || field === 'departureTime') {
                    setDestinations(prev => 
                      prev.map(destination => {
                        const limits = getMinMaxLimits(
                          startLocation,
                          { ...endLocation, [field]: value },
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
              />
            </LocationContainer>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default TripScreen;
