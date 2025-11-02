import { collectMessages, parseFTL, serializeFTL, getMessagePattern, removeMessage, setMessagePattern } from './fluent'

export type Scope = {
  scopePath: string // e.g. src/business-apps/foo/bar
  i18nDir: string // e.g. src/business-apps/foo/bar/_i18n
  locales: Record<string, { raw: string; sha?: string }>
  parentScope?: string
}

export type Action =
  | { type: 'dedupe'; scope: string; locale: string; key: string }
  | { type: 'hoist-suggest'; fromScopes: string[]; toScope: string; locale: string; key: string; value: string }

export type Plan = { actions: Action[] }

export function buildPlan(scopes: Scope[], hoistMinimumChildren: number = 2): Plan {
  const actions: Action[] = []
  const byScope: Record<string, Scope> = Object.fromEntries(scopes.map(s => [s.scopePath, s]))
  // establish parent relationships by path segments
  for (const s of scopes) {
    const parts = s.scopePath.split('/')
    if (parts.length > 2) {
      const parent = parts.slice(0, -1).join('/')
      if (byScope[parent]) s.parentScope = parent
    }
  }
  // dedupe child if identical to parent
  for (const s of scopes) {
    if (!s.parentScope) continue
    const parent = byScope[s.parentScope]
    if (!parent) continue
    for (const [lc, file] of Object.entries(s.locales)) {
      const childAst = parseFTL(file.raw)
      const parentRaw = parent.locales[lc]?.raw
      if (!parentRaw) continue
      const parentAst = parseFTL(parentRaw)
      for (const key of Object.keys(collectMessages(childAst))) {
        const cv = getMessagePattern(childAst, key)
        const pv = getMessagePattern(parentAst, key)
        if (cv != null && pv != null && cv === pv) {
          actions.push({ type: 'dedupe', scope: s.scopePath, locale: lc, key })
        }
      }
    }
  }
  // hoist suggestions only (no auto-apply)
  const byParent: Record<string, Scope[]> = {}
  for (const s of scopes) {
    const p = s.parentScope || ''
    if (!p) continue
    byParent[p] ??= []
    byParent[p].push(s)
  }
  for (const [parentPath, children] of Object.entries(byParent)) {
    const parent = byScope[parentPath]
    const allLocales = new Set<string>()
    children.forEach(c => Object.keys(c.locales).forEach(l => allLocales.add(l)))
    for (const lc of allLocales) {
      const parentHas = parent.locales[lc] ? parseFTL(parent.locales[lc].raw) : null
      const childMaps = children.map(c => {
        const raw = c.locales[lc]?.raw || ''
        return collectMessages(parseFTL(raw))
      })
      const seen: Record<string, { value: string; scopes: string[] }> = {}
      children.forEach((c, i) => {
        for (const [k, v] of Object.entries(childMaps[i])) {
          if (!seen[k]) seen[k] = { value: v, scopes: [c.scopePath] }
          else if (seen[k].value === v) seen[k].scopes.push(c.scopePath)
          else seen[k].scopes = [] // conflict → not hoistable
        }
      })
      for (const [k, { value, scopes: sps }] of Object.entries(seen)) {
        if (sps.length >= hoistMinimumChildren) {
          const parentHasKey = parentHas ? !!getMessagePattern(parentHas, k) : false
          if (!parentHasKey) {
            actions.push({ type: 'hoist-suggest', fromScopes: sps, toScope: parentPath, locale: lc, key: k, value })
          }
        }
      }
    }
  }
  return { actions }
}

export function applyPlan(scopes: Scope[], plan: Plan, enableHoistKeys: Set<string>) {
  // enableHoistKeys contains keys in the form `${locale}:${toScope}:${key}` which user approved to hoist
  const state: Record<string, Record<string, string>> = {} // scope -> locale -> raw
  const ensureAst = (scopePath: string, locale: string) => {
    state[scopePath] ??= {}
    if (!state[scopePath][locale]) {
      const s = scopes.find(s => s.scopePath === scopePath)!
      const raw = s.locales[locale]?.raw || ''
      state[scopePath][locale] = raw
    }
    return state[scopePath][locale]
  }
  const setAst = (scopePath: string, locale: string, newRaw: string) => {
    state[scopePath] ??= {}
    state[scopePath][locale] = newRaw
  }

  for (const a of plan.actions) {
    if (a.type === 'dedupe') {
      const raw = ensureAst(a.scope, a.locale)
      const ast = parseFTL(raw)
      removeMessage(ast, a.key)
      setAst(a.scope, a.locale, serializeFTL(ast))
    } else if (a.type === 'hoist-suggest') {
      const keyStr = `${a.locale}:${a.toScope}:${a.key}`
      if (!enableHoistKeys.has(keyStr)) continue // only apply when user opted in
      // add to parent
      const parentRaw = ensureAst(a.toScope, a.locale)
      const parentAst = parseFTL(parentRaw)
      setMessagePattern(parentAst, a.key, a.value)
      setAst(a.toScope, a.locale, serializeFTL(parentAst))
      // remove from children
      for (const sp of a.fromScopes) {
        const childRaw = ensureAst(sp, a.locale)
        const childAst = parseFTL(childRaw)
        removeMessage(childAst, a.key)
        setAst(sp, a.locale, serializeFTL(childAst))
      }
    }
  }
  return state
}
