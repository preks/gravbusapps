/**
 * Segmented tab strip for expense report pages, overriding nw-design-system `TabsList` defaults
 * (`inline-flex`, `w-fit`, `h-10` from the package) which otherwise stay in the class list
 * when merged with `gba:` utilities. Use `!` so layout wins over `nw:` defaults.
 * @see node_modules/@newwork/nw-design-system/dist/components/tabs/Tabs.js
 */

export const EXPENSE_REPORT_SEGMENTED_TAB_TRIGGER_CLASS =
  'gba:!whitespace-normal gba:inline-flex gba:h-full gba:min-h-0 gba:items-center gba:justify-center gba:gap-1.5 gba:px-1.5 gba:py-1.5 gba:sm:px-2 gba:text-center gba:text-sm gba:font-medium gba:leading-tight gba:rounded-md'

/** Applied to the root `Tabs` so the strip is full width and the default vertical gap is removed. */
export const EXPENSE_REPORT_TABS_ROOT_CLASS = 'gba:w-full gba:min-w-0 gba:!gap-0 gba:max-w-full'

const SEGMENTED_TABS_LIST_BASE =
  'gba:!grid gba:!w-full gba:min-w-0 gba:min-h-10 gba:max-w-full gba:items-stretch gba:gap-0.5 gba:rounded-lg gba:p-0.5 gba:border gba:border-border/60 gba:bg-muted/60 gba:text-muted-foreground gba:shrink-0'

export const getExpenseReportSegmentedTabsListClassName = (columnCount: 4 | 5): string => {
  const grid = columnCount === 4 ? 'gba:grid-cols-4' : 'gba:grid-cols-5'
  return `${SEGMENTED_TABS_LIST_BASE} ${grid}`
}
