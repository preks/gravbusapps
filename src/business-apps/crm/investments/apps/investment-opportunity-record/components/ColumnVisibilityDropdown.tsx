import React, { useState } from 'react';
import { Button } from '@newwork/nw-design-system';
import { SettingOutlined } from '@ant-design/icons';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  disabled?: boolean;
}

interface ColumnVisibilityDropdownProps {
  columnConfig: ColumnConfig[];
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
}

export const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  columnConfig,
  onColumnVisibilityChange
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
        <SettingOutlined />
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
              className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:cursor-pointer"
              style={{ 
                ':hover': { backgroundColor: 'var(--nw-color-background-hover)' }
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLLabelElement>) => 
                (e.target as HTMLElement).style.backgroundColor = 'var(--nw-color-background-hover)'
              }
              onMouseLeave={(e: React.MouseEvent<HTMLLabelElement>) => 
                (e.target as HTMLElement).style.backgroundColor = 'transparent'
              }
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
