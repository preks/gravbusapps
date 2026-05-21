import { useMemo, useState } from 'react'
import { Button, Checkbox, Input } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'

const PAGE_SIZE = 20

interface CompanyOption {
  id: string
  name: string
}

interface CompanyFilterGroupProps {
  companies: CompanyOption[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  searchPlaceholder: string
  previousLabel: string
  nextLabel: string
  ofLabel: string
  emptyLabel: string
}

export function CompanyFilterGroup({
  companies,
  selectedIds,
  onSelectedIdsChange,
  searchPlaceholder,
  previousLabel,
  nextLabel,
  ofLabel,
  emptyLabel
}: Readonly<CompanyFilterGroupProps>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const normalizedQuery = query.trim().toLowerCase()
  const filteredCompanies = useMemo(() => {
    if (!normalizedQuery) {
      return companies
    }

    return companies.filter(company => company.name.toLowerCase().includes(normalizedQuery))
  }, [companies, normalizedQuery])

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)

  const pagedCompanies = useMemo(() => {
    const start = safePage * PAGE_SIZE
    return filteredCompanies.slice(start, start + PAGE_SIZE)
  }, [filteredCompanies, safePage])

  const rangeStart = filteredCompanies.length === 0 ? 0 : safePage * PAGE_SIZE + 1
  const rangeEnd = Math.min((safePage + 1) * PAGE_SIZE, filteredCompanies.length)

  const toggleCompanySelection = (companyId: string, checked: boolean) => {
    if (checked) {
      if (!selectedIds.includes(companyId)) {
        onSelectedIdsChange([...selectedIds, companyId])
      }
      return
    }

    onSelectedIdsChange(selectedIds.filter(id => id !== companyId))
  }

  const handleSearchChange = (value: string) => {
    setQuery(value)
    setPage(0)
  }

  return (
    <div className="gba:w-full">
      <div className="gba:relative gba:my-1">
        <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground gba:pointer-events-none" />
        <Input
          placeholder={searchPlaceholder}
          value={query}
          onChange={event => handleSearchChange(event.target.value)}
          className="gba:h-10 gba:pl-9"
        />
      </div>

      {pagedCompanies.length === 0 ? (
        <div className="gba:px-3 gba:py-4 gba:text-sm gba:text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="gba:py-2">
          {pagedCompanies.map(company =>
            (() => {
              const checkboxId = `company-filter-option-${company.id}`
              return (
                <label
                  key={company.id}
                  htmlFor={checkboxId}
                  className="gba:flex gba:w-full gba:items-start gba:min-h-10 gba:px-3 gba:py-2 gba:transition-none gba:border gba:border-transparent gba:cursor-pointer gba:select-none gba:hover:bg-accent gba:rounded-sm gba:has-[:focus-visible]:border-ring gba:has-[:focus-visible]:ring-ring/50 gba:has-[:focus-visible]:ring-[3px] gba:has-[:focus-visible]:ring-inset"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={selectedIds.includes(company.id)}
                    onCheckedChange={checked => toggleCompanySelection(company.id, checked === true)}
                    className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:transition-none gba:focus-visible:ring-0 gba:self-start gba:mt-0.5 gba:translate-y-0"
                  />
                  <div className="gba:flex gba:items-start gba:justify-between gba:flex-1 gba:min-w-0 gba:ml-3">
                    <span className="gba:block gba:text-sm gba:font-medium gba:whitespace-normal gba:[overflow-wrap:anywhere]">
                      {company.name}
                    </span>
                  </div>
                </label>
              )
            })()
          )}
        </div>
      )}

      {filteredCompanies.length > PAGE_SIZE ? (
        <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:h-14 gba:px-2">
          <span className="gba:text-xs gba:text-muted-foreground">
            {rangeStart} - {rangeEnd} {ofLabel} {filteredCompanies.length}
          </span>
          <div className="gba:flex gba:items-center gba:gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(current => Math.max(0, current - 1))}
              disabled={safePage === 0}
              className="gba:h-9 gba:px-3"
            >
              {previousLabel}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(current => Math.min(totalPages - 1, current + 1))}
              disabled={safePage >= totalPages - 1}
              className="gba:h-9 gba:px-3"
            >
              {nextLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
