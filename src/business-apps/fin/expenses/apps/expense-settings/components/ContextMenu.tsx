import React from 'react';
import { 
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system';
import { DotsThreeVerticalIcon, PencilIcon, TrashIcon, EyeIcon } from '@phosphor-icons/react'
export interface ContextMenuAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

interface ContextMenuProps {
  actions: ContextMenuAction[];
  triggerTestId?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  actions,
  triggerTestId
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gba:h-8 gba:w-8 gba:p-0"
          data-testid={triggerTestId}
          onClick={(e) => e.stopPropagation()}
        >
          <DotsThreeVerticalIcon className="gba:h-4 gba:w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid={`${triggerTestId}-menu`}>
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            className={`gba:flex gba:items-center gba:gap-2 gba:cursor-pointer ${
              action.variant === 'destructive' 
                ? 'gba:text-red-600 hover:gba:text-red-700 hover:gba:bg-red-50' 
                : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            disabled={action.disabled}
            data-testid={`${triggerTestId}-${action.key}`}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Common action creators
export const createEditAction = (
  onClick: () => void,
  disabled = false
): ContextMenuAction => ({
  key: 'edit',
  label: 'Edit',
  icon: <PencilIcon className="gba:h-4 gba:w-4" />,
  onClick,
  disabled
});

export const createDeleteAction = (
  onClick: () => void,
  disabled = false
): ContextMenuAction => ({
  key: 'delete',
  label: 'Delete',
  icon: <TrashIcon className="gba:h-4 gba:w-4" />,
  onClick,
  variant: 'destructive',
  disabled
});

export const createViewAction = (
  onClick: () => void,
  disabled = false
): ContextMenuAction => ({
  key: 'view',
  label: 'View',
  icon: <EyeIcon className="gba:h-4 gba:w-4" />,
  onClick,
  disabled
});
