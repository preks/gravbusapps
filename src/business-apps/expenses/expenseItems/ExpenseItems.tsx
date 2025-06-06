import React, { useState, useEffect, useRef, useReducer } from 'react';
import { GET_EXPENSE_ITEMS_BY_EMPLOYEE, GET_EXPENSE_ITEM_FILES } from './ExpenseItemsQueries';
import { DataTable, Button, Input } from '@newwork/gravity-ui-catalog';
import { RiSearchLine, RiAddLine, RiArrowDownSLine } from '@remixicon/react';
import ExpenseStatsCards from './ExpenseStatsCards';

// Configuration for current user employee ID
const USER_CONFIG = {
  CURRENT_EMPLOYEE_ID: '86f9daa3-d100-4125-b551-1a5c2352ef90'
};

// Interface for expense item file
interface ExpenseItemFile {
  id: string;
  expenseItemId: string;
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  isDeleted?: boolean;
}

// Interface for expense items in the table
interface ExpenseItem {
  id: string;
  date: string;
  dateTimestamp: number; // Store original date as timestamp for sorting
  title: string;
  department: string;
  amount: string;
  type: string;
  status: string;
  files: ExpenseItemFile[];
}

// Define component props
interface ExpenseItemsProps {
  title?: string; // Optional custom title
}

// Helper function to format date as DD.MM.YYYY
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}.${month}.${year}`;
};

// Helper function to format amount as 00.00 + currency
const formatAmount = (amount: string | number | undefined, currency: string | undefined): string => {
  if (amount === undefined || amount === null) return '';
  
  let numericAmount: number;
  if (typeof amount === 'string') {
    numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return '';
  } else {
    numericAmount = amount;
  }
  
  // Clean up currency format (remove Currency:v1: prefix if present)
  let cleanCurrency = currency || '';
  if (cleanCurrency.includes('Currency:v1:')) {
    cleanCurrency = cleanCurrency.replace('Currency:v1:', '');
  }
  
  return `${numericAmount.toFixed(2)} ${cleanCurrency}`;
};

// Helper function to format type (remove any prefixes)
const formatType = (type: string | undefined): string => {
  if (!type) return '';
  
  // Check for common prefixes and remove them
  const prefixPatterns = [
    'EXPENSECLASS:V1:',
    'ExpenseClass:v1:',
    'expenseclass:v1:'
  ];
  
  // Try each prefix pattern
  for (const prefix of prefixPatterns) {
    if (type.includes(prefix)) {
      return type.replace(prefix, '');
    }
  }
  
  // Handle colon-separated format (take last part after colon)
  if (type.includes(':')) {
    const parts = type.split(':');
    return parts[parts.length - 1];
  }
  
  return type;
};

// This is a debug function to help us understand why we're getting different counts
const debugMissingReceiptsCount = async (employeeId: string) => {
  try {
    const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
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
              attachmentUrl
            }
          }
        `,
        variables: {
          employeeId: employeeId
        }
      }),
    });

    const result = await response.json();
    console.log('Debug query result:', result);

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return;
    }

    const expenseItems = result.data?.ExpenseItem || [];
    
    // Count items without attachments
    const itemsWithoutAttachments = expenseItems.filter((item: any) => {
      return !item.attachmentUrl;
    });
    
    console.log('Total items count:', expenseItems.length);
    console.log('Items without attachments count:', itemsWithoutAttachments.length);
    console.log('Items without attachments IDs:', itemsWithoutAttachments.map((item: any) => item.id));
    
    // Also count how many items we have in our table data
    console.log('Total table items in our UI state:', expenseItems.length);
    
    return itemsWithoutAttachments;
  } catch (err) {
    console.error('Error in debug function:', err);
    return [];
  }
};

const ExpenseItems: React.FC<ExpenseItemsProps> = ({ 
  title = 'My Expense Items' 
}) => {
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const [showMissingReceiptsOnly, setShowMissingReceiptsOnly] = useState<boolean>(false);
  const [showPendingReimbursementOnly, setShowPendingReimbursementOnly] = useState<boolean>(false);
  const [sortedInfo, setSortedInfo] = useState<{ columnKey: string | null; order: 'ascend' | 'descend' | null }>({ columnKey: null, order: null });
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<ExpenseItem[]>([]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState<boolean>(false);
  
  // Force re-render when needed
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Filter state variables
  const [timePeriodFilter, setTimePeriodFilter] = useState<string>('');
  const [expenseTypeFilters, setExpenseTypeFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [amountRange, setAmountRange] = useState<{min: number | null, max: number | null}>({min: null, max: null});
  
  // Expansion state for filter categories
  const [expandedFilterSections, setExpandedFilterSections] = useState<{[key: string]: boolean}>({
    timePeriod: false,
    expenseType: false,
    status: false,
    amount: false
  });
  
  // Function to toggle filter section expansion
  const toggleFilterSection = (section: string) => {
    setExpandedFilterSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Refs for handling clicks outside of menus
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  
  // Close the menus when clicking outside of them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close actions menu if clicking outside
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
      
      // Don't close filter menu when clicking on the filter button
      const filterButton = document.getElementById('filter-button');
      if (filterButton && filterButton.contains(event.target as Node)) {
        return;
      }
      
      // Close filter menu if clicking outside
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Apply filters whenever filter state changes
  useEffect(() => {
    applyFilters(searchTerm, showMissingReceiptsOnly, showPendingReimbursementOnly);
    // Force re-render to update the filter icon highlight
    forceUpdate();
  }, [timePeriodFilter, expenseTypeFilters, statusFilters, amountRange, searchTerm, showMissingReceiptsOnly, showPendingReimbursementOnly]);
  
  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First fetch expense items by employee ID
        const expenseItemsResponse = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: GET_EXPENSE_ITEMS_BY_EMPLOYEE,
            variables: {
              employeeId: USER_CONFIG.CURRENT_EMPLOYEE_ID
            }
          }),
        });

        const expenseItemsResult = await expenseItemsResponse.json();
        console.log('Expense items response:', expenseItemsResult);

        if (expenseItemsResult.errors) {
          console.error('GraphQL errors:', expenseItemsResult.errors);
          setError('Failed to fetch expense items');
          return;
        }

        const expenseItems = expenseItemsResult.data?.ExpenseItem || [];
        
        // Then fetch all expense item files
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
          // Continue anyway, we can show expense items without files
        }

        const expenseItemFiles = filesResult.data?.ExpenseItemFile || [];
        
        // Map expense item files to expense items
        const mappedItems = mapExpenseItemsToUIItems(expenseItems, expenseItemFiles);
        setExpenseItems(mappedItems);
        setFilteredItems(mappedItems);
      } catch (err) {
        console.error('Error loading expense items:', err);
        setError('Failed to load expense data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Debug the missing receipts count
    debugMissingReceiptsCount(USER_CONFIG.CURRENT_EMPLOYEE_ID);
  }, []);

  // Helper function to map the GraphQL response to UI items
  const mapExpenseItemsToUIItems = (items: any[], files: any[]): ExpenseItem[] => {
    return items.map(item => {
      // Find all files for this expense item
      const itemFiles = files.filter(file => 
        file.expenseItemId === item.id && 
        file.isDeleted !== true && 
        file.fileUrl
      );
      
      // Convert date string to timestamp for sorting
      let dateTimestamp = 0;
      try {
        // Try to parse the date string to get a timestamp
        if (item.createdAt) {
          const date = new Date(item.createdAt);
          dateTimestamp = date.getTime();
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
      
      return {
        id: item.id,
        date: formatDate(item.createdAt),
        dateTimestamp: dateTimestamp,
        title: item.title || '',
        department: item.employee?.additionalProperties?.department || '',
        amount: formatAmount(item.totalAmount, item.currencyRef),
        type: formatType(item.expenseClassRef) || '',
        status: item.status || 'Draft',
        files: itemFiles
      };
    });
  };

  // Function to handle search input changes
  const handleSearch = (value: any) => {
    const searchValue = typeof value === 'string' 
      ? value 
      : (value?.target?.value || value?.value || '');
    
    setSearchTerm(searchValue);
    applyFilters(searchValue, showMissingReceiptsOnly, showPendingReimbursementOnly);
  };
  
  // Function to handle time period filter changes
  const handleTimePeriodChange = (period: string) => {
    setTimePeriodFilter(period === timePeriodFilter ? '' : period); // Toggle if already selected
  };
  
  // Function to handle expense type filter changes
  const handleExpenseTypeChange = (type: string) => {
    setExpenseTypeFilters(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type); // Remove if already selected
      } else {
        return [...prev, type]; // Add if not selected
      }
    });
  };
  
  // Function to handle status filter changes
  const handleStatusChange = (status: string) => {
    setStatusFilters(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status); // Remove if already selected
      } else {
        return [...prev, status]; // Add if not selected
      }
    });
  };
  
  // Function to handle amount range filter changes
  const handleAmountRangeChange = (min: number | null, max: number | null) => {
    setAmountRange({ min, max });
  };
  
  // Function to handle missing receipts filter toggle
  const handleFilterMissingReceipts = () => {
    // Toggle the filter state
    const newFilterState = !showMissingReceiptsOnly;
    setShowMissingReceiptsOnly(newFilterState);
    
    // Disable other filters when this one is activated
    if (newFilterState) {
      setShowPendingReimbursementOnly(false);
    }
    
    // Apply the updated filter
    applyFilters(searchTerm, newFilterState, false);
  };
  
  // Function to handle pending reimbursement filter toggle
  const handleFilterPendingReimbursement = () => {
    // Toggle the filter state
    const newFilterState = !showPendingReimbursementOnly;
    setShowPendingReimbursementOnly(newFilterState);
    
    // Disable other filters when this one is activated
    if (newFilterState) {
      setShowMissingReceiptsOnly(false);
    }
    
    // Apply the updated filter
    applyFilters(searchTerm, false, newFilterState);
  };
  
  // Function to apply all filters
  const applyFilters = (
    search: string = searchTerm, 
    missingReceiptsFilter: boolean = showMissingReceiptsOnly,
    pendingReimbursementFilter: boolean = showPendingReimbursementOnly
  ) => {
    const lowerCaseSearch = search.toLowerCase();
    
    let filtered = [...expenseItems];
    
    // Apply search filter if present
    if (lowerCaseSearch) {
      filtered = filtered.filter(item => (
        item.title.toLowerCase().includes(lowerCaseSearch) ||
        item.amount.toLowerCase().includes(lowerCaseSearch) ||
        item.status.toLowerCase().includes(lowerCaseSearch)
      ));
    }
    
    // Apply missing receipts filter if enabled
    if (missingReceiptsFilter) {
      filtered = filtered.filter(item => {
        // Check for missing attachments - exactly matches logic in ExpenseStatsCards
        // An item is missing a receipt if it has no files or empty files array
        return !item.files || item.files.length === 0;
      });
    }
    
    // Apply pending reimbursement filter if enabled
    if (pendingReimbursementFilter) {
      filtered = filtered.filter(item => {
        // Exclude items with "paid" status (case insensitive)
        return item.status.toLowerCase() !== 'paid';
      });
    }
    
    // Apply time period filter
    if (timePeriodFilter) {
      const now = new Date();
      let cutoffDate = new Date();
      
      if (timePeriodFilter === 'last30') {
        cutoffDate.setDate(now.getDate() - 30);
      } else if (timePeriodFilter === 'last90') {
        cutoffDate.setDate(now.getDate() - 90);
      } else if (timePeriodFilter === 'last180') {
        cutoffDate.setDate(now.getDate() - 180);
      }
      
      filtered = filtered.filter(item => {
        try {
          const itemDate = new Date(item.dateTimestamp);
          return itemDate >= cutoffDate;
        } catch (e) {
          return true; // If we can't parse the date, keep the item
        }
      });
    }
    
    // Apply expense type filters
    if (expenseTypeFilters.length > 0) {
      filtered = filtered.filter(item => {
        const itemType = item.type.toLowerCase();
        return expenseTypeFilters.some(filter => itemType.includes(filter.toLowerCase()));
      });
    }
    
    // Apply status filters
    if (statusFilters.length > 0) {
      filtered = filtered.filter(item => {
        const itemStatus = item.status.toLowerCase();
        return statusFilters.some(filter => {
          // Map "open" filter to "created" status
          if (filter.toLowerCase() === 'open') {
            return itemStatus === 'created';
          }
          return itemStatus === filter.toLowerCase();
        });
      });
    }
    
    // Apply amount range filter
    if (amountRange.min !== null || amountRange.max !== null) {
      filtered = filtered.filter(item => {
        // Extract numeric amount from formatted string (e.g., "123.45 EUR" -> 123.45)
        const numericAmount = parseFloat(item.amount.replace(/[^0-9.]/g, ''));
        
        // Apply min filter if set
        if (amountRange.min !== null && numericAmount < amountRange.min) {
          return false;
        }
        
        // Apply max filter if set
        if (amountRange.max !== null && numericAmount > amountRange.max) {
          return false;
        }
        
        return true;
      });
    }
    
    setFilteredItems(filtered);
  };

  // Function to directly check if any filters are active
  const checkIfFiltersActive = () => {
    return (
      timePeriodFilter !== '' || 
      expenseTypeFilters.length > 0 || 
      statusFilters.length > 0 || 
      amountRange.min !== null || 
      amountRange.max !== null ||
      searchTerm !== '' ||
      showMissingReceiptsOnly ||
      showPendingReimbursementOnly
    );
  };

  // Function to handle table sorting
  const handleTableChange = (_pagination: any, _filters: any, sorter: any) => {
    setSortedInfo({
      columnKey: sorter.columnKey,
      order: sorter.order
    });
  };

  // Function to generate status tag based on status string
  const getStatusTag = (status: string) => {
    // Define a mapping of status values to tag colors
    const statusColorMap: Record<string, string> = {
      'Draft': 'gba:bg-gray-100 gba:text-gray-800',
      'Pending': 'gba:bg-blue-100 gba:text-blue-800',
      'Approved': 'gba:bg-green-100 gba:text-green-800',
      'Rejected': 'gba:bg-red-100 gba:text-red-800',
      // Add more statuses as needed
    };
    
    // Use the mapped color or default to blue
    const colorClass = statusColorMap[status] || 'gba:bg-blue-100 gba:text-blue-800';
    
    return (
      <div className={`gba:w-24 gba:text-center gba:py-1 gba:px-2 ${colorClass} gba:rounded-md`}>
        {status || 'Draft'}
      </div>
    );
  };

  // Define the columns for the table
  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: ExpenseItem, b: ExpenseItem) => a.title.localeCompare(b.title),
      sortOrder: sortedInfo.columnKey === 'title' ? sortedInfo.order : null,
      render: (text: string, record: ExpenseItem) => (
        <div>
          <div className="gba:font-medium gba:cursor-pointer gba:hover:text-blue-600">
            <a 
              href={`/platform/landing_screen/srn_expenseItemDetails?id=${record.id}`}
            >
              {text}
            </a>
          </div>
        </div>
      ),
    },
    {
      title: 'Invoice Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a: ExpenseItem, b: ExpenseItem) => {
        // Use the stored timestamp values for sorting instead of parsing the formatted date string
        return a.dateTimestamp - b.dateTimestamp;
      },
      sortOrder: sortedInfo.columnKey === 'date' ? sortedInfo.order : null,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      sorter: (a: ExpenseItem, b: ExpenseItem) => {
        if (!a.type) return -1;
        if (!b.type) return 1;
        return a.type.localeCompare(b.type);
      },
      sortOrder: sortedInfo.columnKey === 'type' ? sortedInfo.order : null,
      render: (type: string) => formatType(type),
    },
    {
      title: 'Attachment',
      dataIndex: 'files',
      key: 'attachment',
      sorter: (a: ExpenseItem, b: ExpenseItem) => {
        // Sort by whether there are files or not
        // Items with files will come first in ascending order
        const hasFilesA = a.files && a.files.length > 0 ? 1 : 0;
        const hasFilesB = b.files && b.files.length > 0 ? 1 : 0;
        return hasFilesA - hasFilesB;
      },
      sortOrder: sortedInfo.columnKey === 'attachment' ? sortedInfo.order : null,
      render: (files: ExpenseItemFile[], _record: ExpenseItem) => {
        const hasFiles = files && files.length > 0;
        
        // Show a checkmark if there are files
        return hasFiles ? (
          <div className="gba:text-green-600">
            ✓
          </div>
        ) : null; // Don't show any icon if there are no files
      }
    },
    {
      title: 'Reimbursable Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as 'right',
      sorter: (a: ExpenseItem, b: ExpenseItem) => {
        // Extract numeric values for comparison
        const amountA = parseFloat(a.amount.replace(/[^0-9.]/g, ''));
        const amountB = parseFloat(b.amount.replace(/[^0-9.]/g, ''));
        return amountA - amountB;
      },
      sortOrder: sortedInfo.columnKey === 'amount' ? sortedInfo.order : null,
    },
  ];

  return (
    <div className="gba:flex gba:flex-col">
      {/* Header with title and Flows button */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <h1 className="gba:text-2xl gba:font-semibold">{title}</h1>
        <div className="gba:relative">
          {/* Actions Button with Dropdown */}
          <div className="gba:relative gba:inline-block">
            <Button 
              className="gba:rounded-full gba:border gba:border-gray-300 gba:hover:bg-gray-100"
              onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
            >
              <span className="gba:flex gba:items-center gba:gap-1">
                <span>+</span> ACTIONS <RiArrowDownSLine size={16} />
              </span>
            </Button>
            
            {/* Dropdown Menu */}
            {isActionsMenuOpen && (
              <div 
                className="gba:absolute gba:right-0 gba:mt-2 gba:w-56 gba:bg-white gba:shadow-lg gba:rounded-md gba:border gba:border-gray-200 gba:z-10"
                ref={actionsMenuRef}
              >
                <div className="gba:py-1">
                  <a 
                    href="/platform/landing_screen/srn_expenseItemCreate"
                    className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-sm gba:text-gray-700 gba:hover:bg-blue-50 gba:hover:text-blue-700"
                    onClick={() => setIsActionsMenuOpen(false)}
                  >
                    <span className="gba:inline-flex gba:items-center gba:justify-center gba:w-4 gba:h-4 gba:mr-1">
                      <RiAddLine size={16} />
                    </span>
                    Create Expense Item
                  </a>
                  
                  {selectedRows.length > 0 && (
                    <a 
                      href="#"
                      className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-sm gba:text-gray-700 gba:hover:bg-blue-50 gba:hover:text-blue-700"
                      onClick={(e) => {
                        e.preventDefault();
                        // Here you would implement the logic to create an expense request with the selected items
                        console.log(`Creating expense request with ${selectedRows.length} items`, selectedRows);
                        setIsActionsMenuOpen(false);
                      }}
                    >
                      <span className="gba:inline-flex gba:items-center gba:justify-center gba:w-4 gba:h-4 gba:mr-1">
                        <RiAddLine size={16} />
                      </span>
                      Create Expense Request ({selectedRows.length} {selectedRows.length === 1 ? 'item' : 'items'})
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <ExpenseStatsCards 
        employeeId={USER_CONFIG.CURRENT_EMPLOYEE_ID} 
        onFilterMissingReceipts={handleFilterMissingReceipts}
        missingReceiptsFilterActive={showMissingReceiptsOnly}
        onFilterPendingReimbursement={handleFilterPendingReimbursement}
        pendingReimbursementFilterActive={showPendingReimbursementOnly}
      />

      {/* Filters and Table */}
      <div className="gba:bg-white gba:rounded-lg gba:shadow-sm">
        {/* Filter sidebar overlay - only visible when filter menu is open */}
        <div 
          className={`gba:fixed gba:inset-0 gba:bg-black gba:transition-opacity gba:duration-300 gba:z-10 ${isFilterMenuOpen          ? 'gba:opacity-25' : 'gba:opacity-0 gba:pointer-events-none'}`} 
          onClick={() => setIsFilterMenuOpen(false)}
        ></div>
        
        {/* Filter sidebar that slides in from left */}
        <div 
          ref={filterMenuRef}
          className={`gba:fixed gba:left-0 gba:top-0 gba:h-full gba:w-72 gba:bg-white gba:shadow-xl gba:transform gba:transition-transform gba:duration-300 gba:ease-in-out gba:z-20 ${isFilterMenuOpen      ? 'gba:translate-x-0' : 'gba:-translate-x-full'}`}
        >
          <div className="gba:p-4 gba:border-b gba:border-gray-200 gba:flex gba:justify-between gba:items-center">
            <h2 className="gba:text-lg gba:font-medium">Filters</h2>
            <Button 
              className="gba:text-gray-500 gba:hover:text-gray-700"
              onClick={() => setIsFilterMenuOpen(false)}
            >
              ×
            </Button>
          </div>
          
          {/* Filter sections */}
          <div className="gba:p-4 gba:space-y-6 gba:overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
            {/* Filter by Time Period */}
            <div className="gba:border-b gba:pb-4">
              <h3 
                className="gba:font-medium gba:mb-2 gba:flex gba:justify-between gba:items-center gba:cursor-pointer" 
                onClick={() => toggleFilterSection('timePeriod')}
              >
                <span>Filter by Time Period</span>
                <RiArrowDownSLine 
                  size={20} 
                  className={`gba:text-gray-500 gba:transform gba:transition-transform ${expandedFilterSections.timePeriod ? 'gba:rotate-180' : ''}`} 
                />
              </h3>
              {expandedFilterSections.timePeriod && (
                <div className="gba:space-y-2 gba:mt-2">
                  <div className="gba:flex gba:items-center">
                    <input 
                      type="radio" 
                      id="time-last30" 
                      name="timePeriod"
                      className="gba:mr-2" 
                      checked={timePeriodFilter === 'last30'}
                      onChange={() => handleTimePeriodChange('last30')}
                    />
                    <label htmlFor="time-last30">Last 30 days</label>
                  </div>
                  <div className="gba:flex gba:items-center">
                    <input 
                      type="radio" 
                      id="time-last90" 
                      name="timePeriod"
                      className="gba:mr-2" 
                      checked={timePeriodFilter === 'last90'}
                      onChange={() => handleTimePeriodChange('last90')}
                    />
                    <label htmlFor="time-last90">Last 90 days</label>
                  </div>
                  <div className="gba:flex gba:items-center">
                    <input 
                      type="radio" 
                      id="time-last180" 
                      name="timePeriod"
                      className="gba:mr-2" 
                      checked={timePeriodFilter === 'last180'}
                      onChange={() => handleTimePeriodChange('last180')}
                    />
                    <label htmlFor="time-last180">Last 180 days</label>
                  </div>

                  {timePeriodFilter && (
                    <div className="gba:mt-2">
                      <button 
                        className="gba:text-sm gba:text-blue-600 gba:hover:text-blue-800"
                        onClick={() => handleTimePeriodChange('')}
                      >
                        Clear time period filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Filter by Expense Type */}
            <div className="gba:border-b gba:py-4">
              <h3 
                className="gba:font-medium gba:mb-2 gba:flex gba:justify-between gba:items-center gba:cursor-pointer" 
                onClick={() => toggleFilterSection('expenseType')}
              >
                <span>Filter by Expense Type</span>
                <RiArrowDownSLine 
                  size={20} 
                  className={`gba:text-gray-500 gba:transform gba:transition-transform ${expandedFilterSections.expenseType ? 'gba:rotate-180' : ''}`} 
                />
              </h3>
              {expandedFilterSections.expenseType && (
                <div className="gba:space-y-2 gba:mt-2">
                  <div className="gba:flex gba:items-center">
                    <input 
                      type="checkbox" 
                      id="type-expense" 
                      className="gba:mr-2" 
                      checked={expenseTypeFilters.includes('expense')}
                      onChange={() => handleExpenseTypeChange('expense')}
                    />
                    <label htmlFor="type-expense">Expense</label>
                  </div>
                  <div className="gba:flex gba:items-center">
                    <input 
                      type="checkbox" 
                      id="type-allowance" 
                      className="gba:mr-2" 
                      checked={expenseTypeFilters.includes('allowance')}
                      onChange={() => handleExpenseTypeChange('allowance')}
                    />
                    <label htmlFor="type-allowance">Allowance</label>
                  </div>
                  <div className="gba:flex gba:items-center">
                    <input 
                      type="checkbox" 
                      id="type-mileage" 
                      className="gba:mr-2" 
                      checked={expenseTypeFilters.includes('mileage')}
                      onChange={() => handleExpenseTypeChange('mileage')}
                    />
                    <label htmlFor="type-mileage">Mileage</label>
                  </div>
                  <div className="gba:flex gba:items-center">
                    <input 
                      type="checkbox" 
                      id="type-travel" 
                      className="gba:mr-2" 
                      checked={expenseTypeFilters.includes('travel')}
                      onChange={() => handleExpenseTypeChange('travel')}
                    />
                    <label htmlFor="type-travel">Travel</label>
                  </div>
                  {expenseTypeFilters.length > 0 && (
                    <div className="gba:mt-2">
                      <button 
                        className="gba:text-sm gba:text-blue-600 gba:hover:text-blue-800"
                        onClick={() => {
                          setExpenseTypeFilters([]);
                          applyFilters();
                        }}
                      >
                        Clear expense type filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Filter by Status */}
            <div className="gba:border-b gba:py-4">
              <h3 
                className="gba:font-medium gba:mb-2 gba:flex gba:justify-between gba:items-center gba:cursor-pointer" 
                onClick={() => toggleFilterSection('status')}
              >
                <span>Filter by Status</span>
                <RiArrowDownSLine 
                  size={20} 
                  className={`gba:text-gray-500 gba:transform gba:transition-transform ${expandedFilterSections.status ? 'rotate-180' : ''}`} 
                />
              </h3>
              {expandedFilterSections.status && (
                <div className="gba:space-y-2 gba:mt-2">
                  <div className="gba:flex gba:items-center">
                    <input 
                      type="checkbox" 
                      id="status-open" 
                      className="gba:mr-2" 
                      checked={statusFilters.includes('open')}
                      onChange={() => handleStatusChange('open')}
                    />
                    <label htmlFor="status-open">Open</label>
                  </div>
                  <div className="gba:flex gba:items-center">
                    <input 
                      type="checkbox" 
                      id="status-pending" 
                      className="gba:mr-2" 
                      checked={statusFilters.includes('pending')}
                      onChange={() => handleStatusChange('pending')}
                    />
                    <label htmlFor="status-pending">Pending</label>
                  </div>
                  <div className="gba:flex gba:items-center">
                    <input 
                      type="checkbox" 
                      id="status-done" 
                      className="gba:mr-2" 
                      checked={statusFilters.includes('done')}
                      onChange={() => handleStatusChange('done')}
                    />
                    <label htmlFor="status-done">Done</label>
                  </div>
                  {statusFilters.length > 0 && (
                    <div className="gba:mt-2">
                      <button 
                        className="gba:text-sm gba:text-blue-600 gba:hover:text-blue-800"
                        onClick={() => {
                          setStatusFilters([]);
                          applyFilters();
                        }}
                      >
                        Clear status filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Filter by Amount */}
            <div className="gba:py-4">
              <h3 
                className="gba:font-medium gba:mb-2 gba:flex gba:justify-between gba:items-center gba:cursor-pointer" 
                onClick={() => toggleFilterSection('amount')}
              >
                <span>Filter by Amount</span>
                <RiArrowDownSLine 
                  size={20} 
                  className={`gba:text-gray-500 gba:transform gba:transition-transform ${expandedFilterSections.amount ? 'gba:rotate-180' : ''}`} 
                />
              </h3>
              {expandedFilterSections.amount && (
                <div className="gba:space-y-4 gba:mt-2">
                  <div>
                    <label htmlFor="amount-min" className="gba:block gba:text-sm gba:mb-1">Minimum Amount</label>
                    <input 
                      type="number" 
                      id="amount-min" 
                      className="gba:w-full gba:border gba:border-gray-300 gba:rounded gba:px-2 gba:py-1 gba:text-sm" 
                      placeholder="Min amount"
                      value={amountRange.min !== null ? amountRange.min : ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        handleAmountRangeChange(value, amountRange.max);
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="amount-max" className="gba:block gba:text-sm gba:mb-1">Maximum Amount</label>
                    <input 
                      type="number" 
                      id="amount-max" 
                      className="gba:w-full gba:border gba:border-gray-300 gba:rounded gba:px-2 gba:py-1 gba:text-sm" 
                      placeholder="Max amount"
                      value={amountRange.max !== null ? amountRange.max : ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        handleAmountRangeChange(amountRange.min, value);
                      }}
                    />
                  </div>
                  {(amountRange.min !== null || amountRange.max !== null) && (
                    <div>
                      <button 
                        className="gba:text-sm gba:text-blue-600 gba:hover:text-blue-800"
                        onClick={() => {
                          setAmountRange({min: null, max: null});
                          applyFilters();
                        }}
                      >
                        Clear amount filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Clear All Filters */}
            <div className="gba:pt-4 gba:flex gba:justify-end gba:border-t gba:border-gray-200">
              <button 
                className="gba:px-4 gba:py-2 gba:border gba:border-gray-300 gba:rounded gba:hover:bg-gray-100"
                onClick={() => {
                  // Reset all filters
                  setTimePeriodFilter('');
                  setExpenseTypeFilters([]);
                  setStatusFilters([]);
                  setAmountRange({min: null, max: null});
                  applyFilters(); // Apply with cleared filters
                  setIsFilterMenuOpen(false);
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
        
        {/* Search and filter bar */}
        <div className="gba:flex gba:items-center gba:p-4 gba:border-b gba:border-gray-200">
          {/* Filter button */}
          <div 
            id="filter-button"
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginRight: '8px',
              borderRadius: '4px',
              backgroundColor: checkIfFiltersActive() ? '#3B82F6' : '#F3F4F6',
              color: checkIfFiltersActive() ? '#FFFFFF' : '#374151',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 256 256" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M200,128a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,128Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"></path>
            </svg>
          </div>
          {isSearchExpanded ? (
            <Input
              name="search"
              prefix={<RiSearchLine className="gba:text-gray-400" />}
              placeholder="Search in Expense Item List"
              defaultValue={searchTerm}
              onChange={(e: any) => handleSearch(e)}
              onBlur={() => {
                if (!searchTerm) {
                  setIsSearchExpanded(false);
                }
              }}
              autoFocus
              className="gba:mr-auto"
            />
          ) : (
            <div 
              className="gba:flex gba:items-center gba:cursor-pointer gba:mr-auto" 
              onClick={() => setIsSearchExpanded(true)}
            >
              <RiSearchLine className="gba:text-gray-400 gba:mr-2" />
              <span>My Expense Items</span>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="gba:flex gba:justify-center gba:py-8">
            <span>Loading expense data...</span>
          </div>
        ) : error ? (
          <div className="gba:text-red-500 gba:py-4">{error}</div>
        ) : expenseItems.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:py-8">
            <span>No expense data available</span>
            <div className="gba:text-xs gba:text-gray-500 gba:mt-2">
              No expense items found for your account
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns as any}
            dataSource={filteredItems}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            onChange={handleTableChange}
            rowSelection={{
              type: 'checkbox',
              onChange: (selectedRowKeys, selectedRows) => {
                console.log(`Selected row keys: ${selectedRowKeys}`);
                console.log('Selected rows:', selectedRows);
                // Properly type the selectedRows as ExpenseItem[]
                setSelectedRows(selectedRows as ExpenseItem[]);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ExpenseItems;
