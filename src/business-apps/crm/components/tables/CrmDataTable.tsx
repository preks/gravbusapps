import React, { useState } from "react";
import { Table, Input, Button, Tooltip, Empty, Spin } from "antd";
import { SearchOutlined, SettingOutlined } from "@ant-design/icons";
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
   * Optional title for the table
   */
  title?: string;
  
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
  
  /**
   * Whether to show column visibility toggle
   */
  showColumnVisibility?: boolean;
  
  /**
   * Additional actions to display next to search
   */
  extraActions?: React.ReactNode;
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
  title,
  onPageChange,
  onSearch,
  onRowClick,
  rowSelection,
  showColumnVisibility = true,
  extraActions,
  accessToken, // Required by BusinessAppContextProps but not used directly in this component
}: CrmDataTableProps<T>) => {
  const [searchText, setSearchText] = useState(searchValue);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.map((col) => (col.key || (col as any).dataIndex) as string)
  );

  // Handle search value change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle pagination change
  const handlePaginationChange = (page: number, size: number) => {
    if (onPageChange) {
      onPageChange(page, size);
    }
  };

  // Configure pagination
  const paginationConfig: TablePaginationConfig = {
    current: currentPage,
    pageSize,
    total: totalCount,
    showSizeChanger: true,
    showTotal: (total) => `Total ${total} items`,
    onChange: handlePaginationChange,
    position: ["bottomCenter"],
  };

  // Handle column visibility toggle
  const handleColumnVisibilityToggle = (columnKey: string) => {
    if (visibleColumns.includes(columnKey)) {
      // If column is currently visible, hide it
      setVisibleColumns(visibleColumns.filter(key => key !== columnKey));
    } else {
      // If column is currently hidden, show it
      setVisibleColumns([...visibleColumns, columnKey]);
    }
  };

  // Filter columns based on visibility settings
  const visibleColumnsData = columns.filter((col) => {
    const columnKey = col.key || (col as any).dataIndex;
    return visibleColumns.includes(columnKey as string);
  });

  return (
    <div className="gba:crm-data-table-container" data-testid="crm-data-table">
      {/* Table Header with Search and Actions */}
      <div className="gba:crm-data-table-header">
        {title && <h3 className="gba:crm-data-table-title" data-testid="crm-data-table-title">{title}</h3>}
        
        <div className="gba:crm-data-table-actions">
          <Input
            placeholder={searchPlaceholder}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={handleSearchChange}
            className="gba:crm-data-table-search"
            data-testid="crm-data-table-search"
          />
          
          {extraActions}
          
          {showColumnVisibility && (
            <Tooltip title="Toggle columns">
              <Button
                icon={<SettingOutlined />}
                onClick={() => {
                  // Column visibility menu would be implemented here
                  // For now, we're just toggling a sample column
                  if (columns.length > 0) {
                    const firstColumnKey = (columns[0].key || (columns[0] as any).dataIndex) as string;
                    handleColumnVisibilityToggle(firstColumnKey);
                  }
                }}
                className="gba:crm-data-table-column-toggle"
                data-testid="crm-data-table-column-toggle"
              />
            </Tooltip>
          )}
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
            columns={visibleColumnsData}
            dataSource={data}
            rowKey={(record) => (record as any).id || Math.random().toString(36).substring(2, 9)}
            pagination={paginationConfig}
            rowSelection={rowSelection}
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
