// GraphQL queries for Sales Performance Report

export const getSalesPerformanceKPIs = `
  query GetSalesPerformanceKPIs(
    $startDate: timestamptz!
    $endDate: timestamptz!
    $previousStartDate: timestamptz!
    $previousEndDate: timestamptz!
  ) {
    # Current period sales
    currentPeriodSales: nwSalesSalesOrderAggregate(
      where: {
        orderDate: { _gte: $startDate, _lte: $endDate }
        statusCode: { _neq: "CANCELLED" }
      }
    ) {
      aggregate {
        count
        sum {
          totalAmount
        }
        avg {
          totalAmount
        }
      }
    }

    # Previous period sales for comparison
    previousPeriodSales: nwSalesSalesOrderAggregate(
      where: {
        orderDate: { _gte: $previousStartDate, _lte: $previousEndDate }
        statusCode: { _neq: "CANCELLED" }
      }
    ) {
      aggregate {
        count
        sum {
          totalAmount
        }
        avg {
          totalAmount
        }
      }
    }
  }
`

export const getSalesPerformanceData = `
  query GetSalesPerformanceData(
    $limit: Int!
    $offset: Int!
    $startDate: timestamptz!
    $endDate: timestamptz!
  ) {
    nwSalesSalesOrder(
      limit: $limit
      offset: $offset
      where: {
        orderDate: { _gte: $startDate, _lte: $endDate }
        statusCode: { _neq: "CANCELLED" }
      }
      orderBy: [{ orderDate: DESC }]
    ) {
      id
      salesOrderNumber
      orderDate
      totalAmount
      currencyCode
      statusCode
      requestedShippingDate
      requestedReceiptDate
      sales_order_account {
        id
        name
      }
      salesperson_id_emplyoee {
        id
        firstName
        lastName
      }
    }
    
    nwSalesSalesOrderAggregate(
      where: {
        orderDate: { _gte: $startDate, _lte: $endDate }
        statusCode: { _neq: "CANCELLED" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const getSalesPipelineData = `
  query GetSalesPipelineData(
    $limit: Int!
    $offset: Int!
  ) {
    # Orders by status for pipeline analysis
    draftOrders: nwSalesSalesOrderAggregate(
      where: { statusCode: { _eq: "DRAFT" } }
    ) {
      aggregate {
        count
        sum { totalAmount }
      }
    }
    
    confirmedOrders: nwSalesSalesOrderAggregate(
      where: { statusCode: { _eq: "CONFIRMED" } }
    ) {
      aggregate {
        count
        sum { totalAmount }
      }
    }
    
    inProductionOrders: nwSalesSalesOrderAggregate(
      where: { statusCode: { _eq: "IN_PRODUCTION" } }
    ) {
      aggregate {
        count
        sum { totalAmount }
      }
    }
    
    shippedOrders: nwSalesSalesOrderAggregate(
      where: { statusCode: { _eq: "SHIPPED" } }
    ) {
      aggregate {
        count
        sum { totalAmount }
      }
    }
    
    invoicedOrders: nwSalesSalesOrderAggregate(
      where: { statusCode: { _eq: "INVOICED" } }
    ) {
      aggregate {
        count
        sum { totalAmount }
      }
    }
    
    deliveredOrders: nwSalesSalesOrderAggregate(
      where: { statusCode: { _eq: "DELIVERED" } }
    ) {
      aggregate {
        count
        sum { totalAmount }
      }
    }
    
    closedOrders: nwSalesSalesOrderAggregate(
      where: { statusCode: { _eq: "CLOSED" } }
    ) {
      aggregate {
        count
        sum { totalAmount }
      }
    }
  }
`

export const getFulfillmentData = `
  query GetFulfillmentData(
    $limit: Int!
    $offset: Int!
    $startDate: timestamptz!
    $endDate: timestamptz!
  ) {
    # Orders with fulfillment data
    nwSalesSalesOrder(
      limit: $limit
      offset: $offset
      where: {
        orderDate: { _gte: $startDate, _lte: $endDate }
        statusCode: { _in: ["SHIPPED", "DELIVERED", "CLOSED"] }
      }
      orderBy: [{ orderDate: DESC }]
    ) {
      id
      salesOrderNumber
      orderDate
      requestedShippingDate
      requestedReceiptDate
      totalAmount
      statusCode
      deliveryModeCode
      sales_order_account {
        id
        name
        addresses {
          regionRef
          country {
            value
            code
          }
        }
      }
    }
    
    # Aggregate fulfillment metrics
    nwSalesSalesOrderAggregate(
      where: {
        orderDate: { _gte: $startDate, _lte: $endDate }
        statusCode: { _in: ["SHIPPED", "DELIVERED", "CLOSED"] }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const getProductCategoryPerformance = `
  query GetProductCategoryPerformance(
    $startDate: timestamptz!
    $endDate: timestamptz!
  ) {
    # Sales order items with product information
    nwSalesSalesOrderItem(
      where: {
        sales_order: {
          orderDate: { _gte: $startDate, _lte: $endDate }
          statusCode: { _neq: "CANCELLED" }
        }
      }
    ) {
      id
      quantity
      unitPrice
      totalAmount
      nwSalesProduct {
        id
        name
        productNumber
        description
      }
      sales_order {
        id
        orderDate
        statusCode
      }
    }
  }
`

export const getRegionalSalesData = `
  query GetRegionalSalesData(
    $startDate: timestamptz!
    $endDate: timestamptz!
  ) {
    nwSalesSalesOrder(
      where: {
        orderDate: { _gte: $startDate, _lte: $endDate }
        statusCode: { _neq: "CANCELLED" }
      }
    ) {
      id
      totalAmount
      orderDate
      sales_order_account {
        id
        name
        addresses {
          regionRef
          country {
            value
            code
          }
        }
      }
    }
  }
`

export const getSalespersonPerformance = `
  query GetSalespersonPerformance(
    $startDate: timestamptz!
    $endDate: timestamptz!
    $limit: Int!
  ) {
    nwSalesSalesOrder(
      where: {
        orderDate: { _gte: $startDate, _lte: $endDate }
        statusCode: { _neq: "CANCELLED" }
      }
      limit: $limit
    ) {
      id
      totalAmount
      orderDate
      salesperson_id_emplyoee {
        id
        firstName
        lastName
      }
    }
  }
`
