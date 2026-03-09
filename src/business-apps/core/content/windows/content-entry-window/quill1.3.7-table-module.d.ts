declare module 'quill1.3.7-table-module' {
  import type { default as Quill } from 'quill'

  interface TableHandlerConstructor {
    new (quill: Quill, options?: Record<string, unknown>): unknown
    moduleName: string
    toolName: string
  }

  const TableHandler: TableHandlerConstructor
  export function rewirteFormats(): void
  export default TableHandler
}
