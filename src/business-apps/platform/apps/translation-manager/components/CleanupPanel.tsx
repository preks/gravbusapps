import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Checkbox, Label } from '@newwork/nw-design-system'
import type { UseTranslationTreeResult } from '../hooks/useTranslationTree'
import type { UseTranslationFileResult } from '../hooks/useTranslationFile'
import { buildPlan, applyPlan, Scope, Plan } from '../utils/cleanup'
import { parseFTL } from '../utils/fluent'
import { nowIso } from '../utils/utils'

interface CleanupPanelProps {
  translationTree: UseTranslationTreeResult
  translationFile: UseTranslationFileResult
  branch: string
}

function formatByTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_m, k) => vars[k] || `{${k}}`)
}

const CleanupPanel: React.FC<CleanupPanelProps> = ({ translationTree, translationFile, branch }) => {
  const [scopes, setScopes] = useState<Scope[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [hoistEnabled, setHoistEnabled] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (translationTree.scopes.length === 0) return
      setStatus('Analysiere…')

      // Load all files for all scopes using the hook
      const allFiles = translationTree.scopes.flatMap(ts => ts.files)
      await translationFile.loadFiles(allFiles, branch)

      // Build Scope objects from loaded files
      const scopesData: Scope[] = []

      for (const ts of translationTree.scopes) {
        const locales: Record<string, { raw: string; sha?: string }> = {}

        for (const filePath of ts.files) {
          const file = translationFile.files.get(filePath)
          if (file) {
            locales[file.locale] = { raw: file.content, sha: file.sha }
          }
        }

        scopesData.push({
          scopePath: ts.path,
          i18nDir: ts.path + '/_i18n',
          locales
        })
      }

      const p = buildPlan(scopesData, 2)
      if (!cancelled) {
        setScopes(scopesData)
        setPlan(p)
        setStatus('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [translationTree.scopes, translationFile, branch])

  const toggleHoist = (locale: string, toScope: string, key: string) => {
    const id = `${locale}:${toScope}:${key}`
    setHoistEnabled(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const apply = async () => {
    if (!plan) return
    setStatus('Cleanup wird ausgeführt…')

    const user = 'i18n-cleanup'
    const vars = {
      timestamp: nowIso(),
      user
    }

    // TODO: Load commit templates from settings
    const branchTemplate = 'i18n/cleanup/{timestamp}'
    const messageTemplate = 'i18n(cleanup): automated cleanup [{locale}]'
    const prTitleTemplate = 'i18n: automated cleanup'
    const prBodyTemplate = 'Automated cleanup: removing duplicates and hoisting common translations'

    const newBranch = formatByTemplate(branchTemplate, vars)
    await translationFile.ensureBranch(newBranch, branch)

    // Apply cleanup plan - returns state map of scope -> locale -> raw
    const updatedState = applyPlan(scopes, plan, hoistEnabled)

    // Save all updated files
    for (const [scopePath, locales] of Object.entries(updatedState)) {
      for (const [locale, raw] of Object.entries(locales)) {
        const filePath = `${scopePath}/_i18n/${locale}.ftl`
        const ast = parseFTL(raw)
        const msg = formatByTemplate(messageTemplate, { ...vars, locale })
        await translationFile.saveFile(filePath, ast, newBranch, msg)
      }
    }

    const prTitle = formatByTemplate(prTitleTemplate, vars)
    const prBody = prBodyTemplate
    await translationFile.createPullRequest(newBranch, branch, prTitle, prBody)

    setStatus('PR erstellt')
  }

  // Build hoistable suggestions from plan
  const hoistableSuggestions: Record<string, Record<string, string[]>> = {}
  if (plan) {
    plan.actions.forEach(action => {
      if (action.type === 'hoist-suggest') {
        if (!hoistableSuggestions[action.locale]) {
          hoistableSuggestions[action.locale] = {}
        }
        if (!hoistableSuggestions[action.locale][action.toScope]) {
          hoistableSuggestions[action.locale][action.toScope] = []
        }
        hoistableSuggestions[action.locale][action.toScope].push(action.key)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cleanup-Vorschläge</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <p className="gba:text-sm gba:text-muted-foreground">
          Automatische Analyse, um doppelte Übersetzungen zu entfernen oder häufige Werte hochzuheben.
        </p>

        {status && <div className="gba:text-sm gba:text-muted-foreground">{status}</div>}

        {Object.keys(hoistableSuggestions).length > 0 && (
          <div className="gba:space-y-4">
            {Object.entries(hoistableSuggestions).map(([locale, scopeMap]) => (
              <div key={locale} className="gba:border gba:rounded gba:p-3">
                <h4 className="gba:font-semibold gba:mb-2">Locale: {locale}</h4>
                <div className="gba:space-y-2">
                  {Object.entries(scopeMap).map(([toScope, keys]) => (
                    <div key={toScope} className="gba:pl-4">
                      <p className="gba:text-sm gba:font-medium gba:mb-1">→ {toScope}</p>
                      <div className="gba:pl-4 gba:space-y-1">
                        {keys.map(key => {
                          const id = `${locale}:${toScope}:${key}`
                          return (
                            <div key={key} className="gba:flex gba:items-center gba:gap-2">
                              <Checkbox
                                id={id}
                                checked={hoistEnabled.has(id)}
                                onCheckedChange={() => toggleHoist(locale, toScope, key)}
                              />
                              <Label htmlFor={id} className="gba:text-xs gba:cursor-pointer">
                                {key}
                              </Label>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="gba:flex gba:gap-2">
          <Button onClick={apply} disabled={!plan || hoistEnabled.size === 0}>
            Cleanup ausführen (PR)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default CleanupPanel
