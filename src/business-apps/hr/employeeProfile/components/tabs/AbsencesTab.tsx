'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Employee, EmployeeAbsenceEntitlement } from '../../hooks/useEmployeeData';
import { Card } from '@newwork/gravity-ui-catalog';

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
  const { t } = useTranslation('lowcoder');

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
    <div className="absences-tab space-y-8">
      {/* Entitlements Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium">
            {t('hr_absences.absences')}
          </h2>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={() => {
              // Navigate to absences page
              window.location.href = '/platform/landing_screen/srn_absenceLandingScreen';
            }}
          >
            {t('employee_profile.employee_tabs.flows_button.go_to_absences')}
          </button>
        </div>

        {uniqueAbsenceEntitlements.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>{t('employee_profile:absences.entitlements.no_entitlements')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('hr_absences.absences')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('initiate_advance_payment.total')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('expense_request_overview.side_bar.payment_status')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('manager_expense_landing_page.upcoming_approved_badge')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('hr_absences.available')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uniqueAbsenceEntitlements.map((entitlement) => (
                  <tr key={`${entitlement.type?.value ?? 'unknown'}-${entitlement.total}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getTypeTranslation(entitlement)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entitlement.total}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entitlement.pending}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entitlement.approved}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entitlement.available}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Absence Section */}
      <div>
        <h2 className="text-xl font-medium mb-4">
          {t('hr_absences.create_absence.title')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">
                {t('absence_module.vacation_request')}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {t('hr_absences.create_absence.reason')}
              </p>
              <button 
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                onClick={() => {
                  // Trigger flow to request vacation
                  if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(
                      new CustomEvent('com.newwork.process.start', {
                        detail: {
                          domain: 'employee_time',
                          processName: 'requestVacation',
                          startProcessBody: {
                            employeeId: employee.id
                          }
                        }
                      })
                    );
                  }
                }}
              >
                {t('hr_absences.create_absence.submit')}
              </button>
            </div>
          </Card>
          
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 flex items-center justify-center bg-red-100 text-red-600 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">
                {t('absence_module.sick_leave_request')}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {t('hr_absences.create_absence.reason')}
              </p>
              <button 
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                onClick={() => {
                  // Trigger flow to report sick leave
                  if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(
                      new CustomEvent('com.newwork.process.start', {
                        detail: {
                          domain: 'employee_time',
                          processName: 'reportSickLeave',
                          startProcessBody: {
                            employeeId: employee.id
                          }
                        }
                      })
                    );
                  }
                }}
              >
                {t('hr_absences.create_absence.submit')}
              </button>
            </div>
          </Card>
          
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">
                {t('absence_module.special_leave_request')}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {t('hr_absences.create_absence.reason')}
              </p>
              <button 
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                onClick={() => {
                  // Trigger flow to request special leave
                  if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(
                      new CustomEvent('com.newwork.process.start', {
                        detail: {
                          domain: 'employee_time',
                          processName: 'requestSpecialLeave',
                          startProcessBody: {
                            employeeId: employee.id
                          }
                        }
                      })
                    );
                  }
                }}
              >
                {t('hr_absences.create_absence.submit')}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AbsencesTab;
