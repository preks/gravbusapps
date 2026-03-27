import { useEffect, useMemo, useRef, useState } from 'react'
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
import { ArrowLeft, Bug, Camera, ChevronRight, Clipboard, Lightbulb, Send, Upload, X } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env, setProductReportBaseUrlOverride } from '@/common/env/EnvUtils'
import { submitGravityIssue } from './productReportApi'
import { getReportedEnvironmentFromUrl } from './environment'
import { blobToDevReportScreenshot, captureDevReportScreenshot, MAX_SCREENSHOTS_PER_ISSUE } from './screenshot'
import { getDevReportTelemetrySnapshot, startDevReportTelemetry } from './telemetry'
import type { CreateGravityIssueRequest, GravityIssueType } from './types'
import type { DevReportScreenshot } from './screenshot'

type Phase = 'form' | 'capturing' | 'review-screenshots' | 'submitting'

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
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [expectedBehaviour, setExpectedBehaviour] = useState('')
  const [actualBehaviour, setActualBehaviour] = useState('')
  const [screenshots, setScreenshots] = useState<DevReportScreenshot[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')

  if (!enabled) return null

  const baseUrl = useMemo(() => env('NEXT_PUBLIC_PRODUCT_REPORT_BASE_URL') || '', [baseUrlRefresh])
  const hasBaseUrl = Boolean(baseUrl)
  const canSubmit =
    phase === 'form' &&
    title.trim().length > 0 &&
    (type === 'BUG' ? stepsToReproduce.trim().length > 0 : description.trim().length > 0)

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
    setScreenshots([])
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
    setPhase('review-screenshots')
  }

  const doSubmit = async (capturedScreenshots: DevReportScreenshot[]) => {
    const composedDescription =
      type === 'BUG'
        ? [
            `**Steps to Reproduce:**\n${stepsToReproduce.trim()}`,
            expectedBehaviour.trim() ? `**Expected Behaviour:**\n${expectedBehaviour.trim()}` : '',
            actualBehaviour.trim() ? `**Actual Behaviour:**\n${actualBehaviour.trim()}` : ''
          ]
            .filter(Boolean)
            .join('\n\n')
        : description.trim()

    const pageUrl = typeof window !== 'undefined' ? window.location.href : undefined
    const reportedEnvironment = getReportedEnvironmentFromUrl(pageUrl)
    const buildInfo = typeof globalThis !== 'undefined' ? ((globalThis as any).__APP_BUILD_INFO__ ?? null) : null
    const telemetry = getDevReportTelemetrySnapshot()

    const payload: CreateGravityIssueRequest = {
      screenKey,
      type,
      title: title.trim(),
      description: composedDescription,
      pageUrl,
      reportedEnvironment,
      buildInfo,
      evidence: {
        screenshot: capturedScreenshots[0] ?? null,
        screenshots: capturedScreenshots.length > 0 ? capturedScreenshots : null,
        screenshotError: capturedScreenshots.length === 0 ? 'user_skipped' : null,
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
      setStepsToReproduce('')
      setExpectedBehaviour('')
      setActualBehaviour('')
      setScreenshots([])
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

  const handleCaptureScreenshot = async () => {
    if (screenshots.length >= MAX_SCREENSHOTS_PER_ISSUE) {
      toast.error('Screenshot limit reached', {
        description: (
          <span className="gba:text-foreground">Maximum {MAX_SCREENSHOTS_PER_ISSUE} screenshots per issue.</span>
        ),
        position: 'top-right'
      })
      return
    }
    setPhase('capturing')
    setOpen(false)
    await new Promise(r => setTimeout(r, 300))
    const result = await captureDevReportScreenshot()
    if (result.screenshot) {
      setScreenshots(prev => [...prev, result.screenshot!])
    } else {
      toast.error('Screenshot failed', {
        description: <span className="gba:text-foreground">{result.error || 'Could not capture screenshot'}</span>,
        position: 'top-right'
      })
    }
    setPhase('form')
    setOpen(true)
  }

  const handleFinalSubmit = async () => {
    setPhase('submitting')
    await doSubmit(screenshots)
  }

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index))
  }

  const handlePasteFromClipboard = async () => {
    if (screenshots.length >= MAX_SCREENSHOTS_PER_ISSUE) {
      toast.error('Screenshot limit reached', {
        description: (
          <span className="gba:text-foreground">Maximum {MAX_SCREENSHOTS_PER_ISSUE} screenshots per issue.</span>
        ),
        position: 'top-right'
      })
      return
    }
    try {
      const items = await navigator.clipboard.read()
      let added = false
      const remaining = MAX_SCREENSHOTS_PER_ISSUE - screenshots.length
      let processed = 0
      for (const item of items) {
        if (processed >= remaining) break
        const imageType = item.types.find(t => t.startsWith('image/'))
        if (!imageType) continue
        const blob = await item.getType(imageType)
        const screenshot = await blobToDevReportScreenshot(blob)
        if (screenshot) {
          setScreenshots(prev => [...prev, screenshot])
          added = true
          processed++
        }
      }
      if (!added) {
        toast.error('No image in clipboard', {
          description: <span className="gba:text-foreground">Copy an image first, then paste.</span>,
          position: 'top-right'
        })
      }
    } catch {
      toast.error('Clipboard paste failed', {
        description: <span className="gba:text-foreground">No image found or clipboard permission denied.</span>,
        position: 'top-right'
      })
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    let count = screenshots.length
    for (const file of files) {
      if (count >= MAX_SCREENSHOTS_PER_ISSUE) {
        toast.error('Screenshot limit reached', {
          description: (
            <span className="gba:text-foreground">Maximum {MAX_SCREENSHOTS_PER_ISSUE} screenshots per issue.</span>
          ),
          position: 'top-right'
        })
        break
      }
      if (!file.type.startsWith('image/')) continue
      const screenshot = await blobToDevReportScreenshot(file)
      if (screenshot) {
        setScreenshots(prev => [...prev, screenshot])
        count++
      } else {
        toast.error('Image too large', {
          description: <span className="gba:text-foreground">{file.name} exceeds the 1.1 MB limit.</span>,
          position: 'top-right'
        })
      }
    }
    e.target.value = ''
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
            className="gba:fixed gba:bottom-2.5 gba:right-2.5 gba:h-4 gba:w-4 gba:p-0 gba:opacity-20 gba:hover:opacity-80 gba:transition-opacity gba:z-[2147483647]"
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

                {isBug ? (
                  <>
                    <div className="gba:space-y-1.5">
                      <Label htmlFor="dev-report-steps" className="gba:text-xs gba:text-muted-foreground">
                        Steps to Reproduce
                      </Label>
                      <Textarea
                        id="dev-report-steps"
                        value={stepsToReproduce}
                        onChange={e => setStepsToReproduce(e.target.value)}
                        placeholder={'1. Go to…\n2. Click on…\n3. Observe…'}
                        rows={3}
                        data-testid="dev-report-steps"
                      />
                    </div>
                    <div className="gba:space-y-1.5">
                      <Label htmlFor="dev-report-expected" className="gba:text-xs gba:text-muted-foreground">
                        Expected Behaviour
                      </Label>
                      <Textarea
                        id="dev-report-expected"
                        value={expectedBehaviour}
                        onChange={e => setExpectedBehaviour(e.target.value)}
                        placeholder="What did you expect to happen?"
                        rows={2}
                        data-testid="dev-report-expected"
                      />
                    </div>
                    <div className="gba:space-y-1.5">
                      <Label htmlFor="dev-report-actual" className="gba:text-xs gba:text-muted-foreground">
                        Actual Behaviour
                      </Label>
                      <Textarea
                        id="dev-report-actual"
                        value={actualBehaviour}
                        onChange={e => setActualBehaviour(e.target.value)}
                        placeholder="What actually happened?"
                        rows={2}
                        data-testid="dev-report-actual"
                      />
                    </div>
                  </>
                ) : (
                  <div className="gba:space-y-1.5">
                    <Label htmlFor="dev-report-description" className="gba:text-xs gba:text-muted-foreground">
                      Description
                    </Label>
                    <Textarea
                      id="dev-report-description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Describe the feature and why it would help…"
                      rows={4}
                      data-testid="dev-report-description"
                    />
                  </div>
                )}

                <div className="gba:space-y-2">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <Label className="gba:text-xs gba:text-muted-foreground">Page screenshot</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCaptureScreenshot}
                      disabled={screenshots.length >= MAX_SCREENSHOTS_PER_ISSUE}
                      className="gba:gap-1.5 gba:h-7 gba:text-xs"
                      data-testid="dev-report-capture"
                    >
                      <Camera className="gba:h-3 gba:w-3" />
                      Capture page
                    </Button>
                  </div>
                  {screenshots.length > 0 && (
                    <div className="gba:grid gba:grid-cols-4 gba:gap-1.5">
                      {screenshots.map((ss, idx) => (
                        <div key={idx} className="gba:relative gba:group gba:rounded gba:overflow-hidden gba:border">
                          <img
                            src={ss.dataUrl}
                            alt={`Screenshot ${idx + 1}`}
                            className="gba:w-full gba:h-auto"
                            data-testid={`dev-report-screenshot-preview-${idx}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveScreenshot(idx)}
                            className="gba:absolute gba:top-0.5 gba:right-0.5 gba:h-4 gba:w-4 gba:rounded-full gba:bg-destructive gba:text-destructive-foreground gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
                            data-testid={`dev-report-screenshot-remove-${idx}`}
                          >
                            <X className="gba:h-2.5 gba:w-2.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
                  Next
                  <ChevronRight className="gba:h-3.5 gba:w-3.5" />
                </Button>
              </div>
            </>
          )}

          {phase === 'review-screenshots' && (
            <>
              <div className="gba:px-6 gba:pt-6 gba:pb-4">
                <DialogHeader className="gba:pb-0">
                  <DialogTitle className="gba:text-base">Review screenshots</DialogTitle>
                  <DialogDescription className="gba:mt-0.5">
                    Add more screenshots from your clipboard or files, then submit.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <Separator />

              <div className="gba:space-y-4 gba:px-6 gba:py-5">
                {screenshots.length > 0 && (
                  <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                    {screenshots.map((ss, idx) => (
                      <div key={idx} className="gba:relative gba:group gba:rounded-md gba:overflow-hidden gba:border">
                        <img
                          src={ss.dataUrl}
                          alt={`Screenshot ${idx + 1}`}
                          className="gba:w-full gba:h-auto gba:object-cover"
                          data-testid={`dev-report-screenshot-review-${idx}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveScreenshot(idx)}
                          className="gba:absolute gba:top-1 gba:right-1 gba:h-5 gba:w-5 gba:rounded-full gba:bg-destructive gba:text-destructive-foreground gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
                          data-testid={`dev-report-screenshot-remove-${idx}`}
                        >
                          <X className="gba:h-3 gba:w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {screenshots.length === 0 && (
                  <p className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-4">
                    No screenshots yet. Add from clipboard or browse your files.
                  </p>
                )}

                <div className="gba:flex gba:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePasteFromClipboard}
                    disabled={screenshots.length >= MAX_SCREENSHOTS_PER_ISSUE}
                    className="gba:flex-1 gba:gap-2"
                    data-testid="dev-report-paste-clipboard"
                  >
                    <Clipboard className="gba:h-3.5 gba:w-3.5" />
                    Paste from clipboard
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={screenshots.length >= MAX_SCREENSHOTS_PER_ISSUE}
                    className="gba:flex-1 gba:gap-2"
                    data-testid="dev-report-browse-files"
                  >
                    <Upload className="gba:h-3.5 gba:w-3.5" />
                    Browse files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="gba:hidden"
                    data-testid="dev-report-file-input"
                  />
                </div>
              </div>

              <Separator />

              <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhase('form')}
                  className="gba:gap-1.5"
                  data-testid="dev-report-back"
                >
                  <ArrowLeft className="gba:h-3.5 gba:w-3.5" />
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFinalSubmit}
                  className="gba:gap-2"
                  data-testid="dev-report-screenshot-submit"
                >
                  <Send className="gba:h-3.5 gba:w-3.5" />
                  Submit report
                </Button>
              </div>
            </>
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
