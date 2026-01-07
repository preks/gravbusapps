import { useForm } from 'react-hook-form'
import {
  Input,
  Label,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Textarea,
  Slider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  toast
} from '@newwork/nw-design-system'
import ComponentShowcase from './ComponentShowcase'

/**
 * Comprehensive showcase of all form components and validation patterns
 */
export function FormsShowcase() {
  const basicForm = useForm({
    defaultValues: {
      email: '',
      password: '',
      role: '',
      skills: '',
      experience: '',
      description: '',
      notifications: false
    }
  })

  const onBasicSubmit = (data: any) => {
    console.log('Form submitted:', data)
    toast.success('Form submitted successfully!')
  }

  return (
    <div className="gba:space-y-8" data-testid="forms-showcase">
      {/* Basic Input Components */}
      <ComponentShowcase title="Input Components" description="Basic input controls with different types and states">
        <div className="gba:space-y-4 gba:max-w-md">
          <div className="gba:space-y-2">
            <Label htmlFor="text-input">Text Input</Label>
            <Input id="text-input" placeholder="Enter your name" data-testid="text-input" />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="email-input">Email Input</Label>
            <Input id="email-input" type="email" placeholder="your@email.com" data-testid="email-input" />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="password-input">Password Input</Label>
            <Input id="password-input" type="password" placeholder="••••••••" data-testid="password-input" />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="disabled-input">Disabled Input</Label>
            <Input id="disabled-input" disabled placeholder="Disabled input" data-testid="disabled-input" />
          </div>
        </div>
      </ComponentShowcase>

      {/* Selection Controls */}
      <ComponentShowcase
        title="Selection Controls"
        description="Checkboxes, radio buttons, and switches for user choices"
      >
        <div className="gba:space-y-6 gba:max-w-md">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Checkboxes</h4>
            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Checkbox id="terms" data-testid="terms-checkbox" />
                <Label htmlFor="terms">Accept terms and conditions</Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Checkbox id="newsletter" defaultChecked data-testid="newsletter-checkbox" />
                <Label htmlFor="newsletter">Subscribe to newsletter</Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Checkbox id="disabled-checkbox" disabled data-testid="disabled-checkbox" />
                <Label htmlFor="disabled-checkbox">Disabled option</Label>
              </div>
            </div>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Radio Group</h4>
            <RadioGroup defaultValue="option-one" data-testid="radio-group">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="option-one" id="option-one" />
                <Label htmlFor="option-one">Option One</Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="option-two" id="option-two" />
                <Label htmlFor="option-two">Option Two</Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="option-three" id="option-three" disabled />
                <Label htmlFor="option-three">Option Three (Disabled)</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Switches</h4>
            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Switch id="airplane-mode" data-testid="airplane-switch" />
                <Label htmlFor="airplane-mode">Airplane Mode</Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Switch id="wifi" defaultChecked data-testid="wifi-switch" />
                <Label htmlFor="wifi">WiFi Enabled</Label>
              </div>
            </div>
          </div>
        </div>
      </ComponentShowcase>

      {/* Text Areas and Sliders */}
      <ComponentShowcase title="Text Areas & Range Controls" description="Multi-line text input and slider controls">
        <div className="gba:space-y-6 gba:max-w-lg">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Text Areas</h4>
            <div className="gba:space-y-4">
              <Textarea placeholder="Type your message here..." data-testid="textarea-normal" />
              <Textarea placeholder="Disabled textarea" disabled data-testid="textarea-disabled" />
            </div>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Sliders</h4>
            <div className="gba:space-y-8">
              <div>
                <Label>Single Value Slider</Label>
                <Slider defaultValue={[50]} max={100} step={1} data-testid="single-slider" />
              </div>
              <div>
                <Label>Range Slider</Label>
                <Slider defaultValue={[20, 80]} max={100} step={1} data-testid="range-slider" />
              </div>
            </div>
          </div>
        </div>
      </ComponentShowcase>

      {/* Select and Combobox */}
      <ComponentShowcase title="Dropdown Controls" description="Select dropdowns and searchable comboboxes">
        <div className="gba:space-y-6 gba:max-w-md">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Select Dropdown</h4>
            <Select data-testid="basic-select">
              <SelectTrigger>
                <SelectValue placeholder="Select a framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="react">React</SelectItem>
                <SelectItem value="vue">Vue.js</SelectItem>
                <SelectItem value="angular">Angular</SelectItem>
                <SelectItem value="svelte">Svelte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Combobox (Searchable)</h4>
            <Combobox
              options={[
                { value: 'react', label: 'React' },
                { value: 'vue', label: 'Vue.js' },
                { value: 'angular', label: 'Angular' },
                { value: 'svelte', label: 'Svelte' },
                { value: 'next', label: 'Next.js' }
              ]}
              placeholder="Select framework..."
              searchPlaceholder="Search frameworks..."
              emptyText="No framework found."
              data-testid="combobox"
            />
          </div>
        </div>
      </ComponentShowcase>

      {/* Complete Form Example */}
      <ComponentShowcase
        title="Complete Form with Validation"
        description="Full form example with React Hook Form integration and validation"
      >
        <Card className="gba:max-w-md">
          <CardHeader>
            <CardTitle>User Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...basicForm}>
              <form onSubmit={basicForm.handleSubmit(onBasicSubmit)} className="gba:space-y-4">
                <FormField
                  control={basicForm.control}
                  name="email"
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="example@example.com" {...field} data-testid="form-email" />
                      </FormControl>
                      <FormDescription>Your professional email address</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={basicForm.control}
                  name="role"
                  rules={{ required: 'Please select a role' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="form-role">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="developer">Software Developer</SelectItem>
                          <SelectItem value="designer">UI/UX Designer</SelectItem>
                          <SelectItem value="manager">Project Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={basicForm.control}
                  name="notifications"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-start gba:space-x-3 gba:space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="form-notifications"
                        />
                      </FormControl>
                      <div className="gba:space-y-1 gba:leading-none">
                        <FormLabel>Email Notifications</FormLabel>
                        <FormDescription>Receive updates about new features</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="gba:w-full" data-testid="form-submit">
                  Create Account
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </ComponentShowcase>
    </div>
  )
}

export default FormsShowcase
