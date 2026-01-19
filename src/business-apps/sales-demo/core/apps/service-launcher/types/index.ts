export interface ServiceArea {
  id: string
  title: string
  description: string
  icon: any // PhosphorIcon component
  category: string
  buttonLabel?: string
  links?: Array<{
    label: string
    action: string
  }>
}

export interface ServiceQuickAction {
  id: string
  label: string
  icon: any // PhosphorIcon component
  action: string
}
