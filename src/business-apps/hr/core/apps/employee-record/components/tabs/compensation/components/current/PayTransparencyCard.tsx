import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'
import { DownloadIcon } from '@phosphor-icons/react'
import { usePayTransparencyDownload } from '../../hooks/usePayTransparencyDownload'

interface PayTransparencyCardProps {
  t: (key: string, params?: Record<string, unknown>) => string
  employeeId: string
  accessToken?: string
}

function PayTransparencyCard({ t, employeeId, accessToken }: Readonly<PayTransparencyCardProps>) {
  const { download, isDownloading, canDownload } = usePayTransparencyDownload({ employeeId, accessToken, t })

  return (
    <Card data-testid="pay-transparency-card">
      <CardHeader>
        <CardTitle>{t('pay-transparency-title')}</CardTitle>
        <CardDescription>{t('pay-transparency-description')}</CardDescription>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:py-8">
        <p
          className="gba:text-sm gba:text-muted-foreground gba:text-center"
          data-testid="pay-transparency-download-hint"
        >
          {t('pay-transparency-download-hint')}
        </p>
        <Button
          variant="default"
          onClick={download}
          disabled={isDownloading || !canDownload}
          data-testid="pay-transparency-download-button"
        >
          {isDownloading ? <Spinner size="sm" /> : <DownloadIcon />}
          {t('action-download')}
        </Button>
      </CardContent>
    </Card>
  )
}

export default PayTransparencyCard
