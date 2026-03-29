import { createRoot } from 'react-dom/client'
import { name, version } from './package.json'

import './src/index.css'
import { BusinessAppIDE } from './src/BusinessAppIDE'

function BusinessAppDevApp() {
  return <BusinessAppIDE packageName={name} packageVersion={version} />
}

const container = document.querySelector('#root') as Element | DocumentFragment
const root = createRoot(container)
root.render(<BusinessAppDevApp />)
