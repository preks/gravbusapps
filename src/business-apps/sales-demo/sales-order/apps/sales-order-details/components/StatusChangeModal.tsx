import React, { useState } from 'react'
import { Modal, Select, Steps, Button, Typography, Space, message } from 'antd'
import { CheckCircleIcon, ClockIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useStatusChange } from '../hooks/useStatusChange'

const { Title, Text } = Typography
const { Option } = Select

// Sales Order Status definitions with logical order and descriptions
const SALES_ORDER_STATUSES = [
  {
    key: 'DRAFT',
    label: 'Draft',
    description: 'The order is being created and not yet confirmed',
    icon: <ClockIcon size={16} />
  },
  {
    key: 'OPEN',
    label: 'Open',
    description: 'The order has been saved but is still pending confirmation or approval',
    icon: <ClockIcon size={16} />
  },
  {
    key: 'CONFIRMED',
    label: 'Confirmed',
    description: 'The order is confirmed/accepted and ready to be processed',
    icon: <CheckCircleIcon size={16} />
  },
  {
    key: 'PARTIALLY_SHIPPED',
    label: 'Partially Shipped',
    description: 'Some items have shipped; others are pending',
    icon: <ClockIcon size={16} />
  },
  {
    key: 'SHIPPED',
    label: 'Shipped',
    description: 'All items have been shipped',
    icon: <CheckCircleIcon size={16} />
  },
  {
    key: 'INVOICED',
    label: 'Invoiced',
    description: 'Invoice has been issued',
    icon: <CheckCircleIcon size={16} />
  },
  {
    key: 'CLOSED',
    label: 'Closed',
    description: 'Order is fulfilled and finalized',
    icon: <CheckCircleIcon size={16} />
  },
  {
    key: 'CANCELLED',
    label: 'Cancelled',
    description: 'Order was cancelled before fulfillment',
    icon: <WarningCircleIcon size={16} />
  },
  {
    key: 'ON_HOLD',
    label: 'On Hold',
    description: 'Order is paused for review, issue, or approval',
    icon: <WarningCircleIcon size={16} />
  },
  {
    key: 'REJECTED',
    label: 'Rejected',
    description: 'Order was explicitly rejected',
    icon: <WarningCircleIcon size={16} />
  },
  {
    key: 'RETURNED',
    label: 'Returned',
    description: 'Order was returned (after shipping or invoicing)',
    icon: <WarningCircleIcon size={16} />
  }
]

// Line Item Status definitions with logical order and descriptions
const LINE_ITEM_STATUSES = [
  {
    key: 'NEW',
    label: 'New',
    description: 'Line item was just created; no action taken',
    icon: <ClockIcon size={16} />
  },
  {
    key: 'PLANNED',
    label: 'Planned',
    description: 'Line item is scheduled for processing/shipment',
    icon: <ClockIcon size={16} />
  },
  {
    key: 'BACKORDERED',
    label: 'Backordered',
    description: 'Not enough stock available for this line',
    icon: <WarningCircleIcon size={16} />
  },
  {
    key: 'PARTIALLY_SHIPPED',
    label: 'Partially Shipped',
    description: 'Some quantity shipped, rest still pending',
    icon: <ClockIcon size={16} />
  },
  {
    key: 'SHIPPED',
    label: 'Shipped',
    description: 'Fully shipped',
    icon: <CheckCircleIcon size={16} />
  },
  {
    key: 'PARTIALLY_INVOICED',
    label: 'Partially Invoiced',
    description: 'Partially invoiced (e.g., for partial shipment)',
    icon: <ClockIcon size={16} />
  },
  {
    key: 'INVOICED',
    label: 'Invoiced',
    description: 'Fully invoiced',
    icon: <CheckCircleIcon size={16} />
  },
  {
    key: 'DELIVERED',
    label: 'Delivered',
    description: 'Delivered to the customer',
    icon: <CheckCircleIcon size={16} />
  },
  {
    key: 'CANCELLED',
    label: 'Cancelled',
    description: 'Line item was cancelled before processing',
    icon: <WarningCircleIcon size={16} />
  },
  {
    key: 'RETURNED',
    label: 'Returned',
    description: 'Customer returned this line item',
    icon: <WarningCircleIcon size={16} />
  },
  {
    key: 'ON_HOLD',
    label: 'On Hold',
    description: 'Manually paused — e.g., pricing issue or approval needed',
    icon: <WarningCircleIcon size={16} />
  }
]

interface StatusChangeModalProps {
  visible: boolean
  type: 'order' | 'lineItem'
  currentStatus: string
  orderId: string
  lineItemId?: string // Required when type is 'lineItem'
  accessToken: string
  onCancel: () => void
  onSuccess: () => void
}

const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  visible,
  type,
  currentStatus,
  orderId,
  lineItemId,
  accessToken,
  onCancel,
  onSuccess
}) => {
  // Update selected status when modal opens with new current status
  React.useEffect(() => {
    if (visible) {
      setSelectedStatus(currentStatus)
    }
  }, [visible, currentStatus])

  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus)

  // Get the appropriate status definitions based on type
  const statusDefinitions = type === 'lineItem' ? LINE_ITEM_STATUSES : SALES_ORDER_STATUSES
  const { updateStatus, loading } = useStatusChange({
    accessToken,
    type,
    orderId,
    lineItemId,
    onSuccess: () => {
      message.success(`${type === 'lineItem' ? 'Line item' : 'Order'} status updated successfully`)
      onSuccess()
      onCancel()
    }
  })

  const handleConfirm = async () => {
    if (selectedStatus === currentStatus) {
      message.info('No changes made')
      onCancel()
      return
    }

    try {
      await updateStatus(selectedStatus)
    } catch (error) {
      message.error('Failed to update status')
    }
  }

  // Define the logical order of statuses for progression
  const getLogicalStatusOrder = (statusType: 'order' | 'lineItem') => {
    if (statusType === 'lineItem') {
      return [
        'NEW',
        'PLANNED',
        'BACKORDERED',
        'PARTIALLY_SHIPPED',
        'SHIPPED',
        'PARTIALLY_INVOICED',
        'INVOICED',
        'DELIVERED'
      ]
    }

    // Order statuses
    return [
      'DRAFT',
      'OPEN',
      'CONFIRMED',
      'RELEASED', // Add RELEASED as it's used in the existing code
      'PARTIALLY_SHIPPED',
      'SHIPPED',
      'INVOICED',
      'CLOSED'
    ]
  }

  // Normalize status for comparison (handle different formats)
  const normalizeStatus = (status: string, statusType: 'order' | 'lineItem'): string => {
    if (!status) return ''

    const normalized = status.toUpperCase().trim()

    if (statusType === 'lineItem') {
      // Handle line item status mappings
      const lineItemMappings: { [key: string]: string } = {
        NEW: 'NEW',
        PLANNED: 'PLANNED',
        BACKORDERED: 'BACKORDERED',
        PARTIALLY_SHIPPED: 'PARTIALLY_SHIPPED',
        PARTIAL: 'PARTIALLY_SHIPPED',
        SHIPPED: 'SHIPPED',
        PARTIALLY_INVOICED: 'PARTIALLY_INVOICED',
        INVOICED: 'INVOICED',
        DELIVERED: 'DELIVERED',
        CANCELLED: 'CANCELLED',
        RETURNED: 'RETURNED',
        ON_HOLD: 'ON_HOLD'
      }
      return lineItemMappings[normalized] || normalized
    }

    // Handle order status mappings
    const orderMappings: { [key: string]: string } = {
      CONFIRMED: 'CONFIRMED',
      RELEASED: 'CONFIRMED', // Map RELEASED to CONFIRMED for timeline purposes
      DRAFT: 'DRAFT',
      OPEN: 'OPEN',
      PARTIALLY_SHIPPED: 'PARTIALLY_SHIPPED',
      PARTIAL: 'PARTIALLY_SHIPPED',
      SHIPPED: 'SHIPPED',
      INVOICED: 'INVOICED',
      CLOSED: 'CLOSED',
      CANCELLED: 'CANCELLED',
      ON_HOLD: 'ON_HOLD',
      REJECTED: 'REJECTED',
      RETURNED: 'RETURNED'
    }

    return orderMappings[normalized] || normalized
  }

  const getLogicalStepStatus = (status: string, currentStatus: string): 'finish' | 'process' | 'wait' => {
    const logicalOrder = getLogicalStatusOrder(type)
    const normalizedCurrentStatus = normalizeStatus(currentStatus, type)
    const normalizedStepStatus = normalizeStatus(status, type)

    const currentLogicalIndex = logicalOrder.indexOf(normalizedCurrentStatus)
    const stepLogicalIndex = logicalOrder.indexOf(normalizedStepStatus)

    // For statuses not in the main flow (CANCELLED, ON_HOLD, REJECTED, RETURNED)
    if (stepLogicalIndex === -1) {
      return normalizedStepStatus === normalizedCurrentStatus ? 'process' : 'wait'
    }

    // For statuses in the main flow
    if (currentLogicalIndex === -1) {
      return normalizedStepStatus === normalizedCurrentStatus ? 'process' : 'wait'
    }

    if (stepLogicalIndex < currentLogicalIndex) {
      return 'finish'
    } else if (stepLogicalIndex === currentLogicalIndex) {
      return 'process'
    } else {
      return 'wait'
    }
  }

  const modalTitle = type === 'lineItem' ? 'Change Line Item Status' : 'Change Order Status'

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel} data-testid="status-modal-cancel">
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={loading}
          onClick={handleConfirm}
          data-testid="status-modal-confirm"
        >
          Confirm
        </Button>
      ]}
      data-testid="status-change-modal"
    >
      <div className="gba:space-y-6">
        {/* Status Dropdown */}
        <div data-testid="status-dropdown-section">
          <Title level={4} className="gba:mb-3">
            Select New Status
          </Title>
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: '100%' }}
            size="large"
            data-testid="status-select"
          >
            {statusDefinitions.map(status => (
              <Option key={status.key} value={status.key}>
                <Space>
                  {status.icon}
                  <span>{status.label}</span>
                </Space>
              </Option>
            ))}
          </Select>
        </div>

        {/* Status Timeline */}
        <div data-testid="status-timeline-section">
          <Title level={4} className="gba:mb-3">
            Status Timeline
          </Title>
          <Steps
            direction="vertical"
            size="small"
            current={-1} // Don't use current prop, rely on individual step status
            data-testid="status-timeline"
          >
            {statusDefinitions.map(status => {
              const stepStatus = getLogicalStepStatus(status.key, currentStatus)
              const isCurrentStatus = status.key.toUpperCase() === currentStatus.toUpperCase()

              return (
                <Steps.Step
                  key={status.key}
                  status={stepStatus}
                  title={
                    <Space>
                      {status.icon}
                      <Text strong={isCurrentStatus}>{status.label}</Text>
                    </Space>
                  }
                  description={
                    <Text type={isCurrentStatus ? 'default' : 'secondary'} className="gba:text-sm">
                      {status.description}
                    </Text>
                  }
                />
              )
            })}
          </Steps>
        </div>
      </div>
    </Modal>
  )
}

export default StatusChangeModal
