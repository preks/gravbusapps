import React from "react";
import { Card, Badge } from "@newwork/nw-design-system";
import { Calendar, Clock, FileText } from "lucide-react";
import {
  formatDate,
  getTranslationFromI18nKeyAndLabel,
} from "@/common/utils/windowUtils";
import type { AbsenceListCardProps } from "../types/absenceTypes";

const AbsenceListCard: React.FC<AbsenceListCardProps> = ({ absence }) => {
  const {
    type,
    status,
    title,
    startDate,
    endDate,
    duration,
    description,
    requestedInfo,
    requestDate,
    typeColor,
    statusColor,
  } = absence;

  const getStatusBadge = () => {
    const statusLower = (status || "").toLowerCase();
    switch (statusLower) {
      case "approved":
        return <Badge variant="default" className="gba:text-xs">Approved</Badge>;
      case "pending":
      case "action required":
        return <Badge variant="secondary" className="gba:text-xs">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gba:text-xs">Rejected</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="gba:text-xs">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="gba:text-xs">{status}</Badge>;
    }
  };

  return (
    <Card 
      className="gba:p-4 gba:space-y-3 gba:border-l-4 gba:hover:shadow-md gba:transition-all gba:duration-200" 
      style={{
        borderLeftColor: typeColor ? (typeColor.startsWith("#") ? typeColor : `#${typeColor}`) : 'var(--nw-color-primary-500)'
      }}
      data-testid="absence-list-card"
    >
      {/* Header with type and status */}
      <div className="gba:flex gba:items-center gba:justify-between" data-testid="absence-list-card-header">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div 
            className="gba:w-6 gba:h-6 gba:rounded-md gba:flex gba:items-center gba:justify-center" 
            style={{ 
              backgroundColor: typeColor ? (typeColor.startsWith("#") ? `${typeColor}20` : `#${typeColor}20`) : 'var(--nw-color-primary-100)'
            }}
          >
            <Calendar
              className="gba:w-4 gba:h-4"
              style={{ color: typeColor ? (typeColor.startsWith("#") ? typeColor : `#${typeColor}`) : 'var(--nw-color-primary-500)' }}
              data-testid="absence-icon"
            />
          </div>
          <span className="gba:font-medium gba:text-foreground" data-testid="absence-type">
            {type}
          </span>
        </div>
        {getStatusBadge()}
      </div>
      
      {/* Title */}
      {title && (
        <h4 className="gba:font-semibold gba:text-lg gba:text-foreground" data-testid="absence-list-card-title">
          {title}
        </h4>
      )}
      
      {/* Dates and duration */}
      <div className="gba:flex gba:items-center gba:justify-between gba:text-sm" data-testid="absence-list-card-details">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Clock className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <span className="gba:text-muted-foreground" data-testid="absence-dates">
            {formatDate(startDate, "date.long")} - {formatDate(endDate, "date.long")}
          </span>
        </div>
        <Badge variant="outline" className="gba:text-xs" data-testid="absence-list-card-duration">
          {duration}
        </Badge>
      </div>
      
      {/* Description */}
      {description && (
        <div className="gba:flex gba:items-start gba:gap-2">
          <FileText className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:mt-0.5 gba:flex-shrink-0" />
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="absence-list-card-description">
            {description}
          </p>
        </div>
      )}
      
      {/* Additional info */}
      {requestedInfo && (
        <div className="gba:text-xs gba:text-muted-foreground" data-testid="absence-list-card-requested-info">
          {requestedInfo}
        </div>
      )}
      
      {/* Request date */}
      <div className="gba:text-xs gba:text-muted-foreground gba:border-t gba:pt-2" data-testid="absence-list-card-request-date">
        {getTranslationFromI18nKeyAndLabel(
          "lowcoder:absence_hub.requested_on",
          "Requested on"
        )}{" "}
        {formatDate(requestDate, "date.long")}
      </div>
    </Card>
  );
};

export default AbsenceListCard;
