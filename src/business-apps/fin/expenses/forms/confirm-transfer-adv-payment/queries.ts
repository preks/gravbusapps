import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { AdvancePaymentData } from "./types";

export const GET_ADVANCE_PAYMENT_FOR_APPROVAL = `
  query GetAdvancePaymentForApproval($paymentId: uuid!) {
    AdvancePaymentByPk(id: $paymentId) {
      expensePlanId
      status
      version
      expensePlan {
        planDate
        decisionDate
        employeeDocument {
          id
          file
          mimeType
        }
        employee {
          id
          userId
          firstName
          lastName
          pictureThumbnail
          employeePosition {
            supervisor {
              pictureThumbnail
              firstName
              lastName
              userId
              employeePosition {
                jobPosition {
                  name
                }
                organizationalUnit {
                  name
                }
              }
            }
            jobPosition {
              name
            }
            organizationalUnit {
              name
            }
          }
        }
        code
        requestType {
          code
          value
        }
        currency {
          value
          code
        }
        totalAmount
        title
      }
      amount
      currency {
        value
        id
        code
      }
      paymentMethod
      costCenter {
        code
        name
      }
    }
  }
`;

export const useGetAdvancePaymentForApproval = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken);

  const fetchAdvancePaymentData = async (paymentId: string) => {
    const query = GET_ADVANCE_PAYMENT_FOR_APPROVAL;
    try {
      const result = await graphqlClient.request<{
        AdvancePaymentByPk: AdvancePaymentData;
      }>(query, { paymentId });
      return result.AdvancePaymentByPk;
    } catch (error) {
      console.error("Error fetching advance payment data:", error);
      throw error;
    }
  };

  return { fetchAdvancePaymentData };
};
