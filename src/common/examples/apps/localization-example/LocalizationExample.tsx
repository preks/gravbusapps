import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DateInput,
  Input,
  Button,
  Label,
  Separator,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'

export const LocalizationExample: React.FC<BusinessAppContextProps> = () => {
  return <LocalizationExampleContent />
}

const LocalizationExampleContent: React.FC = () => {
  const { t, tAttr } = useTranslation(translations)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [userName, setUserName] = useState<string>('John Doe')
  const [itemCount, setItemCount] = useState<number>(5)
  const [emailCount, setEmailCount] = useState<number>(0)
  const [rank, setRank] = useState<number>(1)
  const [role, setRole] = useState<string>('admin')
  const [uploadProgress, setUploadProgress] = useState<number>(0.65)
  const [notificationType, setNotificationType] = useState<string>('message')
  const [notificationCount, setNotificationCount] = useState<number>(3)

  const handleReset = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
    setUserName('John Doe')
    setItemCount(5)
    setEmailCount(0)
    setRank(1)
    setRole('admin')
    setUploadProgress(0.65)
    setNotificationType('message')
    setNotificationCount(3)
  }
  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="localization-example-container">
      <Card data-testid="localization-example-card">
        <CardHeader>
          <CardTitle data-testid="localization-example-title">{t('welcome-title')}</CardTitle>
          <p className="gba:text-sm gba:text-muted-foreground">{t('app-name')} - Complete Fluent Syntax Reference</p>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          <div className="gba:space-y-6">
            {/* 1. Simple Text */}
            <div>
              <Badge>1. Simple Text</Badge>
              <p className="gba:text-sm gba:mt-2">{t('app-name')}</p>
            </div>

            <Separator />

            {/* 2. Variables */}
            <div className="gba:space-y-2">
              <Badge>2. Variables (Placeables)</Badge>
              <Input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your name" />
              <p className="gba:text-sm gba:text-success">{t('welcome-user', { name: userName })}</p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {t('user-info', { firstName: 'John', lastName: 'Doe', email: 'john@example.com' })}
              </p>
            </div>

            <Separator />

            {/* 3. Number Formatting */}
            <div className="gba:space-y-2">
              <Badge>3. Number Formatting</Badge>
              <p className="gba:text-sm">{t('file-size', { bytes: 1234567 })}</p>
              <p className="gba:text-sm">{t('price', { amount: 99.99 })}</p>
              <p className="gba:text-sm">{t('percentage', { value: uploadProgress })}</p>
            </div>

            <Separator />

            {/* 4. Date/Time */}
            <div className="gba:space-y-2">
              <Badge>4. Date/Time Formatting</Badge>
              <DateInput value={selectedDate} onChange={setSelectedDate} />
              <p className="gba:text-sm">{t('last-updated', { date: new Date() })}</p>
            </div>

            <Separator />

            {/* 5. Selectors (Plurals) */}
            <div className="gba:space-y-2">
              <Badge>5. Selectors (Plurals)</Badge>
              <Input type="number" min="0" value={itemCount} onChange={e => setItemCount(Number(e.target.value))} />
              <p className="gba:text-sm gba:text-warning">{t('items-count', { count: itemCount })}</p>
              <Input type="number" min="0" value={emailCount} onChange={e => setEmailCount(Number(e.target.value))} />
              <p className="gba:text-sm">{t('unread-emails', { count: emailCount })}</p>
            </div>

            <Separator />

            {/* 6. Ordinals */}
            <div className="gba:space-y-2">
              <Badge>6. Ordinals</Badge>
              <Input type="number" min="1" value={rank} onChange={e => setRank(Number(e.target.value))} />
              <p className="gba:text-sm gba:text-success">{t('rank-position', { pos: rank })}</p>
            </div>

            <Separator />

            {/* 7. Custom Selectors */}
            <div className="gba:space-y-2">
              <Badge>7. Gender/Custom Selectors</Badge>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="gba:text-sm">{t('user-role', { role })}</p>
            </div>

            <Separator />

            {/* 8. Attributes */}
            <div className="gba:space-y-2">
              <Badge>8. Attributes</Badge>
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">
                Two ways to access attributes: t('id.attr') or tAttr('id', 'attr')
              </p>
              <Label>{t('login-input')}</Label>
              <Input
                placeholder={tAttr('login-input', 'placeholder')}
                aria-label={tAttr('login-input', 'aria-label')}
              />
              <div className="gba:mt-2 gba:p-3 gba:bg-muted gba:rounded gba:text-xs gba:font-mono gba:space-y-1">
                <div className="gba:font-bold gba:mb-2">Option 1: Using t()</div>
                <div>t('login-input') = "{t('login-input')}"</div>
                <div>t('login-input.placeholder') = "{t('login-input.placeholder')}"</div>
                <div className="gba:font-bold gba:mt-2 gba:mb-2">Option 2: Using tAttr() (recommended)</div>
                <div>tAttr('login-input', 'placeholder') = "{tAttr('login-input', 'placeholder')}"</div>
                <div>tAttr('login-input', 'aria-label') = "{tAttr('login-input', 'aria-label')}"</div>
              </div>
            </div>

            <Separator />

            {/* 9. Message References */}
            <div>
              <Badge>9. Referencing Other Messages</Badge>
              <p className="gba:text-sm gba:mt-2">{t('page-title')}</p>
              <p className="gba:text-xs gba:text-muted-foreground">References: {t('app-title')}</p>
            </div>

            <Separator />

            {/* 10. Multiline Text */}
            <div>
              <Badge>10. Multiline Text</Badge>
              <div className="gba:p-4 gba:bg-muted gba:rounded-lg gba:mt-2">
                <p className="gba:text-sm gba:whitespace-pre-line">{t('terms-of-service')}</p>
              </div>
            </div>

            <Separator />

            {/* 11. Special Characters */}
            <div>
              <Badge>11. Special Characters (Quoted Text)</Badge>
              <p className="gba:text-sm gba:mt-2">{t('curly-braces')}</p>
              <p className="gba:text-sm gba:font-mono">{t('backslash')}</p>
              <p className="gba:text-sm">{t('non-breaking-space')}</p>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                Uses quoted text syntax: {'{'}"{'{'}"{'}'}
              </p>
            </div>

            <Separator />

            {/* 12. Complex Combinations */}
            <div>
              <Badge>13. Complex Combinations</Badge>
              <p className="gba:text-sm gba:mt-2">
                {t('file-upload-status', {
                  status: 'uploading',
                  fileName: 'document.pdf',
                  progress: uploadProgress
                })}
              </p>
            </div>

            <Separator />

            {/* 13. Nested Selectors */}
            <div className="gba:space-y-2">
              <Badge>14. Nested Selectors</Badge>
              <Select value={notificationType} onValueChange={setNotificationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Message</SelectItem>
                  <SelectItem value="friend-request">Friend Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                value={notificationCount}
                onChange={e => setNotificationCount(Number(e.target.value))}
              />
              <p className="gba:text-sm gba:text-info">
                {t('notification', { type: notificationType, count: notificationCount })}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:gap-2 gba:justify-end">
            <Button variant="outline" onClick={handleReset}>
              Reset All Examples
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
