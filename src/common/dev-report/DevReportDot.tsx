import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env, setProductReportBaseUrlOverride } from '@/common/env/EnvUtils'
import { isHdCaptureActive, stopHdCapture } from './hdCapture'
import { submitGravityIssue } from './productReportApi'
import { captureDevReportScreenshot } from './screenshot'
import { getDevReportTelemetrySnapshot, startDevReportTelemetry } from './telemetry'
import type { CreateGravityIssueRequest, GravityIssueType } from './types'

const HD_STORAGE_KEY = 'dev-report-hd-screenshots'

function readHdPref(): boolean {
  try {
    return localStorage.getItem(HD_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}
function writeHdPref(on: boolean) {
  try {
    localStorage.setItem(HD_STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export interface DevReportDotProps {
  enabled: boolean
  screenKey: string
  context: BusinessAppContextProps
}

export function DevReportDot(props: Readonly<DevReportDotProps>) {
  const { enabled, screenKey, context } = props

  const [open, setOpen] = useState(false)
  const [productReportUrl, setProductReportUrl] = useState(() => env('NEXT_PUBLIC_PRODUCT_REPORT_BASE_URL') || '')
  const [baseUrlRefresh, setBaseUrlRefresh] = useState(0)
  const [type, setType] = useState<GravityIssueType>('BUG')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pendingScreenshot, setPendingScreenshot] = useState<Awaited<
    ReturnType<typeof captureDevReportScreenshot>
  > | null>(null)
  const [hdEnabled, setHdEnabled] = useState(readHdPref)
  const [hdActive, setHdActive] = useState(false)

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && description.trim().length > 0 && !isSubmitting
  }, [description, isSubmitting, title])

  if (!enabled) return null

  const baseUrl = useMemo(() => env('NEXT_PUBLIC_PRODUCT_REPORT_BASE_URL') || '', [baseUrlRefresh])
  const hasBaseUrl = Boolean(baseUrl)

  useEffect(() => {
    if (hasBaseUrl) return
    const ok = setProductReportBaseUrlOverride('https://product.newwork.com')
    if (ok) setBaseUrlRefresh(v => v + 1)
  }, [hasBaseUrl])

  useEffect(() => {
    if (!enabled) return
    startDevReportTelemetry()
  }, [enabled])

  const refreshHdStatus = useCallback(() => setHdActive(isHdCaptureActive()), [])

  const handleDotClick = async () => {
    setPendingScreenshot(null)
    const screenshotRes = await captureDevReportScreenshot(hdEnabled)
    setPendingScreenshot(screenshotRes)
    refreshHdStatus()
    setProductReportUrl(env('NEXT_PUBLIC_PRODUCT_REPORT_BASE_URL') || productReportUrl || '')
    setBaseUrlRefresh(v => v + 1)
    setOpen(true)
  }

  const handleOpenChange = (next: boolean) => {
    setSubmitError(null)
    setOpen(next)
    if (!next) setPendingScreenshot(null)
  }

  const handleToggleHd = () => {
    const next = !hdEnabled
    setHdEnabled(next)
    writeHdPref(next)
    if (!next) {
      stopHdCapture()
      setHdActive(false)
    }
  }

  const handleSaveProductReportUrl = () => {
    const ok = setProductReportBaseUrlOverride(productReportUrl)
    if (!ok) {
      setSubmitError('Please enter a valid http(s) URL')
      return
    }
    setSubmitError(null)
    setBaseUrlRefresh(v => v + 1)
    toast.success('Saved', {
      description: <span className="gba:text-foreground">Product Report URL saved for this browser.</span>,
      position: 'top-right'
    })
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    if (!hasBaseUrl) {
      setSubmitError('Please configure the Product Report URL first')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const pageUrl = typeof window !== 'undefined' ? window.location.href : undefined
    const buildInfo = typeof globalThis !== 'undefined' ? ((globalThis as any).__APP_BUILD_INFO__ ?? null) : null
    const screenshotRes = pendingScreenshot ?? { screenshot: null, error: 'no_pre_capture' }
    const telemetry = getDevReportTelemetrySnapshot()

    const payload: CreateGravityIssueRequest = {
      screenKey,
      type,
      title: title.trim(),
      description: description.trim(),
      pageUrl,
      buildInfo,
      evidence: {
        screenshot: screenshotRes.screenshot,
        screenshotError: screenshotRes.error ?? null,
        telemetry
      },
      reporter: {
        nwUserId: context.userInfo?.id,
        userName: context.userInfo?.userName,
        name:
          (context.userInfo?.givenName || context.userInfo?.familyName
            ? `${context.userInfo?.givenName || ''} ${context.userInfo?.familyName || ''}`.trim()
            : undefined) || context.userInfo?.userName
      }
    }

    const result = await submitGravityIssue(payload)
    if (result.ok) {
      toast.success('Report submitted', {
        description: (
          <span className="gba:text-foreground">
            <code className="gba:font-medium">{screenKey}</code>
          </span>
        ),
        position: 'top-right'
      })
      setTitle('')
      setDescription('')
      setType('BUG')
      setOpen(false)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setSubmitError(result.error || 'Failed to submit')
    toast.error('Failed to submit report', {
      description: <span className="gba:text-foreground">{result.error || 'Unknown error'}</span>,
      position: 'top-right'
    })
  }

  const tooltipLabel = type === 'BUG' ? 'Report bug' : 'Suggest feature'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDotClick}
            className="gba:fixed gba:bottom-2.5 gba:right-2.5 gba:h-4 gba:w-4 gba:p-0 gba:opacity-20 gba:hover:opacity-80 gba:transition-opacity gba:z-50"
            aria-label="Report issue"
            data-testid="dev-report-dot"
          >
            <span className="gba:block gba:h-2 gba:w-2 gba:rounded-full gba:bg-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipLabel}</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="gba:max-w-[560px]" data-testid="dev-report-dialog">
          <DialogHeader>
            <DialogTitle>Report</DialogTitle>
            <DialogDescription>
              Submit a bug report or feature suggestion for <code className="gba:font-medium">{screenKey}</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="gba:space-y-4">
            {!hasBaseUrl && (
              <div className="gba:space-y-2 gba:rounded-md gba:bg-muted gba:p-3" data-testid="dev-report-config">
                <Label htmlFor="dev-report-product-report-url">Product Report URL</Label>
                <div className="gba:flex gba:gap-2">
                  <Input
                    id="dev-report-product-report-url"
                    value={productReportUrl}
                    onChange={e => setProductReportUrl(e.target.value)}
                    placeholder="https://…"
                    data-testid="dev-report-product-report-url"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveProductReportUrl}
                    disabled={isSubmitting || productReportUrl.trim().length === 0}
                    data-testid="dev-report-product-report-url-save"
                  >
                    Save
                  </Button>
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  Your browser blocked automatic setup. Enter a valid URL to store it locally for dev reporting.
                </div>
              </div>
            )}

            <div className="gba:space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={v => setType(v as GravityIssueType)} disabled={isSubmitting}>
                <SelectTrigger data-testid="dev-report-type-trigger" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUG" data-testid="dev-report-type-bug">
                    Bug report
                  </SelectItem>
                  <SelectItem value="SUGGESTION" data-testid="dev-report-type-suggestion">
                    Feature suggestion
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="dev-report-title">Name</Label>
              <Input
                id="dev-report-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Short title"
                disabled={isSubmitting}
                data-testid="dev-report-title"
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="dev-report-description">Description</Label>
              <Textarea
                id="dev-report-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What happened? What did you expect?"
                rows={6}
                disabled={isSubmitting}
                data-testid="dev-report-description"
              />
            </div>

            <div
              className="gba:flex gba:items-center gba:justify-between gba:rounded-md gba:bg-muted gba:px-3 gba:py-2"
              data-testid="dev-report-hd-toggle"
            >
              <div>
                <div className="gba:text-sm gba:font-medium">HD screenshots</div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {hdActive ? 'Active — pixel-perfect capture' : 'One-time tab sharing on first use'}
                </div>
              </div>
              <Button
                type="button"
                variant={hdEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleHd}
                disabled={isSubmitting}
                data-testid="dev-report-hd-toggle-btn"
              >
                {hdEnabled ? 'On' : 'Off'}
              </Button>
            </div>

            {isSubmitting && (
              <div className="gba:text-sm gba:text-muted-foreground" data-testid="dev-report-submitting">
                Submitting…
              </div>
            )}

            {submitError && (
              <div
                className="gba:rounded-md gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:px-3 gba:py-2 gba:text-sm"
                data-testid="dev-report-error"
              >
                {submitError}
              </div>
            )}
          </div>

          <DialogFooter className="gba:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              data-testid="dev-report-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || !hasBaseUrl}
              loading={isSubmitting}
              data-testid="dev-report-submit"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
