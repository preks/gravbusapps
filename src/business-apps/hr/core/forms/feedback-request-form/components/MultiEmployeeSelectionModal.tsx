import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface MultiEmployeeOption {
  id: string
  name: string
  jobTitle?: string
  department?: string
  pictureThumbnail?: string
  userId?: string
}

interface MultiEmployeeSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: MultiEmployeeOption[]
  loading?: boolean
  error?: string | null
  onSearch?: (term: string) => void
  initialSelectedIds?: string[]
  onConfirm: (selectedIds: string[], selectedEmployees: MultiEmployeeOption[]) => void
  maxSelection?: number
  selectionCountLabel?: string | ((count: number, maxSelection?: number) => string)
}

const prefixDataTestId = 'MultiEmployeeSelectionModal'

const MultiEmployeeSelectionModal: React.FC<MultiEmployeeSelectionModalProps> = ({
  open,
  onOpenChange,
  employees,
  loading,
  error,
  onSearch,
  initialSelectedIds = [],
  onConfirm,
  maxSelection,
  selectionCountLabel
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds))
  const [knownEmployees, setKnownEmployees] = useState<Map<string, MultiEmployeeOption>>(new Map())

  useEffect(() => {
    setSelectedIds(new Set(initialSelectedIds))
  }, [initialSelectedIds, open])

  // Accumulate employees across searches for stable resolution on confirm
  useEffect(() => {
    if (employees && employees.length > 0) {
      setKnownEmployees(prev => {
        const next = new Map(prev)
        employees.forEach(emp => next.set(emp.id, emp))
        return next
      })
    }
  }, [employees])

  useEffect(() => {
    if (onSearch) {
      const t = setTimeout(() => onSearch(searchTerm), 300)
      return () => clearTimeout(t)
    }
  }, [searchTerm])

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (maxSelection != null && next.size >= maxSelection) return prev
        next.add(id)
      }
      return next
    })
  }

  const isMaxReached = maxSelection != null && selectedIds.size >= maxSelection
  const resolvedSelectionCountLabel = useMemo(() => {
    if (typeof selectionCountLabel === 'function') {
      return selectionCountLabel(selectedIds.size, maxSelection)
    }
    if (selectionCountLabel) {
      return selectionCountLabel
    }
    if (maxSelection != null) {
      return `${selectedIds.size} of ${maxSelection} selected`
    }
    return null
  }, [selectionCountLabel, selectedIds.size, maxSelection])

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return employees
    const q = searchTerm.toLowerCase()
    return employees.filter(e => [e.name, e.jobTitle, e.department].some(v => (v || '').toLowerCase().includes(q)))
  }, [employees, searchTerm])

  const handleConfirm = () => {
    const ids = Array.from(selectedIds)
    const selectedEmployees = ids.map(id => knownEmployees.get(id)).filter((e): e is MultiEmployeeOption => Boolean(e))
    onConfirm(ids, selectedEmployees)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:w-full gba:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_request_form.selectEmployees', 'Select Employees')}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {error && (
            <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'Error')}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:feedback_request_form.searchEmployees', 'Search')}
            data-testid={formatDataTestId(prefixDataTestId, 'SearchInput')}
          />

          {resolvedSelectionCountLabel && (
            <div className="gba:text-sm gba:text-muted-foreground">{resolvedSelectionCountLabel}</div>
          )}

          <div className="gba:max-h-[60vh] gba:overflow-y-auto gba:space-y-2">
            {loading && employees.length === 0 ? (
              <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-8">
                {getTranslationFromI18nKeyAndLabel('common.loading', 'Loading...')}
              </div>
            ) : filtered.length === 0 ? (
              <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-8">
                {getTranslationFromI18nKeyAndLabel('common.noResults', 'No results found')}
              </div>
            ) : (
              filtered.map(emp => {
                const selected = selectedIds.has(emp.id)
                const disabled = !selected && isMaxReached
                const initials = (emp.name || '?')
                  .split(' ')
                  .map((p: string) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggleId(emp.id)}
                    disabled={disabled}
                    className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-4 gba:rounded-lg gba:border gba:transition-all ${
                      selected
                        ? 'gba:bg-accent gba:border-accent'
                        : disabled
                          ? 'gba:opacity-50 gba:cursor-not-allowed'
                          : 'gba:hover:bg-muted'
                    }`}
                    data-testid={formatDataTestId(prefixDataTestId, `Row-${emp.id}`)}
                  >
                    <Avatar>
                      {emp.pictureThumbnail ? (
                        <AvatarImage src={`data:image/jpeg;base64,${emp.pictureThumbnail}`} alt={emp.name} />
                      ) : (
                        <AvatarFallback>{initials}</AvatarFallback>
                      )}
                    </Avatar>

                    <div className="gba:flex-1 gba:min-w-0 gba:text-left">
                      <div className="gba:text-sm gba:font-medium gba:truncate">{emp.name}</div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:flex-wrap gba:gap-2">
                        {emp.jobTitle && <span>{emp.jobTitle}</span>}
                        {emp.department && <span>· {emp.department}</span>}
                      </div>
                    </div>

                    <div
                      className={`gba:w-5 gba:h-5 gba:rounded gba:border gba:flex gba:items-center gba:justify-center ${
                        selected ? 'gba:bg-primary gba:text-primary-foreground' : ''
                      }`}
                    >
                      {selected ? '✓' : ''}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
            >
              {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleConfirm} data-testid={formatDataTestId(prefixDataTestId, 'ConfirmButton')}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_request_form.apply', 'Apply')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MultiEmployeeSelectionModal
