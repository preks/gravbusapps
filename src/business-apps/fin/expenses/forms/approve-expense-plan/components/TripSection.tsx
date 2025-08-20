import React, { useState } from 'react';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger, 
  Button, 
  Separator 
} from '@newwork/nw-design-system';
import { DownOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { formatDate } from '@/common/utils/windowUtils';

interface TripSectionProps {
  expenseRequestTrip: Array<{
    address?: string;
    tripDateTime?: string;
  }>;
  startDate?: string;
  endDate?: string;
  destinations: Array<{
    address: string;
    tripDateTime?: string;
  }>;
  numberOfDestinations: number;
  countriesSummary: {
    countries?: string;
  };
}

const TripSection: React.FC<TripSectionProps> = ({
  expenseRequestTrip,
  startDate,
  endDate,
  destinations,
  numberOfDestinations,
  countriesSummary
}) => {
  const [isDestinationExpanded, setIsDestinationExpanded] = useState(true);

  if (!expenseRequestTrip || expenseRequestTrip.length === 0) {
    return null;
  }

  return (
    <div data-testid="approve-expense-plan-trip" className="gba:mb-4">
      {/* Trip title - Light gray header bar */}
      <div className="gba:bg-gray-100 gba:p-3 gba:rounded-sm gba:mb-4 gba:w-full">
        <span className="gba:text-foreground gba:text-sm gba:font-semibold gba:pl-3">
          Trip
        </span>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-8 gba:mb-4" data-testid="approve-expense-plan-trip-section">
        {/* Start Location */}
        <div 
          className="gba:mb-4" 
          data-testid="approve-expense-plan-start-location"
        >
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <EnvironmentOutlined className="gba:text-base gba:text-muted-foreground" />
            <span className="gba:font-semibold gba:text-foreground">
              Start Location
            </span>
          </div>
          <div className="gba:ml-6">
            <div className="gba:text-foreground">
              {expenseRequestTrip[0]?.address || 'N/A'} 
            </div>
            <div className="gba:text-foreground">
              {startDate && formatDate(startDate)} {expenseRequestTrip[0]?.tripDateTime && formatDate(expenseRequestTrip[0].tripDateTime)}
            </div>
          </div>
        </div>

        {/* End Location */}
        <div 
          className="gba:mb-4" 
          data-testid="approve-expense-plan-end-location"
        >
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <EnvironmentOutlined className="gba:text-base gba:text-muted-foreground" />
            <span className="gba:font-semibold gba:text-foreground">
              End Location
            </span>
          </div>
          <div className="gba:ml-6">
            <div className="gba:text-foreground">
              {expenseRequestTrip[expenseRequestTrip.length - 1]?.address || 'N/A'} 
            </div>
            <div className="gba:text-foreground">
              {endDate && formatDate(endDate)} {expenseRequestTrip[expenseRequestTrip.length - 1]?.tripDateTime && formatDate(expenseRequestTrip[expenseRequestTrip.length - 1].tripDateTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Destination with collapsible - Full width */}
      <Collapsible 
        open={isDestinationExpanded} 
        onOpenChange={setIsDestinationExpanded}
        data-testid="approve-expense-plan-destination"
        className="gba:w-full"
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <EnvironmentOutlined className="gba:text-base gba:text-muted-foreground" />
          <span className="gba:font-semibold gba:text-foreground">
            Destination Location
          </span>
          <div className="gba:flex-1" />
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="gba:p-1 gba:h-auto"
              data-testid="approve-expense-plan-destination-toggle"
            >
              <DownOutlined 
                className={`gba:text-base gba:transition-transform gba:duration-200 ${isDestinationExpanded ? 'gba:rotate-180' : 'gba:rotate-0'}`}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
        <div className="gba:text-foreground gba:ml-6">
          {numberOfDestinations} Destination{numberOfDestinations !== 1 ? 's' : ''} {countriesSummary.countries ? `in ${countriesSummary.countries}` : ''}
        </div>   
        {/* Collapsible content */}
        <CollapsibleContent>
          <Separator className="gba:h-px gba:bg-gray-100 gba:mb-2 gba:mt-3" />
          <div className="gba:ml-6 gba:mt-1 gba:text-muted-foreground gba:text-sm">
            {destinations.map((trip, index) => (
              <div key={index} className="gba:mb-0">
                <div>
                  <span className="gba:text-muted-foreground gba:font-semibold">Destination:{' '}</span>
                  <span className="gba:text-foreground">{trip.address}, Departure {trip.tripDateTime && formatDate(trip.tripDateTime)}</span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default TripSection; 