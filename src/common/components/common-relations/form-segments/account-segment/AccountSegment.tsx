import React from "react";
import { useFormContext } from "react-hook-form";
import { AccountSegmentProps } from "./types";
import { EmployeeSelect } from "@/components/employee-select";
import { EntitySelect } from "../shared/components";
import { useCatalogOptions } from "../shared/hooks/useCatalogOptions";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
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
  Button,
} from "@newwork/nw-design-system";

const AccountSegment: React.FC<AccountSegmentProps> = (props) => {
  const form = useFormContext<any>();

  const {
    ownerLabel,
    accountNameLabel,
    legalFormLabel,
    industryLabel,
    websiteLabel,
    descriptionLabel,
    contactPhoneLabel,
    contactEmailLabel,
    geographicPresenceLabel,
    // financial labels
    annualRevenueLabel,
    numberOfEmployeesLabel,
    timeZoneLabel,
    foundationDateLabel,
    tickerSymbolLabel,
    liquidationDateLabel,
    missionLabel,
    specialtyLabel,
    notesSummaryLabel,
    pictureUploadLabel,
    communicationChannelsLabel,
    addressesLabel,
    entityLabel,
    accessToken,
    legalFormOptions,
    legalFormCatalog,
    fetchLegalFormOptions,
    industryOptions,
    industryCatalog,
    fetchIndustryOptions,
    // financial catalogs/options
    annualRevenueOptions,
    annualRevenueCatalog,
    fetchAnnualRevenueOptions,
    employeeSizeOptions,
    employeeSizeCatalog,
    fetchEmployeeSizeOptions,
    timeZoneOptions,
    timeZoneCatalog,
    fetchTimeZoneOptions,
    communicationChannelCatalog,
    addressTypeCatalog,
    countryCatalog,
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
    "data-testid": dataTestId = "account-segment",
  } = props;

  // Prime entity search on mount if needed
  React.useEffect(() => {
    if (showEntitySelection && onEntitySearch && (!entities || entities.length === 0)) {
      onEntitySearch("");
    }
  }, [showEntitySelection, onEntitySearch, entities]);

  // Apply initial entity from context when none is set yet
  React.useEffect(() => {
    if (!showEntitySelection || !initialEntityFromContext || !form) return;
    const hasEntity = Boolean(
      form.getValues("account") || form.getValues("contact") || form.getValues("opportunity") || form.getValues("lead")
    );
    if (hasEntity) return;

    const { accountId, contactId, opportunityId, leadId } = initialEntityFromContext || {};
    const map: Array<{ key: "account" | "contact" | "opportunity" | "lead"; id?: string }> = [
      { key: "account", id: accountId },
      { key: "contact", id: contactId },
      { key: "opportunity", id: opportunityId },
      { key: "lead", id: leadId },
    ];
    const found = map.find((m) => m.id);
    if (found?.id) {
      form.setValue(found.key, { id: found.id });
      form.setValue("relatedEntityId", found.id);
    }
  }, [showEntitySelection, initialEntityFromContext, form]);

  // Prime assignee search when empty
  React.useEffect(() => {
    if (onAssigneeSearch && (assignees?.length || 0) === 0) {
      onAssigneeSearch("");
    }
  }, [onAssigneeSearch, assignees?.length]);

  const assigneeOptions = React.useMemo(() => (assignees || []).map((a) => ({
    id: a.id,
    displayName: a.displayName,
    pictureThumbnail: a.pictureThumbnail,
    organizationalUnitName: a.organizationalUnitName,
    jobPositionName: a.jobPositionName,
  })), [assignees]);

  // Catalog options (company + financial)
  const legalFormState = useCatalogOptions({
    accessToken,
    catalog: legalFormCatalog,
    providedOptions: legalFormOptions,
    fetchOptions: fetchLegalFormOptions,
  });
  const industryState = useCatalogOptions({
    accessToken,
    catalog: industryCatalog,
    providedOptions: industryOptions,
    fetchOptions: fetchIndustryOptions,
  });
  const revenueState = useCatalogOptions({
    accessToken,
    catalog: annualRevenueCatalog,
    providedOptions: annualRevenueOptions,
    fetchOptions: fetchAnnualRevenueOptions,
  });
  const employeeSizeState = useCatalogOptions({
    accessToken,
    catalog: employeeSizeCatalog,
    providedOptions: employeeSizeOptions,
    fetchOptions: fetchEmployeeSizeOptions,
  });
  const timeZoneState = useCatalogOptions({
    accessToken,
    catalog: timeZoneCatalog,
    providedOptions: timeZoneOptions,
    fetchOptions: fetchTimeZoneOptions,
  });

  // Communication channel/address catalogs
  const channelState = useCatalogOptions({
    accessToken,
    catalog: communicationChannelCatalog,
    providedOptions: undefined,
  });
  const addressTypeState = useCatalogOptions({
    accessToken,
    catalog: addressTypeCatalog,
    providedOptions: undefined,
  });
  const countryState = useCatalogOptions({
    accessToken,
    catalog: countryCatalog,
    providedOptions: undefined,
  });

  // Map CommunicationChannel entry type -> HTML input type
  const [channelTypeMap, setChannelTypeMap] = React.useState<Record<string, string>>({});
  const catalogClient = accessToken ? useCatalogManagerClient(accessToken) : null;
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!catalogClient || !communicationChannelCatalog) return;
      try {
        const res = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: communicationChannelCatalog.identifier, version: communicationChannelCatalog.version },
          { limit: 500, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        );
        const map: Record<string, string> = {};
        (res?.data || []).forEach((e: any) => {
          const t = String(e?.type || '').toLowerCase();
          const normalized = t === 'email' || t === 'tel' || t === 'url' ? t : 'text';
          map[e.id] = normalized;
        });
        if (!cancelled) setChannelTypeMap(map);
      } catch {
        if (!cancelled) setChannelTypeMap({});
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [catalogClient, communicationChannelCatalog?.identifier, communicationChannelCatalog?.version]);

  const mapChannelTypeToInputType = React.useCallback((channelRef?: string): string => {
    const t = channelRef ? channelTypeMap[channelRef] : undefined;
    if (t === 'email' || t === 'tel' || t === 'url') return t;
    return 'text';
  }, [channelTypeMap]);

  const handleAddChannel = React.useCallback(() => {
    const list = (form.getValues('communicationChannels') || []) as Array<any>;
    const next = [...list, { channelRef: '', value: '' }];
    form.setValue('communicationChannels', next, { shouldDirty: true, shouldValidate: true });
  }, [form]);

  const handleRemoveChannel = React.useCallback((idx: number) => {
    const list = (form.getValues('communicationChannels') || []) as Array<any>;
    if (idx < 0 || idx >= list.length) return;
    const next = list.slice(0, idx).concat(list.slice(idx + 1));
    form.setValue('communicationChannels', next, { shouldDirty: true, shouldValidate: true });
  }, [form]);

  const handleAddAddress = React.useCallback(() => {
    const list = (form.getValues('addresses') || []) as Array<any>;
    const next = [...list, { addressTypeRef: '', countryRef: '', line1: '', line2: '', postalCode: '', city: '' }];
    form.setValue('addresses', next, { shouldDirty: true, shouldValidate: true });
  }, [form]);

  const handleRemoveAddress = React.useCallback((idx: number) => {
    const list = (form.getValues('addresses') || []) as Array<any>;
    if (idx < 0 || idx >= list.length) return;
    const next = list.slice(0, idx).concat(list.slice(idx + 1));
    form.setValue('addresses', next, { shouldDirty: true, shouldValidate: true });
  }, [form]);

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

      {/* Account Name */}
      <FormField
        control={form.control as any}
        name="accountName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {accountNameLabel} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
            </FormLabel>
            <FormControl>
              <Input data-testid={`${dataTestId}-account-name`} {...field} />
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
                <Input type="file" accept="image/*" data-testid="account-segment-picture-file" onChange={(e) => field.onChange(e.target.files?.[0] || null)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Company Info: Legal Form + Industry */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {legalFormLabel && (
          <FormField
            control={form.control as any}
            name="legalFormRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{legalFormLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="gba:w-full" data-testid="account-segment-legal-form">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {legalFormState.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {legalFormState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {industryLabel && (
          <FormField
            control={form.control as any}
            name="industryRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{industryLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="gba:w-full" data-testid="account-segment-industry">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {industryState.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {industryState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Company Info: Website + Description */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {websiteLabel && (
          <FormField
            control={form.control as any}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{websiteLabel}</FormLabel>
                <FormControl>
                  <Input data-testid="account-segment-website" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {descriptionLabel && (
          <FormField
            control={form.control as any}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{descriptionLabel}</FormLabel>
                <FormControl>
                  <Textarea data-testid="account-segment-description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Contact Info */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {contactPhoneLabel && (
          <FormField
            control={form.control as any}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{contactPhoneLabel}</FormLabel>
                <FormControl>
                  <Input data-testid="account-segment-phone" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {contactEmailLabel && (
          <FormField
            control={form.control as any}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{contactEmailLabel}</FormLabel>
                <FormControl>
                  <Input type="email" data-testid="account-segment-email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Geographic Presence */}
      {geographicPresenceLabel && (
        <FormField
          control={form.control as any}
          name="geographicPresence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{geographicPresenceLabel}</FormLabel>
              <FormControl>
                <Input data-testid="account-segment-geographic-presence" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Mission + Specialty */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {missionLabel && (
          <FormField
            control={form.control as any}
            name="mission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{missionLabel}</FormLabel>
                <FormControl>
                  <Textarea data-testid="account-segment-mission" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {specialtyLabel && (
          <FormField
            control={form.control as any}
            name="specialty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{specialtyLabel}</FormLabel>
                <FormControl>
                  <Input data-testid="account-segment-specialty" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Notes Summary */}
      {notesSummaryLabel && (
        <FormField
          control={form.control as any}
          name="notesSummary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{notesSummaryLabel}</FormLabel>
              <FormControl>
                <Textarea data-testid="account-segment-notes-summary" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Financial Info */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {annualRevenueLabel && (
          <FormField
            control={form.control as any}
            name="annualRevenue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{annualRevenueLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="gba:w-full" data-testid="account-segment-annual-revenue">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {revenueState.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {revenueState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {numberOfEmployeesLabel && (
          <FormField
            control={form.control as any}
            name="numberOfEmployees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{numberOfEmployeesLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="gba:w-full" data-testid="account-segment-number-of-employees">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employeeSizeState.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {employeeSizeState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {timeZoneLabel && (
          <FormField
            control={form.control as any}
            name="timeZone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{timeZoneLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="gba:w-full" data-testid="account-segment-time-zone">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timeZoneState.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {timeZoneState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {foundationDateLabel && (
          <FormField
            control={form.control as any}
            name="foundationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{foundationDateLabel}</FormLabel>
                <FormControl>
                  <Input type="date" data-testid="account-segment-foundation-date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {liquidationDateLabel && (
          <FormField
            control={form.control as any}
            name="liquidationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{liquidationDateLabel}</FormLabel>
                <FormControl>
                  <Input type="date" data-testid="account-segment-liquidation-date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {tickerSymbolLabel && (
        <FormField
          control={form.control as any}
          name="tickerSymbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tickerSymbolLabel}</FormLabel>
              <FormControl>
                <Input data-testid="account-segment-ticker-symbol" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Communication Channels */}
      {communicationChannelsLabel && (
        <FormField
          control={form.control as any}
          name="communicationChannels"
          render={() => (
            <FormItem>
              <FormLabel>{communicationChannelsLabel}</FormLabel>
              <Card data-testid="account-segment-channels-card">
                <CardContent className="gba:space-y-4">
                  <div className="gba:flex gba:justify-end">
                    <Button type="button" onClick={handleAddChannel} data-testid="account-segment-add-channel-button">
                      Add Channel
                    </Button>
                  </div>
                  {(form.getValues("communicationChannels") || []).map((_: any, idx: number) => (
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
                                  <SelectTrigger className="gba:w-full" data-testid={`account-segment-channel-${idx}`}>
                                    <SelectValue placeholder="Please Select..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(channelState.options || []).map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                                  type={mapChannelTypeToInputType(form.getValues(`communicationChannels.${idx}.channelRef`))}
                                  data-testid={`account-segment-channel-value-${idx}`}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="gba:flex gba:justify-end">
                        <Button type="button" variant="outline" onClick={() => handleRemoveChannel(idx)} data-testid={`account-segment-remove-channel-${idx}`}>
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

      {/* Addresses */}
      {addressesLabel && (
        <FormField
          control={form.control as any}
          name="addresses"
          render={() => (
            <FormItem>
              <FormLabel>{addressesLabel}</FormLabel>
              <Card data-testid="account-segment-addresses-card">
                <CardContent className="gba:space-y-4">
                  <div className="gba:flex gba:justify-end">
                    <Button type="button" onClick={handleAddAddress} data-testid="account-segment-add-address-button">
                      Add Address
                    </Button>
                  </div>
                  {(form.getValues("addresses") || []).map((_: any, idx: number) => (
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
                                  <SelectTrigger className="gba:w-full" data-testid={`account-segment-address-type-${idx}`}>
                                    <SelectValue placeholder="Please Select..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(addressTypeState.options || []).map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                                  <SelectTrigger className="gba:w-full" data-testid={`account-segment-country-${idx}`}>
                                    <SelectValue placeholder="Please Select..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(countryState.options || []).map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                                <Input data-testid={`account-segment-line1-${idx}`} {...field} />
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
                                <Input data-testid={`account-segment-line2-${idx}`} {...field} />
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
                                <Input data-testid={`account-segment-postal-${idx}`} {...field} />
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
                                <Input data-testid={`account-segment-city-${idx}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="gba:flex gba:justify-end">
                        <Button type="button" variant="outline" onClick={() => handleRemoveAddress(idx)} data-testid={`account-segment-remove-address-${idx}`}>
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

      {/* Related Entity */}
      {showEntitySelection && (
        <FormField
          control={form.control as any}
          name="relatedEntityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{entityLabel || "Related Entity"}</FormLabel>
              <FormControl>
                <EntitySelect
                  entities={(entities || []) as any}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v);
                    const id = String(v || "");
                    const e = (entities || []).find((x) => x.id === id);
                    form.setValue("account", undefined);
                    form.setValue("contact", undefined);
                    form.setValue("opportunity", undefined);
                    form.setValue("lead", undefined);
                    if (e) {
                      form.setValue(e.type, { id: e.id });
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
  );
};

export default AccountSegment;


