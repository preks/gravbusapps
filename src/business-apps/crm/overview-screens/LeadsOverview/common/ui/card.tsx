import React from 'react';
import { Card as AntCard } from 'antd';

interface CardProps extends React.ComponentProps<typeof AntCard> {
  className?: string;
}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => (
  <AntCard 
    className={`gba:card ${className || ''}`}
    data-testid="card-component"
    {...props}
  >
    {children}
  </AntCard>
);

interface CardHeaderProps {
  className?: string;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ className, children, ...props }) => (
  <div 
    className={`gba:card-header ${className || ''}`}
    data-testid="card-header-component"
    {...props}
  >
    {children}
  </div>
);
