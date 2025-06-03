import React, { ReactNode } from 'react';
import { List, Tag, Space, Spin, Empty, Alert } from 'antd';

/**
 * Props for the DataList component.
 * @template T - The type of items in the list.
 */
export interface DataListProps<T> {
  /**
   * The array of items to render in the list.
   */
  readonly items: readonly T[];
  /**
   * Function to render a list item. Receives the item, its index, and whether it is selected.
   */
  readonly renderItem?: (item: T, index: number, selected: boolean) => React.ReactNode;
  /**
   * Optional function to extract a unique key for each item. Defaults to index if not provided.
   */
  readonly getKey?: (item: T, index: number) => React.Key;
  /**
   * The currently selected item, if any (for highlighting/select logic).
   */
  readonly selectedItem?: T;
  /**
   * Optional handler for item clicks. Receives the clicked item and its index.
   */
  readonly onItemClick?: (item: T, index: number) => void;
  /**
   * Additional className for the <ul> element.
   */
  readonly className?: string;
  /**
   * Additional props for the <ul> element.
   */
  readonly ulProps?: React.HTMLAttributes<HTMLUListElement>;
  /**
   * Loading state for the list.
   */
  readonly isLoading?: boolean;
  /**
   * Error state for the list.
   */
  readonly error?: string | null;
  /**
   * Empty state message when no items are available.
   */
  readonly emptyMessage?: string;
  /**
   * Use Ant Design List component instead of native ul/li.
   */
  readonly useAntList?: boolean;
  /**
   * Layout for Ant Design List (only used when useAntList is true).
   */
  readonly itemLayout?: 'horizontal' | 'vertical';
  /**
   * Function to render title for each item (only used when useAntList is true).
   */
  readonly renderTitle?: (item: T, index: number) => ReactNode;
  /**
   * Function to render description for each item (only used when useAntList is true).
   */
  readonly renderDescription?: (item: T, index: number) => ReactNode;
  /**
   * Function to render actions for each item (only used when useAntList is true).
   */
  readonly renderActions?: (item: T, index: number) => ReactNode[];
  /**
   * Function to render extra content for each item (only used when useAntList is true).
   */
  readonly renderExtra?: (item: T, index: number) => ReactNode;
  /**
   * Function to render status tag for each item (only used when useAntList is true).
   */
  readonly renderStatus?: (item: T, index: number) => { text: string; color: string };
}

/**
 * DataList is a generic, reusable component for rendering lists with custom item rendering, selection, and click handling.
 * It supports both native HTML lists and Ant Design List component with additional features.
 *
 * @example Basic usage with native HTML list
 * <DataList
 *   items={companies}
 *   selectedItem={selectedCompany}
 *   getKey={company => company.id}
 *   onItemClick={company => handleSelect(company)}
 *   renderItem={(company, idx, selected) => (
 *     <span className={selected ? 'font-bold' : ''}>{company.name}</span>
 *   )}
 * />
 *
 * @example Advanced usage with Ant Design List
 * <DataList
 *   items={expenseItems}
 *   getKey={item => item.id}
 *   useAntList={true}
 *   itemLayout="horizontal"
 *   isLoading={isLoading}
 *   error={error}
 *   emptyMessage="No expense items found."
 *   renderTitle={(item) => item.title}
 *   renderDescription={(item) => item.description}
 *   renderActions={(item) => [
 *     <Button key="view" type="link">View</Button>,
 *     <Button key="edit" type="link">Edit</Button>
 *   ]}
 *   renderStatus={(item) => ({ text: item.status, color: getStatusColor(item.status) })}
 * />
 */
export function DataList<T>({
  items,
  renderItem,
  getKey,
  selectedItem,
  onItemClick,
  className = '',
  ulProps = {},
  isLoading = false,
  error = null,
  emptyMessage = 'No items found.',
  useAntList = false,
  itemLayout = 'horizontal',
  renderTitle,
  renderDescription,
  renderActions,
  renderExtra,
  renderStatus
}: DataListProps<T>) {
  // Handle loading state
  if (isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />;
  }

  // Handle error state
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  // Handle empty state
  if (!items || items.length === 0) {
    return <Empty description={emptyMessage} style={{ margin: '40px 0' }} />;
  }

  // Use Ant Design List component if specified
  if (useAntList) {
    return (
      <List
        className={className}
        itemLayout={itemLayout}
        dataSource={items as T[]}
        renderItem={(item, index) => {
          const key = getKey?.(item, index) ?? index;
          const selected = selectedItem === item;
          
          // Prepare actions if provided
          const actions = renderActions?.(item, index);
          
          // Prepare status tag if provided
          const status = renderStatus?.(item, index);
          
          // Prepare title with optional status tag
          const title = renderTitle ? (
            <Space>
              {renderTitle(item, index)}
              {status && <Tag color={status.color}>{status.text}</Tag>}
            </Space>
          ) : undefined;
          
          // Prepare description
          const description = renderDescription?.(item, index);
          
          // Prepare extra content
          const extra = renderExtra?.(item, index);
          
          return (
            <List.Item
              key={key}
              actions={actions}
              extra={extra}
              onClick={onItemClick ? () => onItemClick(item, index) : undefined}
              className={selected ? 'ant-list-item-selected' : ''}
            >
              <List.Item.Meta
                title={title}
                description={description}
              />
              {renderItem?.(item, index, selected)}
            </List.Item>
          );
        }}
      />
    );
  }

  // Use native HTML list
  return (
    <ul className={`w-full list-none p-0 m-0 border-t border-gray-200 ${className}`.trim()} {...ulProps}>
      {items.map((item, index) => {
        const selected = selectedItem === item;
        const key = getKey ? getKey(item, index) : index;
        
        // If item is clickable, wrap in a button for proper accessibility
        if (onItemClick) {
          return (
            <li key={key} className={`border-b border-gray-200 transition-colors duration-200 ${selected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
              <button
                type="button"
                className="w-full text-left bg-transparent border-none py-3 px-4 cursor-pointer block font-inherit text-inherit"
                onClick={() => onItemClick(item, index)}
                aria-current={selected ? 'page' : undefined}
              >
                {renderItem?.(item, index, selected)}
              </button>
            </li>
          );
        }
        
        // Non-interactive item
        return (
          <li
            key={key}
            className={`border-b border-gray-200 py-3 px-4 transition-colors duration-200 ${selected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            aria-current={selected ? 'page' : undefined}
          >
            {renderItem?.(item, index, selected)}
          </li>
        );
      })}
    </ul>
  );
}
