/**
 * Neutralizes dynamic import() calls inside @excalidraw/excalidraw so that
 * Rollup/Vite can produce a single self-contained CJS entry for screens that
 * include the editor.
 *
 * Excalidraw ships with ~55 locale dynamic imports, a Mermaid lazy import,
 * font-subsetting workers, image helpers and polyfills – all using import("...").
 * These trigger Rollup code-splitting which the platform's remote component
 * loader cannot handle (it only supports a single index.js).
 *
 * After patching:
 *   - Locale imports resolve to empty objects (English is the built-in default)
 *   - Mermaid import resolves to empty object (optional feature)
 *   - canvas-roundrect-polyfill resolves to undefined (polyfill, harmless)
 *   - data/image helper resolves to stubs
 *   - Font subsetting workers resolve to empty objects (subset still works inline)
 *   - pica / image-blob-reduce resolve to empty objects (image resize is optional)
 */

const fs = require('fs') // eslint-disable-line @typescript-eslint/no-require-imports
const path = require('path') // eslint-disable-line @typescript-eslint/no-require-imports

const PROD_DIR = path.join(__dirname, '..', 'node_modules', '@excalidraw', 'excalidraw', 'dist', 'prod')

if (!fs.existsSync(PROD_DIR)) {
  console.log('[patch-excalidraw] prod/ directory not found – skipping')
  process.exit(0)
}

const replacements = [
  // Locale files:  import("./locales/xx-XX-HASH.js")
  [/import\("\.\/locales\/[^"]+\.js"\)/g, 'Promise.resolve({default:{}})'],
  // Percentages helper
  [/import\("\.\/percentages-[^"]+\.js"\)/g, 'Promise.resolve({default:{}})'],
  // Mermaid
  [/import\("@excalidraw\/mermaid-to-excalidraw"\)/g, 'Promise.resolve({default:{}})'],
  // Canvas polyfill
  [/import\("canvas-roundrect-polyfill"\)/g, 'Promise.resolve(void 0)'],
  // Image data helper
  [
    /import\("\.\/data\/image-[^"]+\.js"\)/g,
    'Promise.resolve({decodePngMetadata:async()=>null,encodePngMetadata:async(b)=>b,getTEXtChunk:()=>null})'
  ],
  // Font subsetting workers
  [/import\("\.\/subset-worker\.chunk\.js"\)/g, 'Promise.resolve({default:{}})'],
  [/import\("\.\/subset-shared\.chunk\.js"\)/g, 'Promise.resolve({default:{}})'],
  // Image processing libraries (used for image resize – optional)
  [/import\("pica"\)/g, 'Promise.resolve({default:function(){return{resize:async(f,t)=>t}}})'],
  [/import\("image-blob-reduce"\)/g, 'Promise.resolve({default:function(){return{toBlob:async(b)=>b}}})']
]

let totalPatched = 0

const jsFiles = fs.readdirSync(PROD_DIR).filter(f => f.endsWith('.js'))
for (const file of jsFiles) {
  const filePath = path.join(PROD_DIR, file)
  const original = fs.readFileSync(filePath, 'utf8')
  let src = original

  for (const [pattern, replacement] of replacements) {
    src = src.replace(pattern, replacement)
  }

  if (src !== original) {
    fs.writeFileSync(filePath, src, 'utf8')
    const count = (original.match(/import\("[^"]+"\)/g) || []).length - (src.match(/import\("[^"]+"\)/g) || []).length
    totalPatched += count
    console.log(`[patch-excalidraw] ${file}: neutralized ${count} dynamic import(s)`)
  }
}

// --- browser-fs-access: replace dynamic imports with static imports ---
const BFS_INDEX = path.join(__dirname, '..', 'node_modules', 'browser-fs-access', 'dist', 'index.mjs')
if (fs.existsSync(BFS_INDEX)) {
  const bfsOriginal = fs.readFileSync(BFS_INDEX, 'utf8')
  if (bfsOriginal.includes('import("./file-open')) {
    const bfsStatic = [
      'import _nfo from"./file-open-002ab408.js";',
      'import _ffo from"./file-open-7c801643.js";',
      'import _ndo from"./directory-open-4ed118d0.js";',
      'import _fdo from"./directory-open-01563666.js";',
      'import _nfs from"./file-save-745eba88.js";',
      'import _ffs from"./file-save-3189631c.js";',
      'const e=(()=>{if("undefined"==typeof self)return!1;if("top"in self&&self!==top)try{top}catch(e){return!1}else if("showOpenFilePicker"in self)return"showOpenFilePicker";return!1})();',
      'const t=Promise.resolve({default:e?_nfo:_ffo});async function n(...e){return(await t).default(...e)}',
      'const i=Promise.resolve({default:e?_ndo:_fdo});async function r(...e){return(await i).default(...e)}',
      'const o=Promise.resolve({default:e?_nfs:_ffs});async function s(...e){return(await o).default(...e)}',
      'export{r as directoryOpen,n as fileOpen,s as fileSave,e as supported};'
    ].join('\n')
    fs.writeFileSync(BFS_INDEX, bfsStatic, 'utf8')
    totalPatched += 6
    console.log('[patch-excalidraw] browser-fs-access: converted 6 dynamic imports to static')
  }
}

if (totalPatched === 0) {
  console.log('[patch-excalidraw] No dynamic imports to patch – already clean')
} else {
  console.log(`[patch-excalidraw] Total: ${totalPatched} dynamic import(s) neutralized`)
}
