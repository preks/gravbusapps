/**
 * Copy @newwork/assets into public/platform/assets so Vite dev serves the same URLs as gravity-platform
 * (/platform/assets/... — see chatPlatformAssetUrls.ts). Run from npm run dev (start-dev-server) or manually.
 *
 * Production `vite build` deletes this folder before emitting dist/ (see vite.config.ts), so images are not
 * shipped with remote bundles — the host serves them.
 */
import { cp, mkdir, rm, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveAssetsStaticDir(root) {
  const pkgRoot = path.join(root, 'node_modules', '@newwork', 'assets')
  const distStatic = path.join(pkgRoot, 'dist', 'static')
  if (existsSync(distStatic)) {
    return distStatic
  }
  const legacyStatic = path.join(pkgRoot, 'static')
  if (existsSync(legacyStatic)) {
    return legacyStatic
  }
  return null
}

async function main() {
  const root = path.resolve(__dirname, '..')
  const srcDir = resolveAssetsStaticDir(root)
  const destDir = path.join(root, 'public', 'platform', 'assets')

  if (!srcDir) {
    console.error('[sync-platform-assets] Missing @newwork/assets static tree — run npm install @newwork/assets')
    process.exitCode = 1
    return
  }

  await rm(destDir, { recursive: true, force: true })
  await mkdir(destDir, { recursive: true })
  await cp(srcDir, destDir, { recursive: true })
  await stat(destDir)
  console.log('[sync-platform-assets] Copied to', destDir)
}

main().catch(err => {
  console.error('[sync-platform-assets] Error:', err)
  process.exitCode = 1
})
