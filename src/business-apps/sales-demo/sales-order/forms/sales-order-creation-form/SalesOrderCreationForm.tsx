import React, { useState, useEffect } from 'react'
import {
  Modal,
  Steps,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Radio,
  Alert,
  Spin,
  Input,
  Table,
  Tag,
  Descriptions,
  Upload,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Divider
} from 'antd'
import {
  FileTextIcon,
  RobotIcon,
  PencilIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  TrayIcon,
  PlusIcon,
  TrashIcon
} from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import dayjs from 'dayjs'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesOrderCreation } from './hooks/useSalesOrderCreation'
import {
  CreationMethod,
  SalesOrderFormData,
  Quote,
  Customer,
  Product,
  AIGenerationRequest,
  AIGenerationResponse,
  CreationFormProps
} from './types'

const { Title, Text } = Typography
const { Step } = Steps
const { Option } = Select
const { Dragger } = Upload

interface SalesOrderCreationFormProps extends BusinessAppContextProps, CreationFormProps {}

const SalesOrderCreationForm: React.FC<SalesOrderCreationFormProps> = ({
  accessToken,
  open,
  onClose,
  onSuccess,
  initialData
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState(0)
  const [creationMethod, setCreationMethod] = useState<CreationMethod | null>(null)
  const [formData, setFormData] = useState<SalesOrderFormData>({
    customerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    items: [],
    grossAmount: 0,
    totalDiscount: 0,
    totalDiscountPercentage: 0,
    totalCost: 0,
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    currency: 'USD'
  })

  // Quote-related state
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

  // AI-related state
  const [aiRequest, setAiRequest] = useState<AIGenerationRequest>({})
  const [aiResult, setAiResult] = useState<AIGenerationResponse | null>(null)

  // Form instances for all steps (moved to top level to fix hooks error)
  const [aiForm] = Form.useForm()
  const [orderDetailsForm] = Form.useForm()
  const [lineItemsForm] = Form.useForm()

  // Manual creation state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [manualSubStep, setManualSubStep] = useState(0)

  // Search states for different steps
  const [quoteSearchTerm, setQuoteSearchTerm] = useState('')
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')

  // Line items management state
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Discount state for line item form
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Hooks
  const {
    quotes,
    customers,
    products,
    quotesLoading,
    customersLoading,
    productsLoading,
    creatingOrder,
    generatingAI,
    error,
    searchQuotes,
    searchCustomers,
    searchProducts,
    getQuoteDetailsById,
    generateWithAI,
    createOrder,
    convertQuote,
    clearError
  } = useSalesOrderCreation({ accessToken })

  // Initialize form data with initial data if provided
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setCreationMethod(null)
      setSelectedQuote(null)
      setAiRequest({})
      setAiResult(null)
      setSelectedCustomer(null)
      setManualSubStep(0)
      clearError()
    }
  }, [open, clearError])

  // Step configuration
  const getSteps = () => {
    const baseSteps = [
      {
        title: 'Creation Method',
        description: 'Choose how to create the sales order'
      }
    ]

    if (creationMethod === 'quote') {
      return [
        ...baseSteps,
        {
          title: 'Select Quote',
          description: 'Choose an existing quote to convert'
        },
        {
          title: 'Review & Create',
          description: 'Review and create the sales order'
        }
      ]
    }

    if (creationMethod === 'ai') {
      return [
        ...baseSteps,
        {
          title: 'AI Generation',
          description: 'Provide input for AI generation'
        },
        {
          title: 'Review & Create',
          description: 'Review and create the sales order'
        }
      ]
    }

    if (creationMethod === 'manual') {
      return [
        ...baseSteps,
        {
          title: 'Customer Selection',
          description: 'Select the customer'
        },
        {
          title: 'Order Details',
          description: 'Enter order information'
        },
        {
          title: 'Line Items',
          description: 'Add products and services'
        },
        {
          title: 'Review & Create',
          description: 'Review and create the sales order'
        }
      ]
    }

    return baseSteps
  }

  const steps = getSteps()

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCancel = () => {
    onClose()
  }

  // Form data update handler
  const updateFormData = (updates: Partial<SalesOrderFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  // Auto-advance to step 1 when creation method is selected
  useEffect(() => {
    if (creationMethod && currentStep === 0) {
      setCurrentStep(1)
    }
  }, [creationMethod, currentStep])

  // Search effects
  useEffect(() => {
    if (creationMethod === 'quote' && currentStep === 1) {
      searchQuotes(quoteSearchTerm)
    }
  }, [quoteSearchTerm, creationMethod, currentStep, searchQuotes])

  useEffect(() => {
    if (creationMethod === 'manual' && currentStep === 1) {
      // Only search if there are at least 2 characters or empty string (to show all)
      if (customerSearchTerm.length >= 2 || customerSearchTerm.length === 0) {
        searchCustomers(customerSearchTerm)
      }
    }
  }, [customerSearchTerm, creationMethod, currentStep, searchCustomers])

  useEffect(() => {
    if (creationMethod === 'manual' && currentStep === 3 && productSearchTerm) {
      searchProducts(productSearchTerm)
    }
  }, [productSearchTerm, creationMethod, currentStep, searchProducts])

  // Creation method selection
  const handleMethodSelect = (method: CreationMethod) => {
    setCreationMethod(method)
  }

  // Quote selection handler
  const handleQuoteSelect = (quote: Quote) => {
    setSelectedQuote(quote)
    updateFormData({
      customerId: quote.customer.id,
      quotationNumber: quote.quoteNumber,
      items: quote.items.map(item => ({
        id: item.id,
        productId: item.product?.id,
        product: item.product,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
        lineNumber: item.lineNumber
      })),
      subtotal: quote.totalAmount,
      totalAmount: quote.totalAmount,
      currency: quote.currency
    })
  }

  // AI generation handler
  const handleAIGenerate = async () => {
    const result = await generateWithAI(aiRequest)
    setAiResult(result)

    if (result.success && result.orderData) {
      updateFormData(result.orderData)
    }
  }

  // Customer selection handler
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    updateFormData({
      customerId: customer.id,
      customer
    })
  }

  // Calculate line item totals with discounts
  const calculateLineItemTotals = (
    quantity: number,
    unitPrice: number,
    discountType: 'fixed' | 'percentage',
    discountValue: number = 0
  ) => {
    const grossAmount = quantity * unitPrice
    let discountAmount = 0

    if (discountType === 'fixed') {
      discountAmount = Math.min(discountValue, grossAmount) // Can't discount more than gross amount
    } else if (discountType === 'percentage') {
      discountAmount = (grossAmount * discountValue) / 100
    }

    const totalAmount = grossAmount - discountAmount

    return {
      grossAmount,
      discountAmount,
      totalAmount
    }
  }

  // Calculate order totals
  const calculateOrderTotals = (items: any[]) => {
    const grossAmount = items.reduce((sum, item) => sum + (item.grossAmount || 0), 0)
    const totalDiscount = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0)
    const totalCost = items.reduce((sum, item) => sum + (item.unitCost || 0) * item.quantity, 0)
    const subtotal = grossAmount - totalDiscount
    const taxAmount = subtotal * 0.2 // 20% tax
    const totalAmount = subtotal + taxAmount
    const totalDiscountPercentage = grossAmount > 0 ? (totalDiscount / grossAmount) * 100 : 0

    return {
      grossAmount,
      totalDiscount,
      totalDiscountPercentage,
      totalCost,
      subtotal,
      taxAmount,
      totalAmount
    }
  }

  // Final submission handler
  const handleSubmit = async () => {
    try {
      let orderId: string | null = null

      if (creationMethod === 'quote' && selectedQuote) {
        orderId = await convertQuote(selectedQuote, formData)
      } else {
        orderId = await createOrder(formData)
      }

      if (orderId) {
        onSuccess?.(orderId)
        onClose()
      }
    } catch (err) {
      console.error('Error creating sales order:', err)
    }
  }

  // Render creation method selection step
  const renderMethodSelection = () => (
    <div className="gba:p-6" data-testid="method-selection-step">
      <Title level={3} className="gba:text-center gba:mb-6">
        Choose Creation Method
      </Title>
      <Text className="gba:block gba:text-center gba:mb-8 gba:text-gray-600">
        Select how you would like to create your sales order
      </Text>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card
            hoverable
            className="gba:h-full gba:cursor-pointer gba:text-center"
            onClick={() => handleMethodSelect('quote')}
            data-testid="method-quote-card"
          >
            <div className="gba:p-4">
              <FileTextIcon className="gba:text-4xl gba:text-blue-500 gba:mb-4" />
              <Title level={4} className="gba:mb-2">
                From Existing Quote
              </Title>
              <Text className="gba:text-gray-600">
                Convert an existing quote into a sales order with all details preserved
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            hoverable
            className="gba:h-full gba:cursor-pointer gba:text-center"
            style={{ backgroundColor: 'rgba(145,202,255,0.1)' }}
            onClick={() => handleMethodSelect('ai')}
            data-testid="method-ai-card"
          >
            <div className="gba:p-4">
              <div className="gba:flex gba:justify-center gba:items-center gba:mb-4">
                <span className="gba:text-4xl gba:mr-2">✨</span>
                <RobotIcon size={40} className="gba:text-4xl gba:text-blue-500" />
              </div>
              <Title level={4} className="gba:mb-2">
                Generate with AI
              </Title>
              <Text className="gba:text-gray-600">
                Create a sales order using AI from text description or PDF upload
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            hoverable
            className="gba:h-full gba:cursor-pointer gba:text-center"
            onClick={() => handleMethodSelect('manual')}
            data-testid="method-manual-card"
          >
            <div className="gba:p-4">
              <PencilIcon size={40} className="gba:text-4xl gba:text-green-500 gba:mb-4" />
              <Title level={4} className="gba:mb-2">
                Manual Creation
              </Title>
              <Text className="gba:text-gray-600">
                Build your sales order step-by-step with full control over all details
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )

  // Render quote selection step
  const renderQuoteSelection = () => {
    const quoteColumns = [
      {
        title: 'Quote ID',
        dataIndex: 'quoteNumber',
        key: 'quoteNumber',
        width: 120,
        render: (text: string) => <Text strong>{text}</Text>
      },
      {
        title: 'Quote Name',
        dataIndex: 'quoteName',
        key: 'quoteName',
        render: (text: string) => <Text>{text}</Text>
      },
      {
        title: 'Customer Name',
        dataIndex: ['customer', 'name'],
        key: 'customer'
      },
      {
        title: 'Quote Date',
        dataIndex: 'createdDate',
        key: 'createdDate',
        width: 120,
        render: (date: string) => dayjs(date).format('MMM D, YYYY')
      },
      {
        title: 'Total Amount',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 130,
        render: (amount: number, record: Quote) => `${amount?.toLocaleString()} ${record.currency}`
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => {
          const colorMap = {
            Draft: 'default',
            Pending: 'processing',
            Approved: 'success',
            Expired: 'error'
          }
          return <Tag color={colorMap[status as keyof typeof colorMap] || 'default'}>{status}</Tag>
        }
      }
    ]

    return (
      <div className="gba:p-6" data-testid="quote-selection-step">
        <Title level={3} className="gba:mb-4">
          Select Quote to Convert
        </Title>

        <div className="gba:mb-4">
          <DebouncedInput
            value={quoteSearchTerm}
            onChange={setQuoteSearchTerm}
            placeholder="Search quotes by number or customer name..."
            className="gba:w-full gba:p-2 gba:border gba:rounded"
            data-testid="quote-search-input"
          />
        </div>

        <Table
          columns={quoteColumns}
          dataSource={quotes}
          rowKey="id"
          loading={quotesLoading}
          pagination={{ pageSize: 10 }}
          onRow={record => ({
            onClick: () => handleQuoteSelect(record),
            className: selectedQuote?.id === record.id ? 'gba:bg-blue-50' : '',
            style: { cursor: 'pointer' }
          })}
          data-testid="quotes-table"
        />

        {selectedQuote && (
          <Card className="gba:mt-4" title="Selected Quote Preview" data-testid="quote-preview">
            <Descriptions column={2} size="small" className="gba:mb-4">
              <Descriptions.Item label="Quote Number">{selectedQuote.quoteNumber}</Descriptions.Item>
              <Descriptions.Item label="Quote Name">{selectedQuote.quoteName}</Descriptions.Item>
              <Descriptions.Item label="Customer">{selectedQuote.customer.name}</Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                {selectedQuote.totalAmount.toLocaleString()} {selectedQuote.currency}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} className="gba:mb-3">
              Line Items ({selectedQuote.items.length})
            </Title>
            <Table
              columns={[
                {
                  title: 'Line #',
                  dataIndex: 'lineNumber',
                  key: 'lineNumber',
                  width: 80
                },
                {
                  title: 'Product',
                  dataIndex: ['product', 'name'],
                  key: 'product',
                  render: (name: string, record: any) => name || record.description
                },
                {
                  title: 'Quantity',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  width: 100,
                  render: (qty: number) => qty.toLocaleString()
                },
                {
                  title: 'Unit Price',
                  dataIndex: 'unitPrice',
                  key: 'unitPrice',
                  width: 120,
                  render: (price: number) => `${price.toLocaleString()} ${selectedQuote.currency}`
                },
                {
                  title: 'Total',
                  dataIndex: 'totalAmount',
                  key: 'totalAmount',
                  width: 120,
                  render: (total: number) => `${total.toLocaleString()} ${selectedQuote.currency}`
                }
              ]}
              dataSource={selectedQuote.items}
              rowKey="id"
              pagination={false}
              size="small"
              data-testid="quote-items-preview"
            />
          </Card>
        )}
      </div>
    )
  }

  // Render AI generation step
  const renderAIGeneration = () => {
    const handleFileUpload = (info: any) => {
      const { status, originFileObj } = info.file
      if (status === 'done' || status === 'uploading') {
        setAiRequest(prev => ({ ...prev, fileUpload: originFileObj }))
      }
    }

    return (
      <div className="gba:p-6" data-testid="ai-generation-step">
        <div className="gba:p-4 gba:mb-6 gba:rounded-lg" style={{ backgroundColor: 'rgba(145,202,255,0.1)' }}>
          <div className="gba:flex gba:items-center gba:mb-4">
            <span className="gba:text-2xl gba:mr-2">✨</span>
            <Title level={3} className="gba:m-0">
              Generate Sales Order with AI
            </Title>
          </div>
          <Text className="gba:text-gray-600">
            Provide a text description or upload a PDF document, and our AI will generate a sales order for you.
          </Text>
        </div>

        <Form form={aiForm} layout="vertical">
          <Form.Item label="Text Description" name="textInput">
            <Input.TextArea
              rows={4}
              placeholder="Describe the sales order you want to create. Include customer details, products, quantities, and any special requirements..."
              value={aiRequest.textInput}
              onChange={e => setAiRequest(prev => ({ ...prev, textInput: e.target.value }))}
              data-testid="ai-text-input"
            />
          </Form.Item>

          <Form.Item label="Or Upload PDF Document">
            <Dragger
              name="file"
              multiple={false}
              accept=".pdf"
              customRequest={({ onSuccess }) => onSuccess?.('ok')}
              onChange={handleFileUpload}
              data-testid="ai-file-upload"
            >
              <p className="ant-upload-drag-icon">
                <TrayIcon size={16} />
              </p>
              <p className="ant-upload-text">Click or drag PDF file to this area to upload</p>
              <p className="ant-upload-hint">Upload a PDF document containing order information for AI analysis</p>
            </Dragger>
          </Form.Item>

          <Form.Item label="Additional Instructions" name="instructions">
            <Input.TextArea
              rows={2}
              placeholder="Any specific instructions for the AI (optional)..."
              value={aiRequest.instructions}
              onChange={e => setAiRequest(prev => ({ ...prev, instructions: e.target.value }))}
              data-testid="ai-instructions-input"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              onClick={handleAIGenerate}
              loading={generatingAI}
              disabled={!aiRequest.textInput && !aiRequest.fileUpload}
              icon={<RobotIcon size={16} />}
              size="large"
              data-testid="generate-ai-button"
            >
              Generate with AI
            </Button>
          </Form.Item>
        </Form>

        {aiResult && (
          <Card
            className="gba:mt-4"
            title={
              <div className="gba:flex gba:items-center">
                <span className="gba:text-lg gba:mr-2">✨</span>
                <span>AI Generated Result</span>
              </div>
            }
            data-testid="ai-result-card"
          >
            {aiResult.success ? (
              <div>
                <Alert
                  message="AI Generation Successful"
                  description={`Generated sales order with ${aiResult.confidence ? Math.round(aiResult.confidence * 100) : 85}% confidence`}
                  type="success"
                  className="gba:mb-4"
                />
                <Text>Review the generated order details in the next step.</Text>
              </div>
            ) : (
              <Alert message="AI Generation Failed" description={aiResult.error} type="error" />
            )}
          </Card>
        )}
      </div>
    )
  }

  // Render customer selection step
  const renderCustomerSelection = () => {
    const customerColumns = [
      {
        title: 'Account Name',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: Customer) => (
          <div>
            <Text strong>{text}</Text>
            {record.ownerEmployee && (
              <div className="gba:text-sm gba:text-gray-500">Account Manager: {record.ownerEmployee.displayName}</div>
            )}
          </div>
        )
      }
    ]

    return (
      <div className="gba:p-6" data-testid="customer-selection-step">
        <Title level={3} className="gba:mb-4">
          Select Customer
        </Title>

        <div className="gba:mb-4">
          <DebouncedInput
            value={customerSearchTerm}
            onChange={setCustomerSearchTerm}
            placeholder="Search accounts by name or account manager (minimum 2 characters)..."
            className="gba:w-full gba:p-2 gba:border gba:rounded"
            data-testid="customer-search-input"
          />
        </div>

        <Table
          columns={customerColumns}
          dataSource={customers}
          rowKey="id"
          loading={customersLoading}
          pagination={{ pageSize: 10 }}
          onRow={record => ({
            onClick: () => handleCustomerSelect(record),
            className: selectedCustomer?.id === record.id ? 'gba:bg-blue-50' : '',
            style: { cursor: 'pointer' }
          })}
          data-testid="customers-table"
        />

        {selectedCustomer && (
          <Card className="gba:mt-4" title="Selected Account" data-testid="customer-preview">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Account Name">{selectedCustomer.name}</Descriptions.Item>
              <Descriptions.Item label="Account Manager">
                {selectedCustomer.ownerEmployee?.displayName || 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </div>
    )
  }

  // Render order details step
  const renderOrderDetails = () => {
    return (
      <div className="gba:p-6" data-testid="order-details-step">
        <Title level={3} className="gba:mb-4">
          Order Details
        </Title>

        <Form
          form={orderDetailsForm}
          layout="vertical"
          initialValues={{
            orderDate: dayjs(formData.orderDate),
            requestedShippingDate: formData.requestedShippingDate ? dayjs(formData.requestedShippingDate) : undefined,
            requestedReceiptDate: formData.requestedReceiptDate ? dayjs(formData.requestedReceiptDate) : undefined,
            currency: formData.currency,
            notes: formData.notes,
            internalNotes: formData.internalNotes
          }}
          onValuesChange={(_, allValues) => {
            updateFormData({
              orderDate: allValues.orderDate?.format('YYYY-MM-DD'),
              requestedShippingDate: allValues.requestedShippingDate?.format('YYYY-MM-DD'),
              requestedReceiptDate: allValues.requestedReceiptDate?.format('YYYY-MM-DD'),
              currency: allValues.currency,
              notes: allValues.notes,
              internalNotes: allValues.internalNotes
            })
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Order Date"
                name="orderDate"
                rules={[{ required: true, message: 'Please select order date' }]}
              >
                <DatePicker className="gba:w-full" data-testid="order-date-picker" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Currency" name="currency">
                <Select data-testid="currency-select">
                  <Option value="EUR">EUR</Option>
                  <Option value="USD">USD</Option>
                  <Option value="GBP">GBP</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item label="Requested Shipping Date" name="requestedShippingDate">
                <DatePicker className="gba:w-full" data-testid="shipping-date-picker" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Requested Receipt Date" name="requestedReceiptDate">
                <DatePicker className="gba:w-full" data-testid="receipt-date-picker" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} placeholder="Customer-visible notes..." data-testid="notes-input" />
          </Form.Item>

          <Form.Item label="Internal Notes" name="internalNotes">
            <Input.TextArea
              rows={3}
              placeholder="Internal notes (not visible to customer)..."
              data-testid="internal-notes-input"
            />
          </Form.Item>
        </Form>
      </div>
    )
  }

  // Render line items step
  const renderLineItems = () => {
    const addItem = () => {
      setShowAddForm(true)
      setEditingIndex(null)
      lineItemsForm.resetFields()
    }

    const editItem = (index: number) => {
      const item = formData.items[index]
      setEditingIndex(index)
      setShowAddForm(true)
      setSelectedProduct(item.product || null)
      setDiscountType(item.discountType || 'percentage')
      lineItemsForm.setFieldsValue({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        discountType: item.discountType || 'percentage',
        discountValue: item.discountValue || 0
      })
    }

    const saveItem = () => {
      lineItemsForm.validateFields().then(values => {
        const product = products.find(p => p.id === values.productId)
        const discountValue = values.discountValue || 0
        const lineCalculations = calculateLineItemTotals(values.quantity, values.unitPrice, discountType, discountValue)

        const newItem = {
          ...values,
          product,
          unitCost: product?.currentCost || 0,
          discountType,
          discountValue,
          discountAmount: lineCalculations.discountAmount,
          grossAmount: lineCalculations.grossAmount,
          totalAmount: lineCalculations.totalAmount,
          lineNumber: editingIndex !== null ? formData.items[editingIndex].lineNumber : formData.items.length + 1
        }

        const newItems = [...formData.items]
        if (editingIndex !== null) {
          newItems[editingIndex] = newItem
        } else {
          newItems.push(newItem)
        }

        const orderTotals = calculateOrderTotals(newItems)

        updateFormData({
          items: newItems,
          ...orderTotals
        })

        setShowAddForm(false)
        setEditingIndex(null)
        setSelectedProduct(null)
        setDiscountType('percentage')
        lineItemsForm.resetFields()
      })
    }

    const removeItem = (index: number) => {
      const newItems = formData.items.filter((_, i) => i !== index)
      const orderTotals = calculateOrderTotals(newItems)

      updateFormData({
        items: newItems,
        ...orderTotals
      })
    }

    const itemColumns = [
      {
        title: 'Line #',
        dataIndex: 'lineNumber',
        key: 'lineNumber',
        width: 80
      },
      {
        title: 'Product',
        dataIndex: 'description',
        key: 'description',
        render: (description: string, record: any) => (
          <div>
            <div className="gba:font-medium">{description}</div>
            {record.product && (
              <div className="gba:text-sm gba:text-gray-500">
                {record.product.productNumber || record.product.code || 'N/A'}
              </div>
            )}
          </div>
        )
      },
      {
        title: 'Quantity',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 100,
        render: (qty: number) => qty.toLocaleString()
      },
      {
        title: 'Unit Price',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 120,
        render: (price: number) => `$${price.toFixed(2)}`
      },
      {
        title: 'Unit Cost',
        dataIndex: 'unitCost',
        key: 'unitCost',
        width: 120,
        render: (cost: number) => `$${(cost || 0).toFixed(2)}`
      },
      {
        title: 'Discount',
        key: 'discount',
        width: 120,
        render: (record: any) => {
          if (!record.discountValue || record.discountValue === 0) return '-'
          return record.discountType === 'percentage'
            ? `${record.discountValue}%`
            : `$${record.discountValue.toFixed(2)}`
        }
      },
      {
        title: 'Line Total',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 120,
        render: (total: number) => `$${total.toFixed(2)}`
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 100,
        render: (_: any, __: any, index: number) => (
          <Space>
            <Button size="small" onClick={() => editItem(index)} data-testid={`edit-item-${index}`}>
              Edit
            </Button>
            <Button size="small" danger onClick={() => removeItem(index)} data-testid={`remove-item-${index}`}>
              <TrashIcon size={16} />
            </Button>
          </Space>
        )
      }
    ]

    return (
      <div className="gba:p-6" data-testid="line-items-step">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <Title level={3} className="gba:m-0">
            Line Items
          </Title>
          <Button type="primary" icon={<PlusIcon size={16} />} onClick={addItem} data-testid="add-item-button">
            Add Item
          </Button>
        </div>

        {showAddForm && (
          <Card className="gba:mb-4" title={editingIndex !== null ? 'Edit Item' : 'Add New Item'}>
            <Form form={lineItemsForm} layout="vertical">
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item label="Product" name="productId">
                    <Select
                      showSearch
                      placeholder="Search and select product"
                      onSearch={setProductSearchTerm}
                      loading={productsLoading}
                      onChange={productId => {
                        const product = products.find(p => p.id === productId)
                        setSelectedProduct(product || null)
                        if (product) {
                          lineItemsForm.setFieldsValue({
                            unitPrice: product.price || product.unitPrice || 0,
                            description: product.description || product.name
                          })
                        }
                      }}
                      data-testid="product-select"
                    >
                      {products.map(product => (
                        <Option key={product.id} value={product.id}>
                          <div>
                            <div className="gba:font-medium">
                              {product.name} - {product.productNumber || product.code || 'N/A'}
                            </div>
                            <div className="gba:text-sm gba:text-gray-500">
                              Price: ${(product.price || product.unitPrice || 0).toFixed(2)} | Cost: $
                              {(product.currentCost || 0).toFixed(2)}
                            </div>
                            {product.supplierName ? (
                              <Tag size="small" color="blue">
                                {product.supplierName}
                              </Tag>
                            ) : (
                              <Tag size="small" color="green">
                                Own Product
                              </Tag>
                            )}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Description"
                    name="description"
                    rules={[{ required: true, message: 'Please enter description' }]}
                  >
                    <Input data-testid="description-input" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={6}>
                  <Form.Item
                    label="Quantity"
                    name="quantity"
                    rules={[{ required: true, message: 'Please enter quantity' }]}
                  >
                    <InputNumber min={1} className="gba:w-full" data-testid="quantity-input" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    label="Unit Price"
                    name="unitPrice"
                    rules={[{ required: true, message: 'Please enter unit price' }]}
                  >
                    <InputNumber min={0} step={0.01} className="gba:w-full" data-testid="unit-price-input" prefix="$" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item label="Unit Cost" name="unitCost">
                    <InputNumber
                      min={0}
                      step={0.01}
                      className="gba:w-full"
                      data-testid="unit-cost-input"
                      prefix="$"
                      value={selectedProduct?.currentCost || 0}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item label="Supplier" name="supplier">
                    <Input
                      value={selectedProduct?.supplierName || 'Own Product'}
                      disabled
                      data-testid="supplier-input"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Discount Options</Divider>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Form.Item label="Discount Type" name="discountType">
                    <Radio.Group
                      value={discountType}
                      onChange={e => setDiscountType(e.target.value)}
                      data-testid="discount-type-radio"
                    >
                      <Radio value="percentage">Percentage</Radio>
                      <Radio value="fixed">Fixed Amount</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label={discountType === 'percentage' ? 'Discount %' : 'Discount Amount'}
                    name="discountValue"
                  >
                    <InputNumber
                      min={0}
                      max={discountType === 'percentage' ? 100 : undefined}
                      step={discountType === 'percentage' ? 1 : 0.01}
                      className="gba:w-full"
                      data-testid="discount-value-input"
                      suffix={discountType === 'percentage' ? '%' : '$'}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} className="gba:flex gba:items-end">
                  <Space>
                    <Button onClick={saveItem} type="primary" data-testid="save-item-button">
                      {editingIndex !== null ? 'Update' : 'Add'}
                    </Button>
                    <Button onClick={() => setShowAddForm(false)} data-testid="cancel-item-button">
                      Cancel
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>
        )}

        <Table
          columns={itemColumns}
          dataSource={formData.items}
          rowKey={(record, index) => `item-${index}`}
          pagination={false}
          data-testid="line-items-table"
        />

        {formData.items.length > 0 && (
          <Card className="gba:mt-4" title="Order Summary">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={6}>
                <div className="gba:text-center">
                  <Text className="gba:block gba:text-sm gba:text-gray-500">Gross Amount</Text>
                  <Text strong>${(formData.grossAmount || 0).toFixed(2)}</Text>
                </div>
              </Col>
              <Col xs={24} md={6}>
                <div className="gba:text-center">
                  <Text className="gba:block gba:text-sm gba:text-gray-500">Total Discount</Text>
                  <Text strong className="gba:text-red-600">
                    -${(formData.totalDiscount || 0).toFixed(2)}
                    {formData.totalDiscountPercentage && formData.totalDiscountPercentage > 0 && (
                      <span className="gba:text-xs gba:ml-1">({formData.totalDiscountPercentage.toFixed(1)}%)</span>
                    )}
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={6}>
                <div className="gba:text-center">
                  <Text className="gba:block gba:text-sm gba:text-gray-500">Total Cost</Text>
                  <Text strong className="gba:text-orange-600">
                    ${(formData.totalCost || 0).toFixed(2)}
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={6}>
                <div className="gba:text-center">
                  <Text className="gba:block gba:text-sm gba:text-gray-500">Tax (20%)</Text>
                  <Text strong>${(formData.taxAmount || 0).toFixed(2)}</Text>
                </div>
              </Col>
            </Row>
            <Row className="gba:mt-4 gba:pt-4 gba:border-t">
              <Col xs={24} className="gba:text-center">
                <Text className="gba:block gba:text-sm gba:text-gray-500">Final Total</Text>
                <Text strong className="gba:text-2xl gba:text-green-600">
                  ${(formData.totalAmount || 0).toFixed(2)}
                </Text>
              </Col>
            </Row>
          </Card>
        )}
      </div>
    )
  }

  // Render review step
  const renderReview = () => {
    return (
      <div className="gba:p-6" data-testid="review-step">
        <Title level={3} className="gba:mb-4">
          Review Sales Order
        </Title>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="Order Information" className="gba:h-full">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Customer">
                  {selectedCustomer?.name || formData.customer?.name || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Order Date">
                  {dayjs(formData.orderDate).format('MMM D, YYYY')}
                </Descriptions.Item>
                {formData.requestedShippingDate && (
                  <Descriptions.Item label="Requested Shipping">
                    {dayjs(formData.requestedShippingDate).format('MMM D, YYYY')}
                  </Descriptions.Item>
                )}
                {formData.requestedReceiptDate && (
                  <Descriptions.Item label="Requested Receipt">
                    {dayjs(formData.requestedReceiptDate).format('MMM D, YYYY')}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Currency">{formData.currency}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Order Summary" className="gba:h-full">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Items Count">{formData.items.length} items</Descriptions.Item>
                <Descriptions.Item label="Subtotal">
                  {formData.subtotal.toLocaleString()} {formData.currency}
                </Descriptions.Item>
                <Descriptions.Item label="Tax Amount">
                  {formData.taxAmount.toLocaleString()} {formData.currency}
                </Descriptions.Item>
                <Descriptions.Item label="Total Amount">
                  <Text strong className="gba:text-lg">
                    {formData.totalAmount.toLocaleString()} {formData.currency}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {formData.items.length > 0 && (
          <Card className="gba:mt-4" title="Line Items">
            <Table
              columns={[
                { title: 'Description', dataIndex: 'description', key: 'description' },
                { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
                {
                  title: 'Unit Price',
                  dataIndex: 'unitPrice',
                  key: 'unitPrice',
                  render: (price: number) => `${price.toLocaleString()} ${formData.currency}`
                },
                {
                  title: 'Total',
                  dataIndex: 'totalAmount',
                  key: 'totalAmount',
                  render: (total: number) => `${total.toLocaleString()} ${formData.currency}`
                }
              ]}
              dataSource={formData.items}
              rowKey={(record, index) => `review-item-${index}`}
              pagination={false}
              size="small"
            />
          </Card>
        )}

        {(formData.notes || formData.internalNotes) && (
          <Card className="gba:mt-4" title="Notes">
            {formData.notes && (
              <div className="gba:mb-2">
                <Text strong>Customer Notes:</Text>
                <div>{formData.notes}</div>
              </div>
            )}
            {formData.internalNotes && (
              <div>
                <Text strong>Internal Notes:</Text>
                <div>{formData.internalNotes}</div>
              </div>
            )}
          </Card>
        )}
      </div>
    )
  }

  // Render step content based on current step and method
  const renderStepContent = () => {
    // Step 0: Always show method selection
    if (currentStep === 0) {
      return renderMethodSelection()
    }

    // Handle different creation methods
    if (creationMethod === 'quote') {
      if (currentStep === 1) {
        return renderQuoteSelection()
      }
      if (currentStep === 2) {
        return renderReview()
      }
    }

    if (creationMethod === 'ai') {
      if (currentStep === 1) {
        return renderAIGeneration()
      }
      if (currentStep === 2) {
        return renderReview()
      }
    }

    if (creationMethod === 'manual') {
      if (currentStep === 1) {
        return renderCustomerSelection()
      }
      if (currentStep === 2) {
        return renderOrderDetails()
      }
      if (currentStep === 3) {
        return renderLineItems()
      }
      if (currentStep === 4) {
        return renderReview()
      }
    }

    // Fallback
    return (
      <div className="gba:p-6 gba:text-center" data-testid="step-placeholder">
        <Spin size="large" />
        <Text className="gba:block gba:mt-4">Loading step content...</Text>
      </div>
    )
  }

  return (
    <Modal
      title="Create New Sales Order"
      open={open}
      onCancel={handleCancel}
      width={1000}
      footer={null}
      destroyOnHidden
      className="gba:sales-order-creation-modal"
      data-testid="sales-order-creation-modal"
    >
      <div className="gba:mb-6">
        <Steps current={currentStep} size="small">
          {steps.map((step, index) => (
            <Step key={index} title={step.title} description={step.description} data-testid={`step-${index}`} />
          ))}
        </Steps>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          onClose={clearError}
          className="gba:mb-4"
          data-testid="error-alert"
        />
      )}

      <div className="gba:min-h-96">{renderStepContent()}</div>

      <div className="gba:flex gba:justify-between gba:items-center gba:mt-6 gba:pt-4 gba:border-t">
        <Button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          icon={<ArrowLeftIcon size={16} />}
          data-testid="previous-button"
        >
          Previous
        </Button>

        <Space>
          <Button onClick={handleCancel} data-testid="cancel-button">
            Cancel
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={creatingOrder}
              icon={<CheckIcon size={16} />}
              disabled={formData.items.length === 0 || !formData.customerId || !formData.orderDate}
              data-testid="submit-button"
            >
              Create Sales Order
            </Button>
          ) : (
            <Button
              type="primary"
              onClick={handleNext}
              disabled={
                (currentStep === 0 && !creationMethod) ||
                (creationMethod === 'quote' && currentStep === 1 && !selectedQuote) ||
                (creationMethod === 'ai' && currentStep === 1 && !aiResult?.success) ||
                (creationMethod === 'manual' && currentStep === 1 && !selectedCustomer) ||
                (creationMethod === 'manual' && currentStep === 3 && formData.items.length === 0)
              }
              icon={<ArrowRightIcon size={16} />}
              data-testid="next-button"
            >
              Next
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  )
}

export default SalesOrderCreationForm
