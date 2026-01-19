import React, { useCallback, useMemo, useState } from 'react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { TranslatableField } from '@/components/translatable-field'
import * as Phosphor from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'

interface ConfigFormProps {
  onSubmit: (values: {
    name: string
    description: string
    url: string
    iconName: string
    nameTranslations: Record<string, string>
    descriptionTranslations: Record<string, string>
    urlTranslations: Record<string, string>
    iconTranslations: Record<string, string>
  }) => void | Promise<void>
  onCancel: () => void
  dataTestIdPrefix: string
  initialValues?: {
    name?: string
    description?: string
    url?: string
    iconName?: string
    nameTranslations?: Record<string, string>
    descriptionTranslations?: Record<string, string>
    urlTranslations?: Record<string, string>
    iconTranslations?: Record<string, string>
  }
}

export const ConfigForm: React.FC<ConfigFormProps> = ({ onSubmit, onCancel, dataTestIdPrefix, initialValues }) => {
  const normalizeIconName = (name: string) => (name && name.endsWith('Icon') ? name.slice(0, -4) : name)
  const form = useForm<{ name: string; description: string; url: string; iconName: string }>({
    defaultValues: {
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
      url: initialValues?.url ?? '',
      iconName: normalizeIconName(initialValues?.iconName ?? '')
    }
  })

  // Translation state
  const [nameTranslations, setNameTranslations] = useState<Record<string, string>>(
    initialValues?.nameTranslations ?? {}
  )
  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string>>(
    initialValues?.descriptionTranslations ?? {}
  )
  const [urlTranslations, setUrlTranslations] = useState<Record<string, string>>(initialValues?.urlTranslations ?? {})
  const [iconTranslations, setIconTranslations] = useState<Record<string, string>>(
    initialValues?.iconTranslations ?? {}
  )

  const [iconSearch, setIconSearch] = useState('')
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  // Build icon list from phosphor package export keys that represent components
  const iconNames = useMemo(() => {
    const keys = Object.keys(Phosphor).filter(k => k !== 'Icon' && /^[A-Z]/.test(k))
    // Filter out duplicate "<Name>Icon" entries; keep base name only
    const baseOnly = keys.filter(k => !k.endsWith('Icon'))
    const componentKeys = baseOnly.filter(k => {
      const v = (Phosphor as any)[k]
      return typeof v === 'function' || (typeof v === 'object' && v !== null && (v as any).$$typeof)
    })
    const fallback = [
      'House',
      'TrendUp',
      'Database',
      'Users',
      'Gear',
      'Link',
      'Play',
      'Plus',
      'ChartBar',
      'WarningCircle',
      'FlowArrow'
    ]
    return (componentKeys.length ? componentKeys : fallback).sort()
  }, [])

  const filteredIcons = useMemo(() => {
    const s = iconSearch.trim().toLowerCase()
    const list = s ? iconNames.filter(n => n.toLowerCase().includes(s)) : iconNames
    // Ensure unique results
    return Array.from(new Set(list))
  }, [iconSearch, iconNames])

  const [page, setPage] = useState(1)
  const pageSize = 48
  const pagedIcons = useMemo(() => filteredIcons.slice(0, page * pageSize), [filteredIcons, page])
  const hasMore = pagedIcons.length < filteredIcons.length

  const submit = useCallback(
    async (values: { name: string; description: string; url: string; iconName: string }) => {
      const cleanName = values.name?.trim()
      if (!cleanName) return
      await onSubmit({
        name: cleanName,
        description: values.description?.trim() ?? '',
        url: values.url?.trim() ?? '',
        iconName: values.iconName ?? '',
        nameTranslations,
        descriptionTranslations,
        urlTranslations,
        iconTranslations
      })
    },
    [onSubmit, nameTranslations, descriptionTranslations, urlTranslations, iconTranslations]
  )

  return (
    <div className="gba:space-y-4" data-testid={`${dataTestIdPrefix}-ConfigForm`}>
      <Form {...form}>
        <form className="gba:space-y-4" onSubmit={form.handleSubmit(submit)}>
          <FormField
            control={form.control}
            name="name"
            rules={{ required: 'Name is required', validate: v => (v?.trim()?.length ? true : 'Name is required') }}
            render={({ field, fieldState }) => (
              <FormItem>
                <TranslatableField
                  label="Name"
                  value={field.value}
                  onChange={field.onChange}
                  translations={nameTranslations}
                  onTranslationsChange={newTranslations => {
                    setNameTranslations(newTranslations)
                    // Also update URL and icon translations with the same values if they're not set
                    const currentUrl = form.getValues('url')
                    const currentIcon = form.getValues('iconName')
                    if (currentUrl) {
                      setUrlTranslations(prev => {
                        const updated = { ...prev }
                        Object.keys(newTranslations).forEach(locale => {
                          if (!updated[locale]) updated[locale] = currentUrl
                        })
                        return updated
                      })
                    }
                    if (currentIcon) {
                      setIconTranslations(prev => {
                        const updated = { ...prev }
                        Object.keys(newTranslations).forEach(locale => {
                          if (!updated[locale]) updated[locale] = currentIcon
                        })
                        return updated
                      })
                    }
                  }}
                  placeholder="Card name"
                  required={true}
                  error={fieldState.error?.message}
                  defaultLanguage="en-US"
                  data-testid={`${dataTestIdPrefix}-NameInput`}
                />
              </FormItem>
            )}
          />

          {/* Icon selector - second field (required) */}
          <FormField
            control={form.control}
            name="iconName"
            rules={{ required: 'Icon is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="gba:font-medium">Icon *</FormLabel>
                <FormControl>
                  <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="gba:w-full gba:justify-between"
                        data-testid={`${dataTestIdPrefix}-IconPickerTrigger`}
                        aria-required="true"
                      >
                        <span className="gba:flex gba:items-center gba:gap-2">
                          {field.value && (Phosphor as any)[field.value]
                            ? (() => {
                                const Icon = (Phosphor as any)[field.value] as React.ComponentType<{
                                  className?: string
                                }>
                                return <Icon className="gba:w-4 gba:h-4" />
                              })()
                            : null}
                          {field.value || 'Select icon'}
                        </span>
                        <span className="gba:text-xs gba:text-gray-500">Browse</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="gba:w-[var(--radix-popover-trigger-width)] gba:p-3"
                      align="start"
                      data-testid={`${dataTestIdPrefix}-IconPopover`}
                    >
                      <div className="gba:space-y-2">
                        <DebouncedInput
                          value={iconSearch}
                          onChange={v => {
                            setIconSearch(v)
                            setPage(1)
                          }}
                          placeholder="Search icons..."
                          data-testid={`${dataTestIdPrefix}-IconSearchInput`}
                        />
                        <div
                          className="gba:grid gba:grid-cols-5 gba:gap-2 gba:max-h-64 gba:overflow-y-auto gba:bg-white"
                          onScroll={e => {
                            const el = e.currentTarget as HTMLDivElement
                            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8 && hasMore) {
                              setPage(p => p + 1)
                            }
                          }}
                          onWheel={e => {
                            // Ensure wheel scroll stays within the grid instead of bubbling to page
                            e.stopPropagation()
                            const el = e.currentTarget as HTMLDivElement
                            el.scrollTop += e.deltaY
                          }}
                          data-testid={`${dataTestIdPrefix}-IconGrid`}
                        >
                          {pagedIcons.length === 0 && (
                            <div
                              className="gba:col-span-5 gba:text-center gba:text-xs gba:text-gray-500 gba:py-4"
                              data-testid={`${dataTestIdPrefix}-IconGridEmpty`}
                            >
                              No icons found
                            </div>
                          )}
                          {pagedIcons.map(iconName => {
                            const IconComp = (Phosphor as any)[iconName] as React.ComponentType<{ className?: string }>
                            const isSelected = field.value === iconName
                            return (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => {
                                  field.onChange(iconName)
                                  setIconPickerOpen(false)
                                  // Update icon translations to match the current value for all languages
                                  setIconTranslations(prev => {
                                    const updated = { ...prev }
                                    Object.keys({ ...nameTranslations, ...descriptionTranslations }).forEach(locale => {
                                      updated[locale] = iconName
                                    })
                                    return updated
                                  })
                                }}
                                className={`gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-20 gba:w-full gba:rounded ${isSelected ? 'gba:bg-gray-100' : ''} hover:gba:bg-gray-50`}
                                title={iconName}
                                data-testid={`${dataTestIdPrefix}-IconItem-${iconName}`}
                                aria-selected={isSelected}
                              >
                                {IconComp ? (
                                  <IconComp className="gba:w-8 gba:h-8" />
                                ) : (
                                  <span className="gba:text-[10px]">{iconName}</span>
                                )}
                                <span className="gba:text-[10px] gba:text-gray-700 gba:mt-1 gba:text-center gba:px-1 gba:truncate gba:w-full">
                                  {iconName}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            rules={{
              required: 'Description is required',
              validate: v => (v?.trim()?.length ? true : 'Description is required')
            }}
            render={({ field, fieldState }) => (
              <FormItem>
                <TranslatableField
                  label="Description"
                  value={field.value}
                  onChange={field.onChange}
                  translations={descriptionTranslations}
                  onTranslationsChange={setDescriptionTranslations}
                  placeholder="Description"
                  required={true}
                  error={fieldState.error?.message}
                  defaultLanguage="en-US"
                  data-testid={`${dataTestIdPrefix}-DescriptionInput`}
                />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="url"
            rules={{ required: 'URL is required', validate: v => (v?.trim()?.length ? true : 'URL is required') }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={e => {
                      field.onChange(e)
                      // Update URL translations to match the current value for all languages
                      const newValue = e.target.value
                      setUrlTranslations(prev => {
                        const updated = { ...prev }
                        Object.keys({ ...nameTranslations, ...descriptionTranslations }).forEach(locale => {
                          updated[locale] = newValue
                        })
                        return updated
                      })
                    }}
                    placeholder="/platform/..."
                    data-testid={`${dataTestIdPrefix}-UrlInput`}
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="gba:flex gba:gap-2">
            <Button type="button" variant="outline" onClick={onCancel} data-testid={`${dataTestIdPrefix}-CancelCreate`}>
              Cancel
            </Button>
            <Button type="submit" data-testid={`${dataTestIdPrefix}-SubmitCreate`}>
              {initialValues ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default ConfigForm
