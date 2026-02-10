# Backend Fix: pnpm Dependency Collection

## Problem

`@radix-ui/react-context` und andere transitive Dependencies fehlen in der Response vom `/previews` Endpoint.

**Beweis aus Frontend-Logs:**

```
[SandboxContainer] Has @radix-ui/react-context? false
```

**Fehler in Sandpack:**

```
ModuleNotFoundError: Could not find module in path: '@radix-ui/react-context'
relative to '/node_modules/@radix-ui/react-accordion/dist/index.js'
```

## Root Cause

pnpm speichert Packages NICHT flach in `node_modules`, sondern in einer `.pnpm` Store-Struktur:

```
node_modules/
  .pnpm/                                    ← Die echten Packages sind hier!
    @radix-ui+react-context@1.1.2/
      node_modules/
        @radix-ui/
          react-context/
            package.json                     ← Version 1.1.2
    @radix-ui+react-accordion@1.2.3/
      node_modules/
        @radix-ui/
          react-accordion/
            package.json                     ← Version 1.2.3
  @radix-ui/
    react-accordion/                         ← Dies ist nur ein Symlink!
    react-context/                           ← Dies ist nur ein Symlink!
```

Die aktuelle Implementierung in `preview.service.ts` (`parseAllDependenciesFromLockFile`) liest vermutlich nur die Symlinks oder parst die `pnpm-lock.yaml` nicht korrekt für peerDependencies.

## Lösung

Ersetzen Sie die Methode `parseAllDependenciesFromLockFile` in `preview.service.ts` mit dieser Implementierung, die direkt aus dem `.pnpm` Store liest:

```typescript
/**
 * Read all dependencies from pnpm .pnpm store
 */
private async parseAllDependenciesFromLockFile(cachePath: string): Promise<Record<string, string>> {
  try {
    const pnpmStorePath = path.join(cachePath, 'node_modules', '.pnpm');
    const allDeps: Record<string, string> = {};

    // Check if .pnpm directory exists
    try {
      await fs.access(pnpmStorePath);
    } catch {
      this.logger.warn('.pnpm directory not found, falling back to package.json only');
      return await this.fallbackToPackageJson(cachePath);
    }

    // Read all items in .pnpm store
    const storeItems = await fs.readdir(pnpmStorePath);

    for (const item of storeItems) {
      // Format examples:
      // - @radix-ui+react-context@1.1.2
      // - react@18.3.1
      // - @types+react@18.3.28

      // Match pattern: packageName@version
      // For scoped packages, the scope uses + instead of /
      const match = item.match(/^(.+?)@([0-9].+?)$/);
      if (!match) {
        continue; // Skip items that don't match the pattern
      }

      let packageName = match[1];
      const version = match[2];

      // Convert pnpm format to npm format: @scope+package -> @scope/package
      packageName = packageName.replace('+', '/');

      // Skip private packages (they're handled separately as IIFE bundles)
      if (packageName.startsWith('@newwork/')) {
        continue;
      }

      // Skip dev-only packages (not needed in browser)
      const devOnlyPackages = [
        '@esbuild/', '@babel/', '@eslint/', '@next/', '@img/', '@rollup/',
        'esbuild', 'eslint', 'typescript', 'vite', 'playwright', 'vitest'
      ];

      if (devOnlyPackages.some(prefix => packageName.startsWith(prefix) || packageName === prefix)) {
        continue;
      }

      allDeps[packageName] = version;
    }

    this.logger.log(`Found ${Object.keys(allDeps).length} packages in .pnpm store`);

    // Log sample for verification
    const radixPackages = Object.keys(allDeps).filter(name => name.startsWith('@radix-ui/'));
    this.logger.log(`Radix UI packages found: ${radixPackages.length} (including: ${radixPackages.slice(0, 5).join(', ')})`);

    return allDeps;

  } catch (error: any) {
    this.logger.error(`Failed to read .pnpm store: ${error.message}`);
    return await this.fallbackToPackageJson(cachePath);
  }
}

/**
 * Fallback: read only direct dependencies from package.json
 */
private async fallbackToPackageJson(cachePath: string): Promise<Record<string, string>> {
  try {
    const packageJsonPath = path.join(cachePath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = packageJson.dependencies || {};

    const allDeps: Record<string, string> = {};

    for (const [packageName, depValue] of Object.entries(dependencies)) {
      if (typeof depValue === 'string' &&
          !packageName.startsWith('@newwork/') &&
          !depValue.endsWith('.tgz')) {
        // Remove ^ or ~ from version
        allDeps[packageName] = depValue.replace(/^[\^~]/, '');
      }
    }

    this.logger.warn(`Using fallback: only ${Object.keys(allDeps).length} direct dependencies from package.json`);
    return allDeps;

  } catch (error: any) {
    this.logger.error(`Fallback also failed: ${error.message}`);
    return {};
  }
}
```

## Testing

Nach der Implementierung, testen Sie mit diesen Checks:

1. **Backend-Log prüfen:**

   ```
   Found XXX packages in .pnpm store
   Radix UI packages found: XX (including: @radix-ui/react-context, ...)
   ```

2. **API Response prüfen:**

   ```bash
   curl http://localhost:3000/previews?repoId=xxx&sessionId=xxx | jq '.dependencies | keys | map(select(startswith("@radix-ui/")))'
   ```

   Sollte enthalten: `@radix-ui/react-context`, `@radix-ui/react-primitive`, etc.

3. **Frontend-Log prüfen:**
   ```
   [SandboxContainer] Has @radix-ui/react-context? true
   ```

## Warum diese Lösung funktioniert

1. **Liest direkt aus `.pnpm` Store** - Keine komplexe Lock-File-Parsing-Logik nötig
2. **Enthält ALLE installierten Packages** - Inklusive transitive dependencies und peer dependencies
3. **Einfach zu debuggen** - Klare Logs zeigen, was gefunden wurde
4. **Robuster Fallback** - Verwendet package.json wenn .pnpm nicht existiert
5. **Filtert Dev-Dependencies** - Vermeidet 403 Errors von CodeSandbox CDN

## Alternative (wenn das nicht funktioniert)

Falls das `.pnpm` Directory nicht existiert oder eine andere pnpm-Version verwendet wird:

```typescript
// Führe pnpm list aus und parse die Ausgabe
const { execSync } = require('child_process')

const output = execSync('pnpm list --json --depth=Infinity', {
  cwd: cachePath,
  encoding: 'utf-8'
})

const packages = JSON.parse(output)
// Parse packages recursively...
```

Aber die `.pnpm` Store-Lösung ist einfacher und schneller.
