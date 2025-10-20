import React, { useState, useMemo } from 'react'
import { Tree, Card, Space, Typography, Tag, Tooltip, Input, Button } from 'antd'
import {
  PiCube,
  PiGear,
  PiStack,
  PiWarning,
  PiInfo,
  PiMagnifyingGlass,
  PiTreeStructure,
  PiPlus,
  PiMinus
} from 'react-icons/pi'
import { BomTreeNode } from '../../../types'

const { Text, Title } = Typography
const { Search } = Input

interface BomTreeViewProps {
  treeData: BomTreeNode[]
  loading?: boolean
  onNodeSelect?: (selectedKeys: React.Key[], info: any) => void
  className?: string
  'data-testid'?: string
}

const BomTreeView: React.FC<BomTreeViewProps> = ({
  treeData,
  loading = false,
  onNodeSelect,
  className = '',
  'data-testid': dataTestId = 'bom-tree-view'
}) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [autoExpandParent, setAutoExpandParent] = useState(true)
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([])

  // Helper function to get component type icon
  const getComponentTypeIcon = (type: string) => {
    switch (type) {
      case 'ASSEMBLY':
        return <PiCube className="gba:text-blue-500" />
      case 'MATERIAL':
        return <PiGear className="gba:text-green-500" />
      case 'PHANTOM':
        return <PiStack className="gba:text-purple-500" />
      case 'REFERENCE':
        return <PiInfo className="gba:text-gray-500" />
      case 'TOOL':
        return <PiWarning className="gba:text-orange-500" />
      case 'RESOURCE':
        return <PiTreeStructure className="gba:text-cyan-500" />
      default:
        return <PiGear className="gba:text-gray-400" />
    }
  }

  // Helper function to get component type color
  const getComponentTypeColor = (type: string) => {
    switch (type) {
      case 'ASSEMBLY':
        return 'blue'
      case 'MATERIAL':
        return 'green'
      case 'PHANTOM':
        return 'purple'
      case 'REFERENCE':
        return 'gray'
      case 'TOOL':
        return 'orange'
      case 'RESOURCE':
        return 'cyan'
      default:
        return 'default'
    }
  }

  // Generate tree data with search highlighting
  const generateTreeData = (data: BomTreeNode[]): any[] => {
    return data.map(node => {
      const isMatch =
        searchValue &&
        (node.title.toLowerCase().includes(searchValue.toLowerCase()) ||
          node.productNumber.toLowerCase().includes(searchValue.toLowerCase()))

      const title = (
        <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
            {getComponentTypeIcon(node.componentType)}
            <div className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Text strong={isMatch} className={isMatch ? 'gba:text-blue-600' : ''}>
                  {node.title}
                </Text>
                {node.isCritical && (
                  <Tag color="red" size="small">
                    Critical
                  </Tag>
                )}
                {node.isOptional && (
                  <Tag color="orange" size="small">
                    Optional
                  </Tag>
                )}
              </div>
              <div className="gba:flex gba:items-center gba:gap-4 gba:mt-1">
                <Text className="gba:text-sm gba:text-gray-500">{node.productNumber}</Text>
                <Text className="gba:text-sm gba:text-gray-500">
                  Qty: {node.quantity} {node.uom}
                </Text>
                {node.unitCost && (
                  <Text className="gba:text-sm gba:text-gray-500">Unit: €{node.unitCost.toFixed(2)}</Text>
                )}
              </div>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Tag color={getComponentTypeColor(node.componentType)} size="small">
              {node.componentType}
            </Tag>
            {node.totalCost && (
              <Text strong className="gba:text-green-600">
                €{node.totalCost.toFixed(2)}
              </Text>
            )}
          </div>
        </div>
      )

      return {
        key: node.key,
        title,
        children: node.children ? generateTreeData(node.children) : undefined,
        className: isMatch ? 'gba:bg-blue-50' : ''
      }
    })
  }

  // Get all keys for expansion
  const getAllKeys = (data: BomTreeNode[]): React.Key[] => {
    const keys: React.Key[] = []
    const traverse = (nodes: BomTreeNode[]) => {
      nodes.forEach(node => {
        keys.push(node.key)
        if (node.children) {
          traverse(node.children)
        }
      })
    }
    traverse(data)
    return keys
  }

  // Handle search
  const handleSearch = (value: string) => {
    setSearchValue(value)
    if (value) {
      // Auto-expand all nodes when searching
      setExpandedKeys(getAllKeys(treeData))
      setAutoExpandParent(true)
    } else {
      // Collapse all when clearing search
      setExpandedKeys([])
      setAutoExpandParent(false)
    }
  }

  // Handle expand/collapse all
  const handleExpandAll = () => {
    setExpandedKeys(getAllKeys(treeData))
    setAutoExpandParent(true)
  }

  const handleCollapseAll = () => {
    setExpandedKeys([])
    setAutoExpandParent(false)
  }

  // Handle tree events
  const handleExpand = (expandedKeysValue: React.Key[]) => {
    setExpandedKeys(expandedKeysValue)
    setAutoExpandParent(false)
  }

  const handleSelect = (selectedKeysValue: React.Key[], info: any) => {
    setSelectedKeys(selectedKeysValue)
    if (onNodeSelect) {
      onNodeSelect(selectedKeysValue, info)
    }
  }

  // Memoized tree data
  const memoizedTreeData = useMemo(() => generateTreeData(treeData), [treeData, searchValue])

  // Calculate total cost
  const totalCost = useMemo(() => {
    const calculateTotal = (nodes: BomTreeNode[]): number => {
      return nodes.reduce((sum, node) => {
        const nodeCost = node.totalCost || 0
        const childrenCost = node.children ? calculateTotal(node.children) : 0
        return sum + nodeCost + childrenCost
      }, 0)
    }
    return calculateTotal(treeData)
  }, [treeData])

  return (
    <Card
      className={`gba:h-full ${className}`}
      data-testid={dataTestId}
      title={
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiTreeStructure />
            <Title level={5} className="gba:m-0">
              BOM Structure
            </Title>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Text className="gba:text-sm gba:text-gray-500">Total Cost:</Text>
            <Text strong className="gba:text-green-600">
              €{totalCost.toFixed(2)}
            </Text>
          </div>
        </div>
      }
      extra={
        <Space>
          <Tooltip title="Expand All">
            <Button
              type="text"
              icon={<PiPlus />}
              onClick={handleExpandAll}
              size="small"
              data-testid="expand-all-button"
            />
          </Tooltip>
          <Tooltip title="Collapse All">
            <Button
              type="text"
              icon={<PiMinus />}
              onClick={handleCollapseAll}
              size="small"
              data-testid="collapse-all-button"
            />
          </Tooltip>
        </Space>
      }
      loading={loading}
    >
      {/* Search */}
      <div className="gba:mb-4">
        <Search
          placeholder="Search components..."
          value={searchValue}
          onChange={e => handleSearch(e.target.value)}
          prefix={<PiMagnifyingGlass />}
          allowClear
          data-testid="tree-search-input"
        />
      </div>

      {/* Tree */}
      <div className="gba:max-h-96 gba:overflow-auto">
        <Tree
          showLine={{ showLeafIcon: false }}
          showIcon={false}
          expandedKeys={expandedKeys}
          autoExpandParent={autoExpandParent}
          selectedKeys={selectedKeys}
          onExpand={handleExpand}
          onSelect={handleSelect}
          treeData={memoizedTreeData}
          className="gba:w-full"
          data-testid="bom-tree"
        />
      </div>

      {/* Legend */}
      <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-gray-200">
        <Text className="gba:text-sm gba:text-gray-500 gba:mb-2 gba:block">Component Types:</Text>
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <Tag color="blue" size="small">
            <PiCube className="gba:mr-1" />
            Assembly
          </Tag>
          <Tag color="green" size="small">
            <PiGear className="gba:mr-1" />
            Material
          </Tag>
          <Tag color="purple" size="small">
            <PiStack className="gba:mr-1" />
            Phantom
          </Tag>
          <Tag color="gray" size="small">
            <PiInfo className="gba:mr-1" />
            Reference
          </Tag>
          <Tag color="orange" size="small">
            <PiWarning className="gba:mr-1" />
            Tool
          </Tag>
          <Tag color="cyan" size="small">
            <PiTreeStructure className="gba:mr-1" />
            Resource
          </Tag>
        </div>
      </div>
    </Card>
  )
}

export default BomTreeView
