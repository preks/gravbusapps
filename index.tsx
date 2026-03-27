import { createRoot } from 'react-dom/client'
import { name, version } from './package.json'

import './src/index.css'
import { BusinessAppIDE } from './src/BusinessAppIDE'

function BusinessAppDevApp() {
  return <BusinessAppIDE packageName={name} packageVersion={version} />
}

const container = document.querySelector('#root') as Element | DocumentFragment
const root = createRoot(container)

const gridSmoke =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('spreadsheetGridSmoke') === '1'

if (gridSmoke) {
  void import('./src/dev/SpreadsheetGridSmoke').then(({ SpreadsheetGridSmoke }) => {
    root.render(<SpreadsheetGridSmoke />)
  })
} else {
  root.render(<BusinessAppDevApp />)
}
