// GraphQL queries for Sales Order Details

export const getSalesOrderDetails = `
  query GetSalesOrderDetails($orderId: uuid!) {
    nwSalesSalesOrder(where: { id: { _eq: $orderId } }) {
      id
      areTotalsUpdated
      contactId
      createdAt
      currencyCode
      deliveryAddressStreet
      deliveryModeCode
      deliveryTermsCode
      invoiceAddressStreet
      isDeleted
      isDeliveryAddressOrderSpecific
      orderDate
      ownerId
      paymentTermsName
      processInstanceId
      processingStatus
      requestedShippingDate
      requestedReceiptDate
      recordState
      quotationNumber
      salesOrderNumber
      salespersonId
      statusCode
      totalAmount
      version
      url
      updatedBy
      updatedAt
      totalTaxAmount
      totalDiscountAmount
      totalChargesAmount
      sales_order_account {
        id
        name
        contact {
          firstName
          lastName
          email
        }
        addresses {
          addressLine
          city
          postalCode
          regionRef
          country {
            value
            code
          }
          addressType
        }
      }
      salesperson_id_emplyoee {
        id
        firstName
        lastName
        displayName
      }
      contact {
        accountId
        account {
          name
        }
        lastName
        firstName
        id
        jobTitle
        phone
      }
      owner {
        fullName
        firstName
        lastName
      }
    }
  }
`

export const getSalesOrderItems = `
  query GetSalesOrderItems($orderId: uuid!) {
    nwSalesSalesOrderItem(
      where: { salesOrderId: { _eq: $orderId } }
      orderBy: { lineItemNumber: ASC }
    ) {
      salesOrderDetailId
      lineItemNumber
      description
      quantity
      quantityShipped
      quantityBackordered
      quantityCancelled
      baseAmount
      extendedAmount
      taxAmount
      type
      commentShort
      commentLong
      salesOrderStateCode
      productId
      product {
        id
        name
        productNumber
        description
        price
      }
      shipToName
      shipToContactName
      shipToLine1
      shipToLine2
      shipToLine3
      shipToCity
      shipToStateOrProvince
      shipToPostalCode
      shipToCountry
      shipToTelephone
      sequenceNumber
      createdAt
      updatedAt
    }
  }
`

export const getSalesOrderWithItems = `
  query GetSalesOrderWithItems($orderId: uuid!) {
    nwSalesSalesOrder(where: { id: { _eq: $orderId } }) {
      id
      salesOrderNumber
      requestedShippingDate
      requestedReceiptDate
      totalAmount
      currencyCode
      statusCode
      createdAt
      updatedAt
      sales_order_account {
        id
        name
        contact {
          firstName
          lastName
          email
        }
        addresses {
          addressLine
          city
          postalCode
          regionRef
          country {
            value
            code
          }
          addressType
        }
      }
      salesperson_id_emplyoee {
        id
        firstName
        lastName
      }
      sales_order_items {
        salesOrderDetailId
        lineItemNumber
        description
        quantity
        quantityShipped
        quantityBackordered
        quantityCancelled
        baseAmount
        extendedAmount
        taxAmount
        type
        commentShort
        commentLong
        productId
        product {
          id
          name
          productNumber
          description
          price
        }
        shipToName
        shipToContactName
        shipToLine1
        shipToLine2
        shipToLine3
        shipToCity
        shipToStateOrProvince
        shipToPostalCode
        shipToCountry
        shipToTelephone
        sequenceNumber
        createdAt
        updatedAt
      }
    }
  }
`
