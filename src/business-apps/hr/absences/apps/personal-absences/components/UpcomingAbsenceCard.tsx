import React from "react";
import { Card, Badge } from "@newwork/nw-design-system";
import { Calendar, Clock } from "lucide-react";
import type { UpcomingAbsenceCardProps } from "../types/absenceTypes";

export const UpcomingAbsenceCard = ({ absence }: UpcomingAbsenceCardProps) => {
  const { type, dates, description, timeUntil, bgColor } = absence;
  
  const getTimeUntilBadge = () => {
    if (timeUntil === "Today") return <Badge variant="destructive" className="gba:text-xs">Today</Badge>;
    if (timeUntil === "Tomorrow") return <Badge variant="secondary" className="gba:text-xs">Tomorrow</Badge>;
    if (timeUntil === "Started") return <Badge variant="default" className="gba:text-xs">In Progress</Badge>;
    return <Badge variant="outline" className="gba:text-xs">{timeUntil}</Badge>;
  };

  return (
    <Card 
      className="gba:p-4 gba:space-y-3 gba:border-l-4 gba:hover:shadow-md gba:transition-all gba:duration-200" 
      style={{
        borderLeftColor: bgColor ? (bgColor.startsWith("#") ? bgColor : `#${bgColor}`) : 'var(--nw-color-primary-500)'
      }}
      data-testid="upcoming-absence-card"
    >
      {/* Header with type and time until */}
      <div className="gba:flex gba:items-center gba:justify-between" data-testid="absence-card-top-row">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div 
            className="gba:w-6 gba:h-6 gba:rounded-md gba:flex gba:items-center gba:justify-center" 
            style={{ 
              backgroundColor: bgColor ? (bgColor.startsWith("#") ? `${bgColor}20` : `#${bgColor}20`) : 'var(--nw-color-primary-100)'
            }}
          >
            <Calendar
              className="gba:w-4 gba:h-4"
              style={{ color: bgColor ? (bgColor.startsWith("#") ? bgColor : `#${bgColor}`) : 'var(--nw-color-primary-500)' }}
              data-testid="absence-icon"
            />
          </div>
          <span className="gba:font-medium gba:text-foreground" data-testid="absence-type">
            {type}
          </span>
        </div>
        {getTimeUntilBadge()}
      </div>
      
      {/* Dates */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <Clock className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        <span className="gba:text-sm gba:font-medium gba:text-foreground" data-testid="absence-dates">
          {Array.isArray(dates) ? dates.map((date) => date).join(", ") : dates}
        </span>
      </div>
      
      {/* Description */}
      {description && (
        <div className="gba:text-sm gba:text-muted-foreground" data-testid="absence-description">
          {description}
        </div>
      )}
    </Card>
  );
};

export default UpcomingAbsenceCard;
