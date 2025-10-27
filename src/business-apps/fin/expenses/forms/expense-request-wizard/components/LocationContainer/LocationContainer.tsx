import React from 'react'
import { Button } from '@newwork/gravity-ui-catalog'
import { ICONS } from '../../../../utils/icons'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * LocationContainer component props
 */
interface LocationContainerProps {
  title: string
  icon: string
  isCollapsed: boolean
  onToggleCollapse: () => void
  onRemove?: () => void
  showRemoveButton?: boolean
  children: React.ReactNode
  summary?: React.ReactNode
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
  children,
  summary
}) => {
  return (
    <div
      className="gba:rounded-lg gba:overflow-hidden"
      data-testid={`location-container-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div
        className="gba:flex gba:justify-between gba:items-center gba:bg-[background]"
        style={{ padding: '10px 0', borderBottom: 'none' }}
        data-testid={`location-header-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div
          className="gba:flex gba:items-center gba:gap-2"
          data-testid={`location-title-wrapper-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <img
            src={icon}
            alt={title}
            style={{ width: '24px', height: '24px' }}
            data-testid={`location-icon-${title.toLowerCase().replace(/\s+/g, '-')}`}
          />
          <span
            style={{ fontSize: '16px', fontWeight: 600, color: 'foreground' }}
            data-testid={`location-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {title}
          </span>
        </div>
        <div
          className="gba:flex gba:items-center gba:gap-3"
          data-testid={`location-actions-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {showRemoveButton && (
            <Button
              variant="ghost"
              onClick={onRemove}
              className="gba:flex gba:items-center gba:gap-1"
              style={{ padding: '4px 8px', borderRadius: '16px', fontSize: '14px', height: 'auto' }}
              data-testid={`remove-button-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <img
                src={ICONS.DELETE_CIRCLE_ICON}
                alt="RemoveDestinationIcon"
                style={{ width: '24px', height: '24px' }}
                data-testid={`remove-icon-${title.toLowerCase().replace(/\s+/g, '-')}`}
              />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.add_request_trip_details.remove_destination_button',
                'Remove Destination'
              )}
            </Button>
          )}
          <Button
            variant="text"
            className="gba:flex gba:items-center gba:justify-center"
            style={{ padding: '4px' }}
            data-testid={`collapse-button-${title.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={onToggleCollapse}
          >
            <img
              src={isCollapsed ? ICONS.DOWN_ARROW : ICONS.UP_ARROW}
              alt={isCollapsed ? 'Expand' : 'Collapse'}
              style={{ width: '24px', height: '24px' }}
              data-testid={`collapse-icon-${title.toLowerCase().replace(/\s+/g, '-')}`}
            />
          </Button>
        </div>
      </div>

      {/* Show summary when collapsed */}
      {isCollapsed && summary && (
        <div className="gba:px-8" data-testid={`location-summary-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {summary}
        </div>
      )}

      {/* Only show content when not collapsed */}
      {!isCollapsed && (
        <div
          className="gba:relative gba:pl-8 gba:pb-[10px] 
         gba:before:content-[''] gba:before:absolute 
         gba:before:left-3 gba:before:top-0 gba:before:bottom-0 
         gba:before:w-px gba:before:bg-black"
        >
          <div className="gba:mt-2" data-testid={`location-content-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export default LocationContainer
