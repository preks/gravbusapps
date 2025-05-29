'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Employee } from '../hooks/useEmployeeData';

interface ActionMenuProps {
  employee: Employee;
  isLoggedUser: boolean;
}

/**
 * Action Menu Component
 * Provides a dropdown menu with actions related to the employee
 */
const ActionMenu: React.FC<ActionMenuProps> = ({ 
  employee, 
  isLoggedUser 
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Close dropdown when clicking outside
  const closeDropdown = () => {
    setIsOpen(false);
  };
  
  // Handle action selection
  const handleAction = (action: string) => {
    setIsOpen(false);
    
    // Trigger the appropriate flow based on the action
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      switch (action) {
        case 'addSkills':
          window.dispatchEvent(
            new CustomEvent('com.newwork.process.start', {
              detail: {
                domain: 'employee',
                processName: 'changeEmployeeSkills',
                startProcessBody: {
                  employeeId: employee.id
                }
              }
            })
          );
          break;
        case 'changeAddress':
          window.dispatchEvent(
            new CustomEvent('com.newwork.process.start', {
              detail: {
                domain: 'employee',
                processName: 'changeEmployeeAddress',
                startProcessBody: {
                  employeeId: employee.id
                }
              }
            })
          );
          break;
        case 'changeBankAccount':
          window.dispatchEvent(
            new CustomEvent('com.newwork.process.start', {
              detail: {
                domain: 'employee',
                processName: 'changeEmployeeBankAccount',
                startProcessBody: {
                  employeeId: employee.id
                }
              }
            })
          );
          break;
        case 'changePersonalData':
          window.dispatchEvent(
            new CustomEvent('com.newwork.process.start', {
              detail: {
                domain: 'employee',
                processName: 'changePersonalInformation',
                startProcessBody: {
                  employeeId: employee.id
                }
              }
            })
          );
          break;
        case 'changeCommunication':
          window.dispatchEvent(
            new CustomEvent('com.newwork.process.start', {
              detail: {
                domain: 'employee',
                processName: 'changeEmployeeCommunication',
                startProcessBody: {
                  employeeId: employee.id
                }
              }
            })
          );
          break;
        case 'changeProfilePicture':
          window.dispatchEvent(
            new CustomEvent('com.newwork.process.start', {
              detail: {
                domain: 'employee',
                processName: 'changeEmployeePicture',
                startProcessBody: {
                  employeeId: employee.id
                }
              }
            })
          );
          break;
        case 'changeRelationship':
          window.dispatchEvent(
            new CustomEvent('com.newwork.process.start', {
              detail: {
                domain: 'employee',
                processName: 'changeEmployeeRelationship',
                startProcessBody: {
                  employeeId: employee.id
                }
              }
            })
          );
          break;
        case 'createExpense':
          window.dispatchEvent(
            new CustomEvent('com.newwork.process.start', {
              detail: {
                domain: 'employee_expense',
                processName: 'createExpenseItem',
                startProcessBody: {
                  employeeId: employee.id
                }
              }
            })
          );
          break;
        case 'reportSickLeave':
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
          break;
        case 'requestSpecialLeave':
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
          break;
        case 'requestVacation':
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
          break;
        case 'uploadDocument':
          window.dispatchEvent(
            new CustomEvent('com.newwork.process.start', {
              detail: {
                domain: 'employee',
                processName: 'uploadEmployeeDocument',
                startProcessBody: {
                  employeeId: employee.id
                }
              }
            })
          );
          break;
        case 'giveFeedback':
          window.dispatchEvent(
            new CustomEvent('com.newwork.process.start', {
              detail: {
                domain: 'employee',
                processName: 'giveEmployeeFeedback',
                startProcessBody: {
                  employeeId: employee.id
                }
              }
            })
          );
          break;
        case 'updateOrganizationalData':
          // Navigate to organization chart with employee highlighted
          window.location.href = `/orgchart/active/organization?employeeId=${employee.id}`;
          break;
        case 'goToAbsences':
          window.location.href = '/platform/landing_screen/srn_absenceLandingScreen';
          break;
        case 'goToManagerProfile':
          window.location.href = `/platform/employee-profile/${employee.employeePosition.supervisor.id}`;
          break;
        case 'goToTeamAvailability':
          window.location.href = '/platform/landing_screen/srn_teamAvailability';
          break;
        case 'goToOrgUnit':
          window.location.href = `/orgchart/active/organization?organizationUnitId=${employee.employeePosition.organizationalUnitId}`;
          break;
        default:
          break;
      }
    }
  };
  
  // Define actions based on whether the user is viewing their own profile
  const getActions = () => {
    const commonActions = [
      { id: 'addSkills', label: t('employee_profile:actions.add_skills') },
      { id: 'uploadDocument', label: t('employee_profile:actions.upload_document') },
    ];
    
    const personalActions = [
      { id: 'changeAddress', label: t('employee_profile:actions.change_address') },
      { id: 'changeBankAccount', label: t('employee_profile:actions.change_bank_account') },
      { id: 'changePersonalData', label: t('employee_profile:actions.change_personal_data') },
      { id: 'changeCommunication', label: t('employee_profile:actions.change_communication') },
      { id: 'changeProfilePicture', label: t('employee_profile:actions.change_profile_picture') },
      { id: 'changeRelationship', label: t('employee_profile:actions.change_relationship') },
      { id: 'createExpense', label: t('employee_profile:actions.create_expense') },
      { id: 'reportSickLeave', label: t('employee_profile:actions.report_sick_leave') },
      { id: 'requestSpecialLeave', label: t('employee_profile:actions.request_special_leave') },
      { id: 'requestVacation', label: t('employee_profile:actions.request_vacation') },
    ];
    
    const managerActions = [
      { id: 'giveFeedback', label: t('employee_profile:actions.give_feedback') },
      { id: 'updateOrganizationalData', label: t('employee_profile:actions.update_organizational_data') },
    ];
    
    const navigationActions = [
      { id: 'goToAbsences', label: t('employee_profile:actions.go_to_absences') },
      { id: 'goToManagerProfile', label: t('employee_profile:actions.go_to_manager_profile') },
      { id: 'goToTeamAvailability', label: t('employee_profile:actions.go_to_team_availability') },
      { id: 'goToOrgUnit', label: t('employee_profile:actions.go_to_org_unit') },
    ];
    
    if (isLoggedUser) {
      return [
        { id: 'actions', label: t('employee_profile:actions.actions'), isHeader: true },
        ...personalActions,
        { id: 'navigation', label: t('employee_profile:actions.navigation'), isHeader: true },
        ...navigationActions
      ];
    } else {
      return [
        { id: 'actions', label: t('employee_profile:actions.actions'), isHeader: true },
        ...commonActions,
        ...managerActions,
        { id: 'navigation', label: t('employee_profile:actions.navigation'), isHeader: true },
        ...navigationActions
      ];
    }
  };
  
  const actions = getActions();

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
          onClick={toggleDropdown}
        >
          {t('employee_profile:actions.menu_label')}
          <svg
            className="-mr-1 ml-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={closeDropdown}
          ></div>
          <div
            className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 max-h-96 overflow-y-auto"
          >
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
              {actions.map((action) => (
                action.isHeader ? (
                  <div 
                    key={action.id}
                    className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50"
                  >
                    {action.label}
                  </div>
                ) : (
                  <button
                    key={action.id}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    role="menuitem"
                    onClick={() => handleAction(action.id)}
                  >
                    {action.label}
                  </button>
                )
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ActionMenu;
