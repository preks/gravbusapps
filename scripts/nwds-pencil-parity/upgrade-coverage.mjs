import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const WORKSPACE_ROOT =
  process.env.WORKSPACE_ROOT || '/Users/denisprekrat/Documents/APPS/NEWWORK Apps/BusinessApps/gravity-business-apps'

const COVERAGE_PATH = path.join(WORKSPACE_ROOT, 'designs', 'nw-design-system-coverage.json')

const PARITY_PATH = path.join(WORKSPACE_ROOT, 'designs', 'nw-design-system-parity.json')

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function stableKey(a) {
  return `${a.moduleFrom}::${a.name}::${a.isType ? 'type' : 'value'}`
}

function normalizeStoryKey(name) {
  if (!name || typeof name !== 'string') return null
  return name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

function buildRequiredVariantKeys(argTypes) {
  const keys = []
  const seen = new Set()
  for (const [prop, options] of Object.entries(argTypes || {})) {
    if (!Array.isArray(options)) continue
    for (const option of options) {
      const key = `${prop}=${String(option)}`
      if (seen.has(key)) continue
      seen.add(key)
      keys.push(key)
    }
  }
  return keys
}

function buildRequiredStoryKeys(stories) {
  const keys = []
  const seen = new Set()
  for (const story of stories || []) {
    const key = normalizeStoryKey(story)
    if (!key || seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return keys
}

function main() {
  const prev = readJson(COVERAGE_PATH)
  const parity = readJson(PARITY_PATH)

  const prevFamilies = prev.componentFamilies || prev.legacy?.componentFamilies || []

  const familyByExport = new Map()
  for (const fam of prevFamilies) {
    if (!fam?.nwExport) continue
    familyByExport.set(fam.nwExport, fam)
  }

  const storyByModuleFrom = new Map()
  for (const mod of parity.modules || []) {
    if (mod?.from) storyByModuleFrom.set(mod.from, mod.story || null)
  }

  const prevExportMapping = new Map()
  const prevVariantCoverage = new Map()
  const prevStoryCoverage = new Map()
  for (const e of prev.exports || []) {
    if (!e?.name || !e?.moduleFrom) continue
    if (e.status !== 'mapped' || !e.pencil?.componentIds?.length) continue
    prevExportMapping.set(`${e.moduleFrom}::${e.name}`, e.pencil)
    if (e.variantCoverage && typeof e.variantCoverage === 'object') {
      prevVariantCoverage.set(`${e.moduleFrom}::${e.name}`, e.variantCoverage)
    }
    if (e.storyCoverage && typeof e.storyCoverage === 'object') {
      prevStoryCoverage.set(`${e.moduleFrom}::${e.name}`, e.storyCoverage)
    }
  }

  const exports = (parity.exports || []).map(e => {
    const fam = familyByExport.get(e.name)
    const story = storyByModuleFrom.get(e.moduleFrom) || null

    const isNonVisualModule =
      typeof e.moduleFrom === 'string' && (e.moduleFrom.startsWith('./lib/') || e.moduleFrom.startsWith('./hooks/'))

    const isNonVisualName =
      typeof e.name === 'string' &&
      (/^use[A-Z0-9_]/.test(e.name) ||
        /^get[A-Z0-9_]/.test(e.name) ||
        /^detect[A-Z0-9_]/.test(e.name) ||
        /^generate[A-Z0-9_]/.test(e.name) ||
        /^[A-Z0-9_]+$/.test(e.name) ||
        e.name === 'toast' ||
        e.name.endsWith('Provider') ||
        e.name.endsWith('Context') ||
        e.name.endsWith('Portal') ||
        e.name.endsWith('Group') ||
        e.name.endsWith('RadioGroup') ||
        e.name.endsWith('Sub') ||
        e.name.endsWith('Renderer') ||
        e.name.endsWith('COLORS') ||
        e.name.endsWith('Variants') ||
        e.name.endsWith('variants') ||
        e.name.endsWith('Style') ||
        e.name.endsWith('Styles') ||
        e.name.endsWith('Config') ||
        e.name.endsWith('Options') ||
        e.name.endsWith('DEFAULT_EMPTY_STATES'))

    const isNonVisual = Boolean(e.isType) || isNonVisualModule || isNonVisualName

    const prevPencil = prevExportMapping.get(`${e.moduleFrom}::${e.name}`) || null

    const mappedPencilComponents = fam?.pencilComponents || []
    const pencilComponentIds = mappedPencilComponents.map(pc => pc.id).filter(Boolean)

    const pencil =
      prevPencil ||
      (pencilComponentIds.length
        ? {
            componentIds: pencilComponentIds,
            componentNames: mappedPencilComponents.map(pc => pc.name).filter(Boolean)
          }
        : null)

    const status = isNonVisual ? 'non_visual' : pencil ? 'mapped' : 'missing'
    const requiredVariantKeys = buildRequiredVariantKeys(story?.argTypes || {})
    const requiredStoryKeys = buildRequiredStoryKeys((story?.stories || []).map(s => s.name).filter(Boolean))
    const coverageKey = `${e.moduleFrom}::${e.name}`
    const variantCoverage = prevVariantCoverage.get(coverageKey) || {}
    const storyCoverage = prevStoryCoverage.get(coverageKey) || {}

    return {
      name: e.name,
      moduleFrom: e.moduleFrom,
      sourceFile: e.sourceFile,
      kind: e.kind,
      isType: Boolean(e.isType),
      story: story
        ? {
            path: story.path || null,
            argTypes: story.argTypes || {},
            stories: (story.stories || []).map(s => s.name).filter(Boolean)
          }
        : null,
      pencil: status === 'mapped' ? pencil : null,
      requiredVariantKeys,
      requiredStoryKeys,
      variantCoverage,
      storyCoverage,
      status
    }
  })

  exports.sort((a, b) => (stableKey(a) < stableKey(b) ? -1 : stableKey(a) > stableKey(b) ? 1 : 0))

  const summary = {
    exportedSymbols: exports.length,
    mapped: exports.filter(e => e.status === 'mapped').length,
    nonVisual: exports.filter(e => e.status === 'non_visual').length,
    missing: exports.filter(e => e.status === 'missing').length,
    modules: {
      exportStarModules: parity.totals?.exportStarModules ?? null,
      modulesWithStories: parity.totals?.modulesWithStories ?? null
    },
    missingVariantMappings: exports.reduce((acc, e) => {
      if (e.status !== 'mapped') return acc
      const missing = (e.requiredVariantKeys || []).filter(k => !e.variantCoverage?.[k])
      return acc + missing.length
    }, 0),
    missingStoryMappings: exports.reduce((acc, e) => {
      if (e.status !== 'mapped') return acc
      const missing = (e.requiredStoryKeys || []).filter(k => !e.storyCoverage?.[k])
      return acc + missing.length
    }, 0)
  }

  const upgraded = {
    $schema: 'nw-design-system-pencil-coverage',
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    lastVerified: prev.lastVerified || null,
    sourceDesignSystem: prev.sourceDesignSystem || parity.designSystemRoot || null,
    pencilFile: prev.pencilFile || null,
    tokenCoverage: prev.tokenCoverage || null,

    // New: per-export ledger (every exported symbol, plus story requirements where available)
    exports,
    summary,

    // Keep previous v1 families for reference only (will be removed after full mapping is complete)
    legacy: {
      componentFamilies: prevFamilies,
      syncProtocol: prev.syncProtocol || prev.legacy?.syncProtocol || null
    }
  }

  writeJson(COVERAGE_PATH, upgraded)

  console.log(`Upgraded coverage manifest: ${COVERAGE_PATH}`)

  console.log(
    `Exports: ${summary.exportedSymbols} (mapped ${summary.mapped}, non-visual ${summary.nonVisual}, missing ${summary.missing})`
  )
}

main()
