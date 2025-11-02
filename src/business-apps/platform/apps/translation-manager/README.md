# I18n Admin (Embedded)

Diese App liegt **komplett unter** `src/business-apps/platform/i18n-admin/` und kann in euer Business‑Apps‑Projekt eingebunden werden.

## Kernpunkte der Anforderungen

1. **Einfacher Aggregator (Index)**

   ```ts
   import translations from '../../../_i18n'

   import enUS from './en-US.ftl?raw'
   import deDE from './de-DE.ftl?raw'
   import roRO from './ro-RO.ftl?raw'

   export default {
     enUS: translations.enUS + '\n' + enUS,
     deDE: translations.deDE + '\n' + deDE,
     roRO: translations.roRO + '\n' + roRO
   } as { enUS: string; deDE: string; roRO: string }
   ```

   Generator: `lib/indexGenerator.ts`

2. **Datei‑Meta statt per Key**
   - Oben im `.ftl` steht ein Kommentar `# file-meta: {...}` mit `status`, `updatedBy`, `updatedAt`, `notes`.
   - Beim Einlesen wird außerdem der letzte Commit‑Zeitpunkt aus dem VCS angefragt.

3. **Reviewer‑fähiges Management**
   - Reviewer können im Tool Änderungen vornehmen, als PR einreichen und (optional) auto‑mergen lassen.
   - Wichtig: Aggregator sorgt dafür, dass **unten an den Komponenten** (Leaf‑Scopes) die finalen Werte ankommen (Parent + Local).

4. **Hoist nur als Vorschlag**
   - Keine Pflicht, identische Keys automatisch nach oben zu ziehen.
   - Das Tool zeigt **Vorschläge**; ihr entscheidet per Checkbox.

5. **GitHub & Bitbucket Support**
   - Abstraktion unter `vcs/` mit identischer API.
   - Scope‑Kette beginnt bei `src/business-apps/_i18n` und endet beim untersten definierten Scope.
   - **Nach oben** dürfen neue `_i18n`‑Dateien angelegt werden; **nach unten** nicht.

6. **App‑Pfad**
   - Liegt vollständig unter `src/business-apps/platform/i18n-admin`.
   - Für den lokalen Dev‑Start existiert ein Host (`index.html`, Vite), in eurer App importiert ihr `src/business-apps/platform/i18n-admin` direkt.

7. **Komplexe Selektoren**
   - Die UI arbeitet mit **serialisierten Patterns**; Updates nutzen AST‑Ersetzung → Plural/Switch‑Selektoren bleiben erhalten.

8. **PR erstellen & mergen**
   - Konfigurierbare Templates für **Branch**, **Commit**, **PR Title/Body**, **Auto‑Merge** inkl. Merge‑Methode.
   - Konfiguration in der App unter _Commit & PR Konventionen_.

## Dev‑Start (Standalone)

```bash
npm i
npm run dev
# http://localhost:5173
```

## Einbindung in eure App

```tsx
import I18nAdminApp from './business-apps/platform/i18n-admin'

export default function RouteI18nAdmin() {
  return <I18nAdminApp />
}
```

Bei Bedarf initiale Konfiguration über Props (`provider`, `owner/workspace`, `repo`, `branch`, `commit`‑Templates).
