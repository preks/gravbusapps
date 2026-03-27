/**
 * Starts Vite, opens dev smoke URL (?spreadsheetGridSmoke=1), waits for Univer canvas, writes PNG proof.
 *
 *   node scripts/capture-spreadsheet-grid-smoke-screenshot.mjs [out.png]
 *
 * Requires: npx playwright install chromium
 */

import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const outFile = path.resolve(process.argv[2] || path.join(process.cwd(), 'spreadsheet-grid-proof.png'))

function waitForPort(port, { host = 'localhost', timeoutMs = 120000 } = {}) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.createConnection({ port, host }, () => {
        socket.end()
        resolve(undefined)
      })
      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timeout waiting for ${host}:${port}`))
        } else {
          setTimeout(tryOnce, 250)
        }
      })
    }
    tryOnce()
  })
}

async function main() {
  const port = Number(process.env.SMOKE_PORT || '4044')
  const vite = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env }
  })

  let stderr = ''
  vite.stderr?.on('data', chunk => {
    stderr += String(chunk)
  })

  const killVite = () => {
    try {
      vite.kill('SIGTERM')
    } catch {
      /* ignore */
    }
  }

  process.on('SIGINT', killVite)
  process.on('SIGTERM', killVite)

  try {
    await waitForPort(port)
  } catch (e) {
    killVite()
    console.error(String(e), stderr.slice(-2000))
    process.exitCode = 1
    return
  }

  const url = `http://localhost:${port}/?spreadsheetGridSmoke=1`
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
    const host = page.locator('[data-testid="univer-sheet-grid-container"]').first()
    await host.waitFor({ state: 'visible', timeout: 120000 })
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="univer-sheet-grid-container"]')?.querySelectorAll('canvas').length > 0,
      { timeout: 120000 }
    )
    await page.screenshot({ path: outFile, fullPage: true })
    console.log('WROTE', outFile)
  } finally {
    await browser.close()
    killVite()
  }
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
