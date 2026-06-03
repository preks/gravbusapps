import React, { useState, useMemo } from 'react'
import { Form, Pagination } from 'antd'
import PlanCard from './PlanCard'
import SearchBarWithLabel from './SearchBarWithLabel'
import { useExpenseRequestCreationTranslation } from '../../expense-request-creation/useExpenseRequestCreationTranslation'
import { PLANS_PER_PAGE } from '../constants/constants'

interface PlanFormContentProps {
  form: any
  planData: Array<{
    id: string
    planType: string
    title: string
    creationDate: string
    tripStart?: string
    tripEnd?: string
    tripInterval?: string
    paymentAmount?: string | number
    paymentCurrency?: string
    planAmount: string | number
    planCurrency: string
  }>
  onPlanSelect?: (plan: any) => void
  isSelectedPlan?: boolean
}

/**
 * Plan Form Content component that displays a list of plan cards with pagination and search
 */
const PlanFormContent: React.FC<PlanFormContentProps> = ({ form, planData, onPlanSelect, isSelectedPlan = false }) => {
  const { t } = useExpenseRequestCreationTranslation()
  const [searchTerm, setSearchTerm] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const plansPerPage = PLANS_PER_PAGE

  const filteredPlans = useMemo(() => {
    if (!searchTerm) return planData

    return planData.filter(plan => {
      const searchTermLower = searchTerm.toLowerCase()

      return (
        plan.title?.toLowerCase().includes(searchTermLower) ||
        plan.planType?.toLowerCase().includes(searchTermLower) ||
        plan.creationDate?.toLowerCase().includes(searchTermLower) ||
        plan.tripInterval?.toLowerCase().includes(searchTermLower) ||
        String(plan.planAmount).toLowerCase().includes(searchTermLower) ||
        plan.planCurrency?.toLowerCase().includes(searchTermLower) ||
        String(plan.paymentAmount).toLowerCase().includes(searchTermLower) ||
        plan.paymentCurrency?.toLowerCase().includes(searchTermLower)
      )
    })
  }, [planData, searchTerm])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const indexOfLastPlan = currentPage * plansPerPage
  const indexOfFirstPlan = indexOfLastPlan - plansPerPage
  const currentPlans = filteredPlans.slice(indexOfFirstPlan, indexOfLastPlan)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  return (
    <div
      className={`${isSelectedPlan ? '' : ''}`}
      style={{ margin: isSelectedPlan ? '0' : '0' }}
      data-testid="plan-form-container"
    >
      <Form
        form={form}
        layout="vertical"
        className={`${isSelectedPlan ? '' : 'gba:flex gba:flex-col gba:flex-grow'}`}
        data-testid="plan-form"
      >
        {/* Search bar - only show if not displaying a selected plan */}
        {!isSelectedPlan && (
          <div
            style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '46px' }}
            data-testid="plan-search-container"
          >
            <SearchBarWithLabel
              onSearch={handleSearch}
              placeholder={t('search-module-placeholder')}
              label={t('plan-select-button', { count: filteredPlans.length })}
            />
          </div>
        )}

        {/* Plan cards list */}
        <div
          className={`${isSelectedPlan ? '' : ''}`}
          style={{
            borderTop: isSelectedPlan ? 'none' : '2px solid muted',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 10px)',
            backgroundColor: isSelectedPlan ? 'transparent' : 'muted',
            borderRadius: '4px'
          }}
          data-testid="plan-cards-container"
        >
          {currentPlans.length > 0 ? (
            currentPlans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selectable={!isSelectedPlan}
                onClick={onPlanSelect ? () => onPlanSelect(plan) : undefined}
              />
            ))
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '24px',
                color: 'muted-foreground',
                fontSize: '14px',
                backgroundColor: 'background',
                borderRadius: '4px',
                boxShadow: '0 2px 2px rgba(0, 0, 0, 0.05)'
              }}
              data-testid="plan-no-results"
            >
              {t('no-plans-found-search')}
            </div>
          )}

          {/* Pagination - only show if not displaying a selected plan */}
          {!isSelectedPlan && filteredPlans.length > plansPerPage && (
            <div
              style={{ display: 'flex', justifyContent: 'center', padding: '8px 0px' }}
              data-testid="plan-pagination-container"
            >
              <Pagination
                current={currentPage}
                onChange={handlePageChange}
                total={filteredPlans.length}
                pageSize={plansPerPage}
                showSizeChanger={false}
                data-testid="plan-pagination"
              />
            </div>
          )}
        </div>
      </Form>
    </div>
  )
}

export default PlanFormContent
