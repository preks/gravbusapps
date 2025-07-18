import React, { useState } from 'react';
import { Button } from 'antd';
import { PiPlus } from 'react-icons/pi';

interface HoverAddButtonProps {
  afterOrder: number;
  onAdd: (afterOrder: number) => void;
  isVisible?: boolean;
  isEditMode?: boolean;
}

const HoverAddButton: React.FC<HoverAddButtonProps> = ({ 
  afterOrder, 
  onAdd, 
  isVisible = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(afterOrder);
  };

  return (
    <div 
      className="gba:relative gba:w-full gba:h-2 gba:group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`hover-add-button-${afterOrder}`}
    >
      {/* Hover detection area */}
      <div className="gba:absolute gba:inset-0 gba:z-10" />
      
      {/* Hover line */}
      <div 
        className={`gba:absolute gba:top-1/2 gba:left-0 gba:right-0 gba:h-px gba:bg-blue-400 gba:transition-opacity gba:duration-200 ${
          isHovered || isVisible ? 'gba:opacity-100' : 'gba:opacity-0'
        }`}
      />
      
      {/* Add button */}
      <div 
        className={`gba:absolute gba:top-1/2 gba:left-1/2 gba:transform gba:-translate-x-1/2 gba:-translate-y-1/2 gba:transition-all gba:duration-200 gba:z-20 ${
          isHovered || isVisible 
            ? 'gba:opacity-100 gba:scale-100' 
            : 'gba:opacity-0 gba:scale-75'
        }`}
      >
        <Button
          type="primary"
          shape="circle"
          size="small"
          icon={<PiPlus className="gba:text-xs" />}
          onClick={handleClick}
          className="gba:shadow-md gba:border-2 gba:border-white"
          style={{
            width: '24px',
            height: '24px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={`Add assignment after position ${afterOrder}`}
        />
      </div>
    </div>
  );
};

export default HoverAddButton; 