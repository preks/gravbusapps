export interface LocationData {
    id: string;
    name: string;
    isAbroad: boolean;
    location: string;
    departureDate: Date | undefined;
    departureTime: Date | undefined;
    isCollapsed: boolean;
  }

  export interface MaxDateTimeLimits {
    maxDate?: Date | undefined;
    maxTime?: Date | undefined;
  }
  
  export interface MinDateTimeLimits {
    minDate?: Date | undefined;
    minTime?: Date | undefined;
  }
  
  export type DateTimeLimits = MinDateTimeLimits & MaxDateTimeLimits;

  export interface DestinationLimit {
    [key: string]: DateTimeLimits;
  }