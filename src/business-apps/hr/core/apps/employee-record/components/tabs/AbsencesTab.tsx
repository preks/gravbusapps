'use client';

import React from 'react';
import { Employee, EmployeeAbsenceEntitlement } from '../../hooks/useEmployeeData';
import { Button, Card } from '@newwork/gravity-ui-catalog';
import { startProcess } from '../../../../../../../common/utils/start-process';

interface AbsencesTabProps {
  employee: Employee;
  employeeAbsenceEntitlement: EmployeeAbsenceEntitlement[];
}

/**
 * Absences Tab Component
 * Displays absence entitlements and history for the employee
 */
const AbsencesTab: React.FC<AbsencesTabProps> = ({ 
  employee, 
  employeeAbsenceEntitlement 
}) => {

  // Function to get the translated type value
  const getTypeTranslation = (entitlement: EmployeeAbsenceEntitlement) => {
    if (!entitlement?.type) return '';
    if (entitlement.type.translations && entitlement.type.translations.length > 0) {
      return entitlement.type.translations[0]?.value ?? '';
    }
    return entitlement.type.value ?? '';
  };
  
  // Filter out duplicate absence types by type value
  const uniqueAbsenceEntitlements = employeeAbsenceEntitlement.reduce<EmployeeAbsenceEntitlement[]>((acc, current) => {
    const typeValue = current.type?.value;
    const exists = acc.find(item => item.type?.value === typeValue);
    if (!exists && typeValue) {
      acc.push(current);
    }
    return acc;
  }, []);

  return (
    <div className="gba:absences-tab gba:space-y-8">
      {/* Entitlements Section */}
      <div>
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <h2 className="gba:text-xl gba:font-medium">
            Absence Entitlements
          </h2>
          <Button 
            onClick={() => {
              // Navigate to absences page
              window.location.href = '/platform/landing_screen/srn_absenceLandingScreen';
            }}
            className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:hover:bg-blue-700 gba:transition-colors"
            data-testid="go-to-absences-button"
            variant="primary"
          >
            Go to Absences
          </Button>
        </div>

        {uniqueAbsenceEntitlements.length === 0 ? (
          <div className="gba:text-center gba:text-gray-500 gba:py-8">
            <p>No absence entitlements found.</p>
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-1 gba:gap-6">
            {uniqueAbsenceEntitlements.map((entitlement) => {
              const typeName = getTypeTranslation(entitlement);
              const total = entitlement.total || 0;
              const used = total - (entitlement.available || 0);
              const pending = entitlement.pending || 0;
              const pendingPercent = total > 0 ? (pending / total) * 100 : 0;
              const usedPercent = total > 0 ? (used / total) * 100 : 0;
              const is365DayType = total === 365;
              
              if (is365DayType) {
                // Special display for 365-day entitlements (like sick days)
                return (
                  <Card 
                    key={`${entitlement.type?.value ?? 'unknown'}-${entitlement.total}`}
                    className="gba:p-6 gba:hover:shadow-md gba:transition-shadow"
                  >
                    <div className="gba:mb-3 gba:flex gba:justify-between gba:items-center">
                      <div className="gba:text-lg gba:font-medium">{typeName}</div>
                      <div className="gba:text-2xl gba:font-bold">
                        {used} <span className="gba:text-sm gba:font-normal gba:text-gray-500">days reported in {new Date().getFullYear()}</span>
                      </div>
                    </div>
                    
                    <div className="gba:flex gba:gap-1">
                      {/* Create dots to represent used days */}
                      {Array(used).fill(0).map((_, index) => (
                        <div 
                          key={index}
                          className="gba:w-8 gba:h-2 gba:bg-purple-500 gba:rounded-full"
                        ></div>
                      ))}
                    </div>
                  </Card>
                );
              }
              
              // Regular display for normal entitlements (like vacation days)
              return (
                <Card 
                  key={`${entitlement.type?.value ?? 'unknown'}-${entitlement.total}`}
                  className="gba:p-6 gba:hover:shadow-md gba:transition-shadow"
                >
                  <div className="gba:mb-2 gba:flex gba:justify-between gba:items-center">
                    <div className="gba:text-lg gba:font-medium">{typeName}</div>
                    <div className="gba:text-sm gba:text-gray-500">
                      {used}/{total} days used
                      {pending > 0 && (
                        <span className="gba:ml-2 gba:text-amber-500">{pending} days pending</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="gba:w-full gba:relative gba:h-3 gba:bg-gray-100 gba:rounded">
                    {/* Used days bar */}
                    <div 
                      className="gba:absolute gba:left-0 gba:top-0 gba:h-full gba:bg-green-500 gba:rounded-l"
                      style={{ width: `${usedPercent}%` }}
                    ></div>
                    
                    {/* Pending days bar */}
                    {pending > 0 && (
                      <div 
                        className="gba:absolute gba:h-full gba:bg-amber-500"
                        style={{ 
                          width: `${pendingPercent}%`,
                          left: `${usedPercent}%`
                        }}
                      ></div>
                    )}
                  </div>
                  
                  <div className="gba:mt-2 gba:flex gba:justify-between gba:items-center gba:text-xs gba:text-gray-500">
                    <div>Used: {used} days</div>
                    {pending > 0 && <div className="gba:text-amber-500">Pending: {pending} days</div>}
                    <div>Available: {entitlement.available || 0} days</div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Absence Section */}
      <div>
        <h2 className="gba:text-xl gba:font-medium gba:mb-4">
          Request Absence
        </h2>
        
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
          <Card className="gba:p-6 gba:hover:shadow-md gba:transition-shadow">
            <div className="gba:flex gba:flex-col gba:items-center gba:text-center">
              <div className="gba:w-16 gba:h-16 gba:flex gba:items-center gba:justify-center gba:bg-blue-100 gba:text-blue-600 gba:rounded-full gba:mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-8 gba:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="gba:text-lg gba:font-medium gba:mb-2">
                Request Vacation
              </h3>
              <p className="gba:text-sm gba:text-gray-500 gba:mb-4">
                Submit a new vacation request.
              </p>
              <Button 
                onClick={() => {
                  // Find vacation entitlement type
                  const vacationEntitlement = employeeAbsenceEntitlement.find(e => e.type?.id === 'AbsenceType:v1:A001');
                  
                  // Trigger flow to request vacation
                  startProcess({
                    domain: 'employee-time',
                    processName: 'createEmployeeVacation',
                    payload: {
                      employeeId: employee.id,
                      absenceType: vacationEntitlement?.type?.id
                    }
                  });
                }}
                className="gba:w-full gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:hover:bg-blue-700 gba:transition-colors"
                data-testid="request-vacation-button"
                variant="primary"
              >
                Submit Request
              </Button>
            </div>
          </Card>
          
          <Card className="gba:p-6 gba:hover:shadow-md gba:transition-shadow">
            <div className="gba:flex gba:flex-col gba:items-center gba:text-center">
              <div className="gba:w-16 gba:h-16 gba:flex gba:items-center gba:justify-center gba:bg-red-100 gba:text-red-600 gba:rounded-full gba:mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-8 gba:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="gba:text-lg gba:font-medium gba:mb-2">
                Report Sick Leave
              </h3>
              <p className="gba:text-sm gba:text-gray-500 gba:mb-4">
                Report an instance of sick leave.
              </p>
              <Button 
                data-testid="report-sick-leave-button"
                variant="primary"
                className="gba:w-full gba:px-4 gba:py-2 gba:bg-red-600 gba:text-white gba:rounded gba:hover:bg-red-700 gba:transition-colors"
                onClick={() => {
                  // Trigger flow to report sick leave
                  startProcess({
                    domain: 'employee-time',
                    processName: 'createEmployeeSickLeave',
                    payload: {
                      employeeId: employee.id
                    }
                  });
                }}
              >
                Submit Report
              </Button>
            </div>
          </Card>
          
          <Card className="gba:p-6 gba:hover:shadow-md gba:transition-shadow">
            <div className="gba:flex gba:flex-col gba:items-center gba:text-center">
              <div className="gba:w-16 gba:h-16 gba:flex gba:items-center gba:justify-center gba:bg-purple-100 gba:text-purple-600 gba:rounded-full gba:mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-8 gba:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="gba:text-lg gba:font-medium gba:mb-2">
                Request Special Leave
              </h3>
              <p className="gba:text-sm gba:text-gray-500 gba:mb-4">
                Request special leave for specific circumstances.
              </p>
              <Button 
                data-testid="request-special-leave-button"
                variant="primary"
                className="gba:w-full gba:px-4 gba:py-2 gba:bg-purple-600 gba:text-white gba:rounded gba:hover:bg-purple-700 gba:transition-colors"
                onClick={() => {
                  // Find special leave entitlement type
                  const specialLeaveEntitlement = employeeAbsenceEntitlement.find(e => e.type?.id === 'AbsenceType:v1:A010');
                  
                  // Trigger flow to request special leave
                  startProcess({
                    domain: 'employee-time',
                    processName: 'createEmployeeSpecialLeave',
                    payload: {
                      employeeId: employee.id,
                      absenceType: specialLeaveEntitlement?.type?.id
                    }
                  });
                }}
              >
                Submit Request
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AbsencesTab;
