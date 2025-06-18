import React, { useState, forwardRef } from 'react';
import { Card } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';

interface CollapsibleCardProps {
  title: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
  id?: string;
}

export const CollapsibleCard = forwardRef<HTMLDivElement, CollapsibleCardProps>(
  function CollapsibleCard({
    title,
    defaultOpen = true,
    className = '',
    headerClassName = '',
    rightElement,
    children,
    id,
    ...props
  }, ref) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    const toggleOpen = () => {
      setIsOpen(!isOpen);
    };
    
    const headerStyle = {
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      userSelect: 'none' as const
    };
    
    return (
      <Card
        className={`gba:collapsible-card ${className} ${isOpen ? 'expanded' : 'collapsed'}`}
        bodyStyle={{ display: isOpen ? 'block' : 'none', padding: '16px' }}
        data-testid={id || 'collapsible-card-component'}
        ref={ref}
        bordered
        {...props}
      >
        <div 
          className={`gba:collapsible-card-header ${headerClassName}`} 
          style={headerStyle} 
          onClick={toggleOpen}
        >
          <div className="gba:collapsible-card-title">{title}</div>
          <div className="gba:collapsible-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {rightElement}
            <div className="gba:collapsible-card-toggle" style={{ fontSize: '12px' }}>
              {isOpen ? <UpOutlined /> : <DownOutlined />}
            </div>
          </div>
        </div>
        <div className="gba:collapsible-card-content">
          {isOpen && children}
        </div>
      </Card>
    );
  }
);
