import { LocationData } from "../utils/types";

/**
 * Tab names enum for expense request wizard
 */
export enum SCREEN_NAMES_ENUM {
  ITEMS_TAB="ItemsScreen",
  CREATE_ITEM_TAB="CreateItemScreen",
  TRIPS_TAB="TripScreen",
  LOAD_TAB="LoadScreen",
  ALLOWANCE_TAB="AllowanceScreen",
  SUMMARY_TAB="SummaryScreen"
}
/**
 * Point type enum
 */
export const PointTypeEnum = {
    start: "START_POINT",
    destination: "DESTINATION_POINT",
    arrival: "REGION_ARRIVAL",
    end: "END_POINT",
    border: "REGION_ARRIVAL"
};

/**
 * Trip direction default values
 */
export const TripDirectionDefaultValue = {
    go: "GO",
    back: "BACK"
};


export const TRIP_REQUEST_TYPE = "ExpenseRequestType:v1:TRIP"

export const ABSENCE_STATUS = "APPROVED"

export const EXCLUDED_STATUSES= ["DISCARDED"]

export const ADDRESS_TYPES_ENUM = {
  value: {
    PRIMARY: "PRIMARY",
    SECONDARY: "SECONDARY"
  }
};

export const defaultStartLocation : LocationData = {
    id: "start-location",
    name: "Start Location",
    isAbroad: false,
    location: "",
    departureDate: undefined,
    departureTime: undefined,
    isCollapsed: false,
    travelRegionRef: undefined,
}

export const defaultEndLocation: LocationData = {
    id: "end-location",
    name: "End Location",
    isAbroad: false,
    location: "",
    departureDate: undefined,
    departureTime: undefined,
    isCollapsed: false,
    travelRegionRef: undefined,
  };

export const defaultDestination: LocationData ={
  id: "destination-0",
  name: "Destination",
  isAbroad: false,
  location: "",
  departureDate: undefined,
  departureTime: undefined,
  isCollapsed: false,
  travelRegionRef: undefined,
}


export const mockAdditionalData = {
    psi_taskPayload: {
      stepKey: "Tab3_pse_save",
      initialParameters:{expenseItems:[{
        itemId: "2eea7deb-a2b2-4a9f-a3ff-7265143ff15d",
        currencyId: "Currency:v1:RON"
    }]},
      expenseRequest: {
        id: "90c7cdc0-ccef-4c0a-b5ba-a57af67bd38d",
        version: 4,
        businessKey: "0a844413-9c9b-45b7-8fda-106ae1808f61",
        additionalProperties: {
          transportationMeans: []
        },
      }
    },
    nvi_navigationPayload: {},
    psi_processMetadata: {
      processMetadata: {
        domain: "employee-expense",
        name: "changeExpenseRequest"
      },
      processInstanceId: "eab911a1-1336-40b1-bde8-f4742166f6c9",
      lastOpenedTask: {
        id: "697018fc-c027-493f-a815-69fb061828dc",
        name: "addItemsToRequest",
        parameters: {
          stepKey: "ItemsScreen_pse_next",
          expenseRequest: {
            id: "3c5b82b3-1487-4b57-8930-1d0d873a2226",
            version: 3
          }
        },
        screenKey: "frm_changeExpenseRequestAddItemsToRequest",
        screen: {
          id: "1e3d736b-29f8-4a7b-b461-a1e229a5afd4",
          namespaceId: "31bb6427-8f98-11ef-b686-1e4781e89729",
          namespaceCode: "nw_employee_expense",
          screenKey: "frm_changeExpenseRequestAddItemsToRequest",
          name: "Add Expense Items To Request",
          namespaceDescription: "Employee Expense",
          createdAt: "2024-11-01T14:41:47.644",
          updatedAt: "2024-11-01T14:41:47.644",
          isDeleted: false,
          type: "FORM",
          screenComponents: {
            key: "frm_changeExpenseRequestAddItemsToRequest",
            name: "Add Expense Items To Request",
            builderType: "LOWCODER",
            appId: "66cf3a923227892ac4685ffd",
            appName: "flw_modifyExpenseRequest",
            formDefinition: {},
            release: "true"
          }
        }
      }
    }
  };