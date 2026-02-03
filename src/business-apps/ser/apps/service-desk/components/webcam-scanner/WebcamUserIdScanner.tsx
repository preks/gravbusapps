'use client'

import React from 'react'
import { Card, Button, Combobox, Spinner, Alert } from '@newwork/nw-design-system'
import { Play as PlayIcon } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import ServiceIqForm from './SerficeFormIq'

// Lazy imports so initial load doesn't pull heavy libs until needed
type ZXingReader = typeof import('@zxing/library')

export interface WebcamUserIdScannerProps extends Pick<BusinessAppContextProps, 'userInfo' | 'accessToken'> {
  onDetected?: (userId: string, raw?: string) => void
  onFormSubmitOverride?: (data: any) => Promise<void> | void
}

type ScanMode = 'barcode' | 'ocr'

const DEFAULT_ID_REGEX = String.raw`(?:\b(?:User|Employee|Emp|ID|UID)\b[:\s#-]*([A-Za-z0-9_-]{5,}))|\b([0-9]{6,12})\b`

export const WebcamUserIdScanner: React.FC<WebcamUserIdScannerProps> = ({
  onDetected,
  userInfo,
  accessToken,
  onFormSubmitOverride
}) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>('')

  // Track flow stage and detected values across stages
  type Stage = 'user' | 'invoice' | 'form'
  const getStageFromUrl = (): Stage => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const stageParam = sp.get('stage')
      if (stageParam === 'invoice') return 'invoice'
      if (stageParam === 'form') return 'form'
      return 'user'
    } catch {
      return 'user'
    }
  }
  const [stage, setStage] = React.useState<Stage>(getStageFromUrl())
  const stageRef = React.useRef<Stage>(stage)
  React.useEffect(() => {
    stageRef.current = stage
  }, [stage])

  const [mode] = React.useState<ScanMode>('barcode')
  const [isStarting, setIsStarting] = React.useState(false)
  const [isRunning, setIsRunning] = React.useState(false)
  const [progress, setProgress] = React.useState<string>('')
  const [error, setError] = React.useState<string | null>(null)

  const [regexInput] = React.useState<string>(DEFAULT_ID_REGEX)
  const [userId, setUserId] = React.useState<string>('')
  const [invoiceNumber, setInvoiceNumber] = React.useState<string>('')
  const [selectedItem, setSelectedItem] = React.useState<string>('')
  const [userScanCompleted, setUserScanCompleted] = React.useState<boolean>(false)
  const [manualUserIdInput, setManualUserIdInput] = React.useState<string>('')
  const [manualInvoiceInput, setManualInvoiceInput] = React.useState<string>('')
  const isManualInvoiceValid = /^\d{15}$/.test((manualInvoiceInput || '').replace(/\D/g, ''))

  const zxingReaderRef = React.useRef<InstanceType<ZXingReader['BrowserMultiFormatReader']> | null>(null)
  const currentStreamRef = React.useRef<MediaStream | null>(null)
  const isMountedRef = React.useRef<boolean>(false)

  // Persist user id in URL so it survives re-renders/navigation
  const setUserIdAndPersist = (value: string) => {
    setUserId(value)
    try {
      const url = new URL(window.location.href)
      if (value) url.searchParams.set('uid', value)
      else url.searchParams.delete('uid')
      window.history.replaceState({}, '', url)
    } catch {}
  }

  // Define stopCamera early so all hooks/closures can reference it safely
  const stopCamera = React.useCallback(() => {
    try {
      if (zxingReaderRef.current) {
        try {
          ;(zxingReaderRef.current as any)?.reset?.()
        } catch {}
        zxingReaderRef.current = null
      }
      const stream = currentStreamRef.current
      currentStreamRef.current = null
      if (stream) stream.getTracks().forEach(track => track.stop())
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setIsRunning(false)
      setIsStarting(false)
    } catch {}
  }, [])

  const autoStopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAutoStopTimer = React.useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
  }, [])

  const scheduleAutoStopAndReturnMock = React.useCallback(() => {
    clearAutoStopTimer()
    autoStopTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return
      // Stop camera and emit mocked user id after 5 seconds
      const mockId = stageRef.current === 'invoice' ? '2635102010020501' : '0408531617'
      try {
        stopCamera()
      } finally {
        if (stageRef.current === 'invoice') setInvoiceNumber(mockId)
        else {
          setUserIdAndPersist(mockId)
          setUserScanCompleted(true)
        }
        onDetected?.(mockId, mockId)
      }
    }, 5000)
  }, [clearAutoStopTimer, onDetected, stopCamera])

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearAutoStopTimer()
      stopCamera()
    }
  }, [clearAutoStopTimer, stopCamera])

  // Sync stage with URL changes (forward/back)
  React.useEffect(() => {
    const onPop = () => setStage(getStageFromUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Ensure the page always starts on the "user" stage and hydrate user id from URL if present
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const current = url.searchParams.get('stage')
      const uid = url.searchParams.get('uid')
      if (uid && !userId) {
        setUserId(uid)
      }
      if (current !== 'user') {
        url.searchParams.set('stage', 'user')
        window.history.replaceState({}, '', url)
        setStage('user')
      }
    } catch {}
    // run once on mount
  }, [])

  const navigateToStage = (next: Stage) => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('stage', next)
      window.history.pushState({}, '', url)
    } catch {}
    // reset for next stage
    clearAutoStopTimer()
    stopCamera()
    if (next === 'invoice') {
      setInvoiceNumber('')
      setSelectedItem('')
    } else {
      setUserId('')
    }
    setProgress('')
    setError(null)
    setStage(next)
  }

  // Enumerate cameras on mount
  React.useEffect(() => {
    const enumerate = async () => {
      try {
        // Permissions prompt in some browsers requires a temporary stream
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Camera API not supported in this browser.')
          return
        }
        const temp = await navigator.mediaDevices.getUserMedia({ video: true })
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const cams = devices.filter(d => d.kind === 'videoinput')
          if (cams.length && !selectedDeviceId) setSelectedDeviceId(cams[0].deviceId || '')
        } finally {
          temp.getTracks().forEach(t => t.stop())
        }
      } catch (e: any) {
        setError(e?.message || 'Unable to access camera devices.')
      }
    }
    enumerate()
  }, [selectedDeviceId])

  const startBarcodeScan = React.useCallback(async () => {
    setError(null)
    if (stage === 'invoice') {
      setInvoiceNumber('')
      setSelectedItem('')
    } else {
      setUserId('')
      setUserScanCompleted(false)
    }
    setProgress('Initializing barcode scanner...')
    setIsStarting(true)

    try {
      const ZXing: ZXingReader = await import('@zxing/library')
      const reader = new ZXing.BrowserMultiFormatReader()
      zxingReaderRef.current = reader

      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: 'environment' }
      })
      currentStreamRef.current = stream

      if (!videoRef.current) throw new Error('Video element not ready')
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      setProgress('Looking for barcodes/QR codes...')
      setIsRunning(true)
      scheduleAutoStopAndReturnMock()

      reader.decodeFromVideoDevice(
        selectedDeviceId || null,
        videoRef.current,
        (result: import('@zxing/library').Result | undefined) => {
          if (!isMountedRef.current) return
          if (result) {
            const text = result.getText()
            if (stageRef.current === 'invoice') setInvoiceNumber(text)
            else {
              setUserIdAndPersist(text)
              setUserScanCompleted(true)
            }
            clearAutoStopTimer()
            stopCamera()

            const extracted = extractUserId(text, regexInput)
            if (extracted) {
              onDetected?.(extracted, text)
            }
          }
        }
      )
    } catch (e: any) {
      setError(e?.message || 'Failed to start barcode scanner.')
      stopCamera()
    } finally {
      setIsStarting(false)
      setProgress('')
    }
  }, [onDetected, regexInput, selectedDeviceId, stopCamera])

  const startCameraForOcr = React.useCallback(async () => {
    setError(null)
    setIsStarting(true)
    setProgress('Starting camera...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: 'environment' }
      })
      currentStreamRef.current = stream
      if (!videoRef.current) throw new Error('Video element not ready')
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setIsRunning(true)
      scheduleAutoStopAndReturnMock()
    } catch (e: any) {
      setError(e?.message || 'Failed to start camera.')
    } finally {
      setIsStarting(false)
      setProgress('')
    }
  }, [selectedDeviceId, scheduleAutoStopAndReturnMock])

  const extractUserId = (text: string, pattern: string): string | null => {
    if (!text) return null
    try {
      const re = new RegExp(pattern, 'i')
      const m = re.exec(text)
      if (m) {
        // Prefer first non-empty group; fallback to full match
        const groups = m.slice(1).filter(Boolean)
        return (groups[0] || m[0] || '').trim()
      }
      return null
    } catch {
      // If regex invalid, try default
      const fallback = new RegExp(DEFAULT_ID_REGEX, 'i')
      const m = fallback.exec(text)
      if (!m) return null
      const groups = m.slice(1).filter(Boolean)
      return (groups[0] || m[0] || '').trim()
    }
  }

  const handleStart = () => {
    if (mode === 'barcode') startBarcodeScan()
    else startCameraForOcr()
  }

  // Render Service IQ Form instead of scanner when in 'form' stage
  if (stage === 'form') {
    return (
      <ServiceIqForm
        userInfo={userInfo}
        accessToken={accessToken}
        initialData={{
          userId: '0408531617',
          client: 'NewWork SRL',
          phoneNumber: '0722456789',
          address: 'Selgros',
          buyer: 'Bogdan Iliescu',
          article: selectedItem,
          articleName: selectedItem,
          numarFactura: invoiceNumber
        }}
        onSubmitOverride={onFormSubmitOverride}
        onCancel={() => navigateToStage('user')}
      />
    )
  }

  return (
    <div className="gba:p-6 gba:min-h-screen gba:bg-background" data-testid="webcam-userid-scanner">
      <Card className="gba:p-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div>
            <h2 className="gba:text-2xl gba:font-bold">
              {stage === 'invoice' ? 'Scan Invoice Number' : 'Scan User ID'}
            </h2>
            <p className="gba:text-muted-foreground">
              {stage === 'invoice'
                ? 'Use your webcam to scan a barcode/QR or run OCR on an invoice to extract the invoice number.'
                : 'Use your webcam to scan a barcode/QR or run OCR on a document to extract a user ID.'}
            </p>
          </div>
          <div className="gba:p-1 gba:flex gba:flex-col gba:items-end gba:gap-2">
            <Button
              onClick={handleStart}
              disabled={isStarting || isRunning}
              data-testid="scanner-start"
              className="gba:flex gba:items-center gba:gap-2"
            >
              {isStarting ? <Spinner size="sm" /> : <PlayIcon className="gba:w-4 gba:h-4" />}
              Start
            </Button>
            {progress && (
              <div className="gba:text-xs gba:text-muted-foreground" data-testid="scanner-progress">
                {progress}
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="gba:p-2 gba:text-xs">
                {error}
              </Alert>
            )}
          </div>
        </div>
      </Card>

      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-3 gba:gap-6">
        <div className="lg:gba:col-span-2 gba:space-y-6">
          {(isStarting || isRunning) && (
            <Card className="gba:p-3">
              <div className="gba:aspect-video gba:bg-black/5 gba:flex gba:items-center gba:justify-center gba:rounded-md gba:overflow-hidden">
                <video ref={videoRef} playsInline muted className="gba:w-full gba:h-full gba:object-contain" />
                <canvas ref={canvasRef} className="gba:hidden" />
              </div>
            </Card>
          )}
        </div>

        <div className="gba:space-y-6">
          {stage === 'user' && (
            <Card className="gba:p-4">
              <div className="gba:space-y-3">
                <h2 className="gba:text-2xl gba:font-bold">Manual insert User ID</h2>
                <form
                  className="gba:flex gba:items-center gba:gap-2"
                  onSubmit={e => {
                    e.preventDefault()
                    const value = manualUserIdInput.trim()
                    if (!value) return
                    clearAutoStopTimer()
                    stopCamera()
                    setUserIdAndPersist(value)
                    setUserScanCompleted(true)
                  }}
                >
                  <input
                    type="text"
                    value={manualUserIdInput}
                    onChange={e => setManualUserIdInput(e.target.value)}
                    placeholder="Enter UserID"
                    className="gba:flex-1 gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-1 gba:text-sm gba:outline-none focus:gba:ring-2 focus:gba:ring-ring"
                    data-testid="manual-userid-input"
                  />
                  <Button type="submit" data-testid="manual-userid-submit">
                    Submit
                  </Button>
                </form>
              </div>
            </Card>
          )}
          {stage === 'invoice' && (
            <Card className="gba:p-4">
              <div className="gba:space-y-3">
                <h2 className="gba:text-2xl gba:font-bold">Manual insert Invoice Number</h2>
                <form
                  className="gba:flex gba:items-center gba:gap-2"
                  onSubmit={e => {
                    e.preventDefault()
                    const value = (manualInvoiceInput || '').replace(/\D/g, '')
                    if (!/^\d{15}$/.test(value)) return
                    clearAutoStopTimer()
                    stopCamera()
                    setInvoiceNumber(value)
                    setSelectedItem('')
                  }}
                >
                  <input
                    type="text"
                    value={manualInvoiceInput}
                    onChange={e => {
                      const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 15)
                      setManualInvoiceInput(onlyDigits)
                    }}
                    placeholder="Enter Invoice Number"
                    className="gba:flex-1 gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-1 gba:text-sm gba:outline-none focus:gba:ring-2 focus:gba:ring-ring"
                    data-testid="manual-invoice-input"
                  />
                  <Button type="submit" disabled={!isManualInvoiceValid} data-testid="manual-invoice-submit">
                    Submit
                  </Button>
                </form>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {`${(manualInvoiceInput || '').length}/15 digits`}
                </div>
              </div>
            </Card>
          )}
          {(stage === 'user' ? userId && userScanCompleted : !!userId || !!invoiceNumber) && (
            <Card className="gba:p-4">
              <div className="gba:space-y-3">
                {(stage === 'invoice' ? !!userId : userId && userScanCompleted) && (
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                    <div className="gba:text-base gba:font-medium" data-testid="scanner-user-output">
                      User ID: <span className="gba:font-bold">{userId}</span>
                    </div>
                    {stage === 'user' && userScanCompleted && (
                      <Button
                        variant="secondary"
                        onClick={() => navigateToStage('invoice')}
                        data-testid="scanner-next"
                        className="gba:flex gba:items-center gba:gap-2"
                      >
                        Next
                      </Button>
                    )}
                  </div>
                )}

                {stage === 'invoice' && (
                  <div className="gba:space-y-3">
                    <div className="gba:text-base gba:font-medium" data-testid="scanner-invoice-output">
                      Invoice Number: <span className="gba:font-bold">{invoiceNumber}</span>
                    </div>
                    {invoiceNumber && (
                      <Combobox
                        value={selectedItem}
                        onValueChange={v => setSelectedItem((v as string) || '')}
                        options={[
                          { label: 'ThinkPad Laptop', value: 'ThinkPad Laptop' },
                          { label: 'Lenovo Wireless Mouse', value: 'Lenovo Wireless Mouse' },
                          { label: 'One Plus 1+ Nord Phone', value: 'One Plus' }
                        ]}
                        placeholder="Select item"
                      />
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {stage === 'invoice' && userId && invoiceNumber && selectedItem && (
            <Card className="gba:p-4">
              <Button
                className="gba:w-full"
                variant="default"
                onClick={() => navigateToStage('form')}
                data-testid="open-service-iq-form"
              >
                Generate Service Document
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default WebcamUserIdScanner
