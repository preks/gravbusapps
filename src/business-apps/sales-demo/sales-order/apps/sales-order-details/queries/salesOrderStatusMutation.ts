// GraphQL mutations for updating sales order and line item status

export const UPDATE_SALES_ORDER_STATUS = `
  mutation UpdateSalesOrderStatus($orderId: uuid!, $statusCode: String!) {
    update_NwSalesSalesOrder(
      where: { id: { _eq: $orderId } }
      _set: { statusCode: $statusCode }
    ) {
      affected_rows
      returning {
        id
        statusCode
        updatedAt
      }
    }
  }
`

export const UPDATE_LINE_ITEM_STATUS = `
  mutation UpdateLineItemStatus($lineItemId: uuid!, $statusCode: String!) {
    update_NwSalesSalesOrderItem(
      where: { salesOrderDetailId: { _eq: $lineItemId } }
      _set: { salesOrderStateCode: $statusCode }
    ) {
      affected_rows
      returning {
        salesOrderDetailId
        salesOrderStateCode
        updatedAt
      }
    }
  }
`
