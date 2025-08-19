import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system';
import { MonthlyWorkdaysData } from '../../../../../hooks/usePerformanceData';
import { OrgEntityType } from '../tabs/Performance';

interface MonthlyWorkdaysTableProps {
  data: MonthlyWorkdaysData[];
  entityType: OrgEntityType;
  dataTestId: string;
}

const MonthlyWorkdaysTable: React.FC<MonthlyWorkdaysTableProps> = ({
  data,
  entityType,
  dataTestId
}) => {
  const getEntityTypeLabel = (type: OrgEntityType): string => {
    switch (type) {
      case 'location':
        return 'Location';
      case 'company':
        return 'Company';
      case 'costCenter':
        return 'Cost Center';
      case 'organizationalUnit':
        return 'Org Unit';
      default:
        return 'Entity';
    }
  };

  const formatWorkdays = (workdays: number): string => {
    return workdays.toFixed(1);
  };

  if (!data || data.length === 0) {
    return (
      <div data-testid={`${dataTestId}-empty`} className="gba:text-center gba:py-8 gba:text-gray-500">
        <p>No workdays data available for selected {entityType}</p>
        <p className="gba:text-sm gba:mt-1">
          Try selecting a different entity type or check if data exists
        </p>
      </div>
    );
  }

  // Get current month names
  const currentDate = new Date();
  const lastMonthName = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const thisMonthName = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const nextMonthName = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div data-testid={dataTestId} className="gba:w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="gba:w-[200px]">
              {getEntityTypeLabel(entityType)}
            </TableHead>
            <TableHead className="gba:text-center gba:w-[100px]">
              {lastMonthName}
            </TableHead>
            <TableHead className="gba:text-center gba:w-[100px] gba:font-semibold">
              {thisMonthName}
            </TableHead>
            <TableHead className="gba:text-center gba:w-[100px]">
              {nextMonthName}
            </TableHead>
            <TableHead className="gba:text-center gba:w-[100px]">
              Avg Days
            </TableHead>
            <TableHead className="gba:text-center gba:w-[100px]">
              Employees
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entity, index) => (
            <TableRow 
              key={entity.entityId}
              data-testid={`${dataTestId}-row-${index}`}
              className="hover:gba:bg-gray-50"
            >
              <TableCell className="gba:font-medium">
                <div>
                  <div className="gba:font-medium gba:text-gray-900">
                    {entity.entityName}
                  </div>
                  {entity.totalEmployees > 0 && (
                    <div className="gba:text-sm gba:text-gray-500">
                      {entity.totalEmployees} employees
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="gba:text-center">
                <span className="gba:text-gray-700">
                  {formatWorkdays(entity.lastMonth)}
                </span>
              </TableCell>
              <TableCell className="gba:text-center">
                <span className="gba:font-semibold gba:text-blue-700">
                  {formatWorkdays(entity.thisMonth)}
                </span>
              </TableCell>
              <TableCell className="gba:text-center">
                <span className="gba:text-gray-700">
                  {formatWorkdays(entity.nextMonth)}
                </span>
              </TableCell>
              <TableCell className="gba:text-center">
                <span className="gba:font-medium gba:text-green-700">
                  {formatWorkdays(entity.averageWorkdays)}
                </span>
              </TableCell>
              <TableCell className="gba:text-center">
                <span className="gba:text-gray-600">
                  {entity.totalEmployees}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Summary Row */}
      <div className="gba:mt-4 gba:p-3 gba:bg-gray-50 gba:rounded gba:border gba:text-sm">
        <div className="gba:flex gba:justify-between gba:items-center">
          <span className="gba:font-medium gba:text-gray-700">
            Total: {data.length} {getEntityTypeLabel(entityType).toLowerCase()}(s)
          </span>
          <span className="gba:text-gray-600">
            {data.reduce((sum, entity) => sum + entity.totalEmployees, 0)} total employees
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyWorkdaysTable; 