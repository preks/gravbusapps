/**
 * Service Portal Data
 */

import { serviceCategories as categories, getCategoryById, getCategoriesByIds, getSortedCategories } from './categories'

// Re-export as named exports
export { categories, getCategoryById, getCategoriesByIds, getSortedCategories }

// Default export for wrapper compatibility
export default {
  categories,
  getCategoryById,
  getCategoriesByIds,
  getSortedCategories
}
