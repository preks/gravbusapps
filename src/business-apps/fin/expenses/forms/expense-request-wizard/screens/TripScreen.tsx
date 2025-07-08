import React, { useMemo, useState } from "react";
import { Typography, Form } from "antd";
import { Button } from "@newwork/gravity-ui-catalog";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { BusinessAppContextProps } from "@/business-apps/types";
import { ICONS } from "../../../utils/icons";
import LocationContainer from "../components/LocationContainer/LocationContainer";
import LocationForm from "../components/LocationForm/LocationForm";
import "./TripScreen.css";
import { DestinationLimit, LocationData } from "../utils/types";
import { getMaxLimits, getMinLimits, getMinMaxLimits, validateAndSanitizeLocation } from "../utils/locationTimeUtils";


/**
 * TripScreen component props
 */
interface TripScreenProps extends BusinessAppContextProps {}

/**
 * TripScreen component for expense request wizard
 * @param props - Component props
 * @returns TripScreen component
 */
const TripScreen: React.FC<TripScreenProps> = () => {
  const [form] = Form.useForm();

  // State for locations
  const [startLocation, setStartLocation] = useState<LocationData>({
    id: "start-location",
    name: "Start Location",
    isAbroad: false,
    location: "",
    departureDate: undefined,
    departureTime: undefined,
    isCollapsed: false,
  });

  const [endLocation, setEndLocation] = useState<LocationData>({
    id: "end-location",
    name: "End Location",
    isAbroad: false,
    location: "",
    departureDate: undefined,
    departureTime: undefined,
    isCollapsed: false,
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
    setDestinations((prev) => {
      // First update the current destination
      const updatedDestinations = prev.map((dest) => 
        dest.id === id ? { ...dest, [field]: value } : dest
      );
      
      // Then validate all destinations against their constraints
      return updatedDestinations.map(destination => {
        const limits = getMinMaxLimits(
          startLocation,
          endLocation,
          updatedDestinations,
          destination
        );
        
        // Only validate if this destination has date/time values
        if (destination.departureDate || destination.departureTime) {
          return validateAndSanitizeLocation(destination, limits);
        }
        return destination;
      });
    });
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
      },
    ]);
  };

  // Remove destination
  const removeDestination = (id: string) => {
    setDestinations((prev) => prev.filter((dest) => dest.id !== id));
  };

  // No longer need summary generation since we're not showing summaries when collapsed

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
              title="Start Location"
              icon={ICONS.PIN_ICON}
              isCollapsed={startLocation.isCollapsed}
              onToggleCollapse={() => toggleLocationCollapse(setStartLocation)}
            >
              <LocationForm
                locationData={startLocation}
                onUpdate={(field, value) => {
                  // Update the start location
                  setStartLocation(prev => {
                    // First create the updated location
                    const updatedLocation = { ...prev, [field]: value };
                    
                    // Then validate against constraints
                    return validateAndSanitizeLocation(updatedLocation, startLimits);
                  });
                  
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
              />
            </LocationContainer>
          </div>

          {/* Destinations */}
          {destinations.map((destination, index) => (
            <div className="gba:locationContainerWrapper gba:withDivider" data-testid={`destination-wrapper-${destination.id}`}>
              <LocationContainer
                key={destination.id}
                title="Destination"
                icon={ICONS.PIN_ICON}
                isCollapsed={destination.isCollapsed}
                onToggleCollapse={() => toggleDestinationCollapse(destination.id)}
                onRemove={() => removeDestination(destination.id)}
                showRemoveButton={index > 0}
              >
              <LocationForm
                locationData={destination}
                onUpdate={(field, value) =>
                  updateDestination(destination.id, field, value)
                }
                index={index}
                showDateTimeFields={index < destinations.length - 1}
                dateTimeLimits={destinationLimits[destination.id] ?? {}}
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
              Add Destination
            </Button>
          </div>

          {/* End Location */}
          <div className="gba:locationContainerWrapper" data-testid="end-location-wrapper">
            <LocationContainer
              title="End Location"
              icon={ICONS.PIN_ICON}
              isCollapsed={endLocation.isCollapsed}
              onToggleCollapse={() => toggleLocationCollapse(setEndLocation)}
            >
              <LocationForm
                locationData={endLocation}
                onUpdate={(field, value) => {
                  // Update the end location
                  setEndLocation(prev => {
                    // First create the updated location
                    const updatedLocation = { ...prev, [field]: value };
                    
                    // Then validate against constraints
                    return validateAndSanitizeLocation(updatedLocation, endLimits);
                  });
                  
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
              />
            </LocationContainer>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default TripScreen;
