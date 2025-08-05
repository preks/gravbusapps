import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  Button,
} from '@newwork/nw-design-system';
import { PiColumns, PiEye, PiEyeClosed } from 'react-icons/pi';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  disabled?: boolean; // For columns that can't be hidden (like Actions)
}

interface ColumnVisibilityDropdownProps {
  columns: ColumnConfig[];
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  'data-testid'?: string;
}

/**
 * Dropdown component for toggling table column visibility
 */
export const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  columns,
  onColumnVisibilityChange,
  'data-testid': dataTestId = 'column-visibility-dropdown'
}) => {
  const visibleCount = columns.filter(col => col.visible).length;
  const totalCount = columns.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gba:flex gba:items-center gba:gap-2"
          data-testid={`${dataTestId}-trigger`}
        >
          <PiColumns className="gba:h-4 gba:w-4" />
          <span className="gba:hidden sm:gba:inline">Columns</span>
          <span className="gba:text-xs gba:text-gray-500">
            ({visibleCount}/{totalCount})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="gba:w-56"
        data-testid={`${dataTestId}-content`}
      >
        <div className="gba:px-3 gba:py-2 gba:text-sm gba:font-medium gba:text-gray-700 gba:border-b">
          Toggle Columns
        </div>
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.visible}
            disabled={column.disabled}
            onCheckedChange={(checked) => onColumnVisibilityChange(column.id, checked)}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={`${dataTestId}-item-${column.id}`}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
              {column.visible ? (
                <PiEye className="gba:h-4 gba:w-4 gba:text-green-600" />
              ) : (
                <PiEyeClosed className="gba:h-4 gba:w-4 gba:text-gray-400" />
              )}
              <span className={column.disabled ? 'gba:text-gray-400' : ''}>
                {column.label}
              </span>
              {column.disabled && (
                <span className="gba:text-xs gba:text-gray-400 gba:ml-auto">
                  (Required)
                </span>
              )}
            </div>
          </DropdownMenuCheckboxItem>
        ))}
        <div className="gba:px-3 gba:py-2 gba:text-xs gba:text-gray-500 gba:border-t">
          {visibleCount} of {totalCount} columns visible
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnVisibilityDropdown; 