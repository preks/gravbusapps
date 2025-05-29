import React, { useState, useEffect } from 'react';
import { Card } from '@newwork/gravity-ui-catalog';
import { RiMoneyEuroCircleLine, RiFileListLine, RiFileTextLine, RiCalendarLine } from '@remixicon/react';

// GraphQL query for expense statistics - simplified to just fetch all expense items
// We'll calculate the statistics in the component
const GET_ALL_EXPENSES_FOR_EMPLOYEE = `
  query GetExpenseItems($employeeId: uuid!) {
    ExpenseItem(
      where: {employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}}
    ) {
      id
      totalAmount
      deductibleAmount
      currencyRef
      status
      expenseClassRef
      additionalProperties
      createdAt
    }
  }
`;

// Query to get all expense item files
const GET_EXPENSE_ITEM_FILES = `
  query GetExpenseItemFiles {
    ExpenseItemFile(where: {isDeleted: {_eq: false}}) {
      id
      expenseItemId
      fileName
      fileType
      fileUrl
      isDeleted
    }
  }
`;

interface ExpenseStatsProps {
  employeeId: string;
  onFilterMissingReceipts?: () => void;
  missingReceiptsFilterActive?: boolean;
  onFilterPendingReimbursement?: () => void;
  pendingReimbursementFilterActive?: boolean;
}

interface ExpenseStats {
  totalAmount: number;
  totalCount: number;
  pendingAmount: number;
  pendingCount: number;
  missingReceipts: number;
  currentMonthAmount: number;
  currentMonthCount: number;
  currentMonthName: string;
  previousMonthChange: number; // Percentage change from last month
  currentYearAmount: number;
  currentYearCount: number;
  previousYearAmount: number;
  previousYearChange: number; // Percentage change from last year
}

// Define expense item type for better type checking
interface ExpenseItemType {
  id: string;
  totalAmount: string;
  deductibleAmount?: string;
  currencyRef: string;
  status: string;
  expenseClassRef: string;
  additionalProperties?: any;
  title?: string;
  createdAt?: string;
  attachmentUrl?: string;
  isDeleted?: boolean;
}

const ExpenseStatsCards: React.FC<ExpenseStatsProps> = ({ 
  employeeId, 
  onFilterMissingReceipts,
  missingReceiptsFilterActive = false,
  onFilterPendingReimbursement,
  pendingReimbursementFilterActive = false
}) => {
  const [stats, setStats] = useState<ExpenseStats>({
    totalAmount: 0,
    totalCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
    missingReceipts: 0,
    currentMonthAmount: 0,
    currentMonthCount: 0,
    currentMonthName: '',
    previousMonthChange: 0,
    currentYearAmount: 0,
    currentYearCount: 0,
    previousYearAmount: 0,
    previousYearChange: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Format number with commas and decimal places
  const formatCurrency = (amount: number): string => {
    // Ensure amount is a valid number
    const validAmount = isNaN(amount) ? 0 : amount;
    // Format with German locale for European number format (comma as decimal separator)
    return validAmount.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Fetch statistics on component mount
  const fetchExpenseStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all expense items for this employee
      const itemsResponse = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: GET_ALL_EXPENSES_FOR_EMPLOYEE,
          variables: {
            employeeId: employeeId
          }
        }),
      });

      const itemsResult = await itemsResponse.json();
      console.log('Expense items response:', itemsResult);

      if (itemsResult.errors) {
        console.error('GraphQL errors:', itemsResult.errors);
        setError('Failed to fetch expense items');
        return;
      }

      // Fetch all expense item files
      const filesResponse = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: GET_EXPENSE_ITEM_FILES
        }),
      });

      const filesResult = await filesResponse.json();
      console.log('Expense item files response:', filesResult);

      if (filesResult.errors) {
        console.error('GraphQL errors:', filesResult.errors);
        setError('Failed to fetch expense item files');
        return;
      }

      // Get all expense items and files
      const expenseItems = itemsResult.data?.ExpenseItem || [] as ExpenseItemType[];
      const expenseItemFiles = filesResult.data?.ExpenseItemFile || [];
      
      console.log('Raw expense items:', expenseItems);
      console.log('Raw expense item files:', expenseItemFiles);
      
      // Helper function to safely parse amounts
      const parseAmount = (value: any): number => {
        if (value === null || value === undefined) return 0;
        
        // If it's already a number, return it directly
        if (typeof value === 'number') return value;
        
        // If it's a string, try to parse it
        if (typeof value === 'string') {
          // Handle potential European number format (comma as decimal separator)
          const normalizedValue = value.replace(',', '.');
          const amount = parseFloat(normalizedValue);
          return isNaN(amount) ? 0 : amount;
        }
        
        return 0;
      };
      
      // Calculate total expenses amount using only totalAmount
      let totalAmount = 0;
      expenseItems.forEach((item: ExpenseItemType) => {
        // Log the raw amount values for debugging
        console.log(`Raw amount values - totalAmount: ${item.totalAmount}, deductibleAmount: ${item.deductibleAmount}`);
        
        // Use totalAmount for total expenses
        // Only add amounts that are reasonable (less than 5000 per item)
        // This helps prevent any corrupted data from inflating totals
        const amount = parseAmount(item.totalAmount);
        if (amount > 0 && amount < 5000) {
          totalAmount += amount;
          console.log(`Total: Adding ${amount} from item ${item.id}`);
        } else if (amount >= 5000) {
          console.log(`Skipping suspiciously high amount ${amount} from item ${item.id}`);
        }
      });
      
      // Debug all statuses to see what values exist
      const allStatuses = expenseItems.map((item: ExpenseItemType) => (
        String(item.status || '').toLowerCase()
      ));
      console.log('All unique statuses:', [...new Set(allStatuses)]);
      
      // Calculate pending items - using the SAME LOGIC as in ExpenseItems.tsx
      // Items that are NOT paid status
      const pendingItems = expenseItems.filter((item: ExpenseItemType) => {
        const status = String(item.status || '').toLowerCase();
        return status !== 'paid';
      });
      
      // Calculate pending reimbursement amount
      const pendingAmount = pendingItems.reduce((total: number, item: ExpenseItemType) => {
        const amount = parseAmount(item.totalAmount);
        console.log(`Pending item ${item.id}: Status: ${item.status}, Amount: ${amount}`);
        return total + amount;
      }, 0);
      
      console.log('Total pending items:', pendingItems.length);
      
      // Calculate items without files - using the SAME LOGIC as in ExpenseItems.tsx
      const itemsWithoutFiles = expenseItems.filter((item: ExpenseItemType) => {
        // Find files for this item
        const itemFiles = expenseItemFiles.filter((file: any) => 
          file.expenseItemId === item.id && 
          file.isDeleted !== true && 
          file.fileUrl
        );
        return itemFiles.length === 0;
      });
      
      // Calculate missing receipts count
      const missingReceiptsCount = itemsWithoutFiles.length;
      
      // Calculate current month stats
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-based (0 = January)
      
      // Get the month name
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const currentMonthName = monthNames[currentMonth];
      
      // Calculate first and last day of current month for accurate filtering
      const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
      
      // Calculate first and last day of previous month
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const firstDayOfPreviousMonth = new Date(previousYear, previousMonth, 1);
      const lastDayOfPreviousMonth = new Date(previousYear, previousMonth + 1, 0);
      
      // Get items created in the current month (using employeeId filtering consistent with main query)
      const currentMonthItems = expenseItems.filter((item: ExpenseItemType) => {
        if (!item.createdAt) return false;
        const itemDate = new Date(item.createdAt);
        return itemDate >= firstDayOfCurrentMonth && itemDate <= lastDayOfCurrentMonth;
      });
      
      // Calculate total amount for current month
      const currentMonthAmount = currentMonthItems.reduce((total: number, item: ExpenseItemType) => {
        return total + parseAmount(item.totalAmount);
      }, 0);
      
      // Get items created in the previous month
      const previousMonthItems = expenseItems.filter((item: ExpenseItemType) => {
        if (!item.createdAt) return false;
        const itemDate = new Date(item.createdAt);
        return itemDate >= firstDayOfPreviousMonth && itemDate <= lastDayOfPreviousMonth;
      });
      
      // Calculate total amount for previous month
      const previousMonthAmount = previousMonthItems.reduce((total: number, item: ExpenseItemType) => {
        return total + parseAmount(item.totalAmount);
      }, 0);
      
      // Calculate percentage change
      let percentChange = 0;
      if (previousMonthAmount > 0) {
        percentChange = ((currentMonthAmount - previousMonthAmount) / previousMonthAmount) * 100;
      }
      
      // Calculate current and previous year stats
      const currentCalendarYear = currentYear; // Store current calendar year
      const previousCalendarYear = currentCalendarYear - 1; // Calculate previous calendar year
      
      // Define date ranges for current year
      const firstDayOfCurrentYear = new Date(currentCalendarYear, 0, 1);
      const lastDayOfCurrentYear = new Date(currentCalendarYear, 11, 31, 23, 59, 59);
      
      // Get items created in the current year
      const currentYearItems = expenseItems.filter((item: ExpenseItemType) => {
        if (!item.createdAt) return false;
        const itemDate = new Date(item.createdAt);
        return itemDate >= firstDayOfCurrentYear && itemDate <= lastDayOfCurrentYear;
      });
      
      // Calculate total amount for current year
      const currentYearAmount = currentYearItems.reduce((total: number, item: ExpenseItemType) => {
        return total + parseAmount(item.totalAmount);
      }, 0);
      
      // Define date ranges for previous year
      const firstDayOfPreviousYear = new Date(previousCalendarYear, 0, 1);
      const lastDayOfPreviousYear = new Date(previousCalendarYear, 11, 31, 23, 59, 59);
      
      // Get items created in the previous year
      const previousYearItems = expenseItems.filter((item: ExpenseItemType) => {
        if (!item.createdAt) return false;
        const itemDate = new Date(item.createdAt);
        return itemDate >= firstDayOfPreviousYear && itemDate <= lastDayOfPreviousYear;
      });
      
      // Calculate total amount for previous year
      const previousYearAmount = previousYearItems.reduce((total: number, item: ExpenseItemType) => {
        return total + parseAmount(item.totalAmount);
      }, 0);
      
      // Calculate percentage change between years
      let yearPercentChange = 0;
      if (previousYearAmount > 0) {
        yearPercentChange = ((currentYearAmount - previousYearAmount) / previousYearAmount) * 100;
      }
      
      console.log(`Current month: ${currentMonthName} ${currentYear}`);
      console.log(`Current month items: ${currentMonthItems.length}, total amount: ${formatCurrency(currentMonthAmount)} €`);
      console.log(`Previous month items: ${previousMonthItems.length}, total amount: ${formatCurrency(previousMonthAmount)} €`);
      console.log(`Current year (${currentCalendarYear}) items: ${currentYearItems.length}, total amount: ${formatCurrency(currentYearAmount)} €`);
      console.log(`Previous year (${previousCalendarYear}) items: ${previousYearItems.length}, total amount: ${formatCurrency(previousYearAmount)} €`);
      console.log(`Year percentage change: ${yearPercentChange.toFixed(2)}%`);
      
      console.log('Items without files IDs:', itemsWithoutFiles.map((item: ExpenseItemType) => item.id));
      console.log(`Actual total amount: ${totalAmount}, Actual pending amount: ${pendingAmount}, Missing receipts: ${missingReceiptsCount}`);
      console.log(`Current month (${currentMonthName}) amount: ${currentMonthAmount}, Previous month amount: ${previousMonthAmount}, Change: ${percentChange.toFixed(2)}%`);
      
      // Set stats with our calculated values
      setStats({
        totalAmount: totalAmount,
        totalCount: expenseItems.length,
        pendingAmount: pendingAmount,
        pendingCount: pendingItems.length,
        missingReceipts: missingReceiptsCount,
        currentMonthAmount: currentMonthAmount,
        currentMonthCount: currentMonthItems.length,
        currentMonthName: currentMonthName,
        previousMonthChange: Math.round(percentChange * 10) / 10, // Round to 1 decimal place
        currentYearAmount: currentYearAmount,
        currentYearCount: currentYearItems.length,
        previousYearAmount: previousYearAmount,
        previousYearChange: Math.round(yearPercentChange * 10) / 10 // Round to 1 decimal place
      });
    } catch (err) {
      console.error('Error fetching expense statistics:', err);
      setError('Failed to load expense statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseStats();
  }, [employeeId]);

  if (loading) {
    return <div className="text-center py-4">Loading statistics...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-2">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-white shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">Total Expenses ({new Date().getFullYear()})</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.currentYearAmount)} €</div>
            <div className={`text-sm ${stats.previousYearChange > 0 ? 'text-green-500' : stats.previousYearChange < 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {stats.previousYearChange > 0 ? '+' : ''}{stats.previousYearChange.toFixed(1)}% vs last year
            </div>
          </div>
          <div className="text-blue-500 p-2 bg-blue-50 rounded-full">
            <RiMoneyEuroCircleLine size={24} />
          </div>
        </div>
      </Card>

      <Card className="bg-white shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">Current Month ({stats.currentMonthName})</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.currentMonthAmount)} €</div>
            <div className={`text-sm ${stats.previousMonthChange > 0 ? 'text-green-500' : stats.previousMonthChange < 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {stats.previousMonthChange > 0 ? '+' : ''}{stats.previousMonthChange.toFixed(1)}% vs previous month
            </div>
          </div>
          <div className="text-blue-500 p-2 bg-blue-50 rounded-full">
            <RiCalendarLine size={24} />
          </div>
        </div>
      </Card>

      <Card 
        className={`shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 ${pendingReimbursementFilterActive ? 'bg-orange-100 ring-2 ring-orange-400' : 'bg-white'}`}
        onClick={onFilterPendingReimbursement}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">Pending Reimbursement</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)} €</div>
            <div className="text-gray-500 text-sm">{stats.pendingCount} items pending</div>
          </div>
          <div className="text-orange-500 p-2 bg-orange-50 rounded-full">
            <RiFileListLine size={24} />
          </div>
        </div>
      </Card>

      <Card 
        className={`shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 ${missingReceiptsFilterActive ? 'bg-red-100 ring-2 ring-red-400' : 'bg-white'}`}
        onClick={onFilterMissingReceipts}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">Missing Receipts</div>
            <div className="text-2xl font-bold">{stats.missingReceipts}</div>
            <div className="text-gray-500 text-sm">
              {stats.missingReceipts > 0 ? 'Action required' : 'All receipts submitted'}
            </div>
          </div>
          <div className="text-red-500 p-2 bg-red-50 rounded-full">
            <RiFileTextLine size={24} />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ExpenseStatsCards;
