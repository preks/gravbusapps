import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'
import { globSync } from 'glob'

const WORKSPACE_ROOT =
  process.env.WORKSPACE_ROOT || '/Users/denisprekrat/Documents/APPS/NEWWORK Apps/BusinessApps/gravity-business-apps'

const DEFAULT_DS_ROOT = '/Users/denisprekrat/Documents/APPS/NEWWORK Apps/nw-design-system'

const DS_ROOT = process.env.NWDS_PATH || DEFAULT_DS_ROOT
const DS_SRC = path.join(DS_ROOT, 'src')
const DS_INDEX = path.join(DS_SRC, 'index.ts')
const DS_TSCONFIG = path.join(DS_ROOT, 'tsconfig.json')

const OUT_FILE = path.join(WORKSPACE_ROOT, 'designs', 'nw-design-system-parity.json')

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}

function resolveModuleFile(baseDir, modulePathNoExt) {
  const candidates = [
    `${modulePathNoExt}.ts`,
    `${modulePathNoExt}.tsx`,
    path.join(modulePathNoExt, 'index.ts'),
    path.join(modulePathNoExt, 'index.tsx')
  ].map(p => path.resolve(baseDir, p))

  for (const c of candidates) {
    if (fileExists(c)) return c
  }
  return null
}

function parseIndexExportStars(indexText) {
  const lines = indexText.split(/\r?\n/)
  const exportStars = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    const m = line.match(/^export\s+\*\s+from\s+['"](.+)['"]\s*$/)
    if (!m) continue
    exportStars.push({
      from: m[1],
      line: i + 1
    })
  }
  return exportStars
}

function createSourceFile(filePath) {
  const text = readUtf8(filePath)
  return ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
}

function createDsProgram() {
  if (!fileExists(DS_TSCONFIG)) {
    // fall back to minimal compiler options if tsconfig is missing
    return ts.createProgram({
      rootNames: [DS_INDEX],
      options: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        jsx: ts.JsxEmit.ReactJSX,
        skipLibCheck: true
      }
    })
  }

  const configFile = ts.readConfigFile(DS_TSCONFIG, ts.sys.readFile)
  if (configFile.error) {
    const msg = ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')
    throw new Error(`Failed reading DS tsconfig: ${msg}`)
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, DS_ROOT, undefined, DS_TSCONFIG)

  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options
  })
}

function getNamedExportsFromModule(program, checker, moduleFilePath) {
  const sf = program.getSourceFile(moduleFilePath)
  if (!sf) {
    // Fallback: still emit something rather than dropping exports entirely.
    const fallbackSf = createSourceFile(moduleFilePath)
    return [
      {
        name: path.basename(moduleFilePath),
        kind: 'unknown',
        isType: false,
        sourceFile: fallbackSf.fileName
      }
    ]
  }

  const moduleSymbol = checker.getSymbolAtLocation(sf)
  if (!moduleSymbol) return []

  const out = []
  const exports = checker.getExportsOfModule(moduleSymbol)

  for (const sym of exports) {
    const aliased = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym
    const decls = (aliased.declarations && aliased.declarations.length ? aliased.declarations : sym.declarations) || []
    const isValue = Boolean(aliased.valueDeclaration || sym.valueDeclaration)
    const isType = !isValue
    const src = decls[0]?.getSourceFile()?.fileName || sf.fileName

    out.push({
      name: sym.name,
      kind: 'export',
      isType,
      sourceFile: src
    })
  }

  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return out
}

function findStoryFileForModule(moduleFilePath) {
  const dir = path.dirname(moduleFilePath)
  const base = path.basename(moduleFilePath).replace(/\.(ts|tsx)$/, '')
  const direct = path.join(dir, `${base}.stories.tsx`)
  if (fileExists(direct)) return direct

  // fallback: any *.stories.tsx in same directory
  const matches = globSync('*.stories.tsx', { cwd: dir, absolute: true })
  if (matches.length === 1) return matches[0]

  // last resort: prefer file matching directory name
  const dirName = path.basename(dir)
  const byDir = matches.find(m => m.toLowerCase().includes(dirName.toLowerCase()))
  return byDir || null
}

function isStringLiteralLike(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
}

function literalToString(node) {
  if (ts.isStringLiteral(node)) return node.text
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  return null
}

function extractArgTypesOptionsFromMeta(sf) {
  const argTypes = {}
  let metaTitle = null

  function extractArgTypesFromObjectLiteral(obj) {
    // Title (only from the meta object)
    const titleProp = obj.properties.find(
      p =>
        ts.isPropertyAssignment(p) &&
        ((ts.isIdentifier(p.name) && p.name.text === 'title') ||
          (isStringLiteralLike(p.name) && literalToString(p.name) === 'title')) &&
        isStringLiteralLike(p.initializer)
    )
    if (titleProp && ts.isPropertyAssignment(titleProp)) {
      metaTitle = literalToString(titleProp.initializer) || metaTitle
    }

    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue
      if (prop.name.text !== 'argTypes') continue
      if (!ts.isObjectLiteralExpression(prop.initializer)) return

      for (const atProp of prop.initializer.properties) {
        if (!ts.isPropertyAssignment(atProp)) continue
        const propName =
          (ts.isIdentifier(atProp.name) && atProp.name.text) ||
          (isStringLiteralLike(atProp.name) && literalToString(atProp.name)) ||
          null
        if (!propName || !ts.isObjectLiteralExpression(atProp.initializer)) continue

        const optionsProp = atProp.initializer.properties.find(
          p =>
            ts.isPropertyAssignment(p) &&
            ((ts.isIdentifier(p.name) && p.name.text === 'options') ||
              (isStringLiteralLike(p.name) && literalToString(p.name) === 'options'))
        )
        if (!optionsProp || !ts.isPropertyAssignment(optionsProp)) continue
        if (!ts.isArrayLiteralExpression(optionsProp.initializer)) continue
        const values = []
        for (const el of optionsProp.initializer.elements) {
          if (!isStringLiteralLike(el)) continue
          const v = literalToString(el)
          if (v) values.push(v)
        }
        if (values.length) argTypes[propName] = values
      }
    }
  }

  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      // heuristic: const meta = { ... }
      if (ts.isIdentifier(node.name) && node.name.text === 'meta') {
        extractArgTypesFromObjectLiteral(node.initializer)
      }
    }

    // heuristic: export default { ... }
    if (ts.isExportAssignment(node) && ts.isObjectLiteralExpression(node.expression)) {
      extractArgTypesFromObjectLiteral(node.expression)
    }

    ts.forEachChild(node, visit)
  }

  visit(sf)
  return { metaTitle, argTypes }
}

function extractStoryExports(sf) {
  const stories = []

  function visit(node) {
    if (ts.isVariableStatement(node) && node.modifiers) {
      const isExported = node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      if (!isExported) return
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text
          if (name === 'default' || name === 'meta') continue
          stories.push({ name })
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sf)
  return stories
}

function main() {
  if (!fileExists(DS_INDEX)) {
    throw new Error(`Design system index not found at: ${DS_INDEX}`)
  }

  const indexText = readUtf8(DS_INDEX)
  const exportStars = parseIndexExportStars(indexText)

  const program = createDsProgram()
  const checker = program.getTypeChecker()

  const modules = []
  const allSymbols = []

  for (const exp of exportStars) {
    const from = exp.from
    if (!from.startsWith('./')) continue
    const moduleNoExt = path.join(DS_SRC, from.replace(/^\.\//, ''))
    const moduleFile = resolveModuleFile(DS_SRC, from.replace(/^\.\//, ''))

    const moduleEntry = {
      exportStar: exp,
      from,
      resolvedFile: moduleFile,
      symbols: [],
      story: null
    }

    if (moduleFile) {
      const symbols = getNamedExportsFromModule(program, checker, moduleFile)
      moduleEntry.symbols = symbols
      for (const s of symbols) allSymbols.push({ ...s, moduleFrom: from })

      const storyFile = findStoryFileForModule(moduleFile)
      if (storyFile) {
        const storySf = createSourceFile(storyFile)
        const { metaTitle, argTypes } = extractArgTypesOptionsFromMeta(storySf)
        const stories = extractStoryExports(storySf)
        moduleEntry.story = {
          path: storyFile,
          metaTitle,
          argTypes,
          stories
        }
      }
    } else {
      moduleEntry.resolvedFile = null
      moduleEntry.resolutionHint = moduleNoExt
    }

    modules.push(moduleEntry)
  }

  const out = {
    schema: 'nw-design-system-parity',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    designSystemRoot: DS_ROOT,
    indexPath: DS_INDEX,
    workspaceRoot: WORKSPACE_ROOT,
    totals: {
      exportStarModules: modules.length,
      resolvedModules: modules.filter(m => m.resolvedFile).length,
      unresolvedModules: modules.filter(m => !m.resolvedFile).length,
      exportedSymbols: allSymbols.length,
      modulesWithStories: modules.filter(m => m.story).length
    },
    modules,
    exports: allSymbols.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8')

  console.log(`Wrote parity file: ${OUT_FILE}`)

  console.log(
    `Modules: ${out.totals.resolvedModules}/${out.totals.exportStarModules} resolved, ` +
      `${out.totals.modulesWithStories} with stories. Exports: ${out.totals.exportedSymbols}.`
  )
}

main()
