import React, { useState, useEffect } from 'react';
import { Select, Spin, Alert } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetEmployeesWithOpportunities, Employee } from '../queries/employeeQueries';

const { Option } = Select;

interface EmployeeSelectorProps extends BusinessAppContextProps {
  sourceApp?: string;
  selectedEmployeeIds?: string[];
  onEmployeeSelectionChange: (employeeIds: string[]) => void;
  disabled?: boolean;
}

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  sourceApp,
  selectedEmployeeIds = [],
  onEmployeeSelectionChange,
  disabled = false,
  ...context
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchEmployeesWithOpportunities } = useGetEmployeesWithOpportunities(context);

  useEffect(() => {
    if (context.accessToken) {
      loadEmployees();
    }
  }, [context.accessToken, sourceApp]);

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const employeesData = await fetchEmployeesWithOpportunities(sourceApp);
      setEmployees(employeesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = (values: string[]) => {
    onEmployeeSelectionChange(values);
  };

  if (error) {
    return (
      <Alert
        message="Error loading employees"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid="employee-selector-container">
      <UserOutlined className="gba:text-gray-500" />
      <Select
        mode="multiple"
        placeholder="Select employees"
        value={selectedEmployeeIds}
        onChange={handleSelectionChange}
        loading={loading}
        disabled={disabled}
        style={{ minWidth: 200 }}
        maxTagCount={2}
        maxTagTextLength={15}
        showSearch
        filterOption={(input, option) =>
          option?.children?.toString().toLowerCase().includes(input.toLowerCase()) || false
        }
        notFoundContent={loading ? <Spin size="small" /> : 'No employees found'}
        data-testid="employee-selector"
      >
        {employees.map((employee) => (
          <Option key={employee.id} value={employee.id} title={employee.displayName}>
            {employee.displayName}
          </Option>
        ))}
      </Select>
      {selectedEmployeeIds.length > 0 && (
        <span className="gba:text-sm gba:text-gray-500" data-testid="employee-count">
          {selectedEmployeeIds.length} selected
        </span>
      )}
    </div>
  );
};

export default EmployeeSelector; 