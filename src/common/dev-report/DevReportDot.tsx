import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Separator,
  Spinner,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast
} from '@newwork/nw-design-system'
import { Bug, Camera, CameraOff, Lightbulb, Send } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env, setProductReportBaseUrlOverride } from '@/common/env/EnvUtils'
import { submitGravityIssue } from './productReportApi'
import { getReportedEnvironmentFromUrl } from './environment'
import { captureDevReportScreenshot } from './screenshot'
import { getDevReportTelemetrySnapshot, startDevReportTelemetry } from './telemetry'
import type { CreateGravityIssueRequest, GravityIssueType } from './types'

type Phase = 'form' | 'ask-screenshot' | 'capturing' | 'submitting'

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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')

  if (!enabled) return null

  const baseUrl = useMemo(() => env('NEXT_PUBLIC_PRODUCT_REPORT_BASE_URL') || '', [baseUrlRefresh])
  const hasBaseUrl = Boolean(baseUrl)
  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && phase === 'form'

  useEffect(() => {
    if (hasBaseUrl) return
    const ok = setProductReportBaseUrlOverride('https://product.newwork.com')
    if (ok) setBaseUrlRefresh(v => v + 1)
  }, [hasBaseUrl])

  useEffect(() => {
    if (!enabled) return
    startDevReportTelemetry()
  }, [enabled])

  const handleDotClick = () => {
    setPhase('form')
    setSubmitError(null)
    setProductReportUrl(env('NEXT_PUBLIC_PRODUCT_REPORT_BASE_URL') || productReportUrl || '')
    setBaseUrlRefresh(v => v + 1)
    setOpen(true)
  }

  const handleOpenChange = (next: boolean) => {
    if (phase === 'capturing' || phase === 'submitting') return
    setSubmitError(null)
    setOpen(next)
    if (!next) setPhase('form')
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

  const handleSubmitClick = () => {
    if (!canSubmit) return
    if (!hasBaseUrl) {
      setSubmitError('Please configure the Product Report URL first')
      return
    }
    setPhase('ask-screenshot')
  }

  const doSubmit = async (screenshotRes: { screenshot: any; error?: string }) => {
    const pageUrl = typeof window !== 'undefined' ? window.location.href : undefined
    const reportedEnvironment = getReportedEnvironmentFromUrl(pageUrl)
    const buildInfo = typeof globalThis !== 'undefined' ? ((globalThis as any).__APP_BUILD_INFO__ ?? null) : null
    const telemetry = getDevReportTelemetrySnapshot()

    const payload: CreateGravityIssueRequest = {
      screenKey,
      type,
      title: title.trim(),
      description: description.trim(),
      pageUrl,
      reportedEnvironment,
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
      setPhase('form')
      return
    }

    setPhase('form')
    setSubmitError(result.error || 'Failed to submit')
    toast.error('Failed to submit report', {
      description: <span className="gba:text-foreground">{result.error || 'Unknown error'}</span>,
      position: 'top-right'
    })
  }

  const handleScreenshotYes = async () => {
    setOpen(false)
    setPhase('capturing')
    await new Promise(r => setTimeout(r, 300))
    const screenshotRes = await captureDevReportScreenshot()
    setPhase('submitting')
    setOpen(true)
    await doSubmit(screenshotRes)
  }

  const handleScreenshotNo = async () => {
    setPhase('submitting')
    await doSubmit({ screenshot: null, error: 'user_skipped' })
  }

  const isBug = type === 'BUG'
  const TypeIcon = isBug ? Bug : Lightbulb
  const tooltipLabel = isBug ? 'Report bug' : 'Suggest feature'

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
        <DialogContent className="gba:max-w-[520px] gba:gap-0 gba:p-0" data-testid="dev-report-dialog">
          {phase === 'form' && (
            <>
              <div className="gba:px-6 gba:pt-6 gba:pb-4">
                <DialogHeader className="gba:pb-0">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div
                      className={`gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg ${isBug ? 'gba:bg-destructive-secondary' : 'gba:bg-info-secondary'}`}
                    >
                      <TypeIcon
                        className={`gba:h-4.5 gba:w-4.5 ${isBug ? 'gba:text-destructive-secondary-foreground' : 'gba:text-info-secondary-foreground'}`}
                      />
                    </div>
                    <div>
                      <DialogTitle className="gba:text-base">
                        {isBug ? 'Report a bug' : 'Suggest a feature'}
                      </DialogTitle>
                      <DialogDescription className="gba:mt-0.5">
                        <Badge variant="secondary" className="gba:font-mono gba:text-xs">
                          {screenKey}
                        </Badge>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <Separator />

              <div className="gba:space-y-4 gba:px-6 gba:py-5">
                {!hasBaseUrl && (
                  <div
                    className="gba:space-y-2 gba:rounded-lg gba:border gba:border-warning gba:bg-warning-secondary gba:p-3"
                    data-testid="dev-report-config"
                  >
                    <Label htmlFor="dev-report-product-report-url" className="gba:text-warning-secondary-foreground">
                      Product Report URL
                    </Label>
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
                        disabled={productReportUrl.trim().length === 0}
                        data-testid="dev-report-product-report-url-save"
                      >
                        Save
                      </Button>
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Automatic setup was blocked. Enter the URL manually.
                    </p>
                  </div>
                )}

                <div className="gba:space-y-2">
                  <Label className="gba:text-xs gba:text-muted-foreground">Type</Label>
                  <div className="gba:grid gba:grid-cols-2 gba:gap-2" data-testid="dev-report-type-toggle">
                    <Button
                      type="button"
                      variant={isBug ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setType('BUG')}
                      className="gba:gap-2"
                      data-testid="dev-report-type-bug"
                    >
                      <Bug className="gba:h-3.5 gba:w-3.5" />
                      Bug report
                    </Button>
                    <Button
                      type="button"
                      variant={!isBug ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setType('SUGGESTION')}
                      className="gba:gap-2"
                      data-testid="dev-report-type-suggestion"
                    >
                      <Lightbulb className="gba:h-3.5 gba:w-3.5" />
                      Feature idea
                    </Button>
                  </div>
                </div>

                <div className="gba:space-y-1.5">
                  <Label htmlFor="dev-report-title" className="gba:text-xs gba:text-muted-foreground">
                    Title
                  </Label>
                  <Input
                    id="dev-report-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={isBug ? 'What went wrong?' : 'What would be useful?'}
                    data-testid="dev-report-title"
                  />
                </div>

                <div className="gba:space-y-1.5">
                  <Label htmlFor="dev-report-description" className="gba:text-xs gba:text-muted-foreground">
                    Description
                  </Label>
                  <Textarea
                    id="dev-report-description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={
                      isBug
                        ? 'Steps to reproduce, expected vs actual behavior…'
                        : 'Describe the feature and why it would help…'
                    }
                    rows={4}
                    data-testid="dev-report-description"
                  />
                </div>

                {submitError && (
                  <div
                    className="gba:rounded-lg gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:px-3 gba:py-2 gba:text-sm"
                    data-testid="dev-report-error"
                  >
                    {submitError}
                  </div>
                )}
              </div>

              <Separator />

              <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:px-6 gba:py-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  data-testid="dev-report-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmitClick}
                  disabled={!canSubmit || !hasBaseUrl}
                  className="gba:gap-2"
                  data-testid="dev-report-submit"
                >
                  <Send className="gba:h-3.5 gba:w-3.5" />
                  Submit
                </Button>
              </div>
            </>
          )}

          {phase === 'ask-screenshot' && (
            <div className="gba:flex gba:flex-col gba:items-center gba:px-6 gba:py-8">
              <div className="gba:flex gba:h-12 gba:w-12 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
                <Camera className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
              </div>
              <DialogHeader className="gba:mt-4 gba:text-center">
                <DialogTitle className="gba:text-base">Include a screenshot?</DialogTitle>
                <DialogDescription className="gba:mt-1">
                  Capture the current page to attach to your report.
                </DialogDescription>
              </DialogHeader>
              <div className="gba:mt-6 gba:flex gba:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleScreenshotNo}
                  className="gba:gap-2"
                  data-testid="dev-report-screenshot-no"
                >
                  <CameraOff className="gba:h-3.5 gba:w-3.5" />
                  Skip
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleScreenshotYes}
                  className="gba:gap-2"
                  data-testid="dev-report-screenshot-yes"
                >
                  <Camera className="gba:h-3.5 gba:w-3.5" />
                  Capture
                </Button>
              </div>
            </div>
          )}

          {phase === 'submitting' && (
            <div
              className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:px-6 gba:py-12"
              data-testid="dev-report-submitting"
            >
              <Spinner size="md" />
              <p className="gba:text-sm gba:text-muted-foreground">Sending your report…</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
