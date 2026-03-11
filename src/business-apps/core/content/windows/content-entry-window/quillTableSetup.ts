import Quill from 'quill'
import TableHandler, { rewirteFormats } from 'quill1.3.7-table-module'

Quill.register({ [`modules/${TableHandler.moduleName}`]: TableHandler }, true)
rewirteFormats()

export { TableHandler }
