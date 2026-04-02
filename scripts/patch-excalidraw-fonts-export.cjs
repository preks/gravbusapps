/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Excalidraw does not export `Fonts` publicly; we need it to register Funnel Display
 * (see src/.../whiteboard-apps/utils/registerFunnelDisplayExcalidraw.ts).
 *
 * Patches are idempotent. Written for @excalidraw/excalidraw@0.18.0 — re-check if upgrading.
 */
const fs = require('fs')
const path = require('path')

const pkgRoot = path.join(__dirname, '..', 'node_modules', '@excalidraw', 'excalidraw')

function patchDevIndex() {
  const devIndex = path.join(pkgRoot, 'dist', 'dev', 'index.js')
  if (!fs.existsSync(devIndex)) return
  let s = fs.readFileSync(devIndex, 'utf8')
  let changed = false

  if (!s.includes('  Fonts,\n  FooterCenter_default as Footer,')) {
    const needle = '  FONT_FAMILY,\n  FooterCenter_default as Footer,'
    if (s.includes(needle)) {
      s = s.replace(needle, '  FONT_FAMILY,\n  Fonts,\n  FooterCenter_default as Footer,')
      changed = true
    }
  }

  const desiredDefaultFonts = `var DEFAULT_FONTS = [
  {
    value: 4,
    icon: FontFamilyNormalIcon,
    text: "Funnel Display",
    testId: "font-family-funnel-display"
  }
];`
  if (!s.includes('testId: "font-family-funnel-display"') || s.includes('testId: "font-family-inter"')) {
    s = s.replace(/var DEFAULT_FONTS = \[[\s\S]*?\];/, desiredDefaultFonts)
    changed = true
  }

  if (changed) {
    fs.writeFileSync(devIndex, s)
  }
}

function patchDevChunk() {
  const devChunk = path.join(pkgRoot, 'dist', 'dev', 'chunk-3KPV5WBD.js')
  if (!fs.existsSync(devChunk)) return
  let s = fs.readFileSync(devChunk, 'utf8')
  const needle = `        shouldThrow: define_import_meta_env_default.DEV || define_import_meta_env_default.MODE === ENV.TEST,
        includeBoundTextValidation: true`
  if (!s.includes(needle)) return
  s = s.replace(
    needle,
    `        shouldThrow: define_import_meta_env_default.DEV || define_import_meta_env_default.MODE === ENV.TEST,
        includeBoundTextValidation: false`
  )
  fs.writeFileSync(devChunk, s)
}

function patchProdIndex() {
  const prodIndex = path.join(pkgRoot, 'dist', 'prod', 'index.js')
  if (!fs.existsSync(prodIndex)) return
  let s = fs.readFileSync(prodIndex, 'utf8')
  let changed = false

  if (!s.includes('Kr as FONT_FAMILY,br as Fonts,')) {
    const needle = 'Kr as FONT_FAMILY,iM as Footer'
    if (s.includes(needle)) {
      s = s.replace(needle, 'Kr as FONT_FAMILY,br as Fonts,iM as Footer')
      changed = true
    }
  }

  const desiredProdDefaultFonts =
    'var Uy=[{value:4,icon:Xl,text:"Funnel Display",testId:"font-family-funnel-display"}],N2=new Set'
  if (!s.includes('font-family-funnel-display') || s.includes('font-family-inter')) {
    s = s.replace(/var Uy=\[[\s\S]*?\],N2=new Set/, desiredProdDefaultFonts)
    changed = true
  }

  if (s.includes('includeBoundTextValidation:!0')) {
    s = s.replace('includeBoundTextValidation:!0', 'includeBoundTextValidation:!1')
    changed = true
  }

  if (changed) {
    fs.writeFileSync(prodIndex, s)
  }
}

function patchTypes() {
  const dts = path.join(pkgRoot, 'dist', 'types', 'excalidraw', 'index.d.ts')
  if (!fs.existsSync(dts)) return
  let s = fs.readFileSync(dts, 'utf8')
  if (s.includes('export { Fonts } from "./fonts/Fonts"')) return
  const needle =
    'export { FONT_FAMILY, THEME, MIME_TYPES, ROUNDNESS, DEFAULT_LASER_COLOR, UserIdleState, } from "./constants";\nexport { mutateElement'
  if (!s.includes(needle)) return
  fs.writeFileSync(
    dts,
    s.replace(
      needle,
      'export { FONT_FAMILY, THEME, MIME_TYPES, ROUNDNESS, DEFAULT_LASER_COLOR, UserIdleState, } from "./constants";\nexport { Fonts } from "./fonts/Fonts";\nexport { mutateElement'
    )
  )
}

function main() {
  if (!fs.existsSync(pkgRoot)) {
    return
  }
  patchDevIndex()
  patchDevChunk()
  patchProdIndex()
  patchTypes()
}

main()
