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
import translations from '../../../_i18n'
import { AutomationVersionSelect } from '../task/AutomationVersionSelect'

interface TaskExpertOption {
  _id?: string
  name?: string
  description?: string
}

interface TaskExpertSelectorSectionProps {
  selectedId?: string
  selectedName?: string
  selectedDescription?: string
  candidates: TaskExpertOption[]
  loading: boolean
  selectedVersion?: number
  availableVersions?: number[]
  versionsLoading?: boolean
  onSelect: (id: string) => void
  onChangeVersion?: (version: number) => void
  testId: string
}

export const TaskExpertSelectorSection: React.FC<TaskExpertSelectorSectionProps> = ({
  selectedId,
  selectedName,
  selectedDescription,
  candidates,
  loading,
  selectedVersion,
  availableVersions = [],
  versionsLoading = false,
  onSelect,
  onChangeVersion,
  testId
}) => {
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = String(search || '')
      .trim()
      .toLowerCase()
    if (!query) return candidates
    return candidates.filter(candidate =>
      String(candidate.name ?? '')
        .toLowerCase()
        .includes(query)
    )
  }, [candidates, search])

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">
        <Bot className="gba:h-3.5 gba:w-3.5 gba:inline gba:mr-1" />
        {t('task-type-ai_task_expert')}
      </Label>

      <div className={selectedId ? 'gba:grid gba:grid-cols-[minmax(0,1fr)_9rem] gba:gap-2 gba:items-end' : ''}>
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">{t('task-type-ai_task_expert')}</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="gba:w-full gba:justify-between gba:h-9 gba:text-xs gba:font-normal gba:bg-background"
                data-testid={`${testId}-select`}
              >
                {selectedId ? (
                  <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-foreground gba:truncate">
                    <Bot className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                    {selectedName}
                  </span>
                ) : (
                  <span className="gba:text-muted-foreground">
                    {loading ? 'Loading agents...' : 'Select an agent...'}
                  </span>
                )}
                <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="gba:w-[--radix-popover-trigger-width] gba:p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Search agents..." value={search} onValueChange={setSearch} />
                <CommandList>
                  {loading ? (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-6 gba:text-xs gba:text-muted-foreground gba:gap-2">
                      <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                      Loading agents...
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>No agents found.</CommandEmpty>
                      <CommandGroup>
                        {filtered.map(candidate => (
                          <CommandItem
                            key={candidate._id}
                            value={candidate._id ?? ''}
                            onSelect={() => {
                              const nextId = String(candidate._id ?? '').trim()
                              if (!nextId) return
                              onSelect(nextId)
                              setOpen(false)
                            }}
                          >
                            <Bot className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
                            <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                              <span className="gba:truncate gba:text-foreground">{candidate.name}</span>
                              {candidate.description ? (
                                <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                                  {candidate.description}
                                </span>
                              ) : null}
                            </div>
                            {selectedId === candidate._id ? (
                              <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                            ) : null}
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

        {selectedId && onChangeVersion ? (
          <AutomationVersionSelect
            label={t('list-col-version')}
            value={selectedVersion}
            options={availableVersions}
            loading={versionsLoading}
            onChange={onChangeVersion}
            data-testid={`${testId}-version`}
          />
        ) : null}
      </div>

      {selectedDescription ? <p className="gba:text-[10px] gba:text-muted-foreground">{selectedDescription}</p> : null}
    </div>
  )
}
