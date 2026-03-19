import React, { useMemo, useState } from 'react'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Bot, Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import translations from '../../../../_i18n'

interface DecisionTaskExpertPickerProps {
  agentsLoading: boolean
  selectedId?: string
  selectedName?: string
  candidates: Array<{ _id: string; name: string; description?: string }>
  onSelect: (promptId: string) => void
  'data-testid': string
}

export const DecisionTaskExpertPicker: React.FC<DecisionTaskExpertPickerProps> = ({
  agentsLoading,
  selectedId,
  selectedName,
  candidates,
  onSelect,
  'data-testid': testId
}) => {
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = String(search || '')
      .trim()
      .toLowerCase()
    const list = Array.isArray(candidates) ? candidates : []
    if (!q) return list
    return list.filter(a =>
      String(a?.name ?? '')
        .toLowerCase()
        .includes(q)
    )
  }, [candidates, search])

  return (
    <div className="gba:flex gba:flex-col gba:gap-1.5">
      <Label className="gba:text-xs gba:font-medium">{t('decision-ai-taskexpert-picker-label')}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="gba:w-full gba:justify-between gba:h-9 gba:text-xs gba:font-normal"
            data-testid={testId}
          >
            {selectedId ? (
              <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-foreground gba:truncate">
                <Bot className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                {selectedName ?? t('decision-ai-taskexpert-picker-selected-fallback')}
              </span>
            ) : (
              <span className="gba:text-muted-foreground">
                {agentsLoading ? 'Loading experts...' : t('decision-ai-taskexpert-picker-placeholder')}
              </span>
            )}
            <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-[var(--radix-popover-trigger-width)] gba:p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t('decision-ai-taskexpert-picker-search')}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="gba:max-h-72 gba:overflow-y-auto">
              {agentsLoading ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-6 gba:text-xs gba:text-muted-foreground gba:gap-2">
                  <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                  Loading experts...
                </div>
              ) : (
                <>
                  <CommandEmpty>{t('decision-ai-taskexpert-picker-empty')}</CommandEmpty>
                  <CommandGroup>
                    {filtered.map(agent => (
                      <CommandItem
                        key={String(agent?._id ?? agent?.name ?? '')}
                        value={String(agent?._id ?? '')}
                        onSelect={() => {
                          const id = String(agent?._id ?? '').trim()
                          if (!id) return
                          onSelect(id)
                          setOpen(false)
                        }}
                      >
                        <Bot className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
                        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                          <span className="gba:truncate gba:text-foreground">{String(agent?.name ?? '')}</span>
                          {agent?.description ? (
                            <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                              {String(agent.description)}
                            </span>
                          ) : null}
                        </div>
                        {selectedId && selectedId === agent?._id && (
                          <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
