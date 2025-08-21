import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system';

interface EmployeeInfoSectionProps {
  code: string;
  costCenterName?: string;
  projectName?: string;
  employee: {
    firstName?: string;
    lastName?: string;
    pictureThumbnail?: string;
    employeePosition?: {
      jobPosition?: {
        name?: string;
      };
    };
  };
}

const EmployeeInfoSection: React.FC<EmployeeInfoSectionProps> = ({
  code,
  costCenterName,
  projectName,
  employee
}) => {
  return (
    <div 
      className="gba:grid gba:grid-cols-2 gba:gap-8 gba:mb-6 gba:p-3" 
      data-testid="approve-expense-plan-employee-section"
    >
      {/* Left side - Employee details */}
      <div data-testid="approve-expense-plan-employee-details">
        <div>
          <span className="gba:text-muted-foreground">
            ID: {code}
          </span>
        </div>
        <div>
          <span className="gba:text-muted-foreground">
            Main Cost Center: {costCenterName}
          </span>
        </div>
        {projectName && 
          <div>
            <span className="gba:text-muted-foreground">
              Main Project: {projectName}
            </span>
          </div>
        }
      </div>
      
      {/* Right side - Employee profile */}
      <div 
        className="gba:flex gba:items-center gba:gap-3 gba:justify-start" 
        data-testid="approve-expense-plan-employee-profile"
      >
        <Avatar 
          className="gba:w-10 gba:h-10" 
          data-testid="approve-expense-plan-employee-avatar"
        >
          <AvatarImage src={`data:image/jpeg;base64,${employee.pictureThumbnail}`} />
          <AvatarFallback>
            {employee.firstName?.[0]}{employee.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <div 
            className="gba:text-sm gba:font-semibold gba:text-foreground" 
            data-testid="approve-expense-plan-employee-name"
          >
            {employee.firstName} {employee.lastName}
          </div>
          <div 
            className="gba:text-xs gba:font-normal gba:text-muted-foreground" 
            data-testid="approve-expense-plan-employee-role"
          >
            {employee.employeePosition?.jobPosition?.name}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeInfoSection; 