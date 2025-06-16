import React from 'react';
import { Button as AntButton } from 'antd';

interface ButtonProps extends React.ComponentProps<typeof AntButton> {
  variant?: 'default' | 'outline' | 'text' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}) => {
  // Map sizes to Ant Design sizes
  const sizeMap = {
    sm: 'small',
    md: 'middle',
    lg: 'large'
  };

  // Map variants to Ant Design types
  const variantMap = {
    default: 'default',
    primary: 'primary',
    outline: 'default',
    text: 'text'
  };

  return (
    <AntButton
      type={variantMap[variant]}
      size={sizeMap[size]}
      className={`gba:button gba:button-${variant} ${className || ''}`}
      data-testid="button-component"
      {...props}
    >
      {children}
    </AntButton>
  );
};
