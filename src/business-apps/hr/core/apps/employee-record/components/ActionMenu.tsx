'use client'

import React, { useState } from 'react'
import { Employee } from '../hooks/useEmployeeData'
import { navigateTo } from '@/common/utils/navigationUtils'

interface ActionMenuProps {
  employee: Employee
  isLoggedUser: boolean
}

interface ActionItem {
  id: string
  label: string
  isHeader?: boolean
}

/**
 * Action Menu Component
 * Provides a dropdown menu with actions related to the employee
 */
const ActionMenu: React.FC<ActionMenuProps> = ({ employee, isLoggedUser }) => {
  const [isOpen, setIsOpen] = useState(false)

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  // Close dropdown when clicking outside
  const closeDropdown = () => {
    setIsOpen(false)
  }

  // Handle action selection
  const handleAction = (action: string) => {
    setIsOpen(false)

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
          )
          break
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
          )
          break
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
          )
          break
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
          )
          break
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
          )
          break
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
          )
          break
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
          )
          break
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
          )
          break
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
          )
          break
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
          )
          break
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
          )
          break
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
          )
          break
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
          )
          break
        case 'updateOrganizationalData':
          // Navigate to organization chart with employee highlighted
          navigateTo(`/orgchart/active/organization?employeeId=${employee.id}`)
          break
        case 'goToAbsences':
          navigateTo('/platform/landing_screen/srn_absenceLandingScreen')
          break
        case 'goToManagerProfile':
          // Modify only the URL parameter instead of full navigation
          if (employee.employeePosition?.supervisor?.id) {
            const url = new URL(window.location.href)
            url.searchParams.set('employeeId', employee.employeePosition.supervisor.id)
            window.history.pushState({}, '', url.toString())
          }
          break
        case 'goToTeamAvailability':
          navigateTo('/platform/landing_screen/srn_teamAvailability')
          break
        case 'goToOrgUnit':
          navigateTo(
            `/orgchart/active/organization?organizationUnitId=${employee.employeePosition?.organizationalUnitId}`
          )
          break
        default:
          break
      }
    }
  }

  // Define actions based on whether the user is viewing their own profile
  const getActions = (): ActionItem[] => {
    const commonActions: ActionItem[] = [
      { id: 'addSkills', label: 'Add/Change Skills' },
      { id: 'uploadDocument', label: 'Upload Document' }
    ]

    const personalActions: ActionItem[] = [
      { id: 'changeAddress', label: 'Change Address' },
      { id: 'changeBankAccount', label: 'Change Bank Account' },
      { id: 'changePersonalData', label: 'Change Personal Data' },
      { id: 'changeCommunication', label: 'Change Communication' },
      { id: 'changeProfilePicture', label: 'Change Profile Picture' },
      { id: 'changeRelationship', label: 'Change Relationship Status' },
      { id: 'createExpense', label: 'Create Expense Report' },
      { id: 'reportSickLeave', label: 'Report Sick Leave' },
      { id: 'requestSpecialLeave', label: 'Request Special Leave' },
      { id: 'requestVacation', label: 'Request Vacation' }
    ]

    const managerActions: ActionItem[] = [
      { id: 'giveFeedback', label: 'Give Feedback' },
      { id: 'updateOrganizationalData', label: 'Update Organizational Data' }
    ]

    const navigationActions: ActionItem[] = [
      { id: 'goToAbsences', label: 'Go to Absences' },
      { id: 'goToManagerProfile', label: 'Go to Manager Profile' },
      { id: 'goToTeamAvailability', label: 'Go to Team Availability' },
      { id: 'goToOrgUnit', label: 'Go to Organizational Unit' }
    ]

    if (isLoggedUser) {
      return [
        { id: 'actions', label: 'Actions', isHeader: true },
        ...personalActions,
        { id: 'navigation', label: 'Navigation', isHeader: true },
        ...navigationActions
      ]
    } else {
      return [
        { id: 'actions', label: 'Actions', isHeader: true },
        ...commonActions,
        ...managerActions,
        { id: 'navigation', label: 'Navigation', isHeader: true },
        ...navigationActions
      ]
    }
  }

  const actions = getActions()

  return (
    <div className="gba:relative gba:inline-block gba:text-left">
      <div>
        <button
          type="button"
          className="gba:inline-flex gba:justify-center gba:w-full gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:text-primary-foreground gba:bg-info gba:rounded-md gba:hover:bg-info-secondary gba:focus:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-white/75"
          onClick={toggleDropdown}
        >
          Actions
          <svg
            className="gba:-mr-1 gba:ml-2 gba:h-5 gba:w-5"
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
          <div className="gba:fixed gba:inset-0 gba:z-10" onClick={closeDropdown}></div>
          <div className="gba:absolute gba:right-0 gba:mt-2 gba:w-56 gba:rounded-md gba:shadow-lg gba:bg-primary-foreground gba:ring-1 gba:ring-border gba:z-20 gba:max-h-96 gba:overflow-y-auto">
            <div className="gba:py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
              {actions.map(action =>
                action.isHeader ? (
                  <div
                    key={action.id}
                    className="gba:px-4 gba:py-2 gba:text-xs gba:font-bold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:bg-muted"
                  >
                    {action.label}
                  </div>
                ) : (
                  <button
                    key={action.id}
                    className="gba:block gba:w-full gba:text-left gba:px-4 gba:py-2 gba:text-sm gba:text-foreground gba:hover:bg-muted gba:hover:text-foreground"
                    role="menuitem"
                    onClick={() => handleAction(action.id)}
                  >
                    {action.label}
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ActionMenu
