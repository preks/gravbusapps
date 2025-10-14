import React from 'react'
import { useFormContext } from 'react-hook-form'
import { ContactSegmentProps } from './types'
import { useCatalogOptions } from '../shared/hooks/useCatalogOptions'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Spinner,
  Card,
  CardContent,
  Button
} from '@newwork/nw-design-system'
import { EmployeeSelect } from '@/components/employee-select'
import { EntitySelect } from '../shared/components'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'

const ContactSegment: React.FC<ContactSegmentProps> = props => {
  const form = useFormContext<any>()

  const {
    ownerLabel,
    typeLabel,
    firstNameLabel,
    lastNameLabel,
    emailLabel,
    phoneLabel,
    salutationLabel,
    academicTitleLabel,
    languageLabel,
    birthDateLabel,
    descriptionLabel,
    jobPositionLabel,
    departmentLabel,
    codeLabel,
    notesSummaryLabel,
    communicationChannelsLabel,
    addressesLabel,
    pictureUploadLabel,
    entityLabel,
    accessToken,
    contactTypeCatalog,
    salutationCatalog,
    academicTitleOptions,
    academicTitleCatalog,
    fetchAcademicTitleOptions,
    languageOptions,
    languageCatalog,
    fetchLanguageOptions,
    communicationChannelCatalog,
    countryCatalog,
    addressTypeCatalog,
    assignees = [],
    assigneesLoading,
    onAssigneeSearch,
    assigneesHasMore,
    onAssigneeLoadMore,
    showEntitySelection = false,
    entities = [],
    entitiesLoading,
    onEntitySearch,
    entitiesHasMore,
    onEntityLoadMore,
    initialEntityFromContext,
    'data-testid': dataTestId = 'contact-segment'
  } = props

  // Prime entity search on mount if needed
  React.useEffect(() => {
    if (showEntitySelection && onEntitySearch && (!entities || entities.length === 0)) {
      onEntitySearch('')
    }
  }, [showEntitySelection, onEntitySearch, entities])

  // Apply initial entity from context when none is set yet
  React.useEffect(() => {
    if (!showEntitySelection || !initialEntityFromContext || !form) return
    const hasEntity = Boolean(
      form.getValues('account') || form.getValues('contact') || form.getValues('opportunity') || form.getValues('lead')
    )
    if (hasEntity) return

    const { accountId, contactId, opportunityId, leadId } = initialEntityFromContext || {}
    const map: Array<{ key: 'account' | 'contact' | 'opportunity' | 'lead'; id?: string }> = [
      { key: 'account', id: accountId },
      { key: 'contact', id: contactId },
      { key: 'opportunity', id: opportunityId },
      { key: 'lead', id: leadId }
    ]
    const found = map.find(m => m.id)
    if (found?.id) {
      form.setValue(found.key, { id: found.id })
      form.setValue('relatedEntityId', found.id)
    }
  }, [showEntitySelection, initialEntityFromContext, form])

  // Prime assignee search when empty
  React.useEffect(() => {
    if (onAssigneeSearch && (assignees?.length || 0) === 0) {
      onAssigneeSearch('')
    }
  }, [onAssigneeSearch, assignees?.length])

  const assigneeOptions = React.useMemo(
    () =>
      (assignees || []).map(a => ({
        id: a.id,
        displayName: a.displayName,
        pictureThumbnail: a.pictureThumbnail,
        organizationalUnitName: a.organizationalUnitName,
        jobPositionName: a.jobPositionName
      })),
    [assignees]
  )

  const academicState = useCatalogOptions({
    accessToken,
    catalog: academicTitleCatalog,
    providedOptions: academicTitleOptions,
    fetchOptions: fetchAcademicTitleOptions
  })
  const languageState = useCatalogOptions({
    accessToken,
    catalog: languageCatalog,
    providedOptions: languageOptions,
    fetchOptions: fetchLanguageOptions
  })
  const contactTypeState = useCatalogOptions({
    accessToken,
    catalog: contactTypeCatalog,
    providedOptions: undefined
  })
  const salutationState = useCatalogOptions({
    accessToken,
    catalog: salutationCatalog,
    providedOptions: undefined
  })
  const channelState = useCatalogOptions({
    accessToken,
    catalog: communicationChannelCatalog,
    providedOptions: undefined
  })
  const countryState = useCatalogOptions({
    accessToken,
    catalog: countryCatalog,
    providedOptions: undefined
  })
  const addressTypeState = useCatalogOptions({
    accessToken,
    catalog: addressTypeCatalog,
    providedOptions: undefined
  })

  // Map of communicationChannel id -> lowercased type (email|tel|url|text)
  const [channelTypeMap, setChannelTypeMap] = React.useState<Record<string, string>>({})
  const catalogClient = accessToken ? useCatalogManagerClient(accessToken) : null
  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!catalogClient || !communicationChannelCatalog) return
      try {
        const res = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: communicationChannelCatalog.identifier, version: communicationChannelCatalog.version },
          { limit: 500, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        )
        const map: Record<string, string> = {}
        ;(res?.data || []).forEach((e: any) => {
          const t = String(e?.type || '').toLowerCase()
          const normalized = t === 'email' || t === 'tel' || t === 'url' ? t : 'text'
          map[e.id] = normalized
        })
        if (!cancelled) setChannelTypeMap(map)
      } catch {
        if (!cancelled) setChannelTypeMap({})
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [catalogClient, communicationChannelCatalog?.identifier, communicationChannelCatalog?.version])

  const mapChannelTypeToInputType = React.useCallback(
    (channelRef?: string): string => {
      const t = channelRef ? channelTypeMap[channelRef] : undefined
      if (t === 'email' || t === 'tel' || t === 'url') return t
      return 'text'
    },
    [channelTypeMap]
  )

  const handleAddChannel = React.useCallback(() => {
    const list = (form.getValues('communicationChannels') || []) as Array<any>
    const next = [...list, { channelRef: '', value: '' }]
    form.setValue('communicationChannels', next, { shouldDirty: true, shouldValidate: true })
  }, [form])

  const handleRemoveChannel = React.useCallback(
    (idx: number) => {
      const list = (form.getValues('communicationChannels') || []) as Array<any>
      if (idx < 0 || idx >= list.length) return
      const next = list.slice(0, idx).concat(list.slice(idx + 1))
      form.setValue('communicationChannels', next, { shouldDirty: true, shouldValidate: true })
    },
    [form]
  )

  const handleAddAddress = React.useCallback(() => {
    const list = (form.getValues('addresses') || []) as Array<any>
    const next = [...list, { addressTypeRef: '', countryRef: '', line1: '', line2: '', postalCode: '', city: '' }]
    form.setValue('addresses', next, { shouldDirty: true, shouldValidate: true })
  }, [form])

  const handleRemoveAddress = React.useCallback(
    (idx: number) => {
      const list = (form.getValues('addresses') || []) as Array<any>
      if (idx < 0 || idx >= list.length) return
      const next = list.slice(0, idx).concat(list.slice(idx + 1))
      form.setValue('addresses', next, { shouldDirty: true, shouldValidate: true })
    },
    [form]
  )

  return (
    <>
      {/* Owner */}
      <FormField
        control={form.control as any}
        name="ownerEmployeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {ownerLabel} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
            </FormLabel>
            <FormControl>
              <EmployeeSelect
                employees={assigneeOptions as any}
                value={field.value || ''}
                onValueChange={(v: string | null) => field.onChange(v)}
                onSearch={onAssigneeSearch}
                loading={Boolean(assigneesLoading)}
                onLoadMore={onAssigneeLoadMore}
                hasMore={Boolean(assigneesHasMore)}
                data-testid={`${dataTestId}-owner`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Picture Upload */}
      {pictureUploadLabel && (
        <FormField
          control={form.control as any}
          name="pictureFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{pictureUploadLabel}</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  data-testid="contact-segment-picture-file"
                  onChange={e => field.onChange(e.target.files?.[0] || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Type + Salutation */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {typeLabel && (
          <FormField
            control={form.control as any}
            name="contactTypeRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{typeLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="gba:w-full" data-testid="contact-segment-type">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(contactTypeState.options || []).map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {salutationLabel && (
          <FormField
            control={form.control as any}
            name="salutationRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{salutationLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="gba:w-full" data-testid="contact-segment-salutation">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(salutationState.options || []).map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Name */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control as any}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {firstNameLabel} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
              </FormLabel>
              <FormControl>
                <Input data-testid="contact-segment-first-name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as any}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {lastNameLabel} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
              </FormLabel>
              <FormControl>
                <Input data-testid="contact-segment-last-name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Contact Info */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control as any}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {emailLabel} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
              </FormLabel>
              <FormControl>
                <Input type="email" data-testid="contact-segment-email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {phoneLabel && (
          <FormField
            control={form.control as any}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{phoneLabel}</FormLabel>
                <FormControl>
                  <Input data-testid="contact-segment-phone" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Personal Info */}
      {/* Academic Title + Language */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {academicTitleLabel && (
          <FormField
            control={form.control as any}
            name="academicTitleRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{academicTitleLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="gba:w-full" data-testid="contact-segment-academic-title">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {academicState.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {academicState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {languageLabel && (
          <FormField
            control={form.control as any}
            name="languageRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{languageLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="gba:w-full" data-testid="contact-segment-language">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {languageState.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {languageState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Professional Info */}
      {/* Professional Info */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {jobPositionLabel && (
          <FormField
            control={form.control as any}
            name="jobPosition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{jobPositionLabel}</FormLabel>
                <FormControl>
                  <Input data-testid="contact-segment-job-position" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {departmentLabel && (
          <FormField
            control={form.control as any}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{departmentLabel}</FormLabel>
                <FormControl>
                  <Input data-testid="contact-segment-department" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
      {codeLabel && (
        <FormField
          control={form.control as any}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{codeLabel}</FormLabel>
              <FormControl>
                <Input data-testid="contact-segment-code" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Additional Information / Notes */}
      {/* Communication Channels (dynamic) */}
      {communicationChannelsLabel && (
        <FormField
          control={form.control as any}
          name="communicationChannels"
          render={() => (
            <FormItem>
              <FormLabel>{communicationChannelsLabel}</FormLabel>
              <Card data-testid="contact-segment-channels-card">
                <CardContent className="gba:space-y-4">
                  <div className="gba:flex gba:justify-end">
                    <Button type="button" onClick={handleAddChannel} data-testid="contact-segment-add-channel-button">
                      Add Channel
                    </Button>
                  </div>
                  {(form.getValues('communicationChannels') || []).map((_: any, idx: number) => (
                    <div key={idx} className="gba:space-y-2">
                      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                        <FormField
                          control={form.control as any}
                          name={`communicationChannels.${idx}.channelRef` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Channel</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="gba:w-full" data-testid={`contact-segment-channel-${idx}`}>
                                    <SelectValue placeholder="Please Select..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(channelState.options || []).map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as any}
                          name={`communicationChannels.${idx}.value` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Value</FormLabel>
                              <FormControl>
                                <Input
                                  type={mapChannelTypeToInputType(
                                    form.getValues(`communicationChannels.${idx}.channelRef`)
                                  )}
                                  data-testid={`contact-segment-channel-value-${idx}`}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="gba:flex gba:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleRemoveChannel(idx)}
                          data-testid={`contact-segment-remove-channel-${idx}`}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </FormItem>
          )}
        />
      )}

      {/* Addresses (dynamic) */}
      {addressesLabel && (
        <FormField
          control={form.control as any}
          name="addresses"
          render={() => (
            <FormItem>
              <FormLabel>{addressesLabel}</FormLabel>
              <Card data-testid="contact-segment-addresses-card">
                <CardContent className="gba:space-y-4">
                  <div className="gba:flex gba:justify-end">
                    <Button type="button" onClick={handleAddAddress} data-testid="contact-segment-add-address-button">
                      Add Address
                    </Button>
                  </div>
                  {(form.getValues('addresses') || []).map((_: any, idx: number) => (
                    <div key={idx} className="gba:space-y-2">
                      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                        <FormField
                          control={form.control as any}
                          name={`addresses.${idx}.addressTypeRef` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger
                                    className="gba:w-full"
                                    data-testid={`contact-segment-address-type-${idx}`}
                                  >
                                    <SelectValue placeholder="Please Select..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(addressTypeState.options || []).map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as any}
                          name={`addresses.${idx}.countryRef` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="gba:w-full" data-testid={`contact-segment-country-${idx}`}>
                                    <SelectValue placeholder="Please Select..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(countryState.options || []).map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as any}
                          name={`addresses.${idx}.line1` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 1</FormLabel>
                              <FormControl>
                                <Input data-testid={`contact-segment-line1-${idx}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as any}
                          name={`addresses.${idx}.line2` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 2</FormLabel>
                              <FormControl>
                                <Input data-testid={`contact-segment-line2-${idx}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as any}
                          name={`addresses.${idx}.postalCode` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postal Code</FormLabel>
                              <FormControl>
                                <Input data-testid={`contact-segment-postal-${idx}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as any}
                          name={`addresses.${idx}.city` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input data-testid={`contact-segment-city-${idx}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="gba:flex gba:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleRemoveAddress(idx)}
                          data-testid={`contact-segment-remove-address-${idx}`}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </FormItem>
          )}
        />
      )}

      {/* Additional Information / Notes */}
      {notesSummaryLabel && (
        <FormField
          control={form.control as any}
          name="notesSummary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{notesSummaryLabel}</FormLabel>
              <FormControl>
                <Textarea data-testid="contact-segment-notes-summary" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Related Entity */}
      {showEntitySelection && (
        <FormField
          control={form.control as any}
          name="relatedEntityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{entityLabel || 'Related Entity'}</FormLabel>
              <FormControl>
                <EntitySelect
                  entities={(entities || []) as any}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v)
                    const id = String(v || '')
                    const e = (entities || []).find(x => x.id === id)
                    form.setValue('account', undefined)
                    form.setValue('contact', undefined)
                    form.setValue('opportunity', undefined)
                    form.setValue('lead', undefined)
                    if (e) {
                      form.setValue(e.type, { id: e.id })
                    }
                  }}
                  onSearch={onEntitySearch}
                  loading={Boolean(entitiesLoading)}
                  onLoadMore={onEntityLoadMore}
                  hasMore={Boolean(entitiesHasMore)}
                  data-testid={`${dataTestId}-entity`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  )
}

export default ContactSegment
