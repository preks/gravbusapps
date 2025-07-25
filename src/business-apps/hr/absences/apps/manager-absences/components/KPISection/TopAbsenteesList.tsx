import React from 'react';
import { Card } from '@newwork/nw-design-system';
import { RiMedalLine } from '@remixicon/react';

interface EmployeeAbsence {
  id: string;
  employee: {
    id: string;
    lastName: string;
    firstName: string;
    pictureThumbnail?: string;
    employeePosition: {
      organizationalUnit: {
        name: string;
      };
    };
  };
  type: {
    objectValue: string;
    translations: {
      localeCode: string;
      value: string;
    }[];
    id: string;
    value: string;
    parentEntryId: string;
    groupName?: string;
  };
  startDate: string;
  endDate: string;
  calendarDays: number;
  effectiveDays: number;
  status: string;
}

interface TopAbsenteesListProps {
  topAbsentees: Array<{
    name: string;
    department: string;
    total: number;
    colorIdx: number;
    absences: EmployeeAbsence[];
  }>;
  maxAbsenceDays: number;
  onNavigateToAbsenceListPage?: (preFilter?: any) => void;
}

export const TopAbsenteesList: React.FC<TopAbsenteesListProps> = ({
  topAbsentees,
  maxAbsenceDays,
  onNavigateToAbsenceListPage,
}) => {
  // Limit to 4 employees to fit within 510px card height
  const maxEmployeesToShow = 4;
  const displayedEmployees = topAbsentees.slice(0, maxEmployeesToShow);

  // Generate avatar placeholder based on name initials
  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate consistent background colors for avatars
  const getAvatarBgColor = (name: string) => {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
      '#eab308', '#22c55e', '#10b981', '#06b6d4', '#3b82f6'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Generate email from name (placeholder logic)
  const generateEmail = (name: string) => {
    const nameParts = name.toLowerCase().split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]}${nameParts[1].charAt(0)}@gmail.com`;
    }
    return `${nameParts[0]}@gmail.com`;
  };

  const handleCardClick = () => {
    if (onNavigateToAbsenceListPage) {
      // Get unique employee IDs from the displayed employees
      const employeeIds = displayedEmployees
        .flatMap(emp => emp.absences.map(absence => absence.employee.id))
        .filter((id, index, array) => array.indexOf(id) === index); // Remove duplicates
      
      onNavigateToAbsenceListPage({
        type: 'top-absentees',
        employees: employeeIds
      });
    }
  };

  return (
    <Card 
      className="gba:hover:shadow-md gba:transition-shadow gba:w-full gba:h-[510px] gba:cursor-pointer" 
      onClick={handleCardClick}
      data-testid="top-absentees-card"
    >
      <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-4 gba:p-6">
        <div>
          <h5 className="gba:text-sm gba:font-medium">Top Absentees</h5>
          <p className="gba:text-xs gba:text-muted-foreground">Employees with most absence days</p>
          <div className="gba:text-2xl gba:font-bold gba:pt-2 gba:text-left">{maxAbsenceDays}</div>
          <div className="gba:text-xs gba:text-muted-foreground gba:text-left">Max Absence Days</div>
        </div>
        <RiMedalLine className="gba:h-6 gba:w-6 gba:text-gray-500 gba:ml-2" />
      </div>

      <div className="gba:flex gba:flex-col gba:gap-2 gba:px-6 gba:pb-6">
        {displayedEmployees.length > 0 ? (
          displayedEmployees.map((emp, idx) => (
            <div
              key={emp.name + idx}
              className="gba:flex gba:items-center gba:justify-between gba:py-3"
            >
              {/* Left side: Avatar + Name & Email */}
              <div className="gba:flex gba:items-center gba:gap-3">
                {/* Avatar */}
                <div 
                  className="gba:w-11 gba:h-11 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:text-sm gba:font-medium gba:flex-shrink-0"
                  style={{ backgroundColor: getAvatarBgColor(emp.name) }}
                >
                  {getAvatarInitials(emp.name)}
                </div>
                
                {/* Name and Email */}
                <div>
                  <div className="gba:text-sm gba:font-medium gba:text-gray-900 gba:leading-5 gba:text-left">
                    {emp.name}
                  </div>
                  <div className="gba:text-xs gba:text-gray-500 gba:leading-4 gba:mt-1 gba:text-left">
                    {generateEmail(emp.name)}
                  </div>
                </div>
              </div>

              {/* Right side: Total days - RIGHT ALIGNED */}
              <div className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:text-right gba:min-w-[3rem]">
                {emp.total}
              </div>
            </div>
          ))
        ) : (
          <div className="gba:text-center gba:text-muted-foreground gba:py-8">
            <p className="gba:text-sm">No absence data available</p>
          </div>
        )}
      </div>
    </Card>
  );
}; 