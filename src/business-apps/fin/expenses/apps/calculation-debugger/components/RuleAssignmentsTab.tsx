import React, { useEffect, useState, useRef } from 'react'
import {
  Users,
  Target,
  Building2,
  MapPin,
  FileCheck,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Search,
  UserPlus,
  Loader2,
  Eye,
  X
} from 'lucide-react'
import { useRuleAssignments, RuleAssignment, CoveredEmployee } from '../hooks/useRuleAssignments'
import { useEmployeeSelect } from '@/components/employee-select/useEmployeeSelect'
import { BusinessAppContextProps } from '@/business-apps/types'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'

interface RuleAssignmentsTabProps {
  accessToken: string
  businessAppContext: BusinessAppContextProps
}

// Custom multi-select employee picker that stays open
interface MultiEmployeeSelectProps {
  selectedEmployees: Employee[]
  onAddEmployee: (employee: Employee) => void
  accessToken: string
  businessAppContext: BusinessAppContextProps
}

const MultiEmployeeSelect: React.FC<MultiEmployeeSelectProps> = ({
  selectedEmployees,
  onAddEmployee,
  accessToken,
  businessAppContext
}) => {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { employeesWithInitial, loading, onSearch } = useEmployeeSelect({
    accessToken,
    businessAppContext
  })

  // Store onSearch in a ref to avoid dependency issues
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  // Trigger search when search value changes (debounced)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      onSearchRef.current(searchValue)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchValue])

  const handleSelect = (employee: Employee) => {
    if (!selectedEmployees.find(e => e.id === employee.id)) {
      onAddEmployee(employee)
    }
    // Clear search but keep popover open
    setSearchValue('')
  }

  const getInitials = (emp: Employee) => {
    const first = emp.firstName?.[0] || emp.displayName?.[0] || ''
    const last = emp.lastName?.[0] || ''
    return `${first}${last}`.toUpperCase() || '?'
  }

  // Filter out already selected employees
  const availableEmployees = employeesWithInitial.filter(emp => !selectedEmployees.find(sel => sel.id === emp.id))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="gba:w-full gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2.5 gba:border gba:border-gray-200 gba:rounded-lg gba:text-sm gba:bg-gray-50 hover:gba:bg-white focus:gba:bg-white focus:gba:ring-2 focus:gba:ring-indigo-500/20 focus:gba:border-indigo-500 gba:transition-all gba:outline-none"
        >
          <span className="gba:text-gray-500">Search and add employees...</span>
          <UserPlus className="gba:w-4 gba:h-4 gba:text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="gba:w-[400px] gba:p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Type to search employees..." value={searchValue} onValueChange={setSearchValue} />
          <CommandList className="gba:max-h-[300px]">
            {availableEmployees.length === 0 && (
              <CommandEmpty>
                {loading ? (
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-2">
                    <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-gray-400" />
                    <span>Searching...</span>
                  </div>
                ) : (
                  'No employees found'
                )}
              </CommandEmpty>
            )}
            <CommandGroup>
              {availableEmployees.map(emp => (
                <CommandItem
                  key={emp.id}
                  value={emp.id}
                  onSelect={() => handleSelect(emp)}
                  className="gba:cursor-pointer"
                >
                  <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                    <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                      {emp.pictureThumbnail ? (
                        <AvatarImage
                          src={`data:image/png;base64,${emp.pictureThumbnail}`}
                          alt={emp.displayName || ''}
                        />
                      ) : null}
                      <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-gradient-to-br gba:from-indigo-400 gba:to-purple-500 gba:text-white">
                        {getInitials(emp)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="gba:flex gba:flex-col gba:min-w-0">
                      <span className="gba:font-medium gba:truncate">
                        {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                      </span>
                      {emp.employeePosition?.organizationalUnit?.name && (
                        <span className="gba:text-xs gba:text-gray-500 gba:truncate">
                          {emp.employeePosition.organizationalUnit.name}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export const RuleAssignmentsTab: React.FC<RuleAssignmentsTabProps> = ({ accessToken, businessAppContext }) => {
  const {
    rules,
    loading,
    error,
    fetchRules,
    employeeStatuses,
    checkingEmployees,
    checkEmployeeRules,
    clearEmployeeStatuses,
    fetchCoveredEmployees
  } = useRuleAssignments()

  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set())
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([])
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0])
  const [activeView, setActiveView] = useState<'rules' | 'check'>('rules')

  // State for viewing covered employees
  const [viewingAssignment, setViewingAssignment] = useState<RuleAssignment | null>(null)
  const [coveredEmployees, setCoveredEmployees] = useState<CoveredEmployee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleViewEmployees = async (assignment: RuleAssignment) => {
    setViewingAssignment(assignment)
    setLoadingEmployees(true)
    setCoveredEmployees([])

    const employees = await fetchCoveredEmployees(assignment)
    setCoveredEmployees(employees)
    setLoadingEmployees(false)
  }

  const closeEmployeesView = () => {
    setViewingAssignment(null)
    setCoveredEmployees([])
  }

  // Check if an assignment has viewable criteria (not a catch-all)
  const hasViewableCriteria = (assignment: RuleAssignment): boolean => {
    return !!(
      assignment.employeeId ||
      assignment.companyId ||
      assignment.organizationalUnitId ||
      assignment.siteLocationId
    )
  }

  const toggleRuleExpand = (ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev)
      if (next.has(ruleId)) {
        next.delete(ruleId)
      } else {
        next.add(ruleId)
      }
      return next
    })
  }

  const handleAddEmployee = (employee: Employee | null) => {
    if (employee && !selectedEmployees.find(e => e.id === employee.id)) {
      setSelectedEmployees(prev => [...prev, employee])
    }
  }

  const handleRemoveEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => prev.filter(e => e.id !== employeeId))
  }

  const handleCheckRules = async () => {
    if (selectedEmployees.length === 0) return
    const employeeIds = selectedEmployees.map(e => e.id)
    await checkEmployeeRules(employeeIds, accessToken, new Date(checkDate))
  }

  const getAssignmentCriteria = (assignment: RuleAssignment): string[] => {
    const criteria: string[] = []

    if (assignment.employee) {
      criteria.push(`Employee: ${assignment.employee.firstName} ${assignment.employee.lastName}`)
    }
    if (assignment.company) {
      criteria.push(`Company: ${assignment.company.name}`)
    }
    if (assignment.organizationalUnit) {
      criteria.push(`Org Unit: ${assignment.organizationalUnit.name}`)
    }
    if (assignment.siteLocation) {
      criteria.push(`Site: ${assignment.siteLocation.name}`)
    }
    if (assignment.contractType) {
      criteria.push(`Contract: ${assignment.contractType.description || assignment.contractType.code}`)
    }
    if (assignment.employmentType) {
      criteria.push(`Employment: ${assignment.employmentType.description || assignment.employmentType.code}`)
    }

    if (criteria.length === 0) {
      criteria.push('All employees (catch-all)')
    }

    return criteria
  }

  const employeesWithRules = employeeStatuses.filter(s => s.hasRule)
  const employeesWithoutRules = employeeStatuses.filter(s => !s.hasRule && !s.error)
  const employeesWithErrors = employeeStatuses.filter(s => s.error)

  return (
    <div className="gba:space-y-4">
      {/* View Toggle */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:bg-gray-100 gba:p-1 gba:rounded-lg gba:w-fit">
        <button
          onClick={() => setActiveView('rules')}
          className={`gba:px-4 gba:py-2 gba:rounded-md gba:text-sm gba:font-medium gba:transition-colors ${
            activeView === 'rules'
              ? 'gba:bg-white gba:text-gray-900 gba:shadow-sm'
              : 'gba:text-gray-600 hover:gba:text-gray-900'
          }`}
        >
          <span className="gba:flex gba:items-center gba:gap-2">
            <Target className="gba:w-4 gba:h-4" />
            Rules Overview
          </span>
        </button>
        <button
          onClick={() => setActiveView('check')}
          className={`gba:px-4 gba:py-2 gba:rounded-md gba:text-sm gba:font-medium gba:transition-colors ${
            activeView === 'check'
              ? 'gba:bg-white gba:text-gray-900 gba:shadow-sm'
              : 'gba:text-gray-600 hover:gba:text-gray-900'
          }`}
        >
          <span className="gba:flex gba:items-center gba:gap-2">
            <Users className="gba:w-4 gba:h-4" />
            Check Employees
          </span>
        </button>
      </div>

      {activeView === 'rules' && (
        <div className="gba:space-y-4">
          {/* Header */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <h3 className="gba:font-semibold gba:text-gray-900">Active Rules & Assignments</h3>
              <p className="gba:text-sm gba:text-gray-500">Overview of expense rules and their assignment criteria</p>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <button
                onClick={fetchRules}
                disabled={loading}
                className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-gray-100 gba:text-gray-700 gba:rounded-lg gba:text-sm hover:gba:bg-gray-200 disabled:gba:opacity-50"
              >
                <RefreshCw className={`gba:w-4 gba:h-4 ${loading ? 'gba:animate-spin' : ''}`} />
                Refresh
              </button>
              <a
                href="/platform/fin/expenses/apps/expense-settings?view=calculation-rules&tab=assignments"
                target="_blank"
                rel="noopener noreferrer"
                className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-indigo-50 gba:text-indigo-700 gba:rounded-lg gba:text-sm hover:gba:bg-indigo-100"
              >
                <ExternalLink className="gba:w-4 gba:h-4" />
                Configure Rules
              </a>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="gba:bg-red-50 gba:text-red-700 gba:px-4 gba:py-3 gba:rounded-lg gba:flex gba:items-center gba:gap-2">
              <AlertCircle className="gba:w-5 gba:h-5" />
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Loader2 className="gba:w-8 gba:h-8 gba:text-indigo-500 gba:animate-spin" />
            </div>
          )}

          {/* Rules List */}
          {!loading && rules.length === 0 && (
            <div className="gba:text-center gba:py-12 gba:bg-gray-50 gba:rounded-xl">
              <Target className="gba:w-12 gba:h-12 gba:text-gray-300 gba:mx-auto gba:mb-3" />
              <p className="gba:text-gray-500">No active expense rules found</p>
            </div>
          )}

          {!loading && rules.length > 0 && (
            <div className="gba:space-y-3">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className="gba:bg-white gba:rounded-xl gba:border gba:border-gray-200 gba:overflow-hidden"
                >
                  {/* Rule Header */}
                  <button
                    onClick={() => toggleRuleExpand(rule.id)}
                    className="gba:w-full gba:px-4 gba:py-3 gba:flex gba:items-center gba:justify-between hover:gba:bg-gray-50 gba:transition-colors"
                  >
                    <div className="gba:flex gba:items-center gba:gap-3">
                      {expandedRules.has(rule.id) ? (
                        <ChevronDown className="gba:w-5 gba:h-5 gba:text-gray-400" />
                      ) : (
                        <ChevronRight className="gba:w-5 gba:h-5 gba:text-gray-400" />
                      )}
                      <div className="gba:w-10 gba:h-10 gba:bg-indigo-100 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
                        <Target className="gba:w-5 gba:h-5 gba:text-indigo-600" />
                      </div>
                      <div className="gba:text-left">
                        <div className="gba:font-semibold gba:text-gray-900">{rule.name}</div>
                        <div className="gba:text-sm gba:text-gray-500 gba:font-mono">{rule.code}</div>
                      </div>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-4">
                      <div className="gba:text-right">
                        <div className="gba:text-xs gba:text-gray-500">Assignments</div>
                        <div className="gba:font-semibold gba:text-indigo-600">{rule.assignments.length}</div>
                      </div>
                      {rule.country && (
                        <span className="gba:px-2 gba:py-1 gba:bg-gray-100 gba:text-gray-600 gba:rounded gba:text-xs">
                          {rule.country.description || rule.country.code}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded Assignments */}
                  {expandedRules.has(rule.id) && (
                    <div className="gba:border-t gba:border-gray-200 gba:bg-gray-50">
                      {rule.assignments.length === 0 ? (
                        <div className="gba:px-4 gba:py-6 gba:text-center">
                          <AlertCircle className="gba:w-8 gba:h-8 gba:text-amber-400 gba:mx-auto gba:mb-2" />
                          <p className="gba:text-gray-600 gba:text-sm">No assignments configured</p>
                          <p className="gba:text-gray-400 gba:text-xs gba:mt-1">This rule won't apply to anyone</p>
                        </div>
                      ) : (
                        <div className="gba:divide-y gba:divide-gray-200">
                          {rule.assignments.map((assignment, idx) => {
                            const criteria = getAssignmentCriteria(assignment)
                            return (
                              <div key={assignment.id} className="gba:px-4 gba:py-3">
                                <div className="gba:flex gba:items-start gba:gap-3">
                                  <div className="gba:w-6 gba:h-6 gba:bg-gray-200 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium gba:text-gray-600 gba:flex-shrink-0">
                                    {idx + 1}
                                  </div>
                                  <div className="gba:flex-1">
                                    <div className="gba:flex gba:flex-wrap gba:gap-2">
                                      {criteria.map((c, i) => {
                                        const isEmployee = c.startsWith('Employee:')
                                        const isCompany = c.startsWith('Company:')
                                        const isOrgUnit = c.startsWith('Org Unit:')
                                        const isSite = c.startsWith('Site:')
                                        const isCatchAll = c.includes('catch-all')

                                        let Icon = FileCheck
                                        let bgColor = 'gba:bg-gray-100'
                                        let textColor = 'gba:text-gray-700'

                                        if (isEmployee) {
                                          Icon = Users
                                          bgColor = 'gba:bg-blue-100'
                                          textColor = 'gba:text-blue-700'
                                        } else if (isCompany) {
                                          Icon = Building2
                                          bgColor = 'gba:bg-purple-100'
                                          textColor = 'gba:text-purple-700'
                                        } else if (isOrgUnit) {
                                          Icon = Building2
                                          bgColor = 'gba:bg-green-100'
                                          textColor = 'gba:text-green-700'
                                        } else if (isSite) {
                                          Icon = MapPin
                                          bgColor = 'gba:bg-orange-100'
                                          textColor = 'gba:text-orange-700'
                                        } else if (isCatchAll) {
                                          Icon = Users
                                          bgColor = 'gba:bg-amber-100'
                                          textColor = 'gba:text-amber-700'
                                        }

                                        return (
                                          <span
                                            key={i}
                                            className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-md gba:text-xs gba:font-medium ${bgColor} ${textColor}`}
                                          >
                                            <Icon className="gba:w-3 gba:h-3" />
                                            {c}
                                          </span>
                                        )
                                      })}
                                    </div>
                                    <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2">
                                      {assignment.cascading && (
                                        <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-gray-500">
                                          <CheckCircle className="gba:w-3 gba:h-3" />
                                          Cascading to sub-units
                                        </span>
                                      )}
                                      {hasViewableCriteria(assignment) && (
                                        <button
                                          onClick={() => handleViewEmployees(assignment)}
                                          className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-indigo-600 hover:gba:text-indigo-800 gba:font-medium"
                                        >
                                          <Eye className="gba:w-3 gba:h-3" />
                                          View employees
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'check' && (
        <div className="gba:space-y-4">
          {/* Header */}
          <div>
            <h3 className="gba:font-semibold gba:text-gray-900">Check Employee Rule Assignments</h3>
            <p className="gba:text-sm gba:text-gray-500">
              Select employees to check which rule applies to them on a specific date
            </p>
          </div>

          {/* Employee Selection */}
          <div className="gba:bg-white gba:rounded-xl gba:border gba:border-gray-200 gba:p-4 gba:space-y-4">
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
              <div>
                <label className="gba:block gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:mb-2">
                  Add Employee
                </label>
                <MultiEmployeeSelect
                  selectedEmployees={selectedEmployees}
                  onAddEmployee={emp => handleAddEmployee(emp)}
                  accessToken={accessToken}
                  businessAppContext={businessAppContext}
                />
              </div>
              <div>
                <label className="gba:block gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:mb-2">
                  Check Date
                </label>
                <input
                  type="date"
                  value={checkDate}
                  onChange={e => setCheckDate(e.target.value)}
                  className="gba:w-full gba:px-3 gba:py-2.5 gba:border gba:border-gray-200 gba:rounded-lg gba:text-sm gba:bg-gray-50 focus:gba:bg-white focus:gba:ring-2 focus:gba:ring-indigo-500/20 focus:gba:border-indigo-500 gba:transition-all gba:outline-none"
                />
              </div>
            </div>

            {/* Selected Employees */}
            {selectedEmployees.length > 0 && (
              <div>
                <div className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:mb-2">
                  Selected Employees ({selectedEmployees.length})
                </div>
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {selectedEmployees.map(emp => {
                    const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase()
                    const avatarUrl = emp.pictureThumbnail ? `data:image/png;base64,${emp.pictureThumbnail}` : null
                    return (
                      <span
                        key={emp.id}
                        className="gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:bg-indigo-50 gba:text-indigo-700 gba:rounded-lg gba:text-sm"
                      >
                        <div className="gba:w-5 gba:h-5 gba:rounded-full gba:overflow-hidden gba:bg-gradient-to-br gba:from-indigo-400 gba:to-indigo-600 gba:flex-shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="gba:w-full gba:h-full gba:object-cover" />
                          ) : (
                            <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:text-white gba:text-[10px] gba:font-semibold">
                              {initials || '?'}
                            </div>
                          )}
                        </div>
                        {emp.firstName} {emp.lastName}
                        <button
                          onClick={() => handleRemoveEmployee(emp.id)}
                          className="gba:text-indigo-400 hover:gba:text-indigo-600"
                        >
                          <XCircle className="gba:w-4 gba:h-4" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleCheckRules}
              disabled={selectedEmployees.length === 0 || checkingEmployees}
              className="gba:w-full gba:bg-indigo-500 gba:text-white gba:py-2.5 gba:rounded-lg gba:font-medium gba:text-sm hover:gba:bg-indigo-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:transition-colors gba:flex gba:items-center gba:justify-center gba:gap-2"
            >
              {checkingEmployees ? (
                <>
                  <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="gba:w-4 gba:h-4" />
                  Check Rule Assignments
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {employeeStatuses.length > 0 && (
            <div className="gba:space-y-4">
              {/* Summary */}
              <div className="gba:grid gba:grid-cols-3 gba:gap-4">
                <div className="gba:bg-emerald-50 gba:rounded-xl gba:p-4 gba:border gba:border-emerald-200">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-emerald-700">
                    <CheckCircle className="gba:w-5 gba:h-5" />
                    <span className="gba:text-sm gba:font-medium">With Rule</span>
                  </div>
                  <div className="gba:text-2xl gba:font-bold gba:text-emerald-800 gba:mt-1">
                    {employeesWithRules.length}
                  </div>
                </div>
                <div className="gba:bg-red-50 gba:rounded-xl gba:p-4 gba:border gba:border-red-200">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-red-700">
                    <XCircle className="gba:w-5 gba:h-5" />
                    <span className="gba:text-sm gba:font-medium">No Rule</span>
                  </div>
                  <div className="gba:text-2xl gba:font-bold gba:text-red-800 gba:mt-1">
                    {employeesWithoutRules.length}
                  </div>
                </div>
                <div className="gba:bg-amber-50 gba:rounded-xl gba:p-4 gba:border gba:border-amber-200">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-amber-700">
                    <AlertCircle className="gba:w-5 gba:h-5" />
                    <span className="gba:text-sm gba:font-medium">Errors</span>
                  </div>
                  <div className="gba:text-2xl gba:font-bold gba:text-amber-800 gba:mt-1">
                    {employeesWithErrors.length}
                  </div>
                </div>
              </div>

              {/* Employees Without Rules */}
              {employeesWithoutRules.length > 0 && (
                <div className="gba:bg-white gba:rounded-xl gba:border gba:border-red-200 gba:overflow-hidden">
                  <div className="gba:bg-red-50 gba:px-4 gba:py-3 gba:border-b gba:border-red-200 gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <XCircle className="gba:w-5 gba:h-5 gba:text-red-600" />
                      <span className="gba:font-medium gba:text-red-800">
                        Employees Without Rule ({employeesWithoutRules.length})
                      </span>
                    </div>
                    <a
                      href="/platform/fin/expenses/apps/expense-settings?view=calculation-rules&tab=assignments"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gba:text-sm gba:text-red-600 hover:gba:text-red-800 gba:flex gba:items-center gba:gap-1"
                    >
                      <UserPlus className="gba:w-4 gba:h-4" />
                      Assign Rules
                    </a>
                  </div>
                  <div className="gba:divide-y gba:divide-gray-100">
                    {employeesWithoutRules.map(status => {
                      const employee = selectedEmployees.find(e => e.id === status.employeeId)
                      const initials = employee
                        ? `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase()
                        : '?'
                      const avatarUrl = employee?.pictureThumbnail
                        ? `data:image/png;base64,${employee.pictureThumbnail}`
                        : null
                      return (
                        <div
                          key={status.employeeId}
                          className="gba:px-4 gba:py-3 gba:flex gba:items-center gba:justify-between"
                        >
                          <div className="gba:flex gba:items-center gba:gap-3">
                            <div className="gba:w-8 gba:h-8 gba:rounded-full gba:overflow-hidden gba:bg-gradient-to-br gba:from-red-400 gba:to-red-600 gba:flex-shrink-0">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="gba:w-full gba:h-full gba:object-cover" />
                              ) : (
                                <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xs gba:font-semibold">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="gba:font-medium gba:text-gray-900">
                                {employee ? `${employee.firstName} ${employee.lastName}` : status.employeeId}
                              </div>
                              <div className="gba:text-xs gba:text-gray-500 gba:font-mono">{status.employeeId}</div>
                            </div>
                          </div>
                          <span className="gba:text-sm gba:text-red-600 gba:font-medium">No rule found</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Employees With Rules */}
              {employeesWithRules.length > 0 && (
                <div className="gba:bg-white gba:rounded-xl gba:border gba:border-emerald-200 gba:overflow-hidden">
                  <div className="gba:bg-emerald-50 gba:px-4 gba:py-3 gba:border-b gba:border-emerald-200 gba:flex gba:items-center gba:gap-2">
                    <CheckCircle className="gba:w-5 gba:h-5 gba:text-emerald-600" />
                    <span className="gba:font-medium gba:text-emerald-800">
                      Employees With Rule ({employeesWithRules.length})
                    </span>
                  </div>
                  <div className="gba:divide-y gba:divide-gray-100">
                    {employeesWithRules.map(status => {
                      const employee = selectedEmployees.find(e => e.id === status.employeeId)
                      const initials = employee
                        ? `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase()
                        : '?'
                      const avatarUrl = employee?.pictureThumbnail
                        ? `data:image/png;base64,${employee.pictureThumbnail}`
                        : null
                      const formatDate = (dateStr?: string) => {
                        if (!dateStr) return null
                        return new Date(dateStr).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      }
                      const sinceDate = formatDate(status.assignmentActiveFrom) || formatDate(status.ruleActiveFrom)
                      return (
                        <div
                          key={status.employeeId}
                          className="gba:px-4 gba:py-3 gba:flex gba:items-center gba:justify-between"
                        >
                          <div className="gba:flex gba:items-center gba:gap-3">
                            <div className="gba:w-8 gba:h-8 gba:rounded-full gba:overflow-hidden gba:bg-gradient-to-br gba:from-emerald-400 gba:to-emerald-600 gba:flex-shrink-0">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="gba:w-full gba:h-full gba:object-cover" />
                              ) : (
                                <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xs gba:font-semibold">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="gba:font-medium gba:text-gray-900">
                                {employee ? `${employee.firstName} ${employee.lastName}` : status.employeeId}
                              </div>
                              <div className="gba:text-xs gba:text-gray-500 gba:font-mono">{status.employeeId}</div>
                            </div>
                          </div>
                          <div className="gba:text-right">
                            <div className="gba:font-medium gba:text-emerald-700">{status.ruleName}</div>
                            <div className="gba:text-xs gba:text-gray-500 gba:font-mono">{status.ruleCode}</div>
                            {sinceDate && (
                              <div className="gba:text-xs gba:text-gray-400 gba:mt-0.5">Since {sinceDate}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Clear Button */}
              <button onClick={clearEmployeeStatuses} className="gba:text-sm gba:text-gray-500 hover:gba:text-gray-700">
                Clear results
              </button>
            </div>
          )}
        </div>
      )}

      {/* Covered Employees Modal */}
      {viewingAssignment && (
        <div className="gba:fixed gba:inset-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:p-4">
          {/* Backdrop */}
          <div className="gba:absolute gba:inset-0 gba:bg-black/40 gba:backdrop-blur-sm" onClick={closeEmployeesView} />

          {/* Modal */}
          <div className="gba:relative gba:bg-white gba:rounded-xl gba:shadow-2xl gba:max-w-2xl gba:w-full gba:max-h-[80vh] gba:overflow-hidden gba:flex gba:flex-col">
            {/* Header */}
            <div className="gba:bg-indigo-50 gba:px-5 gba:py-4 gba:border-b gba:border-indigo-100 gba:flex gba:items-center gba:justify-between">
              <div>
                <h3 className="gba:font-semibold gba:text-gray-900">Covered Employees</h3>
                <p className="gba:text-sm gba:text-gray-500 gba:mt-0.5">
                  {viewingAssignment.company?.name ||
                    viewingAssignment.organizationalUnit?.name ||
                    viewingAssignment.siteLocation?.name ||
                    'Assignment criteria'}
                </p>
              </div>
              <button
                onClick={closeEmployeesView}
                className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-white gba:border gba:border-gray-200 gba:flex gba:items-center gba:justify-center gba:text-gray-400 hover:gba:text-gray-600 hover:gba:border-gray-300"
              >
                <X className="gba:w-4 gba:h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="gba:flex-1 gba:overflow-y-auto gba:p-4">
              {loadingEmployees ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                  <Loader2 className="gba:w-8 gba:h-8 gba:text-indigo-500 gba:animate-spin" />
                </div>
              ) : coveredEmployees.length === 0 ? (
                <div className="gba:text-center gba:py-12">
                  <Users className="gba:w-12 gba:h-12 gba:text-gray-300 gba:mx-auto gba:mb-3" />
                  <p className="gba:text-gray-500">No employees found matching this criteria</p>
                  <p className="gba:text-gray-400 gba:text-sm gba:mt-1">
                    This could be a catch-all assignment or no one matches the criteria yet
                  </p>
                </div>
              ) : (
                <div className="gba:space-y-2">
                  <div className="gba:text-sm gba:text-gray-500 gba:mb-3">
                    {coveredEmployees.length} employee{coveredEmployees.length !== 1 ? 's' : ''} covered
                    {coveredEmployees.length >= 100 && ' (limited to 100)'}
                  </div>
                  {coveredEmployees.map(emp => {
                    const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase()
                    return (
                      <div
                        key={emp.id}
                        className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-gray-50 gba:rounded-lg hover:gba:bg-gray-100 gba:transition-colors"
                      >
                        <div className="gba:w-10 gba:h-10 gba:rounded-full gba:flex-shrink-0 gba:overflow-hidden gba:bg-gradient-to-br gba:from-indigo-400 gba:to-indigo-600">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={`${emp.firstName} ${emp.lastName}`}
                              className="gba:w-full gba:h-full gba:object-cover"
                            />
                          ) : (
                            <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-sm">
                              {initials || '?'}
                            </div>
                          )}
                        </div>
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:font-medium gba:text-gray-900">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                            {emp.code && <span className="gba:font-mono">{emp.code}</span>}
                            {emp.companyName && (
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <Building2 className="gba:w-3 gba:h-3" />
                                {emp.companyName}
                              </span>
                            )}
                            {emp.orgUnitName && (
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <Building2 className="gba:w-3 gba:h-3" />
                                {emp.orgUnitName}
                              </span>
                            )}
                            {emp.siteLocationName && (
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <MapPin className="gba:w-3 gba:h-3" />
                                {emp.siteLocationName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="gba:bg-gray-50 gba:px-5 gba:py-3 gba:border-t gba:border-gray-200">
              <button
                onClick={closeEmployeesView}
                className="gba:w-full gba:bg-gray-100 gba:text-gray-700 gba:py-2 gba:rounded-lg gba:text-sm gba:font-medium hover:gba:bg-gray-200 gba:transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
