import { Employee } from '../hooks/useGetEmployeesReport';

/**
 * Filters a list of employees based on a search term.
 * The search term is matched against first name, last name, job position, and location.
 * @param employees The list of employees to filter.
 * @param search The search term.
 * @returns A filtered list of employees.
 */
const filterBySearch = (employees: Employee[], search: string): Employee[] => {
  if (!search) return employees;
  const searchLower = search.toLowerCase();
  return employees.filter(
    employee =>
      employee.firstName.toLowerCase().includes(searchLower) ||
      employee.lastName.toLowerCase().includes(searchLower) ||
      employee.jobPosition?.toLowerCase().includes(searchLower) ||
      employee.location?.toLowerCase().includes(searchLower)
  );
};

/**
 * Filters a list of employees based on a set of selected filter strings.
 * Handles multi-select for categories by grouping filters.
 * @param employees The list of employees to filter.
 * @param selectedFilters An array of filter strings (e.g., 'position:Software Engineer').
 * @returns A filtered list of employees.
 */
const filterBySelectedFilters = (employees: Employee[], selectedFilters: string[]): Employee[] => {
  if (selectedFilters.length === 0) return employees;

  const groupedFilters = selectedFilters.reduce((acc, filter) => {
    const [key, value] = filter.split(':');
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(value);
    return acc;
  }, {} as Record<string, string[]>);

  return employees.filter(employee =>
    Object.entries(groupedFilters).every(([key, values]) => {
      if (values.length === 0) return true;
      switch (key) {
        case 'position':
          return values.includes(employee.jobPosition || '');
        case 'location':
          return values.includes(employee.location || '');
        case 'employmentType':
          return values.includes(employee.employmentType || '');
        case 'contractType':
          return values.includes(employee.contractType || '');
        default:
          return true;
      }
    })
  );
};

/**
 * Applies all filtering logic (search, selected filters, and KPI matching) to a list of employees.
 * @param employees The full list of employees.
 * @param search The current search term.
 * @param selectedFilters An array of selected filter strings.
 * @param matchesKpi A function that checks if an employee matches the current KPI.
 * @returns The final filtered list of employees.
 */
export const applyEmployeeFilters = (
  employees: Employee[],
  search: string,
  selectedFilters: string[],
  matchesKpi: (employee: Employee) => boolean
): Employee[] => {
  const searched = filterBySearch(employees, search);
  const kpiFiltered = searched.filter(matchesKpi);
  const standardFiltered = filterBySelectedFilters(kpiFiltered, selectedFilters);
  return standardFiltered;
};
