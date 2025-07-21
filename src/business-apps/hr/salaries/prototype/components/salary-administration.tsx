"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlusCircle, Trash2, Calculator, History } from "lucide-react"

// Types for our salary components
interface SalaryComponent {
  id: string
  name: string
  amount: number
  type: "fixed" | "hourly" | "percentage" | "percentage-hour"
  basis?: string // For percentage-based components
  effectOnSalary: "add-to-gross" | "add-to-net" | "partially-to-gross" | "no-effect"
  isRecurring: boolean
  validFrom: string
  validTo: string
}

interface SalaryRow {
  id: string
  paymentType: "hourly" | "monthly"
  baseAmount: number
  targetHours?: number
  activeMonths?: number[]
  description: string
  validFrom: string
  validTo: string
}

interface Absence {
  id: string
  type: "sick" | "vacation" | "unpaid" | "other"
  startDate: string
  endDate: string
  hours: number
  description: string
}

interface HourlyMovement {
  rowId: string
  month: number
  year: number
  actualHours: number
}

interface MovementData {
  absences: Absence[]
  hourlyMovements: HourlyMovement[]
}

// New interfaces for Vehicle data
interface VehicleAbandonment {
  id: string
  startDate: string
  endDate: string
  reason: string
  payrollNotes?: string
}

interface Vehicle {
  id: string
  licensePlate: string
  type: "passenger-car" | "motorcycle" | "bicycle" | "pedelec" | "e-bike" | "scooter-with-seat" | "scooter-without-seat"
  motor: "combustion" | "hybrid" | "electric" | "gas" | "fuel-cell" | "none"
  grossListPrice: number
  roundedDownPrice: number
  kmHomeOffice?: number
  familyReturnsPerWeek?: number
  employeeContributionGLP?: number
  employeeContributionMonthly?: number
  employeeMonetaryBenefit?: number
  monthlyWorkDaysWithTour?: number
  validFrom: string
  validTo: string
  abandonments: VehicleAbandonment[]
}

interface Insurance {
  id: string
  provider: string
  fileNumber: string
  type: string
  amount: number
  frequency: "monthly" | "quarterly" | "semi-annual" | "annual"
  effectType: "gross-deduction" | "net-deduction" | "additional" | "no-effect"
  startDate: string
  endDate: string
  notes?: string
}

interface Garnishment {
  id: string
  dateOfReceipt: string
  timeOfReceipt: string
  typeOfPayment: "regular" | "preferential" | "support" | "attachment" | "personal-insolvency" | "employer-loan"
  orderNumber: number
  isActive: boolean
  totalAmount?: number
  monthlyPayment?: number
  remainingAmount?: number
  fileNumber: string
  creditor: string
  iban: string
  bic: string
  creditInstitution: string
  isFulfilled: boolean
  validTo?: string
}

interface EmployeeSalary {
  currency: string
  salaryRows: SalaryRow[]
  components: SalaryComponent[]
  movementData: MovementData
  vehicles: Vehicle[]
  insurances: Insurance[]
  garnishments: Garnishment[]
}

export default function SalaryAdministration() {
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  const [salary, setSalary] = useState<EmployeeSalary>({
    currency: "EUR",
    salaryRows: [
      {
        id: "row-1",
        paymentType: "monthly",
        baseAmount: 0,
        targetHours: 160,
        activeMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        description: "Base Salary",
        validFrom: new Date().toISOString().split("T")[0],
        validTo: "",
      },
    ],
    components: [],
    movementData: {
      absences: [],
      hourlyMovements: [],
    },
    vehicles: [],
    insurances: [],
    garnishments: [],
  })

  const [newComponent, setNewComponent] = useState<Omit<SalaryComponent, "id">>({
    name: "",
    amount: 0,
    type: "fixed",
    effectOnSalary: "add-to-gross",
    isRecurring: true,
    validFrom: new Date().toISOString().split("T")[0],
    validTo: "",
  })

  const [newAbsence, setNewAbsence] = useState<Omit<Absence, "id">>({
    type: "sick",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    hours: 8,
    description: "",
  })

  // New state for vehicle management
  const [newVehicle, setNewVehicle] = useState<Omit<Vehicle, "id" | "abandonments">>({
    licensePlate: "",
    type: "passenger-car",
    motor: "combustion",
    grossListPrice: 0,
    roundedDownPrice: 0,
    validFrom: new Date().toISOString().split("T")[0],
    validTo: "",
  })

  const [newAbandonment, setNewAbandonment] = useState<Omit<VehicleAbandonment, "id">>({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "",
    payrollNotes: "",
  })

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)

  const [newInsurance, setNewInsurance] = useState<Omit<Insurance, "id">>({
    provider: "",
    fileNumber: "",
    type: "",
    amount: 0,
    frequency: "monthly",
    effectType: "no-effect",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    notes: "",
  })

  const [selectedInsuranceId, setSelectedInsuranceId] = useState<string | null>(null)

  const [newGarnishment, setNewGarnishment] = useState<Omit<Garnishment, "id">>({
    dateOfReceipt: new Date().toISOString().split("T")[0],
    timeOfReceipt: new Date().toTimeString().slice(0, 5),
    typeOfPayment: "regular",
    orderNumber: 1,
    isActive: true,
    fileNumber: "",
    creditor: "",
    iban: "",
    bic: "",
    creditInstitution: "",
    isFulfilled: false,
  })

  const [selectedGarnishmentId, setSelectedGarnishmentId] = useState<string | null>(null)

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const [expectedSalary, setExpectedSalary] = useState(0)
  const [activeTab, setActiveTab] = useState("base")

  const [historyDateFilter, setHistoryDateFilter] = useState<"all" | "past" | "current" | "future" | "custom">("all")
  const [historyStartDate, setHistoryStartDate] = useState<string>("")
  const [historyEndDate, setHistoryEndDate] = useState<string>("")
  const [historyViewType, setHistoryViewType] = useState<"contract" | "paid">("contract")

  // Calculate the expected salary whenever salary data changes
  useEffect(() => {
    // Calculate total from all salary rows
    let total = salary.salaryRows.reduce((sum, row) => {
      if (row.paymentType === "monthly") {
        return sum + row.baseAmount
      } else {
        // For hourly rows, check if we have actual hours in movement data
        const movement = salary.movementData.hourlyMovements.find(
          (m) => m.rowId === row.id && m.month === selectedMonth && m.year === selectedYear,
        )

        // Use actual hours if available, otherwise use target hours
        const hours = movement ? movement.actualHours : row.targetHours || 0
        return sum + row.baseAmount * hours
      }
    }, 0)

    // Subtract absences if they apply to monthly salaries
    const totalAbsenceHours = salary.movementData.absences.reduce((sum, absence) => {
      // Only count absences that affect the current month
      const startDate = new Date(absence.startDate)
      const endDate = new Date(absence.endDate)
      const isInSelectedMonth =
        (startDate.getMonth() === selectedMonth && startDate.getFullYear() === selectedYear) ||
        (endDate.getMonth() === selectedMonth && endDate.getFullYear() === selectedYear)

      return isInSelectedMonth ? sum + absence.hours : sum
    }, 0)

    // Calculate hourly rate for monthly employees (for absence deduction)
    const monthlyRows = salary.salaryRows.filter((row) => row.paymentType === "monthly")
    if (monthlyRows.length > 0) {
      const avgMonthlyHours = monthlyRows.reduce((sum, row) => sum + (row.targetHours || 160), 0) / monthlyRows.length
      const avgHourlyRate = monthlyRows.reduce((sum, row) => sum + row.baseAmount, 0) / avgMonthlyHours

      // Deduct absences from monthly salary
      total -= totalAbsenceHours * avgHourlyRate
    }

    // Add all the components
    salary.components.forEach((component) => {
      if (component.type === "fixed") {
        total += component.amount
      } else if (component.type === "percentage" && component.basis === "base") {
        const baseSalaryTotal = salary.salaryRows.reduce((sum, row) => {
          if (row.paymentType === "monthly") {
            return sum + row.baseAmount
          } else {
            // For hourly rows, check if we have actual hours in movement data
            const movement = salary.movementData.hourlyMovements.find(
              (m) => m.rowId === row.id && m.month === selectedMonth && m.year === selectedYear,
            )

            // Use actual hours if available, otherwise use target hours
            const hours = movement ? movement.actualHours : row.targetHours || 0
            return sum + row.baseAmount * hours
          }
        }, 0)
        total += baseSalaryTotal * (component.amount / 100)
      } else if (component.type === "hourly") {
        // For hourly components, use the actual hours if available
        let totalHours = 0
        salary.salaryRows.forEach((row) => {
          if (row.paymentType === "hourly") {
            totalHours += getActualHours(row.id) || row.targetHours || 0
          } else {
            totalHours += row.targetHours || 0
          }
        })
        total += component.amount * totalHours
      } else if (component.type === "percentage-hour") {
        // Calculate percentage of specific hourly rate if basis is specified
        if (component.basis) {
          const targetRow = salary.salaryRows.find((row) => row.id === component.basis && row.paymentType === "hourly")
          if (targetRow) {
            const movement = salary.movementData.hourlyMovements.find(
              (m) => m.rowId === targetRow.id && m.month === selectedMonth && m.year === selectedYear,
            )
            const hours = movement ? movement.actualHours : targetRow.targetHours || 0
            const hourlyBonus = targetRow.baseAmount * (component.amount / 100)
            total += hourlyBonus * hours
          }
        } else {
          // Fallback to all hourly rows if no basis specified
          const hourlyRowsTotal = salary.salaryRows
            .filter((row) => row.paymentType === "hourly")
            .reduce((sum, row) => {
              const movement = salary.movementData.hourlyMovements.find(
                (m) => m.rowId === row.id && m.month === selectedMonth && m.year === selectedYear,
              )
              const hours = movement ? movement.actualHours : row.targetHours || 0
              const hourlyBonus = row.baseAmount * (component.amount / 100)
              return sum + hourlyBonus * hours
            }, 0)
          total += hourlyRowsTotal
        }
      }
    })

    // Add employee monetary benefit from vehicles if applicable
    salary.vehicles.forEach((vehicle) => {
      if (vehicle.employeeMonetaryBenefit && isVehicleActiveInMonth(vehicle, selectedMonth, selectedYear)) {
        total += vehicle.employeeMonetaryBenefit
      }
    })

    // Add or subtract insurance amounts based on their effect type
    salary.insurances.forEach((insurance) => {
      if (isInsuranceActiveInMonth(insurance, selectedMonth, selectedYear)) {
        const monthlyAmount = getInsuranceMonthlyAmount(insurance)

        if (insurance.effectType === "additional") {
          total += monthlyAmount
        } else if (insurance.effectType === "gross-deduction") {
          total -= monthlyAmount
        }
        // Note: net-deduction doesn't affect the gross salary calculation
      }
    })

    setExpectedSalary(total)
  }, [salary, selectedMonth, selectedYear])

  const addComponent = () => {
    setSalary({
      ...salary,
      components: [
        ...salary.components,
        {
          ...newComponent,
          id: `comp-${Date.now()}`,
        },
      ],
    })

    // Reset the new component form
    setNewComponent({
      name: "",
      amount: 0,
      type: "fixed",
      effectOnSalary: "add-to-gross",
      isRecurring: true,
      validFrom: new Date().toISOString().split("T")[0],
      validTo: "",
    })
  }

  const removeComponent = (id: string) => {
    setSalary({
      ...salary,
      components: salary.components.filter((comp) => comp.id !== id),
    })
  }

  const addAbsence = () => {
    setSalary({
      ...salary,
      movementData: {
        ...salary.movementData,
        absences: [
          ...salary.movementData.absences,
          {
            ...newAbsence,
            id: `absence-${Date.now()}`,
          },
        ],
      },
    })

    // Reset the new absence form
    setNewAbsence({
      type: "sick",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      hours: 8,
      description: "",
    })
  }

  const removeAbsence = (id: string) => {
    setSalary({
      ...salary,
      movementData: {
        ...salary.movementData,
        absences: salary.movementData.absences.filter((absence) => absence.id !== id),
      },
    })
  }

  // Vehicle management functions
  const addVehicle = () => {
    if (!newVehicle.licensePlate || !newVehicle.validFrom || !newVehicle.validTo) {
      return // Don't add if mandatory fields are missing
    }

    const newVehicleId = `vehicle-${Date.now()}`

    setSalary({
      ...salary,
      vehicles: [
        ...salary.vehicles,
        {
          ...newVehicle,
          id: newVehicleId,
          abandonments: [],
        },
      ],
    })

    // Select the newly created vehicle
    setSelectedVehicleId(newVehicleId)

    // Reset the new vehicle form
    setNewVehicle({
      licensePlate: "",
      type: "passenger-car",
      motor: "combustion",
      grossListPrice: 0,
      roundedDownPrice: 0,
      validFrom: new Date().toISOString().split("T")[0],
      validTo: "",
    })
  }

  const removeVehicle = (id: string) => {
    setSalary({
      ...salary,
      vehicles: salary.vehicles.filter((vehicle) => vehicle.id !== id),
    })

    if (selectedVehicleId === id) {
      setSelectedVehicleId(null)
    }
  }

  const addVehicleAbandonment = (vehicleId: string) => {
    if (!newAbandonment.startDate || !newAbandonment.endDate || !newAbandonment.reason) {
      return // Don't add if mandatory fields are missing
    }

    setSalary({
      ...salary,
      vehicles: salary.vehicles.map((vehicle) => {
        if (vehicle.id === vehicleId) {
          return {
            ...vehicle,
            abandonments: [
              ...vehicle.abandonments,
              {
                ...newAbandonment,
                id: `abandonment-${Date.now()}`,
              },
            ],
          }
        }
        return vehicle
      }),
    })

    // Reset the new abandonment form
    setNewAbandonment({
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      reason: "",
      payrollNotes: "",
    })
  }

  const removeVehicleAbandonment = (vehicleId: string, abandonmentId: string) => {
    setSalary({
      ...salary,
      vehicles: salary.vehicles.map((vehicle) => {
        if (vehicle.id === vehicleId) {
          return {
            ...vehicle,
            abandonments: vehicle.abandonments.filter((abandonment) => abandonment.id !== abandonmentId),
          }
        }
        return vehicle
      }),
    })
  }

  // Insurance management functions
  const addInsurance = () => {
    if (
      !newInsurance.provider ||
      !newInsurance.fileNumber ||
      !newInsurance.type ||
      !newInsurance.startDate ||
      newInsurance.amount <= 0
    ) {
      return // Don't add if mandatory fields are missing
    }

    const newInsuranceId = `insurance-${Date.now()}`

    setSalary({
      ...salary,
      insurances: [
        ...salary.insurances,
        {
          ...newInsurance,
          id: newInsuranceId,
        },
      ],
    })

    // Select the newly created insurance
    setSelectedInsuranceId(newInsuranceId)

    // Reset the new insurance form
    setNewInsurance({
      provider: "",
      fileNumber: "",
      type: "",
      amount: 0,
      frequency: "monthly",
      effectType: "no-effect",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      notes: "",
    })
  }

  const removeInsurance = (id: string) => {
    setSalary({
      ...salary,
      insurances: salary.insurances.filter((insurance) => insurance.id !== id),
    })

    if (selectedInsuranceId === id) {
      setSelectedInsuranceId(null)
    }
  }

  const isInsuranceActiveInMonth = (insurance: Insurance, month: number, year: number) => {
    const startDate = new Date(insurance.startDate)
    const endDate = insurance.endDate ? new Date(insurance.endDate) : new Date(9999, 11, 31)
    const targetDate = new Date(year, month, 15) // Middle of the month

    // Check if the insurance is valid for the given month
    return startDate <= targetDate && targetDate <= endDate
  }

  const getInsuranceMonthlyAmount = (insurance: Insurance) => {
    switch (insurance.frequency) {
      case "monthly":
        return insurance.amount
      case "quarterly":
        return insurance.amount / 3
      case "semi-annual":
        return insurance.amount / 6
      case "annual":
        return insurance.amount
    }
  }

  // Garnishment management functions
  const addGarnishment = () => {
    if (
      !newGarnishment.dateOfReceipt ||
      !newGarnishment.fileNumber ||
      !newGarnishment.creditor ||
      !newGarnishment.iban ||
      !newGarnishment.bic ||
      !newGarnishment.creditInstitution
    ) {
      return // Don't add if mandatory fields are missing
    }

    // Ensure order number is unique and sequential
    const orderNumbers = salary.garnishments.map((g) => g.orderNumber)
    const maxOrderNumber = orderNumbers.length > 0 ? Math.max(...orderNumbers) : 0
    const orderNumber = Math.max(newGarnishment.orderNumber, maxOrderNumber + 1)

    const newGarnishmentId = `garnishment-${Date.now()}`
    const newGarnishmentItem = {
      ...newGarnishment,
      id: newGarnishmentId,
      orderNumber,
    }

    // Add the new garnishment
    const updatedGarnishments = [...salary.garnishments, newGarnishmentItem]

    // Sort garnishments by order number
    const sortedGarnishments = updatedGarnishments.sort((a, b) => a.orderNumber - b.orderNumber)

    // Update active status based on priority rules
    const finalGarnishments = updateGarnishmentActiveStatus(sortedGarnishments)

    setSalary({
      ...salary,
      garnishments: finalGarnishments,
    })

    // Select the newly created garnishment
    setSelectedGarnishmentId(newGarnishmentId)

    // Reset the new garnishment form
    setNewGarnishment({
      dateOfReceipt: new Date().toISOString().split("T")[0],
      timeOfReceipt: new Date().toTimeString().slice(0, 5),
      typeOfPayment: "regular",
      orderNumber: finalGarnishments.length + 1,
      isActive: true,
      fileNumber: "",
      creditor: "",
      iban: "",
      bic: "",
      creditInstitution: "",
      isFulfilled: false,
    })
  }

  const removeGarnishment = (id: string) => {
    const updatedGarnishments = salary.garnishments.filter((g) => g.id !== id)

    // Re-number the remaining garnishments
    const renumberedGarnishments = updatedGarnishments
      .sort((a, b) => a.orderNumber - b.orderNumber)
      .map((g, index) => ({ ...g, orderNumber: index + 1 }))

    // Update active status based on priority rules
    const finalGarnishments = updateGarnishmentActiveStatus(renumberedGarnishments)

    setSalary({
      ...salary,
      garnishments: finalGarnishments,
    })

    if (selectedGarnishmentId === id) {
      setSelectedGarnishmentId(null)
    }
  }

  const updateGarnishmentActiveStatus = (garnishments: Garnishment[]): Garnishment[] => {
    // Filter out fulfilled garnishments as they don't affect the active status logic
    const activeGarnishments = garnishments.filter((g) => !g.isFulfilled)

    // Sort by order number
    const sortedGarnishments = [...activeGarnishments].sort((a, b) => a.orderNumber - b.orderNumber)

    // Find the first inactive garnishment
    const firstInactiveIndex = sortedGarnishments.findIndex((g) => !g.isActive)

    if (firstInactiveIndex !== -1) {
      // Set all garnishments after the first inactive one to inactive
      for (let i = firstInactiveIndex; i < sortedGarnishments.length; i++) {
        sortedGarnishments[i].isActive = false
      }
    }

    // Combine with fulfilled garnishments
    return [...sortedGarnishments, ...garnishments.filter((g) => g.isFulfilled)].sort(
      (a, b) => a.orderNumber - b.orderNumber,
    )
  }

  const updateGarnishmentOrder = (garnishmentId: string, newOrder: number) => {
    // Get the garnishment to update
    const garnishmentToUpdate = salary.garnishments.find((g) => g.id === garnishmentId)
    if (!garnishmentToUpdate) return

    // Get the current order
    const currentOrder = garnishmentToUpdate.orderNumber

    // If the order hasn't changed, do nothing
    if (currentOrder === newOrder) return

    // Create a copy of garnishments
    const updatedGarnishments = [...salary.garnishments]

    // Update the order numbers
    updatedGarnishments.forEach((g) => {
      if (g.id === garnishmentId) {
        // Update the target garnishment
        g.orderNumber = newOrder
      } else if (newOrder > currentOrder && g.orderNumber > currentOrder && g.orderNumber <= newOrder) {
        // Shift down garnishments in between
        g.orderNumber--
      } else if (newOrder < currentOrder && g.orderNumber >= newOrder && g.orderNumber < currentOrder) {
        // Shift up garnishments in between
        g.orderNumber++
      }
    })

    // Sort and update active status
    const finalGarnishments = updateGarnishmentActiveStatus(
      updatedGarnishments.sort((a, b) => a.orderNumber - b.orderNumber),
    )

    setSalary({
      ...salary,
      garnishments: finalGarnishments,
    })
  }

  const getGarnishmentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      regular: "Regular Garnishment",
      preferential: "Preferential Garnishment",
      support: "Garnishment of Support Payments",
      attachment: "Salary Attachment",
      "personal-insolvency": "Personal Insolvency",
      "employer-loan": "Employer Loan",
    }
    return types[type] || type
  }

  const isVehicleActiveInMonth = (vehicle: Vehicle, month: number, year: number) => {
    const startDate = new Date(vehicle.validFrom)
    const endDate = vehicle.validTo ? new Date(vehicle.validTo) : new Date(9999, 11, 31)
    const targetDate = new Date(year, month, 15) // Middle of the month

    // Check if the vehicle is valid for the given month
    const isValid = startDate <= targetDate && targetDate <= endDate

    // Check if there's any abandonment period that covers the entire month
    if (isValid) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)

      for (const abandonment of vehicle.abandonments) {
        const abandonmentStart = new Date(abandonment.startDate)
        const abandonmentEnd = new Date(abandonment.endDate)

        // If abandonment covers the entire month, vehicle is not active
        if (abandonmentStart <= monthStart && abandonmentEnd >= monthEnd) {
          return false
        }
      }
    }

    return isValid
  }

  const updateHourlyMovement = (rowId: string, hours: number) => {
    const existingMovementIndex = salary.movementData.hourlyMovements.findIndex(
      (m) => m.rowId === rowId && m.month === selectedMonth && m.year === selectedYear,
    )

    const updatedMovements = [...salary.movementData.hourlyMovements]

    if (existingMovementIndex >= 0) {
      // Update existing movement
      updatedMovements[existingMovementIndex] = {
        ...updatedMovements[existingMovementIndex],
        actualHours: hours,
      }
    } else {
      // Add new movement
      updatedMovements.push({
        rowId,
        month: selectedMonth,
        year: selectedYear,
        actualHours: hours,
      })
    }

    setSalary({
      ...salary,
      movementData: {
        ...salary.movementData,
        hourlyMovements: updatedMovements,
      },
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-DE", {
      style: "currency",
      currency: salary.currency,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Open"
    const date = new Date(dateString)
    return `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}.${date.getFullYear()}`
  }

  const getActiveMonthsString = (activeMonths?: number[]) => {
    if (!activeMonths || activeMonths.length === 12) return "All Year"
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return activeMonths.map((m) => monthNames[m]).join(", ")
  }

  const getBasisDescription = (component: SalaryComponent) => {
    if (component.type === "percentage" && component.basis === "base") {
      return "Base Salary"
    } else if (component.type === "percentage-hour" && component.basis) {
      const targetRow = salary.salaryRows.find((row) => row.id === component.basis)
      return targetRow ? `${targetRow.description} (${formatCurrency(targetRow.baseAmount)}/hr)` : "Unknown"
    }
    return ""
  }

  const getActualHours = (rowId: string) => {
    const movement = salary.movementData.hourlyMovements.find(
      (m) => m.rowId === rowId && m.month === selectedMonth && m.year === selectedYear,
    )
    return movement ? movement.actualHours : undefined
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const isRowValidInRange = (validFrom: string, validTo: string) => {
    if (historyDateFilter === "all") return true

    const startDate = validFrom ? new Date(validFrom) : new Date(0)
    const endDate = validTo ? new Date(validTo) : new Date(9999, 11, 31)
    const now = new Date()

    switch (historyDateFilter) {
      case "past":
        return endDate < now
      case "current":
        return startDate <= now && (endDate >= now || !validTo)
      case "future":
        return startDate > now
      case "custom":
        const filterStart = historyStartDate ? new Date(historyStartDate) : new Date(0)
        const filterEnd = historyEndDate ? new Date(historyEndDate) : new Date(9999, 11, 31)
        return startDate <= filterEnd && (!validTo || endDate >= filterStart)
      default:
        return true
    }
  }

  const getVehicleTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      "passenger-car": "Passenger Car",
      motorcycle: "Motorcycle",
      bicycle: "Bicycle",
      pedelec: "Pedelec",
      "e-bike": "E-Bike",
    }
    return types[type] || type
  }

  const getMotorTypeLabel = (motor: string) => {
    const motors: Record<string, string> = {
      combustion: "Combustion Engine",
      hybrid: "Hybrid Engine",
      electric: "Electric Engine",
      gas: "Gas-powered Engine",
      "fuel-cell": "Fuel Cell",
      none: "No Engine",
    }
    return motors[motor] || motor
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Salary & Compensation</h2>
        <div className="flex items-center space-x-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={salary.currency} onValueChange={(value) => setSalary({ ...salary, currency: value })}>
            <SelectTrigger className="w-20">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="base">Base Salary</TabsTrigger>
          <TabsTrigger value="components">Additional Components</TabsTrigger>
          <TabsTrigger value="movements">Movement Data</TabsTrigger>
          <TabsTrigger value="insurances">Insurances</TabsTrigger>
          <TabsTrigger value="garnishments">Garnishment & Credit</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Salary Rows</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveTab("history")}>
                <History className="mr-2 h-4 w-4" />
                Show History
              </Button>

              <Button
                onClick={() => {
                  const newRow: SalaryRow = {
                    id: `row-${Date.now()}`,
                    paymentType: "monthly",
                    baseAmount: 0,
                    targetHours: 160,
                    activeMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                    description: `Salary Row ${salary.salaryRows.length + 1}`,
                    validFrom: new Date().toISOString().split("T")[0],
                    validTo: "",
                  }
                  setSalary({
                    ...salary,
                    salaryRows: [...salary.salaryRows, newRow],
                  })
                }}
                size="sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Row
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {salary.salaryRows.map((row, index) => (
              <div key={row.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <Input
                    value={row.description}
                    onChange={(e) => {
                      const updatedRows = salary.salaryRows.map((r) =>
                        r.id === row.id ? { ...r, description: e.target.value } : r,
                      )
                      setSalary({ ...salary, salaryRows: updatedRows })
                    }}
                    className="font-medium text-sm w-48"
                    placeholder="Row description"
                  />
                  {salary.salaryRows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSalary({
                          ...salary,
                          salaryRows: salary.salaryRows.filter((r) => r.id !== row.id),
                        })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-shrink-0 space-y-2">
                    <Label className="text-xs">Payment Type</Label>
                    <Select
                      value={row.paymentType}
                      onValueChange={(value: "hourly" | "monthly") => {
                        const updatedRows = salary.salaryRows.map((r) =>
                          r.id === row.id ? { ...r, paymentType: value } : r,
                        )
                        setSalary({ ...salary, salaryRows: updatedRows })
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-shrink-0 space-y-2">
                    <Label className="text-xs">
                      {row.paymentType === "monthly" ? "Monthly Salary" : "Hourly Rate"}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.baseAmount}
                      onChange={(e) => {
                        const updatedRows = salary.salaryRows.map((r) =>
                          r.id === row.id ? { ...r, baseAmount: Number.parseFloat(e.target.value) || 0 } : r,
                        )
                        setSalary({ ...salary, salaryRows: updatedRows })
                      }}
                      className="h-8 text-xs w-28"
                    />
                  </div>

                  <div className="flex-shrink-0 space-y-2">
                    <Label className="text-xs">Target Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      value={row.targetHours}
                      onChange={(e) => {
                        const updatedRows = salary.salaryRows.map((r) =>
                          r.id === row.id ? { ...r, targetHours: Number.parseInt(e.target.value) || 0 } : r,
                        )
                        setSalary({ ...salary, salaryRows: updatedRows })
                      }}
                      disabled={row.paymentType === "monthly"}
                      className="h-8 text-xs w-20"
                    />
                  </div>

                  <div className="flex-shrink-0 border-l pl-4 ml-2">
                    <div className="flex gap-3 items-end">
                      {[
                        { abbr: "Jan", month: 0 },
                        { abbr: "Feb", month: 1 },
                        { abbr: "Mar", month: 2 },
                        { abbr: "Apr", month: 3 },
                        { abbr: "May", month: 4 },
                        { abbr: "Jun", month: 5 },
                        { abbr: "Jul", month: 6 },
                        { abbr: "Aug", month: 7 },
                        { abbr: "Sep", month: 8 },
                        { abbr: "Oct", month: 9 },
                        { abbr: "Nov", month: 10 },
                        { abbr: "Dec", month: 11 },
                      ].map(({ abbr, month }) => (
                        <div key={month} className="flex flex-col items-center space-y-1">
                          <Label className="text-xs font-normal">{abbr}</Label>
                          <input
                            type="checkbox"
                            checked={row.activeMonths?.includes(month) ?? true}
                            onChange={(e) => {
                              const activeMonths = row.activeMonths || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
                              const updatedMonths = e.target.checked
                                ? [...activeMonths.filter((m) => m !== month), month].sort()
                                : activeMonths.filter((m) => m !== month)

                              const updatedRows = salary.salaryRows.map((r) =>
                                r.id === row.id ? { ...r, activeMonths: updatedMonths } : r,
                              )
                              setSalary({ ...salary, salaryRows: updatedRows })
                            }}
                            className="h-4 w-4"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-shrink-0 border-l pl-4 ml-2">
                    <div className="flex gap-3 items-end">
                      <div className="flex flex-col space-y-1">
                        <Label className="text-xs">Valid From</Label>
                        <Input
                          type="date"
                          value={row.validFrom}
                          onChange={(e) => {
                            const updatedRows = salary.salaryRows.map((r) =>
                              r.id === row.id ? { ...r, validFrom: e.target.value } : r,
                            )
                            setSalary({ ...salary, salaryRows: updatedRows })
                          }}
                          className="h-8 text-xs w-32"
                        />
                      </div>

                      <div className="flex flex-col space-y-1">
                        <Label className="text-xs">Valid To</Label>
                        <Input
                          type="date"
                          value={row.validTo}
                          onChange={(e) => {
                            const updatedRows = salary.salaryRows.map((r) =>
                              r.id === row.id ? { ...r, validTo: e.target.value } : r,
                            )
                            setSalary({ ...salary, salaryRows: updatedRows })
                          }}
                          className="h-8 text-xs w-32"
                          placeholder="Open-ended"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded">
                  <div className="flex justify-between items-center text-sm">
                    <span>Row Total:</span>
                    <span className="font-bold">
                      {formatCurrency(
                        row.paymentType === "monthly" ? row.baseAmount : row.baseAmount * (row.targetHours || 0),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <span>
                      Valid: {formatDate(row.validFrom)} - {formatDate(row.validTo)}
                    </span>
                    <span>Active: {getActiveMonthsString(row.activeMonths)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Expected Monthly Base Pay:</span>
              <span className="text-xl font-bold">
                {formatCurrency(
                  salary.salaryRows.reduce((total, row) => {
                    const rowTotal =
                      row.paymentType === "monthly" ? row.baseAmount : row.baseAmount * (row.targetHours || 0)
                    return total + rowTotal
                  }, 0),
                )}
              </span>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <div className="space-y-4">
            <h3 className="font-medium">Current Additional Components</h3>

            {salary.components.length === 0 ? (
              <p className="text-muted-foreground">No additional salary components added yet.</p>
            ) : (
              <div className="space-y-2">
                {salary.components.map((component) => (
                  <div key={component.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{component.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {component.type === "fixed" && `Fixed amount: ${formatCurrency(component.amount)}`}
                        {component.type === "percentage" && `${component.amount}% of ${getBasisDescription(component)}`}
                        {component.type === "percentage-hour" &&
                          `${component.amount}% of ${getBasisDescription(component)}`}
                        {component.type === "hourly" && `${formatCurrency(component.amount)} per hour`}
                        {component.isRecurring ? " (recurring)" : " (one-time)"}
                        {" • "}
                        {component.effectOnSalary === "add-to-gross" && "Add to Gross"}
                        {component.effectOnSalary === "add-to-net" && "Add to Net"}
                        {component.effectOnSalary === "partially-to-gross" && "Partially to Gross"}
                        {component.effectOnSalary === "no-effect" && "No Effect on Salary"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Valid: {formatDate(component.validFrom)} - {formatDate(component.validTo)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeComponent(component.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Add New Component</h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-shrink-0 space-y-2">
                  <Label htmlFor="componentName" className="text-xs">
                    Component Name
                  </Label>
                  <Input
                    id="componentName"
                    placeholder="e.g., Shift Bonus"
                    value={newComponent.name}
                    onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                    className="w-40"
                  />
                </div>

                <div className="flex-shrink-0 space-y-2">
                  <Label htmlFor="componentType" className="text-xs">
                    Type
                  </Label>
                  <Select
                    value={newComponent.type}
                    onValueChange={(value: "fixed" | "hourly" | "percentage" | "percentage-hour") =>
                      setNewComponent({ ...newComponent, type: value })
                    }
                  >
                    <SelectTrigger id="componentType" className="w-48">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage of Base Salary</SelectItem>
                      {salary.salaryRows.some((row) => row.paymentType === "hourly") && (
                        <>
                          <SelectItem value="hourly">Per Hour</SelectItem>
                          <SelectItem value="percentage-hour">Percentage of Hourly Rate</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-shrink-0 space-y-2">
                  <Label htmlFor="componentAmount" className="text-xs">
                    {newComponent.type === "percentage" || newComponent.type === "percentage-hour"
                      ? "Percentage (%)"
                      : "Amount"}
                  </Label>
                  <Input
                    id="componentAmount"
                    type="number"
                    min="0"
                    step={newComponent.type === "percentage" || newComponent.type === "percentage-hour" ? "1" : "0.01"}
                    value={newComponent.amount}
                    onChange={(e) =>
                      setNewComponent({
                        ...newComponent,
                        amount: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-24"
                  />
                </div>

                <div className="flex-shrink-0 space-y-2">
                  <Label htmlFor="componentBasis" className="text-xs">
                    Basis
                  </Label>
                  {newComponent.type === "percentage" || newComponent.type === "percentage-hour" ? (
                    <Select
                      value={newComponent.basis || (newComponent.type === "percentage" ? "base" : "")}
                      onValueChange={(value) => setNewComponent({ ...newComponent, basis: value })}
                    >
                      <SelectTrigger id="componentBasis" className="w-44">
                        <SelectValue placeholder="Select basis" />
                      </SelectTrigger>
                      <SelectContent>
                        {newComponent.type === "percentage" && <SelectItem value="base">Base Salary</SelectItem>}
                        {newComponent.type === "percentage-hour" &&
                          salary.salaryRows
                            .filter((row) => row.paymentType === "hourly")
                            .map((row) => (
                              <SelectItem key={row.id} value={row.id}>
                                {row.description} ({formatCurrency(row.baseAmount)}/hr)
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="w-44 h-9 border border-transparent"></div>
                  )}
                </div>

                <div className="flex-shrink-0 space-y-2">
                  <Label htmlFor="componentEffectOnSalary" className="text-xs">
                    Effect on Salary
                  </Label>
                  <Select
                    value={newComponent.effectOnSalary}
                    onValueChange={(value: "add-to-gross" | "add-to-net" | "partially-to-gross" | "no-effect") =>
                      setNewComponent({ ...newComponent, effectOnSalary: value })
                    }
                  >
                    <SelectTrigger id="componentEffectOnSalary" className="w-44">
                      <SelectValue placeholder="Select effect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add-to-gross">Add to Gross</SelectItem>
                      <SelectItem value="add-to-net">Add to Net</SelectItem>
                      <SelectItem value="partially-to-gross">Partially to Gross</SelectItem>
                      <SelectItem value="no-effect">No Effect on Salary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-shrink-0 space-y-2">
                  <Label htmlFor="componentValidFrom" className="text-xs">
                    Valid From
                  </Label>
                  <Input
                    id="componentValidFrom"
                    type="date"
                    value={newComponent.validFrom}
                    onChange={(e) => setNewComponent({ ...newComponent, validFrom: e.target.value })}
                    className="w-40"
                  />
                </div>

                <div className="flex-shrink-0 space-y-2">
                  <Label htmlFor="componentValidTo" className="text-xs">
                    Valid To
                  </Label>
                  <Input
                    id="componentValidTo"
                    type="date"
                    value={newComponent.validTo}
                    onChange={(e) => setNewComponent({ ...newComponent, validTo: e.target.value })}
                    placeholder="Open-ended"
                    className="w-40"
                  />
                </div>

                <div className="flex-shrink-0 space-y-2">
                  <Label className="text-xs">Recurring</Label>
                  <div className="flex items-center h-9">
                    <Switch
                      id="isRecurring"
                      checked={newComponent.isRecurring}
                      onCheckedChange={(checked) => setNewComponent({ ...newComponent, isRecurring: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  onClick={addComponent}
                  disabled={!newComponent.name || newComponent.amount <= 0}
                  className="w-full"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Component
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Movement Data</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="selectedMonth">Month:</Label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(Number.parseInt(value))}
                >
                  <SelectTrigger id="selectedMonth" className="w-32">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="selectedYear">Year:</Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(Number.parseInt(value))}
                >
                  <SelectTrigger id="selectedYear" className="w-24">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Card className="p-4">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Hours Assignment</h4>
                <div className="text-sm text-muted-foreground">
                  Enter actual hours worked for the selected period: {monthNames[selectedMonth]} {selectedYear}
                </div>
              </div>

              {/* Base Salary Hourly Rows */}
              <div className="space-y-4">
                <h5 className="font-medium text-sm border-b pb-2">Base Salary - Hourly Payments</h5>
                {salary.salaryRows.filter((row) => row.paymentType === "hourly").length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hourly payment rows defined in Base Salary.</p>
                ) : (
                  <div className="space-y-3">
                    {salary.salaryRows
                      .filter((row) => row.paymentType === "hourly")
                      .map((row) => {
                        const actualHours = getActualHours(row.id) || row.targetHours || 0
                        const difference = actualHours - (row.targetHours || 0)

                        return (
                          <div key={row.id} className="border rounded-lg p-3 bg-muted/30">
                            <div className="grid grid-cols-6 gap-4 items-center">
                              <div className="col-span-2">
                                <Label className="text-xs text-muted-foreground">Payment Description</Label>
                                <p className="font-medium">{row.description}</p>
                                <p className="text-xs text-muted-foreground">{formatCurrency(row.baseAmount)}/hour</p>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Target Hours</Label>
                                <p className="text-sm font-mono">{row.targetHours}</p>
                              </div>

                              <div>
                                <Label htmlFor={`actual-${row.id}`} className="text-xs text-muted-foreground">
                                  Actual Hours
                                </Label>
                                <Input
                                  id={`actual-${row.id}`}
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={actualHours}
                                  onChange={(e) => updateHourlyMovement(row.id, Number(e.target.value) || 0)}
                                  className="w-24 h-8 font-mono"
                                  placeholder="0"
                                />
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Difference</Label>
                                <p
                                  className={`text-sm font-mono ${difference > 0 ? "text-green-600" : difference < 0 ? "text-red-600" : ""}`}
                                >
                                  {difference > 0 ? "+" : ""}
                                  {difference}
                                </p>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Total Pay</Label>
                                <p className="text-sm font-semibold">{formatCurrency(row.baseAmount * actualHours)}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              {/* Additional Components - Hourly */}
              <div className="space-y-4">
                <h5 className="font-medium text-sm border-b pb-2">Additional Components - Per Hour</h5>
                {salary.components.filter((comp) => comp.type === "hourly").length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hourly additional components defined.</p>
                ) : (
                  <div className="space-y-3">
                    {salary.components
                      .filter((comp) => comp.type === "hourly")
                      .map((component) => {
                        // Calculate total hours from all salary rows (both monthly and hourly)
                        let totalHours = 0
                        salary.salaryRows.forEach((row) => {
                          if (row.paymentType === "hourly") {
                            totalHours += getActualHours(row.id) || row.targetHours || 0
                          } else {
                            totalHours += row.targetHours || 0
                          }
                        })

                        return (
                          <div key={component.id} className="border rounded-lg p-3 bg-blue-50/50">
                            <div className="grid grid-cols-4 gap-4 items-center">
                              <div className="col-span-2">
                                <Label className="text-xs text-muted-foreground">Component Name</Label>
                                <p className="font-medium">{component.name}</p>
                                <p className="text-xs text-muted-foreground">{formatCurrency(component.amount)}/hour</p>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Total Hours Used</Label>
                                <p className="text-sm font-mono">{totalHours}</p>
                                <p className="text-xs text-muted-foreground">From all salary rows</p>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Component Total</Label>
                                <p className="text-sm font-semibold">{formatCurrency(component.amount * totalHours)}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              {/* Additional Components - Percentage of Hourly */}
              <div className="space-y-4">
                <h5 className="font-medium text-sm border-b pb-2">Additional Components - Percentage of Hourly Rate</h5>
                {salary.components.filter((comp) => comp.type === "percentage-hour").length === 0 ? (
                  <p className="text-muted-foreground text-sm">No percentage-based hourly components defined.</p>
                ) : (
                  <div className="space-y-3">
                    {salary.components
                      .filter((comp) => comp.type === "percentage-hour")
                      .map((component) => {
                        let componentValue = 0
                        let hoursUsed = 0
                        let baseRate = 0
                        let basisDescription = ""

                        if (component.basis) {
                          const targetRow = salary.salaryRows.find(
                            (row) => row.id === component.basis && row.paymentType === "hourly",
                          )
                          if (targetRow) {
                            hoursUsed = getActualHours(targetRow.id) || targetRow.targetHours || 0
                            baseRate = targetRow.baseAmount
                            const hourlyBonus = baseRate * (component.amount / 100)
                            componentValue = hourlyBonus * hoursUsed
                            basisDescription = `${targetRow.description} (${formatCurrency(baseRate)}/hr)`
                          }
                        } else {
                          // Use all hourly rows
                          salary.salaryRows
                            .filter((row) => row.paymentType === "hourly")
                            .forEach((row) => {
                              const rowHours = getActualHours(row.id) || row.targetHours || 0
                              hoursUsed += rowHours
                              const hourlyBonus = row.baseAmount * (component.amount / 100)
                              componentValue += hourlyBonus * rowHours
                            })
                          basisDescription = "All hourly rates"
                        }

                        return (
                          <div key={component.id} className="border rounded-lg p-3 bg-green-50/50">
                            <div className="grid grid-cols-5 gap-4 items-center">
                              <div className="col-span-2">
                                <Label className="text-xs text-muted-foreground">Component Name</Label>
                                <p className="font-medium">{component.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {component.amount}% of {basisDescription}
                                </p>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Base Rate</Label>
                                <p className="text-sm font-mono">{formatCurrency(baseRate)}/hr</p>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Hours Used</Label>
                                <p className="text-sm font-mono">{hoursUsed}</p>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Component Total</Label>
                                <p className="text-sm font-semibold">{formatCurrency(componentValue)}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              {/* Summary of Hours Impact */}
              <div className="border-t pt-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h5 className="font-medium mb-3">
                    Hours Summary for {monthNames[selectedMonth]} {selectedYear}
                  </h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Total Target Hours</Label>
                      <p className="font-semibold">
                        {salary.salaryRows
                          .filter((row) => row.paymentType === "hourly")
                          .reduce((sum, row) => sum + (row.targetHours || 0), 0)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Total Actual Hours</Label>
                      <p className="font-semibold">
                        {salary.salaryRows
                          .filter((row) => row.paymentType === "hourly")
                          .reduce((sum, row) => sum + (getActualHours(row.id) || row.targetHours || 0), 0)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Hours Difference</Label>
                      <p
                        className={`font-semibold ${
                          salary.salaryRows
                            .filter((row) => row.paymentType === "hourly")
                            .reduce(
                              (sum, row) =>
                                sum + ((getActualHours(row.id) || row.targetHours || 0) - (row.targetHours || 0)),
                              0,
                            ) > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {salary.salaryRows
                          .filter((row) => row.paymentType === "hourly")
                          .reduce((sum, row) => {
                            const diff = (getActualHours(row.id) || row.targetHours || 0) - (row.targetHours || 0)
                            return sum + diff
                          }, 0) > 0
                          ? "+"
                          : ""}
                        {salary.salaryRows
                          .filter((row) => row.paymentType === "hourly")
                          .reduce(
                            (sum, row) =>
                              sum + ((getActualHours(row.id) || row.targetHours || 0) - (row.targetHours || 0)),
                            0,
                          )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="space-y-4">
              <h4 className="font-medium">Absences</h4>
              {salary.movementData.absences.length === 0 ? (
                <p className="text-muted-foreground">No absences recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salary.movementData.absences.map((absence) => (
                      <TableRow key={absence.id}>
                        <TableCell className="capitalize">{absence.type}</TableCell>
                        <TableCell>{formatDate(absence.startDate)}</TableCell>
                        <TableCell>{formatDate(absence.endDate)}</TableCell>
                        <TableCell>{absence.hours}</TableCell>
                        <TableCell>{absence.description}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeAbsence(absence.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="border-t pt-4">
                <h5 className="font-medium mb-3">Add New Absence</h5>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-shrink-0 space-y-2">
                    <Label htmlFor="absenceType" className="text-xs">
                      Type
                    </Label>
                    <Select
                      value={newAbsence.type}
                      onValueChange={(value: "sick" | "vacation" | "unpaid" | "other") =>
                        setNewAbsence({ ...newAbsence, type: value })
                      }
                    >
                      <SelectTrigger id="absenceType" className="w-32">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="vacation">Vacation</SelectItem>
                        <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-shrink-0 space-y-2">
                    <Label htmlFor="absenceStartDate" className="text-xs">
                      Start Date
                    </Label>
                    <Input
                      id="absenceStartDate"
                      type="date"
                      value={newAbsence.startDate}
                      onChange={(e) => setNewAbsence({ ...newAbsence, startDate: e.target.value })}
                      className="w-40"
                    />
                  </div>

                  <div className="flex-shrink-0 space-y-2">
                    <Label htmlFor="absenceEndDate" className="text-xs">
                      End Date
                    </Label>
                    <Input
                      id="absenceEndDate"
                      type="date"
                      value={newAbsence.endDate}
                      onChange={(e) => setNewAbsence({ ...newAbsence, endDate: e.target.value })}
                      className="w-40"
                    />
                  </div>

                  <div className="flex-shrink-0 space-y-2">
                    <Label htmlFor="absenceHours" className="text-xs">
                      Hours
                    </Label>
                    <Input
                      id="absenceHours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={newAbsence.hours}
                      onChange={(e) => setNewAbsence({ ...newAbsence, hours: Number(e.target.value) || 0 })}
                      className="w-20"
                    />
                  </div>

                  <div className="flex-shrink-0 space-y-2 flex-1">
                    <Label htmlFor="absenceDescription" className="text-xs">
                      Description
                    </Label>
                    <Input
                      id="absenceDescription"
                      placeholder="Optional description"
                      value={newAbsence.description}
                      onChange={(e) => setNewAbsence({ ...newAbsence, description: e.target.value })}
                    />
                  </div>

                  <div className="flex-shrink-0">
                    <Button
                      onClick={addAbsence}
                      disabled={!newAbsence.startDate || !newAbsence.endDate || newAbsence.hours <= 0}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Absence
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">Period:</span>
                <span className="ml-2">
                  {monthNames[selectedMonth]} {selectedYear}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-muted-foreground mr-2">Expected Monthly Pay:</span>
                  <span className="font-bold">{formatCurrency(expectedSalary)}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("summary")}>
                  <Calculator className="mr-2 h-4 w-4" />
                  View Summary
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="garnishments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Garnishment Management</h3>
            <Button size="sm" onClick={() => setSelectedGarnishmentId(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Garnishment
            </Button>
          </div>

          {/* Garnishment List */}
          {salary.garnishments.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2">Current Garnishments</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Order</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Creditor</TableHead>
                    <TableHead>File Number</TableHead>
                    <TableHead className="w-24">Monthly</TableHead>
                    <TableHead className="w-24">Remaining</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salary.garnishments
                    .sort((a, b) => a.orderNumber - b.orderNumber)
                    .map((garnishment) => (
                      <TableRow
                        key={garnishment.id}
                        className={`cursor-pointer ${selectedGarnishmentId === garnishment.id ? "bg-muted/50" : ""} ${
                          garnishment.isFulfilled ? "text-muted-foreground" : ""
                        }`}
                        onClick={() => setSelectedGarnishmentId(garnishment.id)}
                      >
                        <TableCell>{garnishment.orderNumber}</TableCell>
                        <TableCell>{getGarnishmentTypeLabel(garnishment.typeOfPayment)}</TableCell>
                        <TableCell>{garnishment.creditor}</TableCell>
                        <TableCell>{garnishment.fileNumber}</TableCell>
                        <TableCell>
                          {garnishment.monthlyPayment ? formatCurrency(garnishment.monthlyPayment) : "-"}
                        </TableCell>
                        <TableCell>
                          {garnishment.remainingAmount ? formatCurrency(garnishment.remainingAmount) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {garnishment.isFulfilled ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Fulfilled
                              </span>
                            ) : garnishment.isActive ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Inactive
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeGarnishment(garnishment.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Garnishment Form */}
          <Card className="p-6">
            {selectedGarnishmentId === null ? (
              <div className="space-y-6">
                <h4 className="font-medium">Add New Garnishment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfReceipt" className="text-sm">
                      Date of Receipt <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="dateOfReceipt"
                        type="date"
                        value={newGarnishment.dateOfReceipt}
                        onChange={(e) => setNewGarnishment({ ...newGarnishment, dateOfReceipt: e.target.value })}
                        required
                        className="w-40"
                      />
                      <Input
                        id="timeOfReceipt"
                        type="time"
                        value={newGarnishment.timeOfReceipt}
                        onChange={(e) => setNewGarnishment({ ...newGarnishment, timeOfReceipt: e.target.value })}
                        required
                        className="w-32"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="typeOfPayment" className="text-sm">
                      Type of Payment <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={newGarnishment.typeOfPayment}
                      onValueChange={(
                        value:
                          | "regular"
                          | "preferential"
                          | "support"
                          | "attachment"
                          | "personal-insolvency"
                          | "employer-loan",
                      ) => setNewGarnishment({ ...newGarnishment, typeOfPayment: value })}
                    >
                      <SelectTrigger id="typeOfPayment">
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular Garnishment</SelectItem>
                        <SelectItem value="preferential">Preferential Garnishment</SelectItem>
                        <SelectItem value="support">Garnishment of Support Payments</SelectItem>
                        <SelectItem value="attachment">Salary Attachment</SelectItem>
                        <SelectItem value="personal-insolvency">Personal Insolvency</SelectItem>
                        <SelectItem value="employer-loan">Employer Loan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orderNumber" className="text-sm">
                      Order Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="orderNumber"
                      type="number"
                      min="1"
                      step="1"
                      value={newGarnishment.orderNumber}
                      onChange={(e) =>
                        setNewGarnishment({
                          ...newGarnishment,
                          orderNumber: Number.parseInt(e.target.value) || 1,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fileNumber" className="text-sm">
                      File Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fileNumber"
                      value={newGarnishment.fileNumber}
                      onChange={(e) => setNewGarnishment({ ...newGarnishment, fileNumber: e.target.value })}
                      placeholder="e.g., 123-456-789"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="creditor" className="text-sm">
                      Creditor <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="creditor"
                      value={newGarnishment.creditor}
                      onChange={(e) => setNewGarnishment({ ...newGarnishment, creditor: e.target.value })}
                      placeholder="Creditor name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalAmount" className="text-sm">
                      Total Amount
                    </Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newGarnishment.totalAmount || ""}
                      onChange={(e) =>
                        setNewGarnishment({
                          ...newGarnishment,
                          totalAmount: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyPayment" className="text-sm">
                      Monthly Payment
                    </Label>
                    <Input
                      id="monthlyPayment"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newGarnishment.monthlyPayment || ""}
                      onChange={(e) =>
                        setNewGarnishment({
                          ...newGarnishment,
                          monthlyPayment: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="remainingAmount" className="text-sm">
                      Remaining Amount
                    </Label>
                    <Input
                      id="remainingAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newGarnishment.remainingAmount || ""}
                      onChange={(e) =>
                        setNewGarnishment({
                          ...newGarnishment,
                          remainingAmount: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iban" className="text-sm">
                      IBAN <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="iban"
                      value={newGarnishment.iban}
                      onChange={(e) => setNewGarnishment({ ...newGarnishment, iban: e.target.value })}
                      placeholder="e.g., DE89 3704 0044 0532 0130 00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bic" className="text-sm">
                      BIC <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bic"
                      value={newGarnishment.bic}
                      onChange={(e) => setNewGarnishment({ ...newGarnishment, bic: e.target.value })}
                      placeholder="e.g., COBADEFFXXX"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="creditInstitution" className="text-sm">
                      Credit Institution <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="creditInstitution"
                      value={newGarnishment.creditInstitution}
                      onChange={(e) => setNewGarnishment({ ...newGarnishment, creditInstitution: e.target.value })}
                      placeholder="e.g., Deutsche Bank"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validTo" className="text-sm">
                      Valid To
                    </Label>
                    <Input
                      id="validTo"
                      type="date"
                      value={newGarnishment.validTo || ""}
                      onChange={(e) => setNewGarnishment({ ...newGarnishment, validTo: e.target.value })}
                      className="w-40"
                    />
                  </div>

                  <div className="space-y-2 flex items-center">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={newGarnishment.isActive}
                        onChange={(checked) => setNewGarnishment({ ...newGarnishment, isActive: checked })}
                      />
                      <Label htmlFor="isActive" className="text-sm">
                        Active
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2 flex items-center">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isFulfilled"
                        checked={newGarnishment.isFulfilled}
                        onChange={(checked) => setNewGarnishment({ ...newGarnishment, isFulfilled: checked })}
                      />
                      <Label htmlFor="isFulfilled" className="text-sm">
                        Fulfilled
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={addGarnishment}
                    disabled={
                      !newGarnishment.dateOfReceipt ||
                      !newGarnishment.fileNumber ||
                      !newGarnishment.creditor ||
                      !newGarnishment.iban ||
                      !newGarnishment.bic ||
                      !newGarnishment.creditInstitution
                    }
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Garnishment
                  </Button>
                </div>
              </div>
            ) : (
              // Edit existing garnishment
              (() => {
                const garnishment = salary.garnishments.find((g) => g.id === selectedGarnishmentId)
                if (!garnishment) return null

                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Edit Garnishment: {garnishment.creditor}</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedGarnishmentId(null)}>
                          Add New Garnishment
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            removeGarnishment(garnishment.id)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Garnishment
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-dateOfReceipt" className="text-sm">
                          Date of Receipt <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="edit-dateOfReceipt"
                            type="date"
                            value={garnishment.dateOfReceipt}
                            onChange={(e) => {
                              setSalary({
                                ...salary,
                                garnishments: salary.garnishments.map((g) =>
                                  g.id === garnishment.id ? { ...g, dateOfReceipt: e.target.value } : g,
                                ),
                              })
                            }}
                            required
                            className="w-40"
                          />
                          <Input
                            id="edit-timeOfReceipt"
                            type="time"
                            value={garnishment.timeOfReceipt}
                            onChange={(e) => {
                              setSalary({
                                ...salary,
                                garnishments: salary.garnishments.map((g) =>
                                  g.id === garnishment.id ? { ...g, timeOfReceipt: e.target.value } : g,
                                ),
                              })
                            }}
                            required
                            className="w-32"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-typeOfPayment" className="text-sm">
                          Type of Payment <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={garnishment.typeOfPayment}
                          onValueChange={(
                            value:
                              | "regular"
                              | "preferential"
                              | "support"
                              | "attachment"
                              | "personal-insolvency"
                              | "employer-loan",
                          ) => {
                            setSalary({
                              ...salary,
                              garnishments: salary.garnishments.map((g) =>
                                g.id === garnishment.id ? { ...g, typeOfPayment: value } : g,
                              ),
                            })
                          }}
                        >
                          <SelectTrigger id="edit-typeOfPayment">
                            <SelectValue placeholder="Select payment type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular Garnishment</SelectItem>
                            <SelectItem value="preferential">Preferential Garnishment</SelectItem>
                            <SelectItem value="support">Garnishment of Support Payments</SelectItem>
                            <SelectItem value="attachment">Salary Attachment</SelectItem>
                            <SelectItem value="personal-insolvency">Personal Insolvency</SelectItem>
                            <SelectItem value="employer-loan">Employer Loan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-orderNumber" className="text-sm">
                          Order Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-orderNumber"
                          type="number"
                          min="1"
                          step="1"
                          value={garnishment.orderNumber}
                          onChange={(e) => {
                            const newOrder = Number.parseInt(e.target.value) || 1
                            updateGarnishmentOrder(garnishment.id, newOrder)
                          }}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-fileNumber" className="text-sm">
                          File Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-fileNumber"
                          value={garnishment.fileNumber}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              garnishments: salary.garnishments.map((g) =>
                                g.id === garnishment.id ? { ...g, fileNumber: e.target.value } : g,
                              ),
                            })
                          }}
                          placeholder="e.g., 123-456-789"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-creditor" className="text-sm">
                          Creditor <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-creditor"
                          value={garnishment.creditor}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              garnishments: salary.garnishments.map((g) =>
                                g.id === garnishment.id ? { ...g, creditor: e.target.value } : g,
                              ),
                            })
                          }}
                          placeholder="Creditor name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-totalAmount" className="text-sm">
                          Total Amount
                        </Label>
                        <Input
                          id="edit-totalAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={garnishment.totalAmount || ""}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              garnishments: salary.garnishments.map((g) =>
                                g.id === garnishment.id
                                  ? {
                                      ...g,
                                      totalAmount: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                                    }
                                  : g,
                              ),
                            })
                          }}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-monthlyPayment" className="text-sm">
                          Monthly Payment
                        </Label>
                        <Input
                          id="edit-monthlyPayment"
                          type="number"
                          min="0"
                          step="0.01"
                          value={garnishment.monthlyPayment || ""}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              garnishments: salary.garnishments.map((g) =>
                                g.id === garnishment.id
                                  ? {
                                      ...g,
                                      monthlyPayment: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                                    }
                                  : g,
                              ),
                            })
                          }}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-remainingAmount" className="text-sm">
                          Remaining Amount
                        </Label>
                        <Input
                          id="edit-remainingAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={garnishment.remainingAmount || ""}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              garnishments: salary.garnishments.map((g) =>
                                g.id === garnishment.id
                                  ? {
                                      ...g,
                                      remainingAmount: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                                    }
                                  : g,
                              ),
                            })
                          }}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-iban" className="text-sm">
                          IBAN <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-iban"
                          value={garnishment.iban}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              garnishments: salary.garnishments.map((g) =>
                                g.id === garnishment.id ? { ...g, iban: e.target.value } : g,
                              ),
                            })
                          }}
                          placeholder="e.g., DE89 3704 0044 0532 0130 00"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-bic" className="text-sm">
                          BIC <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-bic"
                          value={garnishment.bic}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              garnishments: salary.garnishments.map((g) =>
                                g.id === garnishment.id ? { ...g, bic: e.target.value } : g,
                              ),
                            })
                          }}
                          placeholder="e.g., COBADEFFXXX"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-creditInstitution" className="text-sm">
                          Credit Institution <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-creditInstitution"
                          value={garnishment.creditInstitution}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              garnishments: salary.garnishments.map((g) =>
                                g.id === garnishment.id ? { ...g, creditInstitution: e.target.value } : g,
                              ),
                            })
                          }}
                          placeholder="e.g., Deutsche Bank"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-validTo" className="text-sm">
                          Valid To
                        </Label>
                        <Input
                          id="edit-validTo"
                          type="date"
                          value={garnishment.validTo || ""}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              garnishments: salary.garnishments.map((g) =>
                                g.id === garnishment.id ? { ...g, validTo: e.target.value } : g,
                              ),
                            })
                          }}
                          className="w-40"
                        />
                      </div>

                      <div className="space-y-2 flex items-center">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="edit-isActive"
                            checked={garnishment.isActive}
                            onChange={(checked) => {
                              // Update this garnishment's active status
                              const updatedGarnishments = salary.garnishments.map((g) =>
                                g.id === garnishment.id ? { ...g, isActive: checked } : g,
                              )

                              // Apply the active status rules
                              const finalGarnishments = updateGarnishmentActiveStatus(updatedGarnishments)

                              setSalary({
                                ...salary,
                                garnishments: finalGarnishments,
                              })
                            }}
                          />
                          <Label htmlFor="edit-isActive" className="text-sm">
                            Active
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-2 flex items-center">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="edit-isFulfilled"
                            checked={garnishment.isFulfilled}
                            onChange={(checked) => {
                              // Update this garnishment's fulfilled status
                              const updatedGarnishments = salary.garnishments.map((g) =>
                                g.id === garnishment.id ? { ...g, isFulfilled: checked } : g,
                              )

                              // Apply the active status rules
                              const finalGarnishments = updateGarnishmentActiveStatus(updatedGarnishments)

                              setSalary({
                                ...salary,
                                garnishments: finalGarnishments,
                              })
                            }}
                          />
                          <Label htmlFor="edit-isFulfilled" className="text-sm">
                            Fulfilled
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => setSelectedGarnishmentId(null)}>Close</Button>
                    </div>
                  </div>
                )
              })()
            )}
          </Card>
        </TabsContent>

        <TabsContent value="insurances" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Insurance Management</h3>
            <Button size="sm" onClick={() => setSelectedInsuranceId(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Insurance
            </Button>
          </div>

          {/* Insurance List */}
          {salary.insurances.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2">Current Insurances</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>File Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Effect</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salary.insurances.map((insurance) => (
                    <TableRow
                      key={insurance.id}
                      className={`cursor-pointer ${selectedInsuranceId === insurance.id ? "bg-muted/50" : ""}`}
                      onClick={() => setSelectedInsuranceId(insurance.id)}
                    >
                      <TableCell>{insurance.provider}</TableCell>
                      <TableCell>{insurance.type}</TableCell>
                      <TableCell>{insurance.fileNumber}</TableCell>
                      <TableCell>{formatCurrency(insurance.amount)}</TableCell>
                      <TableCell className="capitalize">{insurance.frequency}</TableCell>
                      <TableCell className="capitalize">{insurance.effectType}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeInsurance(insurance.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Insurance Form */}
          <Card className="p-6">
            {selectedInsuranceId === null ? (
              <div className="space-y-6">
                <h4 className="font-medium">Add New Insurance</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider" className="text-sm">
                      Provider <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="provider"
                      value={newInsurance.provider}
                      onChange={(e) => setNewInsurance({ ...newInsurance, provider: e.target.value })}
                      placeholder="e.g., Allianz"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm">
                      Type <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="type"
                      value={newInsurance.type}
                      onChange={(e) => setNewInsurance({ ...newInsurance, type: e.target.value })}
                      placeholder="e.g., Health Insurance"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fileNumber" className="text-sm">
                      File Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fileNumber"
                      value={newInsurance.fileNumber}
                      onChange={(e) => setNewInsurance({ ...newInsurance, fileNumber: e.target.value })}
                      placeholder="e.g., 123-456-789"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm">
                      Amount <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newInsurance.amount}
                      onChange={(e) =>
                        setNewInsurance({ ...newInsurance, amount: Number.parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency" className="text-sm">
                      Frequency
                    </Label>
                    <Select
                      value={newInsurance.frequency}
                      onValueChange={(value: "monthly" | "quarterly" | "semi-annual" | "annual") =>
                        setNewInsurance({ ...newInsurance, frequency: value })
                      }
                    >
                      <SelectTrigger id="frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="effectType" className="text-sm">
                      Effect Type
                    </Label>
                    <Select
                      value={newInsurance.effectType}
                      onValueChange={(value: "gross-deduction" | "net-deduction" | "additional" | "no-effect") =>
                        setNewInsurance({ ...newInsurance, effectType: value })
                      }
                    >
                      <SelectTrigger id="effectType">
                        <SelectValue placeholder="Select effect" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gross-deduction">Gross Deduction</SelectItem>
                        <SelectItem value="net-deduction">Net Deduction</SelectItem>
                        <SelectItem value="additional">Additional</SelectItem>
                        <SelectItem value="no-effect">No Effect</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm">
                      Start Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newInsurance.startDate}
                      onChange={(e) => setNewInsurance({ ...newInsurance, startDate: e.target.value })}
                      required
                      className="w-40"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm">
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newInsurance.endDate}
                      onChange={(e) => setNewInsurance({ ...newInsurance, endDate: e.target.value })}
                      className="w-40"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm">
                      Notes
                    </Label>
                    <Input
                      id="notes"
                      value={newInsurance.notes || ""}
                      onChange={(e) => setNewInsurance({ ...newInsurance, notes: e.target.value })}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={addInsurance}
                    disabled={
                      !newInsurance.provider ||
                      !newInsurance.fileNumber ||
                      !newInsurance.type ||
                      !newInsurance.startDate ||
                      newInsurance.amount <= 0
                    }
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Insurance
                  </Button>
                </div>
              </div>
            ) : (
              // Edit existing insurance
              (() => {
                const insurance = salary.insurances.find((i) => i.id === selectedInsuranceId)
                if (!insurance) return null

                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Edit Insurance: {insurance.provider}</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedInsuranceId(null)}>
                          Add New Insurance
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            removeInsurance(insurance.id)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Insurance
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-provider" className="text-sm">
                          Provider <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-provider"
                          value={insurance.provider}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              insurances: salary.insurances.map((i) =>
                                i.id === insurance.id ? { ...i, provider: e.target.value } : i,
                              ),
                            })
                          }}
                          placeholder="e.g., Allianz"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-type" className="text-sm">
                          Type <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-type"
                          value={insurance.type}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              insurances: salary.insurances.map((i) =>
                                i.id === insurance.id ? { ...i, type: e.target.value } : i,
                              ),
                            })
                          }}
                          placeholder="e.g., Health Insurance"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-fileNumber" className="text-sm">
                          File Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-fileNumber"
                          value={insurance.fileNumber}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              insurances: salary.insurances.map((i) =>
                                i.id === insurance.id ? { ...i, fileNumber: e.target.value } : i,
                              ),
                            })
                          }}
                          placeholder="e.g., 123-456-789"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-amount" className="text-sm">
                          Amount <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={insurance.amount}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              insurances: salary.insurances.map((i) =>
                                i.id === insurance.id ? { ...i, amount: Number.parseFloat(e.target.value) || 0 } : i,
                              ),
                            })
                          }}
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-frequency" className="text-sm">
                          Frequency
                        </Label>
                        <Select
                          value={insurance.frequency}
                          onValueChange={(value: "monthly" | "quarterly" | "semi-annual" | "annual") => {
                            setSalary({
                              ...salary,
                              insurances: salary.insurances.map((i) =>
                                i.id === insurance.id ? { ...i, frequency: value } : i,
                              ),
                            })
                          }}
                        >
                          <SelectTrigger id="edit-frequency">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-effectType" className="text-sm">
                          Effect Type
                        </Label>
                        <Select
                          value={insurance.effectType}
                          onValueChange={(value: "gross-deduction" | "net-deduction" | "additional" | "no-effect") => {
                            setSalary({
                              ...salary,
                              insurances: salary.insurances.map((i) =>
                                i.id === insurance.id ? { ...i, effectType: value } : i,
                              ),
                            })
                          }}
                        >
                          <SelectTrigger id="edit-effectType">
                            <SelectValue placeholder="Select effect" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gross-deduction">Gross Deduction</SelectItem>
                            <SelectItem value="net-deduction">Net Deduction</SelectItem>
                            <SelectItem value="additional">Additional</SelectItem>
                            <SelectItem value="no-effect">No Effect</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-startDate" className="text-sm">
                          Start Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-startDate"
                          type="date"
                          value={insurance.startDate}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              insurances: salary.insurances.map((i) =>
                                i.id === insurance.id ? { ...i, startDate: e.target.value } : i,
                              ),
                            })
                          }}
                          required
                          className="w-40"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-endDate" className="text-sm">
                          End Date
                        </Label>
                        <Input
                          id="edit-endDate"
                          type="date"
                          value={insurance.endDate}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              insurances: salary.insurances.map((i) =>
                                i.id === insurance.id ? { ...i, endDate: e.target.value } : i,
                              ),
                            })
                          }}
                          className="w-40"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-notes" className="text-sm">
                          Notes
                        </Label>
                        <Input
                          id="edit-notes"
                          value={insurance.notes || ""}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              insurances: salary.insurances.map((i) =>
                                i.id === insurance.id ? { ...i, notes: e.target.value } : i,
                              ),
                            })
                          }}
                          placeholder="Optional notes"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => setSelectedInsuranceId(null)}>Close</Button>
                    </div>
                  </div>
                )
              })()
            )}
          </Card>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Vehicle Management</h3>
            <Button size="sm" onClick={() => setSelectedVehicleId(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Vehicle
            </Button>
          </div>

          {/* Vehicle List */}
          {salary.vehicles.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2">Current Vehicles</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Motor</TableHead>
                    <TableHead>Gross List Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salary.vehicles.map((vehicle) => (
                    <TableRow
                      key={vehicle.id}
                      className={`cursor-pointer ${selectedVehicleId === vehicle.id ? "bg-muted/50" : ""}`}
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                    >
                      <TableCell>{vehicle.licensePlate}</TableCell>
                      <TableCell>{getVehicleTypeLabel(vehicle.type)}</TableCell>
                      <TableCell>{getMotorTypeLabel(vehicle.motor)}</TableCell>
                      <TableCell>{formatCurrency(vehicle.grossListPrice)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeVehicle(vehicle.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Vehicle Form */}
          <Card className="p-6">
            {selectedVehicleId === null ? (
              <div className="space-y-6">
                <h4 className="font-medium">Add New Vehicle</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licensePlate" className="text-sm">
                      License Plate <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="licensePlate"
                      value={newVehicle.licensePlate}
                      onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value })}
                      placeholder="e.g., ABC-123"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm">
                      Type
                    </Label>
                    <Select
                      value={newVehicle.type}
                      onValueChange={(
                        value:
                          | "passenger-car"
                          | "motorcycle"
                          | "bicycle"
                          | "pedelec"
                          | "e-bike"
                          | "scooter-with-seat"
                          | "scooter-without-seat",
                      ) => setNewVehicle({ ...newVehicle, type: value })}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passenger-car">Passenger Car</SelectItem>
                        <SelectItem value="motorcycle">Motorcycle</SelectItem>
                        <SelectItem value="bicycle">Bicycle</SelectItem>
                        <SelectItem value="pedelec">Pedelec</SelectItem>
                        <SelectItem value="e-bike">E-Bike</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motor" className="text-sm">
                      Motor
                    </Label>
                    <Select
                      value={newVehicle.motor}
                      onValueChange={(value: "combustion" | "hybrid" | "electric" | "gas" | "fuel-cell" | "none") =>
                        setNewVehicle({ ...newVehicle, motor: value })
                      }
                    >
                      <SelectTrigger id="motor">
                        <SelectValue placeholder="Select motor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="combustion">Combustion Engine</SelectItem>
                        <SelectItem value="hybrid">Hybrid Engine</SelectItem>
                        <SelectItem value="electric">Electric Engine</SelectItem>
                        <SelectItem value="gas">Gas-powered Engine</SelectItem>
                        <SelectItem value="fuel-cell">Fuel Cell</SelectItem>
                        <SelectItem value="none">No Engine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grossListPrice" className="text-sm">
                      Gross List Price <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="grossListPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newVehicle.grossListPrice}
                      onChange={(e) =>
                        setNewVehicle({ ...newVehicle, grossListPrice: Number.parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roundedDownPrice" className="text-sm">
                      Rounded Down Price
                    </Label>
                    <Input
                      id="roundedDownPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newVehicle.roundedDownPrice}
                      onChange={(e) =>
                        setNewVehicle({ ...newVehicle, roundedDownPrice: Number.parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validFrom" className="text-sm">
                      Valid From <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="validFrom"
                      type="date"
                      value={newVehicle.validFrom}
                      onChange={(e) => setNewVehicle({ ...newVehicle, validFrom: e.target.value })}
                      required
                      className="w-40"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validTo" className="text-sm">
                      Valid To <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="validTo"
                      type="date"
                      value={newVehicle.validTo}
                      onChange={(e) => setNewVehicle({ ...newVehicle, validTo: e.target.value })}
                      required
                      className="w-40"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={addVehicle}
                    disabled={!newVehicle.licensePlate || !newVehicle.validFrom || !newVehicle.validTo}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Vehicle
                  </Button>
                </div>
              </div>
            ) : (
              // Edit existing vehicle
              (() => {
                const vehicle = salary.vehicles.find((v) => v.id === selectedVehicleId)
                if (!vehicle) return null

                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Edit Vehicle: {vehicle.licensePlate}</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedVehicleId(null)}>
                          Add New Vehicle
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            removeVehicle(vehicle.id)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Vehicle
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-licensePlate" className="text-sm">
                          License Plate <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-licensePlate"
                          value={vehicle.licensePlate}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              vehicles: salary.vehicles.map((v) =>
                                v.id === vehicle.id ? { ...v, licensePlate: e.target.value } : v,
                              ),
                            })
                          }}
                          placeholder="e.g., ABC-123"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-type" className="text-sm">
                          Type
                        </Label>
                        <Select
                          value={vehicle.type}
                          onValueChange={(
                            value:
                              | "passenger-car"
                              | "motorcycle"
                              | "bicycle"
                              | "pedelec"
                              | "e-bike"
                              | "scooter-with-seat"
                              | "scooter-without-seat",
                          ) => {
                            setSalary({
                              ...salary,
                              vehicles: salary.vehicles.map((v) => (v.id === vehicle.id ? { ...v, type: value } : v)),
                            })
                          }}
                        >
                          <SelectTrigger id="edit-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="passenger-car">Passenger Car</SelectItem>
                            <SelectItem value="motorcycle">Motorcycle</SelectItem>
                            <SelectItem value="bicycle">Bicycle</SelectItem>
                            <SelectItem value="pedelec">Pedelec</SelectItem>
                            <SelectItem value="e-bike">E-Bike</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-motor" className="text-sm">
                          Motor
                        </Label>
                        <Select
                          value={vehicle.motor}
                          onValueChange={(
                            value: "combustion" | "hybrid" | "electric" | "gas" | "fuel-cell" | "none",
                          ) => {
                            setSalary({
                              ...salary,
                              vehicles: salary.vehicles.map((v) => (v.id === vehicle.id ? { ...v, motor: value } : v)),
                            })
                          }}
                        >
                          <SelectTrigger id="edit-motor">
                            <SelectValue placeholder="Select motor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="combustion">Combustion Engine</SelectItem>
                            <SelectItem value="hybrid">Hybrid Engine</SelectItem>
                            <SelectItem value="electric">Electric Engine</SelectItem>
                            <SelectItem value="gas">Gas-powered Engine</SelectItem>
                            <SelectItem value="fuel-cell">Fuel Cell</SelectItem>
                            <SelectItem value="none">No Engine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-grossListPrice" className="text-sm">
                          Gross List Price <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-grossListPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={vehicle.grossListPrice}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              vehicles: salary.vehicles.map((v) =>
                                v.id === vehicle.id
                                  ? { ...v, grossListPrice: Number.parseFloat(e.target.value) || 0 }
                                  : v,
                              ),
                            })
                          }}
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-roundedDownPrice" className="text-sm">
                          Rounded Down Price
                        </Label>
                        <Input
                          id="edit-roundedDownPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={vehicle.roundedDownPrice}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              vehicles: salary.vehicles.map((v) =>
                                v.id === vehicle.id
                                  ? { ...v, roundedDownPrice: Number.parseFloat(e.target.value) || 0 }
                                  : v,
                              ),
                            })
                          }}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-validFrom" className="text-sm">
                          Valid From <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-validFrom"
                          type="date"
                          value={vehicle.validFrom}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              vehicles: salary.vehicles.map((v) =>
                                v.id === vehicle.id ? { ...v, validFrom: e.target.value } : v,
                              ),
                            })
                          }}
                          required
                          className="w-40"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-validTo" className="text-sm">
                          Valid To <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-validTo"
                          type="date"
                          value={vehicle.validTo}
                          onChange={(e) => {
                            setSalary({
                              ...salary,
                              vehicles: salary.vehicles.map((v) =>
                                v.id === vehicle.id ? { ...v, validTo: e.target.value } : v,
                              ),
                            })
                          }}
                          required
                          className="w-40"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h5 className="font-medium mb-3">Abandonment Periods</h5>
                      {vehicle.abandonments.length === 0 ? (
                        <p className="text-muted-foreground">No abandonment periods recorded.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Payroll Notes</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vehicle.abandonments.map((abandonment) => (
                              <TableRow key={abandonment.id}>
                                <TableCell>{formatDate(abandonment.startDate)}</TableCell>
                                <TableCell>{formatDate(abandonment.endDate)}</TableCell>
                                <TableCell>{abandonment.reason}</TableCell>
                                <TableCell>{abandonment.payrollNotes}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeVehicleAbandonment(vehicle.id, abandonment.id)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}

                      <div className="border-t pt-4">
                        <h5 className="font-medium mb-3">Add New Abandonment Period</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="abandonment-startDate" className="text-sm">
                              Start Date <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="abandonment-startDate"
                              type="date"
                              value={newAbandonment.startDate}
                              onChange={(e) => setNewAbandonment({ ...newAbandonment, startDate: e.target.value })}
                              required
                              className="w-40"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="abandonment-endDate" className="text-sm">
                              End Date <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="abandonment-endDate"
                              type="date"
                              value={newAbandonment.endDate}
                              onChange={(e) => setNewAbandonment({ ...newAbandonment, endDate: e.target.value })}
                              required
                              className="w-40"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="abandonment-reason" className="text-sm">
                              Reason <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="abandonment-reason"
                              value={newAbandonment.reason}
                              onChange={(e) => setNewAbandonment({ ...newAbandonment, reason: e.target.value })}
                              placeholder="e.g., Repair"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="abandonment-payrollNotes" className="text-sm">
                              Payroll Notes
                            </Label>
                            <Input
                              id="abandonment-payrollNotes"
                              value={newAbandonment.payrollNotes || ""}
                              onChange={(e) => setNewAbandonment({ ...newAbandonment, payrollNotes: e.target.value })}
                              placeholder="Optional notes"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={() => addVehicleAbandonment(vehicle.id)}
                            disabled={!newAbandonment.startDate || !newAbandonment.endDate || !newAbandonment.reason}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Abandonment
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => setSelectedVehicleId(null)}>Close</Button>
                    </div>
                  </div>
                )
              })()
            )}
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <h3 className="font-medium">Salary Summary</h3>
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Expected Monthly Pay:</span>
                <span className="text-xl font-bold">{formatCurrency(expectedSalary)}</span>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium">Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Base Salary:</span>
                    <span>
                      {formatCurrency(
                        salary.salaryRows.reduce((total, row) => {
                          const rowTotal =
                            row.paymentType === "monthly" ? row.baseAmount : row.baseAmount * (row.targetHours || 0)
                          return total + rowTotal
                        }, 0),
                      )}
                    </span>
                  </div>
                  {salary.components.map((component) => (
                    <div key={component.id} className="flex justify-between items-center">
                      <span>{component.name}:</span>
                      <span>{formatCurrency(component.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h3 className="font-medium">Salary History</h3>
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="historyDateFilter">Date Filter:</Label>
                <Select value={historyDateFilter} onValueChange={setHistoryDateFilter}>
                  <SelectTrigger id="historyDateFilter">
                    <SelectValue placeholder="Select filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="future">Future</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {historyDateFilter === "custom" && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="historyStartDate">Start Date:</Label>
                      <Input
                        type="date"
                        id="historyStartDate"
                        value={historyStartDate}
                        onChange={(e) => setHistoryStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="historyEndDate">End Date:</Label>
                      <Input
                        type="date"
                        id="historyEndDate"
                        value={historyEndDate}
                        onChange={(e) => setHistoryEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <Label htmlFor="historyViewType">View Type:</Label>
                <Select value={historyViewType} onValueChange={setHistoryViewType}>
                  <SelectTrigger id="historyViewType">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Salary Rows</h4>
                {salary.salaryRows.filter((row) => isRowValidInRange(row.validFrom, row.validTo)).length === 0 ? (
                  <p className="text-muted-foreground">No salary rows match the selected filter.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Payment Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Valid From</TableHead>
                        <TableHead>Valid To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salary.salaryRows
                        .filter((row) => isRowValidInRange(row.validFrom, row.validTo))
                        .map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.description}</TableCell>
                            <TableCell className="capitalize">{row.paymentType}</TableCell>
                            <TableCell>{formatCurrency(row.baseAmount)}</TableCell>
                            <TableCell>{formatDate(row.validFrom)}</TableCell>
                            <TableCell>{formatDate(row.validTo)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
