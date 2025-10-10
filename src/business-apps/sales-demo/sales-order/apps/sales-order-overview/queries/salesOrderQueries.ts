// GraphQL queries for Sales Order Overview

export const getSalesOrders = `
  query GetSalesOrders(
    $limit: Int!
    $offset: Int!
    $where: NwSalesSalesOrderBoolExp
    $orderBy: [NwSalesSalesOrderOrderBy!]
  ) {
    nwSalesSalesOrder(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
    ) {
      id
      salesOrderNumber
      requestedShippingDate
      requestedReceiptDate
      totalAmount
      currencyCode
      statusCode
      sales_order_account {
        name
        id
      }
      salesperson_id_emplyoee {
        firstName
        lastName
        id
      }
    }
    nwSalesSalesOrderAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export const getSalesOrderKPIs = `
  query GetSalesOrderKPIs {
    # Total Sales Orders
    totalOrders: nwSalesSalesOrderAggregate {
      aggregate {
        count
      }
    }

    # Total Order Value
    totalValue: nwSalesSalesOrderAggregate(
      where: {
        statusCode: { _neq: "CANCELLED" }
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }

    # Open Orders
    openOrders: nwSalesSalesOrderAggregate(
      where: {
        statusCode: { _in: ["DRAFT", "RELEASED"] }
      }
    ) {
      aggregate {
        count
      }
    }

    # Pending Approval Orders
    pendingApprovalOrders: nwSalesSalesOrderAggregate(
      where: {
        statusCode: { _eq: "DRAFT" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const getCustomers = `
  query GetCustomers($searchTerm: String, $limit: Int!) {
    nwSalesSalesOrder(
      where: {
        sales_order_account: {
          name: { _ilike: $searchTerm }
        }
      }
      limit: $limit
      distinctOn: [accountId]
    ) {
      sales_order_account {
        id
        name
      }
    }
  }
`

export const getSalespersons = `
  query GetSalespersons($searchTerm: String, $limit: Int!) {
    nwSalesSalesOrder(
      where: {
        salesperson_id_emplyoee: {
          _or: [
            { firstName: { _ilike: $searchTerm } }
            { lastName: { _ilike: $searchTerm } }
          ]
        }
      }
      limit: $limit
      distinctOn: [salespersonId]
    ) {
      salesperson_id_emplyoee {
        id
        firstName
        lastName
      }
    }
  }
`
