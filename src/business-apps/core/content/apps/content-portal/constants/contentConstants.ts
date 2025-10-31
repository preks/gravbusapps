/**
 * Content Portal Constants
 *
 * Most constants have been migrated to:
 * - ContentGroup enum: @/common/data/content/types/contentEnums
 * - Dynamic catalog entries with getCatalogEntryValue()
 */

// =====================================================
// CATEGORY CONSTANTS - Still Used (will be migrated to dynamic catalog)
// =====================================================

/**
 * @deprecated Categories should be fetched from catalog dynamically
 * Currently still used in NewsView and QuestionView navigation
 */
export const ALL_TAG = 'All'

/**
 * @deprecated Categories should be fetched from catalog dynamically
 * Currently still used in NewsView - should be replaced with dynamic catalog fetch
 */
export const NEWS_CATEGORIES = ['Achievements', 'Company Updates', 'Tech News']

/**
 * @deprecated Categories should be fetched from catalog dynamically
 * Currently still used in QuestionView - should be replaced with dynamic catalog fetch
 */
export const QUESTION_CATEGORIES = ['Technical', 'Process', 'General']

// =====================================================
// FILE SIZE CONSTANTS - Keep (not deprecated)
// =====================================================

export const MAX_IMAGE_SIZE_MB = 1
export const MAX_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024 // 1MB in bytes

// =====================================================
// TYPE DEFINITIONS - Keep (not deprecated)
// =====================================================

export interface CategoryOption {
  id: string
  name: string
}
