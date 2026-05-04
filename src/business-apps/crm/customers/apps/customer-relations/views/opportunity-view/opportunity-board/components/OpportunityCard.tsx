import { useState, useRef, useEffect } from 'react'
import { formatCurrency, formatDateShort } from '../lib/utils'
import type { Opportunity } from '../lib/types'
import { useKanbanStore } from '../lib/kanban-store'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Input, DatePicker } from 'antd'
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface OpportunityCardProps {
  opportunity: Opportunity
  onSaveQuickEdit?: (id: string, fields: Partial<Opportunity>) => void
  isQuickEditing?: boolean
}

export function OpportunityCard({ opportunity, onSaveQuickEdit, isQuickEditing = false }: OpportunityCardProps) {
  const { selectedOpportunity, selectOpportunity } = useKanbanStore()
  const [quickEditMode, setQuickEditMode] = useState(false)
  const [editFields, setEditFields] = useState<Partial<Opportunity>>({})
  const [loading, setLoading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: opportunity.id,
    data: {
      type: 'opportunity',
      opportunity
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1
  }

  const handleClick = (e: React.MouseEvent) => {
    if (quickEditMode) return
    selectOpportunity(opportunity.id)
  }

  const handleQuickEditToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!quickEditMode) {
      setEditFields({
        title: opportunity.title || opportunity.name,
        amount: opportunity.amount ?? opportunity.estimatedAmount,
        estimatedCloseDate: opportunity.estimatedCloseDate ?? opportunity.closeDate
      })
    }
    setQuickEditMode(prev => !prev)
  }

  const handleFieldChange = (field: keyof Opportunity, value: any) => {
    setEditFields(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await useKanbanStore.getState().quickUpdateOpportunity(opportunity.id, editFields)
      setQuickEditMode(false)
      setEditFields({})
      if (onSaveQuickEdit) {
        onSaveQuickEdit(opportunity.id, editFields)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setQuickEditMode(false)
    setEditFields({})
  }

  // Close quick edit on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && quickEditMode) {
        handleCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [quickEditMode])

  // Click outside to cancel quick edit
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) && quickEditMode) {
        handleCancel()
      }
    }
    if (quickEditMode) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [quickEditMode])

  const isSelected = selectedOpportunity?.id === opportunity.id

  const QuickEditTrigger = isQuickEditing ? (
    <button
      onClick={handleQuickEditToggle}
      className="gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:duration-200 gba:absolute gba:top-2 gba:right-2 gba:p-1 gba:rounded gba:bg-gray-100 gba:hover:bg-blue-100 gba:text-gray-500 gba:hover:text-blue-600 gba:dark:bg-gray-700 gba:dark:hover:bg-blue-900 gba:dark:text-gray-400 gba:z-20"
      title="Quick Edit"
      data-testid="quick-edit-trigger"
    >
      {quickEditMode ? (
        <CloseOutlined className="gba:w-3.5 gba:h-3.5" />
      ) : (
        <EditOutlined className="gba:w-3.5 gba:h-3.5" />
      )}
    </button>
  ) : null

  const QuickEditOverlay = quickEditMode ? (
    <div className="gba:fixed gba:inset-0 gba:bg-black/10 gba:z-40" />
  ) : null

  const QuickEditForm = quickEditMode ? (
    <div className="gba:absolute gba:inset-0 gba:bg-white gba:dark:bg-gray-800 gba:z-50 gba:rounded gba:p-3 gba:shadow-lg gba:border gba:border-blue-200 gba:dark:border-blue-700">
      <div className="gba:space-y-2">
        <div>
          <label className="gba:block gba:text-xs gba:font-medium gba:mb-0.5 gba:text-gray-600 gba:dark:text-gray-400">
            Title
          </label>
          <Input
            size="small"
            value={editFields.title || ''}
            onChange={e => handleFieldChange('title', e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="Opportunity title"
            className="gba:text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="gba:block gba:text-xs gba:font-medium gba:mb-0.5 gba:text-gray-600 gba:dark:text-gray-400">
            Amount
          </label>
          <Input
            size="small"
            type="number"
            value={editFields.amount || ''}
            onChange={e => handleFieldChange('amount', Number(e.target.value))}
            onClick={e => e.stopPropagation()}
            placeholder="Amount"
            prefix="$"
            className="gba:text-sm"
          />
        </div>
        <div>
          <label className="gba:block gba:text-xs gba:font-medium gba:mb-0.5 gba:text-gray-600 gba:dark:text-gray-400">
            Close Date
          </label>
          <DatePicker
            size="small"
            value={editFields.estimatedCloseDate ? dayjs(editFields.estimatedCloseDate) : null}
            onChange={(date: Dayjs | null) => handleFieldChange('estimatedCloseDate', date?.toISOString())}
            onClick={e => e.stopPropagation()}
            placeholder="Select date"
            className="gba:w-full gba:text-sm"
          />
        </div>
        <div className="gba:flex gba:gap-2 gba:pt-1">
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={e => { e.stopPropagation(); handleSave() }}
            loading={loading}
            className="gba:flex-1"
          >
            Save
          </Button>
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={e => { e.stopPropagation(); handleCancel(e) }}
            className="gba:flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        if (cardRef) {
          (cardRef as any).current = node
        }
      }}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`gba:group gba:cursor-pointer gba:bg-white gba:dark:bg-gray-800 gba:p-3 gba:rounded-lg gba:shadow-sm gba:border gba:transition-all gba:duration-200 gba:relative ${
        isSelected
          ? 'gba:border-blue-500 gba:ring-2 gba:ring-blue-200 gba:dark:ring-blue-800 gba:shadow-md'
          : 'gba:border-gray-100 gba:dark:border-gray-700 hover:gba:border-gray-200 gba:dark:hover:border-gray-600 hover:gba:shadow-md'
      }`}
    >
      {QuickEditTrigger}

      {/* Quick Edit Form Overlay */}
      {quickEditMode && QuickEditOverlay}
      {quickEditMode && QuickEditForm}

      {/* Normal View */}
      {!quickEditMode && (
        <>
          <div className="gba:flex gba:items-start gba:justify-between gba:mb-1">
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-900 gba:dark:text-white gba:leading-tight gba:pr-6">
              {opportunity.title || opportunity.name}
            </h4>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
            {opportunity.owner && (
              <div className="gba:w-5 gba:h-5 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium gba:text-white gba:overflow-hidden gba:flex-shrink-0 gba:shadow-sm gba:bg-blue-500">
                {getInitials(opportunity.owner)}
              </div>
            )}
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
              <span>{opportunity.owner}</span>
              {opportunity.account && (
                <>
                  <span className="gba:text-gray-300 gba:dark:text-gray-600">·</span>
                  <span className="gba:truncate gba:max-w-[100px]">{opportunity.account}</span>
                </>
              )}
            </div>
          </div>

          <div className="gba:flex gba:items-center gba:justify-between gba:mt-2">
            <div className="gba:text-sm gba:font-medium gba:text-gray-900 gba:dark:text-white">
              {formatCurrency(opportunity.amount ?? opportunity.estimatedAmount)}
            </div>
            {(opportunity.estimatedCloseDate ?? opportunity.closeDate) && (
              <div className="gba:text-xs gba:text-gray-400 gba:dark:text-gray-500">
                {formatDateShort(opportunity.estimatedCloseDate ?? opportunity.closeDate)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default OpportunityCard
