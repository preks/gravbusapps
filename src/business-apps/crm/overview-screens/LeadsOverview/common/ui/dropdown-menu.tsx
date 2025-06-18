import React from 'react';
import { Dropdown, Menu } from 'antd';
import type { MenuProps } from 'antd';

interface DropdownMenuProps {
  className?: string;
  children?: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ className, children, ...props }) => (
  <div 
    className={`gba:dropdown-menu ${className || ''}`}
    data-testid="dropdown-menu-component"
    {...props}
  >
    {children}
  </div>
);

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ asChild, className, children, ...props }) => (
  <div 
    className={`gba:dropdown-menu-trigger ${className || ''}`}
    data-testid="dropdown-menu-trigger-component"
    {...props}
  >
    {children}
  </div>
);

interface DropdownMenuContentProps {
  align?: 'start' | 'center' | 'end';
  className?: string;
  children?: React.ReactNode;
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ align = 'center', className, children, ...props }) => (
  <div 
    className={`gba:dropdown-menu-content ${className || ''}`}
    data-align={align}
    data-testid="dropdown-menu-content-component"
    {...props}
  >
    <Menu>
      {children}
    </Menu>
  </div>
);

interface DropdownMenuItemProps extends Omit<MenuProps, 'className'> {
  className?: string;
  children?: React.ReactNode;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ className, children, ...props }) => (
  <Menu.Item 
    className={`gba:dropdown-menu-item ${className || ''}`}
    data-testid="dropdown-menu-item-component"
    {...props}
  >
    {children}
  </Menu.Item>
);
