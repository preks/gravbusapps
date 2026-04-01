import { createRoot } from 'react-dom/client'
import { name, version } from './package.json'

import './src/index.css'
import { BusinessAppIDE } from './src/BusinessAppIDE'

// Webview viewport height fix: set --app-height to the actual visible height.
// In native app webviews, `100%`/`100vh` can include areas behind native UI
// (status bar, bottom nav). The visualViewport API gives the real visible area.
// This is the fallback for browsers that don't support `dvh`.
;(function initAppHeight() {
  function update() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight
    document.documentElement.style.setProperty('--app-height', `${h}px`)
  }
  update()
  window.visualViewport?.addEventListener('resize', update)
  window.addEventListener('resize', update)
})()

function BusinessAppDevApp() {
  return <BusinessAppIDE packageName={name} packageVersion={version} />
}
const container = document.querySelector('#root') as Element | DocumentFragment
const root = createRoot(container)
root.render(<BusinessAppDevApp />)
