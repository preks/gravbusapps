import React, { useState, useCallback } from "react";
import { Table, Input, Empty, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { TableProps, TablePaginationConfig } from "antd/es/table";
import type { ColumnsType } from "antd/es/table";
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import "./styles/CrmDataTable.css";

export interface CrmDataTableProps<T extends object> extends BusinessAppContextProps {
  /**
   * Table data array
   */
  data: T[];
  
  /**
   * Table columns configuration
   */
  columns: ColumnsType<T>;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Total count of items (for pagination)
   */
  totalCount?: number;
  
  /**
   * Current page number
   */
  currentPage?: number;
  
  /**
   * Items per page
   */
  pageSize?: number;
  
  /**
   * Search value
   */
  searchValue?: string;
  
  /**
   * Search placeholder text
   */
  searchPlaceholder?: string;
  
  /**
   * Callback when page changes
   */
  onPageChange?: (page: number, pageSize: number) => void;
  
  /**
   * Callback when search changes
   */
  onSearch?: (value: string) => void;
  
  /**
   * Callback to handle row click
   */
  onRowClick?: (record: T) => void;
  
  /**
   * Optional row selection configuration
   */
  rowSelection?: TableProps<T>["rowSelection"];
}

/**
 * A reusable data table component for CRM screens
 */
export const CrmDataTable = <T extends object>({
  data,
  columns,
  loading = false,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
  searchValue = "",
  searchPlaceholder = "Search...",
  onPageChange,
  onSearch,
  onRowClick,
  rowSelection,
}: CrmDataTableProps<T>) => {
  const [searchText, setSearchText] = useState(searchValue);


  // Handle search value change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle pagination change
  const handlePaginationChange = (page: number, pageSize: number) => {
    // Call the parent's onPageChange handler if provided
    onPageChange && onPageChange(page, pageSize);
  };
  
  // Handle table change for combined pagination and sorting
  const handleTableChange = (_pagination: any, _filters: any, _sorter: any) => {
    if (_pagination && _pagination.current) {
      handlePaginationChange(_pagination.current, _pagination.pageSize || pageSize);
    }
  };

  // Define button styles for pagination
  const enabledButtonStyle: React.CSSProperties = {
    border: '1px solid #d1d5db',
    color: '#4b5563',
    borderRadius: '6px',
    padding: '4px 15px',
    height: '32px',
    backgroundColor: '#ffffff',
    margin: '0 4px',
    lineHeight: '1.5',
    minWidth: '80px',
    textAlign: 'center',
    cursor: 'pointer',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...enabledButtonStyle, 
    borderColor: '#e5e7eb', 
    color: '#9ca3af', 
    backgroundColor: '#f9fafb', 
    cursor: 'not-allowed',
  };

  // Custom pagination item renderer
  const itemRender = useCallback((_current: number, type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next', originalElement: React.ReactNode): React.ReactNode => {
    if (!React.isValidElement(originalElement)) {
      return originalElement;
    }

    const props = originalElement.props as { className?: string; children?: React.ReactNode };

    const antIsDisabled = props.className?.includes('ant-pagination-disabled');
    let styleToApply: React.CSSProperties = {};
    let newChildren = props.children;
    let isPrevNextButton = false;

    if (type === 'prev') {
      const isLogicallyDisabled = currentPage === 1;
      const finalIsDisabled = isLogicallyDisabled || antIsDisabled; 
      styleToApply = finalIsDisabled ? disabledButtonStyle : enabledButtonStyle;
      newChildren = 'Previous';
      isPrevNextButton = true;

    } else if (type === 'next') {
      const totalPages = Math.ceil(totalCount / pageSize);
      const isLogicallyDisabled = totalCount === 0 || currentPage >= totalPages;
      const finalIsDisabled = isLogicallyDisabled || antIsDisabled;
      styleToApply = finalIsDisabled ? disabledButtonStyle : enabledButtonStyle;
      newChildren = 'Next';
      isPrevNextButton = true;

    } else if (type === 'jump-prev' || type === 'jump-next') {
      return originalElement;
    } else if (React.isValidElement(originalElement) && (originalElement.props as { className?: string }).className?.includes('ant-pagination-item')) {
      return originalElement;
    } else {
      return originalElement;
    }

    if (isPrevNextButton) {
      const elementToClone = originalElement as React.ReactElement<React.HTMLAttributes<HTMLElement>>;

      const currentClassName = elementToClone.props.className || '';
      const gbaClassName = type === 'prev' ? 'gba:pagination-prev-btn' : 'gba:pagination-next-btn';
      let finalClassName = currentClassName.replace('gba:pagination-prev-btn', '').replace('gba:pagination-next-btn', '').trim();
      finalClassName = `${finalClassName} ${gbaClassName}`.trim();
      if (styleToApply === disabledButtonStyle && !antIsDisabled) {
        finalClassName = `${finalClassName} ant-pagination-disabled`.trim();
      }

      return React.cloneElement(elementToClone, {
        className: finalClassName,
        style: styleToApply,
        children: newChildren,
      });
    }
    
    return originalElement; 
  }, [currentPage, totalCount, pageSize, enabledButtonStyle, disabledButtonStyle]);

  // Configure pagination
  const paginationConfig: TablePaginationConfig = {
    current: currentPage,
    pageSize,
    total: totalCount,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    onChange: handlePaginationChange,
    className: 'gba:custom-pagination',
    itemRender: itemRender,
    position: ["bottomCenter"],
    showTotal: (total) => `Total ${total} items`,
  };



  return (
    <div className="gba:crm-data-table-container" data-testid="crm-data-table">
      {/* Table Header with Search and Actions */}
      <div className="gba:crm-data-table-header">
        <div className="gba:crm-data-table-actions">
          <Input
            placeholder={searchPlaceholder}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={handleSearchChange}
            className="gba:crm-data-table-search"
            data-testid="crm-data-table-search"
          />

        </div>
      </div>

      {/* Table Content */}
      <div className="gba:crm-data-table-content" data-testid="crm-data-table-content">
        {loading ? (
          <div className="gba:crm-data-table-loading" data-testid="crm-data-table-loading">
            <Spin size="large" />
          </div>
        ) : data.length === 0 ? (
          <Empty
            description="No data available"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            data-testid="crm-data-table-empty"
          />
        ) : (
          <Table<T>
            columns={columns}
            dataSource={data}
            rowKey={(record) => (record as any).id || Math.random().toString(36).substring(2, 9)}
            pagination={paginationConfig}
            rowSelection={rowSelection}
            onChange={handleTableChange}
            onRow={(record) => ({
              onClick: () => onRowClick && onRowClick(record),
              className: "gba:crm-data-table-row",
              "data-testid": `crm-data-table-row-${(record as any).id || "unknown"}`,
            })}
            className="gba:crm-data-table"
            data-testid="crm-data-table-table"
          />
        )}
      </div>
    </div>
  );
};

export default CrmDataTable;
