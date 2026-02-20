'use client'

import React from 'react'
import {
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Search } from 'lucide-react'
import { DebouncedInput } from '@/components/debounced-input'

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
  senderLabel: string
  typeLabel: string
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
  senderLabel,
  typeLabel
}) => {
  return (
    <Card data-testid="feedback-hub-filters-card">
      <CardContent className="gba:p-4">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-6 gba:gap-2">
          <DebouncedInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={onSearchChange}
            debounceDelay={300}
            className="gba:w-full gba:h-9"
            icon={<Search className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
            ariaLabel={searchPlaceholder}
            data-testid="feedback-search-input"
          />
          <Select value={filterType} onValueChange={onFilterChange} data-testid="feedback-filter-select">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{allLabel}</SelectItem>
              <SelectItem value="private">{privateLabel}</SelectItem>
              <SelectItem value="public">{publicLabel}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
            placeholder={dateFromLabel}
          />
          <Input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} placeholder={dateToLabel} />
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
        </div>
      </CardContent>
    </Card>
  )
}

export default FeedbackToolbar
