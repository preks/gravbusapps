import React from 'react';
import { Button } from '@newwork/gravity-ui-catalog';
import { ICONS } from '../../../../utils/icons';

/**
 * LocationContainer component props
 */
interface LocationContainerProps {
  title: string;
  icon: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
  children: React.ReactNode;
}

/**
 * LocationContainer component for collapsible location sections
 * @param props - Component props
 * @returns LocationContainer component
 */
const LocationContainer: React.FC<LocationContainerProps> = ({
  title,
  icon,
  isCollapsed,
  onToggleCollapse,
  onRemove,
  showRemoveButton = false,
  children
}) => {
  return (
    <div className="gba:locationContainer" data-testid={`location-container-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="gba:locationHeader" data-testid={`location-header-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className="gba:locationTitleWrapper" data-testid={`location-title-wrapper-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          <img 
            src={icon} 
            alt={title} 
            style={{ width: "24px", height: "24px" }}
            data-testid={`location-icon-${title.toLowerCase().replace(/\s+/g, '-')}`}
          />
          <span className="gba:locationTitle" data-testid={`location-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>{title}</span>
        </div>
        <div className="gba:locationActions" data-testid={`location-actions-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {showRemoveButton && (
            <Button
              variant="ghost"
              onClick={onRemove}
              className="gba:removeButton"
              data-testid={`remove-button-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <img 
                src={ICONS.DELETE_CIRCLE_ICON} 
                alt="RemoveDestinationIcon" 
                style={{ width: "24px", height: "24px" }}
                data-testid={`remove-icon-${title.toLowerCase().replace(/\s+/g, '-')}`}
              />
              Remove
            </Button>
          )}
          <Button
            variant="text"
            className="gba:collapseButton"
            data-testid={`collapse-button-${title.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={onToggleCollapse}
          >
            <img 
              src={isCollapsed ? ICONS.DOWN_ARROW : ICONS.UP_ARROW} 
              alt={isCollapsed ? "Expand" : "Collapse"} 
              style={{ width: "24px", height: "24px" }}
              data-testid={`collapse-icon-${title.toLowerCase().replace(/\s+/g, '-')}`}
            />
          </Button>
        </div>
      </div>
      
      {/* Only show content when not collapsed */}
      {!isCollapsed && (
        <div className="gba:verticalLine" data-testid={`vertical-line-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          <div className="gba:locationContent" data-testid={`location-content-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationContainer;
