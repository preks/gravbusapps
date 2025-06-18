import React from 'react';
import { Tooltip as AntTooltip } from 'antd';

interface TooltipProps extends React.ComponentProps<typeof AntTooltip> {
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ className, children, ...props }) => (
  <AntTooltip 
    className={`gba:tooltip ${className || ''}`}
    data-testid="tooltip-component"
    {...props}
  >
    {children}
  </AntTooltip>
);

interface TooltipContentProps {
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  children?: React.ReactNode;
}

export const TooltipContent: React.FC<TooltipContentProps> = ({ side = 'top', className, children, ...props }) => (
  <div 
    className={`gba:tooltip-content ${className || ''}`}
    data-side={side}
    data-testid="tooltip-content-component"
    {...props}
  >
    {children}
  </div>
);

interface TooltipProviderProps {
  children?: React.ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children, ...props }) => (
  <>{children}</>
);

interface TooltipTriggerProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ asChild, className, children, ...props }) => (
  <div 
    className={`gba:tooltip-trigger ${className || ''}`}
    data-testid="tooltip-trigger-component"
    {...props}
  >
    {children}
  </div>
);
