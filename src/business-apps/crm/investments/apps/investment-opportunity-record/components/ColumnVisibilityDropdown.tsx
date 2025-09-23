import React, { useState } from 'react';
import { Button, Icon } from '@newwork/nw-design-system';
import { Gear } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  disabled?: boolean;
}

interface ColumnVisibilityDropdownProps extends BusinessAppContextProps {
  columnConfig: ColumnConfig[];
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
}

export const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  columnConfig,
  onColumnVisibilityChange,
  ...context
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="gba:relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gba:flex gba:items-center gba:gap-2"
        data-testid="column-visibility-dropdown"
      >
        <Icon icon={Gear} size="sm" decorative />
        <span className="gba:text-sm">Columns</span>
      </Button>
      {isOpen && (
        <div 
          className="gba:absolute gba:top-full gba:right-0 gba:mt-1 gba:rounded-lg gba:shadow-lg gba:p-2 gba:min-w-[200px] gba:z-50" 
          style={{ backgroundColor: 'var(--nw-color-background)', border: '1px solid var(--nw-color-border)' }}
        >
          {columnConfig.map((column) => (
            <label
              key={column.id}
              className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:cursor-pointer gba:hover:bg-[var(--nw-color-background-hover)]"
            >
              <input
                type="checkbox"
                checked={column.visible}
                disabled={column.disabled}
                onChange={(e) => onColumnVisibilityChange(column.id, e.target.checked)}
                className="gba:rounded"
              />
              <span className="gba:text-sm">{column.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColumnVisibilityDropdown;
