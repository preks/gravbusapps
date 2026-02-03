-- HR Analytics Query Definitions
-- All queries for charts and reports in the HR Analytics application
-- Format: JSON query definitions for the dataset addon

-- =============================================================================
-- TIMESERIES QUERIES (for time-based charts)
-- Structure: category, date_category, value
-- =============================================================================

-- 1. EMPLOYEES PER YEAR (Total employees created each year) - IMPORTED
{
  "name": "employeesCreatedPerYear",
  "description": "New employee records created each year",
  "query": "SELECT 'Total Employees' as category, DATE_TRUNC('year', e.created_at) as date_category, COUNT(DISTINCT e.id) as value FROM nw_employee.employee e WHERE e.is_deleted = false AND e.created_at IS NOT NULL AND e.created_at BETWEEN :startDate AND :endDate GROUP BY date_category ORDER BY date_category",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for analysis",
      "defaultValue": "2020-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for analysis",
      "defaultValue": "2025-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 2. HIRES PER YEAR (New hires each year) - IMPORTED
{
  "name": "hiresPerYear",
  "description": "New employees hired each year based on hire date from working conditions",
  "query": "SELECT 'New Hires' as category, DATE_TRUNC('year', ewc.hire_date) as date_category, COUNT(DISTINCT ewc.employee_id) as value FROM nw_employee.employee_working_condition ewc LEFT JOIN nw_employee.employee e ON ewc.employee_id = e.id WHERE e.is_deleted = false AND ewc.hire_date IS NOT NULL AND ewc.hire_date BETWEEN :startDate AND :endDate GROUP BY date_category ORDER BY date_category",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for analysis",
      "defaultValue": "2020-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for analysis",
      "defaultValue": "2025-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 3. EXITS PER YEAR (Employee exits each year) - IMPORTED
{
  "name": "exitsPerYear",
  "description": "Employees who left each year based on exit date from working conditions",
  "query": "SELECT 'Exits' as category, DATE_TRUNC('year', ewc.exit_date) as date_category, COUNT(DISTINCT ewc.employee_id) as value FROM nw_employee.employee_working_condition ewc LEFT JOIN nw_employee.employee e ON ewc.employee_id = e.id WHERE e.is_deleted = false AND ewc.exit_date IS NOT NULL AND ewc.exit_date BETWEEN :startDate AND :endDate GROUP BY date_category ORDER BY date_category",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for analysis",
      "defaultValue": "2020-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for analysis",
      "defaultValue": "2025-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 4. ABSENCE DAYS PER YEAR (Total absence days per year) - IMPORTED
{
  "name": "absenceDaysPerYear",
  "description": "Total absence days taken each year",
  "query": "SELECT 'Absence Days' as category, DATE_TRUNC('year', ea.start_date) as date_category, COALESCE(SUM(ea.effective_days), 0) as value FROM nw_employee_time.employee_absence ea LEFT JOIN nw_employee.employee e ON ea.employee_id = e.id WHERE e.is_deleted = false AND ea.is_deleted = false AND ea.start_date IS NOT NULL AND ea.start_date BETWEEN :startDate::timestamp AND :endDate::timestamp GROUP BY date_category ORDER BY date_category",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for analysis",
      "defaultValue": "2020-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for analysis",
      "defaultValue": "2025-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 5. AVERAGE ABSENCE DURATION PER YEAR - IMPORTED
{
  "name": "avgAbsenceDurationPerYear",
  "description": "Average absence duration in days per year",
  "query": "SELECT 'Avg Duration' as category, DATE_TRUNC('year', ea.start_date) as date_category, COALESCE(AVG(ea.effective_days), 0) as value FROM nw_employee_time.employee_absence ea LEFT JOIN nw_employee.employee e ON ea.employee_id = e.id WHERE e.is_deleted = false AND ea.is_deleted = false AND ea.start_date IS NOT NULL AND ea.start_date BETWEEN :startDate::timestamp AND :endDate::timestamp GROUP BY date_category ORDER BY date_category",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for analysis",
      "defaultValue": "2020-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for analysis",
      "defaultValue": "2025-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- =============================================================================
-- DATASET QUERIES (for categorical/distribution charts)
-- Structure: category, value
-- =============================================================================

-- 6. EMPLOYEES BY ORGANIZATIONAL UNIT - IMPORTED
{
  "name": "employeesByDepartment",
  "description": "Current employee count by organizational unit",
  "query": "SELECT COALESCE(ou.name, 'Unknown') as category, COUNT(DISTINCT e.id) as value FROM nw_employee.employee e LEFT JOIN nw_orgchart.employee_position ep ON e.id = ep.employee_id LEFT JOIN nw_orgchart.organizational_unit ou ON ep.organizational_unit_id = ou.id WHERE e.is_deleted = false AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) GROUP BY ou.name ORDER BY value DESC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [],
  "additionalColumns": []
}

-- 7. EMPLOYEES BY JOB LEVEL - IMPORTED
{
  "name": "employeesByJobLevel",
  "description": "Current employee count by job level",
  "query": "SELECT COALESCE(jl.name, 'Unknown') as category, COUNT(DISTINCT e.id) as value FROM nw_employee.employee e LEFT JOIN nw_orgchart.employee_position ep ON e.id = ep.employee_id LEFT JOIN nw_employee.job_position jp ON ep.job_position_id = jp.id LEFT JOIN nw_employee.job_level jl ON jp.job_level_id = jl.id WHERE e.is_deleted = false AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) AND jl.is_deleted = false GROUP BY jl.name ORDER BY value DESC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [],
  "additionalColumns": []
}

-- 8. GENDER DISTRIBUTION - IMPORTED
{
  "name": "genderDistribution",
  "description": "Employee distribution by gender",
  "query": "SELECT COALESCE(g.value, 'Not Specified') as category, COUNT(DISTINCT e.id) as value FROM nw_employee.employee e LEFT JOIN nw_catalog.catalog_entry g ON e.gender_ref = g.id LEFT JOIN nw_catalog.catalog gc ON g.catalog_id = gc.id WHERE e.is_deleted = false AND (gc.identifier = 'Gender' AND gc.version = 'v1' OR g.id IS NULL) AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) GROUP BY g.value ORDER BY value DESC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [],
  "additionalColumns": []
}

-- 9. AGE DISTRIBUTION - IMPORTED
{
  "name": "ageDistribution",
  "description": "Employee distribution by age groups",
  "query": "SELECT age_category as category, COUNT(*) as value FROM (SELECT CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.birth_date)) < 25 THEN 'Under 25' WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.birth_date)) >= 25 AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.birth_date)) < 35 THEN '25-34' WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.birth_date)) >= 35 AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.birth_date)) < 45 THEN '35-44' WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.birth_date)) >= 45 AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.birth_date)) < 55 THEN '45-54' WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.birth_date)) >= 55 THEN '55+' ELSE 'Unknown' END as age_category FROM nw_employee.employee e WHERE e.is_deleted = false AND e.birth_date IS NOT NULL AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE)) age_calc GROUP BY age_category ORDER BY CASE age_category WHEN 'Under 25' THEN 1 WHEN '25-34' THEN 2 WHEN '35-44' THEN 3 WHEN '45-54' THEN 4 WHEN '55+' THEN 5 ELSE 6 END",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [],
  "additionalColumns": []
}

-- 10. ABSENCE BY TYPE - IMPORTED
{
  "name": "absenceByType",
  "description": "Total absence days by absence type",
  "query": "SELECT COALESCE(at.value, 'Unknown') as category, COALESCE(SUM(ea.effective_days), 0) as value FROM nw_employee_time.employee_absence ea LEFT JOIN nw_employee.employee e ON ea.employee_id = e.id LEFT JOIN nw_catalog.catalog_entry at ON ea.type_ref = at.id LEFT JOIN nw_catalog.catalog atc ON at.catalog_id = atc.id WHERE e.is_deleted = false AND ea.is_deleted = false AND (atc.identifier = 'AbsenceType' AND atc.version = 'v1' OR at.id IS NULL) AND ea.start_date BETWEEN :startDate::timestamp AND :endDate::timestamp GROUP BY at.value ORDER BY value DESC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for absence analysis",
      "defaultValue": "2024-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for absence analysis",
      "defaultValue": "2024-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 11. COMPENSATION BY ORGANIZATIONAL UNIT - IMPORTED
{
  "name": "compensationByDepartment",
  "description": "Average compensation by organizational unit",
  "query": "SELECT COALESCE(ou.name, 'Unknown') as category, ROUND(AVG(wc.annual_gross_salary), 2) as value FROM nw_employee.employee e LEFT JOIN nw_orgchart.employee_position ep ON e.id = ep.employee_id LEFT JOIN nw_orgchart.organizational_unit ou ON ep.organizational_unit_id = ou.id LEFT JOIN nw_employee.employee_working_condition wc ON e.id = wc.employee_id AND wc.is_deleted = false WHERE e.is_deleted = false AND wc.annual_gross_salary IS NOT NULL AND wc.annual_gross_salary > 0 AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) GROUP BY ou.name HAVING COUNT(DISTINCT e.id) >= 3 ORDER BY value DESC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [],
  "additionalColumns": []
}

-- 12. WORKFORCE DISTRIBUTION BY LOCATION - IMPORTED
{
  "name": "workforceByLocation",
  "description": "Employee count by work location",
  "query": "SELECT COALESCE(sl.name, 'No Location Assigned') as category, COUNT(DISTINCT e.id) as value FROM nw_employee.employee e LEFT JOIN nw_orgchart.site_location_employee sle ON e.id = sle.employee_id LEFT JOIN nw_orgchart.site_location sl ON sle.site_location_id = sl.id WHERE e.is_deleted = false AND (sl.is_deleted = false OR sl.is_deleted IS NULL) AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) GROUP BY sl.name ORDER BY value DESC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [],
  "additionalColumns": []
}

-- 13. STRUCTURAL SPAN ANALYSIS - IMPORTED
{
  "name": "structuralSpanAnalysis",
  "description": "Number of direct reports per manager",
  "query": "SELECT span_category as category, COUNT(*) as value FROM (SELECT CASE WHEN report_count = 0 THEN 'Individual Contributors' WHEN report_count >= 1 AND report_count <= 3 THEN '1-3 Reports' WHEN report_count >= 4 AND report_count <= 7 THEN '4-7 Reports' WHEN report_count >= 8 AND report_count <= 15 THEN '8-15 Reports' WHEN report_count > 15 THEN '15+ Reports' END as span_category FROM (SELECT e.id, COUNT(sub_ep.id) as report_count FROM nw_employee.employee e LEFT JOIN nw_orgchart.employee_position ep ON e.id = ep.employee_id LEFT JOIN nw_orgchart.employee_position sub_ep ON ep.employee_id = sub_ep.supervisor_employee_id LEFT JOIN nw_employee.employee sub_e ON sub_ep.employee_id = sub_e.id AND sub_e.is_deleted = false AND (sub_e.active_from IS NULL OR sub_e.active_from <= CURRENT_DATE) AND (sub_e.active_to IS NULL OR e.active_to >= CURRENT_DATE) WHERE e.is_deleted = false AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) GROUP BY e.id) report_calc) span_calc GROUP BY span_category ORDER BY CASE span_category WHEN 'Individual Contributors' THEN 1 WHEN '1-3 Reports' THEN 2 WHEN '4-7 Reports' THEN 3 WHEN '8-15 Reports' THEN 4 WHEN '15+ Reports' THEN 5 END",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [],
  "additionalColumns": []
}

-- 14. MONTHLY ABSENCE DAYS (Monthly absence days for trend analysis) - IMPORTED
{
  "name": "monthlyAbsenceDays",
  "description": "Total absence days taken each month",
  "query": "SELECT 'Absence Days' as category, DATE_TRUNC('month', ea.start_date) as date_category, COALESCE(SUM(ea.effective_days), 0) as value FROM nw_employee_time.employee_absence ea LEFT JOIN nw_employee.employee e ON ea.employee_id = e.id WHERE e.is_deleted = false AND ea.is_deleted = false AND ea.start_date IS NOT NULL AND ea.start_date BETWEEN :startDate::timestamp AND :endDate::timestamp GROUP BY date_category ORDER BY date_category",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "defaultValue": "2020-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate", 
      "type": "DATE",
      "defaultValue": "2024-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 15. ABSENCE BY DEPARTMENT - IMPORTED
{
  "name": "absenceByDepartment",
  "description": "Total absence days by department/organizational unit",
  "query": "SELECT COALESCE(ou.name, 'Unknown Department') as category, COALESCE(SUM(ea.effective_days), 0) as value FROM nw_employee_time.employee_absence ea LEFT JOIN nw_employee.employee e ON ea.employee_id = e.id LEFT JOIN nw_orgchart.employee_position ep ON e.id = ep.employee_id LEFT JOIN nw_orgchart.organizational_unit ou ON ep.organizational_unit_id = ou.id WHERE e.is_deleted = false AND ea.is_deleted = false AND ea.start_date IS NOT NULL AND ea.start_date BETWEEN :startDate::timestamp AND :endDate::timestamp GROUP BY ou.name ORDER BY value DESC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE", 
      "defaultValue": "2024-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "defaultValue": "2024-12-31", 
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 16. NATIONALITY DISTRIBUTION - IMPORTED
{
  "name": "nationalityDistribution",
  "description": "Employee distribution by nationality",
  "query": "SELECT COALESCE(n.value, 'Unknown') as category, COUNT(*) as value FROM nw_employee.employee e LEFT JOIN nw_catalog.catalog_entry n ON e.nationality_ref = n.id LEFT JOIN nw_catalog.catalog nc ON n.catalog_id = nc.id WHERE e.is_deleted = false AND (nc.identifier = 'Nationality' AND nc.version = 'v1' OR n.id IS NULL) AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) GROUP BY n.value ORDER BY value DESC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [],
  "additionalColumns": []
}

-- 17. TENURE DISTRIBUTION - IMPORTED
{
  "name": "tenureDistribution",
  "description": "Employee distribution by tenure ranges based on hire date",
  "query": "SELECT tenure_category as category, COUNT(*) as value FROM (SELECT CASE WHEN COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) < 1 THEN '< 1 year' WHEN COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) >= 1 AND COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) < 3 THEN '1-2 years' WHEN COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) >= 3 AND COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) < 6 THEN '3-5 years' WHEN COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) >= 6 AND COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) < 11 THEN '6-10 years' WHEN COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) >= 11 AND COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) < 16 THEN '11-15 years' WHEN COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) >= 16 AND COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))), 0) < 21 THEN '16-20 years' ELSE '21+ years' END as tenure_category FROM nw_employee.employee e LEFT JOIN nw_employee.employee_working_condition ewc ON e.id = ewc.employee_id WHERE e.is_deleted = false AND (ewc.is_deleted = false OR ewc.is_deleted IS NULL) AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) AND (ewc.hire_date IS NOT NULL OR e.created_at IS NOT NULL)) tenure_calc GROUP BY tenure_category ORDER BY CASE tenure_category WHEN '< 1 year' THEN 1 WHEN '1-2 years' THEN 2 WHEN '3-5 years' THEN 3 WHEN '6-10 years' THEN 4 WHEN '11-15 years' THEN 5 WHEN '16-20 years' THEN 6 WHEN '21+ years' THEN 7 END",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [],
  "additionalColumns": []
}

-- =============================================================================
-- NEW QUERIES FOR HEADCOUNT TRENDS
-- =============================================================================

-- 17. TOTAL EMPLOYEE COUNT (Simple count for statistics) - IMPORTED
{
  "name": "totalEmployeeCount",
  "description": "Simple count of current active employees based on employee positions",
  "query": "SELECT 'Total Employees' as category, COUNT(DISTINCT ep.employee_id) as value FROM nw_orgchart.employee_position ep",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [],
  "additionalColumns": []
}

-- 18. MONTHLY HIRES (New hires each month) - IMPORTED
{
  "name": "hiresPerMonth",
  "description": "New employees hired each month based on hire date",
  "query": "SELECT 'New Hires' as category, DATE_TRUNC('month', ewc.hire_date) as date_category, COUNT(DISTINCT ewc.employee_id) as value FROM nw_employee.employee_working_condition ewc LEFT JOIN nw_employee.employee e ON ewc.employee_id = e.id WHERE e.is_deleted = false AND ewc.hire_date IS NOT NULL AND ewc.hire_date BETWEEN :startDate AND :endDate GROUP BY date_category ORDER BY date_category",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for analysis",
      "defaultValue": "2023-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for analysis",
      "defaultValue": "2024-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 19. MONTHLY EXITS (Employee departures each month) - IMPORTED
{
  "name": "exitsPerMonth",
  "description": "Employees who left each month based on exit date",
  "query": "SELECT 'Departures' as category, DATE_TRUNC('month', ewc.exit_date) as date_category, COUNT(DISTINCT ewc.employee_id) as value FROM nw_employee.employee_working_condition ewc LEFT JOIN nw_employee.employee e ON ewc.employee_id = e.id WHERE e.is_deleted = false AND ewc.exit_date IS NOT NULL AND ewc.exit_date BETWEEN :startDate AND :endDate GROUP BY date_category ORDER BY date_category",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for analysis",
      "defaultValue": "2023-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for analysis",
      "defaultValue": "2024-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 20. TOTAL HEADCOUNT OVER TIME (Monthly active headcount) - IMPORTED
{
  "name": "totalHeadcountOverTime",
  "description": "Total active headcount at the end of each month using employee working conditions",
  "query": "WITH monthly_periods AS (SELECT generate_series(DATE_TRUNC('month', :startDate::date), DATE_TRUNC('month', :endDate::date), '1 month'::interval) AS month_end), employee_events AS (SELECT e.id as employee_id, COALESCE(ewc.hire_date, e.created_at::date) as hire_date, ewc.exit_date FROM nw_employee.employee e LEFT JOIN nw_employee.employee_working_condition ewc ON e.id = ewc.employee_id WHERE e.is_deleted = false AND (COALESCE(ewc.hire_date, e.created_at::date) <= :endDate::date)) SELECT 'Total Headcount' as category, mp.month_end as date_category, COUNT(DISTINCT ee.employee_id) as value FROM monthly_periods mp LEFT JOIN employee_events ee ON ee.hire_date <= mp.month_end AND (ee.exit_date IS NULL OR ee.exit_date > mp.month_end) GROUP BY mp.month_end ORDER BY mp.month_end",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for headcount analysis",
      "defaultValue": "2023-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for headcount analysis",
      "defaultValue": "2024-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 22. NET HEADCOUNT CHANGE (Monthly net change: hires - departures) - IMPORTED
{
  "name": "netHeadcountChange",
  "description": "Monthly net headcount change (hires minus departures)",
  "query": "WITH monthly_hires AS (SELECT DATE_TRUNC('month', ewc.hire_date) as month_date, COUNT(DISTINCT ewc.employee_id) as hires FROM nw_employee.employee_working_condition ewc LEFT JOIN nw_employee.employee e ON ewc.employee_id = e.id WHERE e.is_deleted = false AND ewc.hire_date IS NOT NULL AND ewc.hire_date BETWEEN :startDate AND :endDate GROUP BY DATE_TRUNC('month', ewc.hire_date)), monthly_exits AS (SELECT DATE_TRUNC('month', ewc.exit_date) as month_date, COUNT(DISTINCT ewc.employee_id) as exits FROM nw_employee.employee_working_condition ewc LEFT JOIN nw_employee.employee e ON ewc.employee_id = e.id WHERE e.is_deleted = false AND ewc.exit_date IS NOT NULL AND ewc.exit_date BETWEEN :startDate AND :endDate GROUP BY DATE_TRUNC('month', ewc.exit_date)), all_months AS (SELECT generate_series(DATE_TRUNC('month', :startDate::date), DATE_TRUNC('month', :endDate::date), '1 month'::interval) AS month_date) SELECT 'Net Change' as category, am.month_date as date_category, COALESCE(mh.hires, 0) - COALESCE(me.exits, 0) as value FROM all_months am LEFT JOIN monthly_hires mh ON am.month_date = mh.month_date LEFT JOIN monthly_exits me ON am.month_date = me.month_date ORDER BY am.month_date",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for net change analysis",
      "defaultValue": "2023-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for net change analysis",
      "defaultValue": "2024-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- =============================================================================
-- TURNOVER & RETENTION QUERIES (for real turnover and retention analytics)
-- =============================================================================

-- 23. TURNOVER RATE BY DEPARTMENT - IMPORTED
{
  "name": "turnoverRateByDepartment",
  "description": "Annual turnover rate (percentage) by organizational unit based on exits and current headcount",
  "query": "SELECT COALESCE(ou.name, 'Unknown') as category, ROUND(COALESCE((exits.exit_count * 100.0) / NULLIF(headcount.current_count, 0), 0), 2) as value FROM (SELECT ou.id as org_unit_id, ou.name as org_name, COUNT(DISTINCT e.id) as current_count FROM nw_orgchart.organizational_unit ou LEFT JOIN nw_orgchart.employee_position ep ON ou.id = ep.organizational_unit_id LEFT JOIN nw_employee.employee e ON ep.employee_id = e.id WHERE ou.is_deleted = false AND e.is_deleted = false AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) GROUP BY ou.id, ou.name HAVING COUNT(DISTINCT e.id) >= 3) headcount LEFT JOIN (SELECT ou.id as org_unit_id, COUNT(DISTINCT ewc.employee_id) as exit_count FROM nw_employee.employee_working_condition ewc LEFT JOIN nw_employee.employee e ON ewc.employee_id = e.id LEFT JOIN nw_orgchart.employee_position ep ON e.id = ep.employee_id LEFT JOIN nw_orgchart.organizational_unit ou ON ep.organizational_unit_id = ou.id WHERE e.is_deleted = false AND ewc.exit_date IS NOT NULL AND ewc.exit_date BETWEEN :startDate AND :endDate GROUP BY ou.id) exits ON headcount.org_unit_id = exits.org_unit_id LEFT JOIN nw_orgchart.organizational_unit ou ON headcount.org_unit_id = ou.id ORDER BY value DESC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for turnover analysis",
      "defaultValue": "2020-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for turnover analysis",
      "defaultValue": "2024-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 24. RETENTION RATE BY DEPARTMENT - IMPORTED
{
  "name": "retentionRateByDepartment",
  "description": "Annual retention rate (percentage) by organizational unit calculated as 100 minus turnover rate",
  "query": "SELECT COALESCE(ou.name, 'Unknown') as category, ROUND(GREATEST(0, 100 - COALESCE((exits.exit_count * 100.0) / NULLIF(headcount.current_count, 0), 0)), 2) as value FROM (SELECT ou.id as org_unit_id, ou.name as org_name, COUNT(DISTINCT e.id) as current_count FROM nw_orgchart.organizational_unit ou LEFT JOIN nw_orgchart.employee_position ep ON ou.id = ep.organizational_unit_id LEFT JOIN nw_employee.employee e ON ep.employee_id = e.id WHERE ou.is_deleted = false AND e.is_deleted = false AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) GROUP BY ou.id, ou.name HAVING COUNT(DISTINCT e.id) >= 3) headcount LEFT JOIN (SELECT ou.id as org_unit_id, COUNT(DISTINCT ewc.employee_id) as exit_count FROM nw_employee.employee_working_condition ewc LEFT JOIN nw_employee.employee e ON ewc.employee_id = e.id LEFT JOIN nw_orgchart.employee_position ep ON e.id = ep.employee_id LEFT JOIN nw_orgchart.organizational_unit ou ON ep.organizational_unit_id = ou.id WHERE e.is_deleted = false AND ewc.exit_date IS NOT NULL AND ewc.exit_date BETWEEN :startDate AND :endDate GROUP BY ou.id) exits ON headcount.org_unit_id = exits.org_unit_id LEFT JOIN nw_orgchart.organizational_unit ou ON headcount.org_unit_id = ou.id ORDER BY value ASC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for retention analysis",
      "defaultValue": "2020-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for retention analysis",
      "defaultValue": "2024-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 25. MONTHLY TURNOVER RATE PERCENTAGE - IMPORTED
{
  "name": "monthlyTurnoverRatePercentage",
  "description": "Monthly turnover rate as percentage (exits divided by average headcount * 100)",
  "query": "WITH monthly_exits AS (SELECT DATE_TRUNC('month', ewc.exit_date) as month_date, COUNT(DISTINCT ewc.employee_id) as exits FROM nw_employee.employee_working_condition ewc LEFT JOIN nw_employee.employee e ON ewc.employee_id = e.id WHERE e.is_deleted = false AND ewc.exit_date IS NOT NULL AND ewc.exit_date BETWEEN :startDate AND :endDate GROUP BY DATE_TRUNC('month', ewc.exit_date)), monthly_headcount AS (SELECT DATE_TRUNC('month', date_series) as month_date, COUNT(DISTINCT e.id) as headcount FROM generate_series(:startDate::date, :endDate::date, '1 month'::interval) date_series CROSS JOIN nw_employee.employee e LEFT JOIN nw_employee.employee_working_condition ewc ON e.id = ewc.employee_id WHERE e.is_deleted = false AND (COALESCE(ewc.hire_date, e.created_at::date) <= date_series) AND (ewc.exit_date IS NULL OR ewc.exit_date > date_series) GROUP BY DATE_TRUNC('month', date_series)), all_months AS (SELECT generate_series(DATE_TRUNC('month', :startDate::date), DATE_TRUNC('month', :endDate::date), '1 month'::interval) AS month_date) SELECT 'Monthly Turnover Rate' as category, am.month_date as date_category, ROUND(COALESCE((me.exits * 100.0) / NULLIF(mh.headcount, 0), 0), 2) as value FROM all_months am LEFT JOIN monthly_exits me ON am.month_date = me.month_date LEFT JOIN monthly_headcount mh ON am.month_date = mh.month_date ORDER BY am.month_date",
  "queryType": "TIMESERIES",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for monthly turnover analysis",
      "defaultValue": "2023-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for monthly turnover analysis",
      "defaultValue": "2024-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- 26. AT-RISK DEPARTMENTS ANALYSIS - IMPORTED
{
  "name": "atRiskDepartments",
  "description": "Departments with turnover above risk threshold",
  "query": "SELECT COALESCE(ou.name, 'Unknown') as category, ROUND(COALESCE((exits.exit_count * 100.0) / NULLIF(headcount.current_count, 0), 0), 2) as value FROM (SELECT ou.id as org_unit_id, ou.name as org_name, COUNT(DISTINCT e.id) as current_count FROM nw_orgchart.organizational_unit ou LEFT JOIN nw_orgchart.employee_position ep ON ou.id = ep.organizational_unit_id LEFT JOIN nw_employee.employee e ON ep.employee_id = e.id WHERE ou.is_deleted = false AND e.is_deleted = false AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) GROUP BY ou.id, ou.name HAVING COUNT(DISTINCT e.id) >= 3) headcount INNER JOIN (SELECT ou.id as org_unit_id, COUNT(DISTINCT ewc.employee_id) as exit_count FROM nw_employee.employee_working_condition ewc LEFT JOIN nw_employee.employee e ON ewc.employee_id = e.id LEFT JOIN nw_orgchart.employee_position ep ON e.id = ep.employee_id LEFT JOIN nw_orgchart.organizational_unit ou ON ep.organizational_unit_id = ou.id WHERE e.is_deleted = false AND ewc.exit_date IS NOT NULL AND ewc.exit_date BETWEEN :startDate AND :endDate GROUP BY ou.id) exits ON headcount.org_unit_id = exits.org_unit_id LEFT JOIN nw_orgchart.organizational_unit ou ON headcount.org_unit_id = ou.id WHERE ROUND(COALESCE((exits.exit_count * 100.0) / NULLIF(headcount.current_count, 0), 0), 2) > 15 ORDER BY value DESC",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "startDate",
      "type": "DATE",
      "description": "Start date for risk analysis",
      "defaultValue": "2024-01-01",
      "required": false,
      "allowedValues": null
    },
    {
      "name": "endDate",
      "type": "DATE",
      "description": "End date for risk analysis",
      "defaultValue": "2024-12-31",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": []
}

-- =============================================================================
-- TENURE HEATMAP QUERY (for tenure distribution by organizational unit)
-- =============================================================================

-- 27. TENURE DISTRIBUTION BY ORGANIZATIONAL UNIT - IMPORTED
{
  "name": "tenureDistributionByOrgUnit",
  "description": "Employee tenure distribution across organizational units for heatmap visualization",
  "query": "WITH tenure_calculations AS (SELECT e.id as employee_id, ou.id as org_unit_id, ou.name as org_unit_name, EXTRACT(EPOCH FROM AGE(CURRENT_DATE, COALESCE(ewc.hire_date, e.created_at))) / (30.44 * 24 * 3600) as tenure_months FROM nw_employee.employee e LEFT JOIN nw_employee.employee_working_condition ewc ON e.id = ewc.employee_id AND ewc.is_deleted = false LEFT JOIN nw_orgchart.organizational_unit_employee oue ON e.id = oue.employee_id LEFT JOIN nw_orgchart.organizational_unit ou ON oue.organizational_unit_id = ou.id WHERE e.is_deleted = false AND ou.is_deleted = false AND oue.structure_id = CAST(:structureId AS UUID) AND (e.active_from IS NULL OR e.active_from <= CURRENT_DATE) AND (e.active_to IS NULL OR e.active_to >= CURRENT_DATE) AND (COALESCE(ewc.hire_date, e.created_at) IS NOT NULL)), tenure_ranges AS (SELECT employee_id, org_unit_id, org_unit_name, CASE WHEN tenure_months < 6 THEN 'less-than-6m' WHEN tenure_months >= 6 AND tenure_months < 12 THEN '6m-1y' WHEN tenure_months >= 12 AND tenure_months < 24 THEN '1y-2y' WHEN tenure_months >= 24 AND tenure_months < 60 THEN '2y-5y' ELSE 'more-than-5y' END as tenure_range_id, CASE WHEN tenure_months < 6 THEN '< 6 months' WHEN tenure_months >= 6 AND tenure_months < 12 THEN '6-12 months' WHEN tenure_months >= 12 AND tenure_months < 24 THEN '1-2 years' WHEN tenure_months >= 24 AND tenure_months < 60 THEN '2-5 years' ELSE '5+ years' END as tenure_range_label FROM tenure_calculations WHERE tenure_months >= 0) SELECT org_unit_name as category, COUNT(*) as value, tenure_range_id, tenure_range_label FROM tenure_ranges GROUP BY org_unit_id, org_unit_name, tenure_range_id, tenure_range_label ORDER BY org_unit_name, CASE tenure_range_id WHEN 'less-than-6m' THEN 1 WHEN '6m-1y' THEN 2 WHEN '1y-2y' THEN 3 WHEN '2y-5y' THEN 4 WHEN 'more-than-5y' THEN 5 END",
  "queryType": "DATASET",
  "status": "ACTIVE",
  "parameters": [
    {
      "name": "structureId",
      "type": "STRING",
      "description": "Organizational structure ID to filter employees",
      "defaultValue": "ffaf293e-15a8-427a-bbf5-0ad64eb875a7",
      "required": false,
      "allowedValues": null
    }
  ],
  "additionalColumns": [
    {
      "name": "tenure_range_id",
      "type": "STRING",
      "description": "Tenure range identifier (less-than-6m, 6m-1y, 1y-2y, 2y-5y, more-than-5y)"
    },
    {
      "name": "tenure_range_label", 
      "type": "STRING",
      "description": "Human-readable tenure range label"
    }
  ]
}
