'use client'

import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { CalendarBlankIcon, CaretDownIcon } from '@phosphor-icons/react'
import { FilterBar } from '../components/CompactFilterBar'

interface FeedbackToolbarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterType: string
  onFilterChange: (value: string) => void
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  senderFilter: string
  onSenderFilterChange: (value: string) => void
  senderOptions: string[]
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  typeOptions: string[]
  searchPlaceholder: string
  allLabel: string
  privateLabel: string
  publicLabel: string
  dateFromLabel: string
  dateToLabel: string
  allDatesLabel: string
  senderLabel: string
  typeLabel: string
  clearLabel: string
  onClearFilters: () => void
  showSenderFilter?: boolean
}

const FeedbackToolbar: React.FC<FeedbackToolbarProps> = ({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  senderFilter,
  onSenderFilterChange,
  senderOptions,
  typeFilter,
  onTypeFilterChange,
  typeOptions,
  searchPlaceholder,
  allLabel,
  privateLabel,
  publicLabel,
  dateFromLabel,
  dateToLabel,
  allDatesLabel,
  senderLabel,
  typeLabel,
  clearLabel,
  onClearFilters,
  showSenderFilter = true
}) => {
  const dateLabel = ((): string => {
    if (dateFrom && dateTo) return `${dateFrom} - ${dateTo}`
    if (dateFrom) return `${dateFrom} - ...`
    if (dateTo) return `... - ${dateTo}`
    return allDatesLabel
  })()

  return (
    <FilterBar
      dataTestId="feedback-hub-filters-card"
      className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:p-1.5"
      controlsClassName="gba:gap-1.5"
      search={{
        value: searchTerm,
        onChange: onSearchChange,
        placeholder: searchPlaceholder,
        minWidthClassName: 'gba:min-w-[260px] gba:flex-1',
        'data-testid': 'feedback-search-input'
      }}
      clear={{ label: clearLabel, onClick: onClearFilters, 'data-testid': 'feedback-clear-filters' }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="gba:h-9 gba:px-3 gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:hover:bg-accent gba:text-sm"
            data-testid="feedback-date-filter-trigger"
          >
            <CalendarBlankIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <span>{dateLabel}</span>
            <CaretDownIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="gba:w-72 gba:p-3 gba:space-y-3">
          <div className="gba:space-y-1">
            <label
              htmlFor="feedback-date-from"
              className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:block"
            >
              {dateFromLabel}
            </label>
            <Input
              id="feedback-date-from"
              type="date"
              value={dateFrom}
              onChange={e => onDateFromChange(e.target.value)}
            />
          </div>
          <div className="gba:space-y-1">
            <label
              htmlFor="feedback-date-to"
              className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:block"
            >
              {dateToLabel}
            </label>
            <Input id="feedback-date-to" type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Select value={typeFilter} onValueChange={onTypeFilterChange}>
        <SelectTrigger>
          <SelectValue placeholder={typeLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{typeLabel}</SelectItem>
          {typeOptions.map(type => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterType} onValueChange={onFilterChange} data-testid="feedback-filter-select">
        <SelectTrigger>
          <SelectValue placeholder={`${publicLabel} • ${privateLabel}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          <SelectItem value="private">{privateLabel}</SelectItem>
          <SelectItem value="public">{publicLabel}</SelectItem>
        </SelectContent>
      </Select>

      {showSenderFilter && senderOptions.length > 0 && (
        <Select value={senderFilter} onValueChange={onSenderFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder={senderLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{senderLabel}</SelectItem>
            {senderOptions.map(sender => (
              <SelectItem key={sender} value={sender}>
                {sender}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FilterBar>
  )
}

export default FeedbackToolbar
