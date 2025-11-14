import React from 'react'
import { Typography, Space } from 'antd'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface FiltersBarProps {
  active: { expense: boolean; plan: boolean; request: boolean }
  toggle: (type: 'expense' | 'plan' | 'request') => void
}

const FiltersBar: React.FC<FiltersBarProps> = ({ active, toggle }) => {
  return (
    <div
      data-testid="expense-calendar-wrapper"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        marginTop: '8px',
        padding: '0 8px'
      }}
    >
      <Typography.Title level={3} style={{ margin: 0 }} data-testid="expense-calendar-title">
        {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_calendar', 'Expense Calendar')}
      </Typography.Title>
      <Space direction="horizontal" wrap>
        <Space
          data-testid="filter-items"
          align="center"
          onClick={() => toggle('expense')}
          style={{ cursor: 'pointer', opacity: active.expense ? 1 : 0.5, padding: '4px 8px', borderRadius: '4px' }}
        >
          <div
            className="gba:w-[14px] gba:h-[14px] gba:bg-muted gba:border gba:border-border gba:rounded-sm"
            data-testid="filter-items-color"
          />
          <Typography.Text data-testid="filter-items-label">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.items', 'Items')}
          </Typography.Text>
        </Space>
        <Space
          data-testid="filter-plan"
          align="center"
          onClick={() => toggle('plan')}
          style={{ cursor: 'pointer', opacity: active.plan ? 1 : 0.5, padding: '4px 8px', borderRadius: '4px' }}
        >
          <div
            className="gba:w-[14px] gba:h-[14px] gba:bg-info-secondary gba:border gba:border-border gba:rounded-sm"
            data-testid="filter-plan-color"
          />
          <Typography.Text data-testid="filter-plan-label">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plans', 'Plans')}
          </Typography.Text>
        </Space>
        <Space
          data-testid="filter-request"
          align="center"
          onClick={() => toggle('request')}
          style={{ cursor: 'pointer', opacity: active.request ? 1 : 0.5, padding: '4px 8px', borderRadius: '4px' }}
        >
          <div
            className="gba:w-[14px] gba:h-[14px] gba:bg-success-secondary gba:border gba:border-border gba:rounded-sm"
            data-testid="filter-request-color"
          />
          <Typography.Text data-testid="filter-request-label">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.requests', 'Requests')}
          </Typography.Text>
        </Space>
      </Space>
    </div>
  )
}

export default FiltersBar
