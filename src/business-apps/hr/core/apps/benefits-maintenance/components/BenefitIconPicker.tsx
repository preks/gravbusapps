import React, { useState, useMemo } from 'react'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Input,
  IconAvatar,
  ScrollArea
} from '@newwork/nw-design-system'
import {
  Heart,
  FirstAidKit,
  Stethoscope,
  Pill,
  Tooth,
  Eye,
  Baby,
  Wheelchair,
  Barbell,
  Bicycle,
  PersonSimpleRun,
  SwimmingPool,
  ForkKnife,
  CookingPot,
  Coffee,
  Hamburger,
  Car,
  Bus,
  Train,
  Taxi,
  Airplane,
  MapPin,
  House,
  Buildings,
  GraduationCap,
  Book,
  Certificate,
  Student,
  Briefcase,
  Laptop,
  Desktop,
  Phone,
  Headphones,
  CurrencyDollar,
  CurrencyEur,
  Wallet,
  Coins,
  PiggyBank,
  ChartLineUp,
  Gift,
  HandHeart,
  Handshake,
  ShieldCheck,
  Umbrella,
  TreeEvergreen,
  Sun,
  Flower,
  Dog,
  PawPrint,
  Smiley,
  Sparkle,
  Lightning,
  Fire,
  Drop,
  Leaf
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

interface BenefitIconPickerProps {
  value?: string
  onChange: (iconName: string) => void
  t: (key: string) => string
}

interface IconEntry {
  name: string
  component: PhosphorIcon
  keywords: string[]
}

const BENEFIT_ICONS: IconEntry[] = [
  { name: 'Heart', component: Heart, keywords: ['health', 'care', 'love', 'wellness'] },
  { name: 'FirstAidKit', component: FirstAidKit, keywords: ['health', 'medical', 'emergency'] },
  { name: 'Stethoscope', component: Stethoscope, keywords: ['health', 'medical', 'doctor'] },
  { name: 'Pill', component: Pill, keywords: ['health', 'medical', 'pharmacy', 'medicine'] },
  { name: 'Tooth', component: Tooth, keywords: ['dental', 'health'] },
  { name: 'Eye', component: Eye, keywords: ['vision', 'optical', 'health'] },
  { name: 'Baby', component: Baby, keywords: ['child', 'childcare', 'parental', 'family'] },
  { name: 'Wheelchair', component: Wheelchair, keywords: ['disability', 'accessibility'] },
  { name: 'Barbell', component: Barbell, keywords: ['gym', 'fitness', 'exercise', 'sport'] },
  { name: 'Bicycle', component: Bicycle, keywords: ['bike', 'transport', 'fitness', 'sport'] },
  { name: 'PersonSimpleRun', component: PersonSimpleRun, keywords: ['fitness', 'sport', 'running'] },
  { name: 'SwimmingPool', component: SwimmingPool, keywords: ['pool', 'fitness', 'sport'] },
  { name: 'ForkKnife', component: ForkKnife, keywords: ['meal', 'food', 'lunch', 'voucher', 'restaurant'] },
  { name: 'CookingPot', component: CookingPot, keywords: ['meal', 'food', 'cooking'] },
  { name: 'Coffee', component: Coffee, keywords: ['drink', 'beverage', 'break'] },
  { name: 'Hamburger', component: Hamburger, keywords: ['meal', 'food', 'fast food'] },
  { name: 'Car', component: Car, keywords: ['car', 'vehicle', 'transport', 'company car'] },
  { name: 'Bus', component: Bus, keywords: ['transport', 'commute', 'public transport'] },
  { name: 'Train', component: Train, keywords: ['transport', 'commute', 'rail'] },
  { name: 'Taxi', component: Taxi, keywords: ['transport', 'ride', 'taxi'] },
  { name: 'Airplane', component: Airplane, keywords: ['travel', 'flight', 'relocation'] },
  { name: 'MapPin', component: MapPin, keywords: ['location', 'relocation', 'move'] },
  { name: 'House', component: House, keywords: ['housing', 'home', 'rent', 'relocation'] },
  { name: 'Buildings', component: Buildings, keywords: ['office', 'company', 'building'] },
  { name: 'GraduationCap', component: GraduationCap, keywords: ['education', 'training', 'learning', 'university'] },
  { name: 'Book', component: Book, keywords: ['education', 'reading', 'learning', 'library'] },
  { name: 'Certificate', component: Certificate, keywords: ['certification', 'achievement', 'education'] },
  { name: 'Student', component: Student, keywords: ['education', 'student', 'scholarship'] },
  { name: 'Briefcase', component: Briefcase, keywords: ['work', 'business', 'professional'] },
  { name: 'Laptop', component: Laptop, keywords: ['tech', 'computer', 'equipment', 'remote work'] },
  { name: 'Desktop', component: Desktop, keywords: ['tech', 'computer', 'equipment', 'office'] },
  { name: 'Phone', component: Phone, keywords: ['phone', 'mobile', 'communication'] },
  { name: 'Headphones', component: Headphones, keywords: ['audio', 'music', 'equipment'] },
  { name: 'CurrencyDollar', component: CurrencyDollar, keywords: ['money', 'bonus', 'salary', 'compensation'] },
  { name: 'CurrencyEur', component: CurrencyEur, keywords: ['money', 'euro', 'compensation'] },
  { name: 'Wallet', component: Wallet, keywords: ['money', 'payment', 'finance'] },
  { name: 'Coins', component: Coins, keywords: ['money', 'bonus', 'reward'] },
  { name: 'PiggyBank', component: PiggyBank, keywords: ['savings', 'pension', 'retirement'] },
  { name: 'ChartLineUp', component: ChartLineUp, keywords: ['growth', 'investment', 'stock'] },
  { name: 'Gift', component: Gift, keywords: ['gift', 'reward', 'bonus', 'perk'] },
  { name: 'HandHeart', component: HandHeart, keywords: ['care', 'charity', 'volunteer', 'wellbeing'] },
  { name: 'Handshake', component: Handshake, keywords: ['partnership', 'deal', 'agreement'] },
  { name: 'ShieldCheck', component: ShieldCheck, keywords: ['insurance', 'protection', 'security'] },
  { name: 'Umbrella', component: Umbrella, keywords: ['insurance', 'protection', 'coverage'] },
  { name: 'TreeEvergreen', component: TreeEvergreen, keywords: ['nature', 'environment', 'green'] },
  { name: 'Sun', component: Sun, keywords: ['vacation', 'holiday', 'summer'] },
  { name: 'Flower', component: Flower, keywords: ['nature', 'garden', 'wellness'] },
  { name: 'Dog', component: Dog, keywords: ['pet', 'animal', 'pet insurance'] },
  { name: 'PawPrint', component: PawPrint, keywords: ['pet', 'animal'] },
  { name: 'Smiley', component: Smiley, keywords: ['happiness', 'wellbeing', 'wellness'] },
  { name: 'Sparkle', component: Sparkle, keywords: ['premium', 'special', 'perk'] },
  { name: 'Lightning', component: Lightning, keywords: ['energy', 'electric', 'power'] },
  { name: 'Fire', component: Fire, keywords: ['hot', 'popular', 'trending'] },
  { name: 'Drop', component: Drop, keywords: ['water', 'hydration', 'wellness'] },
  { name: 'Leaf', component: Leaf, keywords: ['eco', 'green', 'nature', 'sustainability'] }
]

const ICON_MAP: Record<string, PhosphorIcon> = Object.fromEntries(
  BENEFIT_ICONS.map(entry => [entry.name, entry.component])
)

export function getIconComponent(iconName?: string): PhosphorIcon | null {
  if (!iconName) return null
  return ICON_MAP[iconName] ?? null
}

export const DEFAULT_BENEFIT_ICON = Heart

const BenefitIconPicker: React.FC<BenefitIconPickerProps> = ({ value, onChange, t }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return BENEFIT_ICONS
    const q = search.toLowerCase()
    return BENEFIT_ICONS.filter(
      entry => entry.name.toLowerCase().includes(q) || entry.keywords.some(kw => kw.includes(q))
    )
  }, [search])

  const selectedIcon = useMemo(() => {
    return BENEFIT_ICONS.find(e => e.name === value)
  }, [value])

  const SelectedComponent = selectedIcon?.component ?? DEFAULT_BENEFIT_ICON

  const handleSelect = (iconName: string) => {
    onChange(iconName)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="gba:h-10 gba:w-full gba:justify-start gba:gap-3 gba:font-normal"
          data-testid="BenefitIconPicker-Trigger"
        >
          <IconAvatar icon={SelectedComponent} variant="default" size="sm" decorative />
          <span className="gba:text-sm">{selectedIcon ? selectedIcon.name : t('field-icon-placeholder')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="gba:w-80 gba:p-0" align="start">
        <div className="gba:p-3 gba:border-b">
          <Input
            placeholder={t('field-icon-search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="gba:h-8"
            autoFocus
            data-testid="BenefitIconPicker-Search"
          />
        </div>
        <ScrollArea className="gba:h-60">
          <div className="gba:grid gba:grid-cols-6 gba:gap-1 gba:p-2">
            {filteredIcons.map(entry => {
              const isSelected = value === entry.name
              return (
                <button
                  key={entry.name}
                  type="button"
                  className={[
                    'gba:flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:rounded-md gba:transition-colors',
                    isSelected ? 'gba:bg-primary gba:text-primary-foreground' : 'hover:gba:bg-muted gba:text-foreground'
                  ].join(' ')}
                  onClick={() => handleSelect(entry.name)}
                  title={entry.name}
                  data-testid={`BenefitIconPicker-Icon-${entry.name}`}
                >
                  <entry.component size={20} weight={isSelected ? 'fill' : 'regular'} />
                </button>
              )
            })}
          </div>
          {filteredIcons.length === 0 && (
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-6">
              {t('field-icon-no-results')}
            </p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export default BenefitIconPicker
