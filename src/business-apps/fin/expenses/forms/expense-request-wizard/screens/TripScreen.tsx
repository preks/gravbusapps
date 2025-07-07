import React, { useState } from "react";
import { Typography, Form } from "antd";
import { Button } from "@newwork/gravity-ui-catalog";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { BusinessAppContextProps } from "@/business-apps/types";
import { ICONS } from "../../../utils/icons";
import LocationContainer from "../components/LocationContainer/LocationContainer";
import LocationForm from "../components/LocationForm/LocationForm";
import "./TripScreen.css";


/**
 * Location data interface for trip details
 */
interface LocationData {
  id: string;
  name: string;
  isAbroad: boolean;
  location: string;
  departureDate: Date | null;
  departureTime: string;
  isCollapsed: boolean;
}

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
    departureDate: null,
    departureTime: "",
    isCollapsed: false,
  });

  const [endLocation, setEndLocation] = useState<LocationData>({
    id: "end-location",
    name: "End Location",
    isAbroad: false,
    location: "",
    departureDate: null,
    departureTime: "",
    isCollapsed: false,
  });

  const [destinations, setDestinations] = useState<LocationData[]>([
    {
      id: "destination-1",
      name: "Destination",
      isAbroad: false,
      location: "",
      departureDate: null,
      departureTime: "",
      isCollapsed: false,
    },
  ]);

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

  // Update destination
  const updateDestination = (id: string, field: string, value: any) => {
    setDestinations((prev) =>
      prev.map((dest) => (dest.id === id ? { ...dest, [field]: value } : dest))
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
        departureDate: null,
        departureTime: "",
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
                location={startLocation}
                onUpdate={(field, value) =>
                  setStartLocation((prev) => ({ ...prev, [field]: value }))
                }
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
                showRemoveButton={destinations.length > 1}
              >
              <LocationForm
                location={destination}
                onUpdate={(field, value) =>
                  updateDestination(destination.id, field, value)
                }
                index={index}
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
                location={endLocation}
                onUpdate={(field, value) =>
                  setEndLocation((prev) => ({ ...prev, [field]: value }))
                }
                showDateTimeFields={true}
              />
            </LocationContainer>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default TripScreen;
