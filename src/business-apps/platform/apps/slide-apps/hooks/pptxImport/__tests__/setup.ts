// Polyfill DOMParser for Node.js test environment.

import { JSDOM } from 'jsdom'

const dom = new JSDOM('')
globalThis.DOMParser = dom.window.DOMParser
globalThis.Document = dom.window.Document as unknown as typeof Document
globalThis.Element = dom.window.Element as unknown as typeof Element
