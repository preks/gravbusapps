import React from 'react';
import { Separator } from '@newwork/nw-design-system';

interface FormHeaderProps {
  title: string;
  flowIconUrl: string;
}

const FormHeader: React.FC<FormHeaderProps> = ({ title, flowIconUrl }) => {
  return (
    <div className="gba:mx-auto gba:font-primary gba:flex gba:flex-col" style={{ width: '100%', maxWidth: '800px' }} data-testid="hr-form-header-container">
      <div className="gba:flex gba:items-center gba:pt-2 gba:font-primary gba:relative gba:pb-[30px] gba:h-8 gba:box-content" data-testid="hr-form-header-row">
        <div className="gba:flex gba:items-center gba:gap-3" data-testid="hr-form-header-title-container">
          <img
            src={flowIconUrl}
            alt="Flow"
            className="gba:w-5 gba:h-5"
            style={{ filter: 'invert(1) brightness(0)' }}
            data-testid="hr-form-header-icon"
          />
          <div className="gba:text-[20px] gba:font-semibold gba:m-0" data-testid="hr-form-header-title">
            {title}
          </div>
        </div>
      </div>
      <Separator className="gba:m-0 gba:ml-0 gba:mb-[30px]" data-testid="hr-form-header-divider" />
    </div>
  );
};

export default FormHeader;



