/**
 * Central Catalog Entry Descriptors
 *
 * Describes the structure of catalog entries (similar to entity descriptors in IRM/CRM).
 * These descriptors define how catalog entry fields can be searched and sorted.
 */

import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * Standard catalog entry field descriptors
 * Used for filtering and sorting catalog entries in CatalogSelect
 *
 * Based on CatalogEntry interface from commonTypes.ts
 *
 * Structure follows IRM pattern:
 * - First section: Search/Sort descriptors
 * - Second section: Filter descriptors
 */
export const CATALOG_ENTRY_DESCRIPTORS: Descriptor[] = [
  // =====================================================
  // SEARCH/SORT DESCRIPTORS
  // =====================================================
  {
    key: 'code',
    searchPaths: ['code'],
    sortPath: 'code',
    type: 'text'
  },
  {
    key: 'alternativeCode',
    searchPaths: ['alternativeCode'],
    sortPath: 'alternativeCode',
    type: 'text'
  },
  {
    key: 'value',
    searchPaths: ['value'],
    sortPath: 'value',
    type: 'text'
  },
  {
    key: 'additionalValue1',
    searchPaths: ['additionalValue1'],
    sortPath: 'additionalValue1',
    type: 'text'
  },
  {
    key: 'additionalValue2',
    searchPaths: ['additionalValue2'],
    sortPath: 'additionalValue2',
    type: 'text'
  },
  {
    key: 'additionalValue3',
    searchPaths: ['additionalValue3'],
    sortPath: 'additionalValue3',
    type: 'text'
  },
  {
    key: 'type',
    searchPaths: ['type'],
    sortPath: 'type',
    type: 'text'
  },
  {
    key: 'displayOrder',
    searchPaths: ['displayOrder'],
    sortPath: 'displayOrder',
    type: 'number'
  },
  {
    key: 'parentEntry',
    searchPaths: ['parentEntry.code', 'parentEntry.value'],
    sortPath: 'parentEntry.code',
    type: 'text'
  },

  // =====================================================
  // FILTER DESCRIPTORS
  // =====================================================
  { key: 'id', path: 'id', kind: 'inIds' },
  {
    key: 'codeIds',
    path: 'code',
    filterLabel: 'Code',
    optionSelectPaths: ['id', 'code'],
    optionSearchPaths: ['code'],
    optionDistinctOn: ['code'],
    kind: 'inIds'
  },
  {
    key: 'valueIds',
    path: 'value',
    filterLabel: 'Value',
    optionSelectPaths: ['id', 'value'],
    optionSearchPaths: ['value'],
    optionDistinctOn: ['value'],
    kind: 'inIds'
  },
  {
    key: 'typeIds',
    path: 'type',
    filterLabel: 'Type',
    optionSelectPaths: ['id', 'type'],
    optionSearchPaths: ['type'],
    optionDistinctOn: ['type'],
    kind: 'inIds'
  },
  {
    key: 'parentEntryIds',
    path: 'parentEntryId',
    filterLabel: 'Parent Entry',
    optionSelectPaths: ['parentEntry.id', 'parentEntry.value'],
    optionSearchPaths: ['parentEntry.value', 'parentEntry.code'],
    optionDistinctOn: ['parentEntryId'],
    kind: 'inIds'
  }
]
