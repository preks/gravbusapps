import React from 'react';
import { Progress as AntProgress } from 'antd';

interface ProgressProps extends React.ComponentProps<typeof AntProgress> {
  value: number;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, className, ...props }) => (
  <AntProgress 
    percent={value} 
    className={`gba:progress ${className || ''}`}
    data-testid="progress-component"
    {...props} 
  />
);
