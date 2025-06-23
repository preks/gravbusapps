import React from 'react';
import { Tag } from 'antd';

interface BadgeProps extends React.ComponentProps<typeof Tag> {
  variant?: 'default' | 'outline' | 'secondary'; 
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  className,
  children,
  ...props 
}) => (
  <Tag 
    className={`gba:badge gba:badge-${variant} ${className || ''}`}
    data-testid="badge-component"
    {...props}
  >
    {children}
  </Tag>
);
