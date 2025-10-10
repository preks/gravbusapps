import React from 'react'
import { Row, Col } from 'antd'

interface ExpenseItemRowProps {
  id: string
  leftPrimary: React.ReactNode
  leftSecondary?: React.ReactNode
  rightPrimary?: React.ReactNode
  rightSecondary: React.ReactNode
}

/**
 * ExpenseItemRow component for displaying items in a two-column layout
 * @param id - Unique identifier for the row
 * @param leftPrimary - Primary content for the left column (top)
 * @param leftSecondary - Secondary content for the left column (bottom)
 * @param rightPrimary - Primary content for the right column (top)
 * @param rightSecondary - Secondary content for the right column (bottom)
 */
const ExpenseItemRow: React.FC<ExpenseItemRowProps> = ({
  id,
  leftPrimary,
  leftSecondary,
  rightPrimary,
  rightSecondary
}) => {
  return (
    <div className="gba:expense-item-row gba:p-4" data-testid={`expense-item-row-${id}`}>
      <Row gutter={[24, 0]}>
        <Col xs={24} md={12} className="gba:text-left">
          <div className="gba:flex gba:flex-col">
            <span className="gba:font-bold" data-testid={`expense-item-left-primary-${id}`}>
              {leftPrimary}
            </span>
            {leftSecondary && <span data-testid={`expense-item-left-secondary-${id}`}>{leftSecondary}</span>}
          </div>
        </Col>
        <Col xs={24} md={12} className="gba:text-right">
          <div className="gba:flex gba:flex-col gba:items-end">
            {rightPrimary ? (
              <span data-testid={`expense-item-right-primary-${id}`}>{rightPrimary}</span>
            ) : (
              <span className="gba:invisible">placeholder</span>
            )}
            <span className="gba:font-bold" data-testid={`expense-item-right-secondary-${id}`}>
              {rightSecondary}
            </span>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default ExpenseItemRow
