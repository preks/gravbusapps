import { BaseCatalog, BaseCatalogEntry, Catalog, CatalogEntry } from '../types/catalogTypes';

export interface ToCatalogOptions {
  mapEntries?: boolean;
  mapChildEntries?: boolean;
  entriesLimit?: number;
  entriesOffset?: number;
  search?: string;
}

export const toCatalog = (baseCatalog: BaseCatalog, options: ToCatalogOptions = {}): Catalog => {
  const entriesCount = baseCatalog.catalogEntriesAggregate?.aggregate?.count || 0;
  const hasChildCatalogs = (baseCatalog.catalogs?.length || 0) > 0;

  let status: 'active' | 'inactive' | 'draft' = 'active';
  if (baseCatalog.recordState === 'DRAFT') {
    status = 'draft';
  } else if (baseCatalog.validTo && new Date(baseCatalog.validTo) < new Date()) {
    status = 'inactive';
  }

  let color = '#1890ff';
  if (status === 'draft') color = '#faad14';
  else if (status === 'inactive') color = '#999999';
  else if (hasChildCatalogs) color = '#722ed1';

  const catalog: Catalog = {
    ...baseCatalog,
    displayName: baseCatalog.name || baseCatalog.identifier,
    entriesCount,
    hasChildCatalogs,
    lastUpdated: baseCatalog.updatedAt || baseCatalog.createdAt || '',
    status,
    color,
    // Initialize enhanced, UI-friendly pagination/search fields
    entries: undefined,
    total: baseCatalog.catalogEntriesAggregate?.aggregate?.count || 0,
    offset: 0,
    limit: 0,
    loading: false,
    search: undefined
  };

  if (options.mapEntries && baseCatalog.catalogEntries) {
    const baseEntries = baseCatalog.catalogEntries as BaseCatalogEntry[];
    const entries = baseEntries.map(e => toCatalogEntry(e, baseEntries, options.mapChildEntries));
    catalog.entries = entries;
    catalog.total = baseCatalog.catalogEntriesAggregate?.aggregate?.count || entries.length || 0;
    catalog.limit = options.entriesLimit ?? 0;
    catalog.offset = options.entriesOffset ?? 0;
    catalog.search = options.search;
  }

  return catalog;
};

export const toCatalogEntry = (
  baseEntry: BaseCatalogEntry,
  allEntries?: BaseCatalogEntry[],
  mapChildEntries: boolean = false
): CatalogEntry => {
  const { childEntries: _ignoredChildEntries, ...baseEntryWithoutChildren } = baseEntry;
  const hasChildren = (baseEntry.childEntries?.length || 0) > 0;

  let level = 0;
  let currentParentId = baseEntry.parentEntryId;
  const parentPath: string[] = [];

  while (currentParentId && allEntries) {
    const parent = allEntries.find(e => e.id === currentParentId);
    if (parent) {
      parentPath.unshift(parent.value || parent.code || parent.description || parent.id);
      currentParentId = parent.parentEntryId;
      level++;
    } else {
      break;
    }
  }

  const searchableFields = [
    baseEntry.value,
    baseEntry.description,
    baseEntry.code,
    baseEntry.alternativeCode,
    baseEntry.additionalValue1,
    baseEntry.additionalValue2,
    baseEntry.additionalValue3,
    baseEntry.type,
    baseEntry.displayOrder?.toString()
  ].filter(Boolean);

  const searchableText = (searchableFields as string[]).join(' ').toLowerCase();

  const displayValue = baseEntry.value || baseEntry.code || baseEntry.description || baseEntry.id;

  const entry: CatalogEntry = {
    ...(baseEntryWithoutChildren as Omit<BaseCatalogEntry, 'childEntries'>),
    displayValue,
    fullPath: parentPath.length > 0 ? `${parentPath.join(' > ')} > ${displayValue}` : displayValue,
    hasChildren,
    level,
    parentPath: parentPath.length > 0 ? parentPath.join(' > ') : undefined,
    searchableText
  };

  if (mapChildEntries && baseEntry.childEntries && baseEntry.childEntries.length > 0) {
    entry.childEntries = (baseEntry.childEntries as BaseCatalogEntry[]).map(child =>
      toCatalogEntry(child, allEntries, true)
    );
  }

  return entry;
};


