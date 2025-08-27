import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { AdvancePaymentData } from "./types";

export const GET_ADVANCE_PAYMENT_FOR_APPROVAL = `
  query GetAdvancePaymentForApproval($paymentId: uuid!) {
    AdvancePaymentByPk(id: $paymentId) {
      expensePlanId
      expensePlan {
        employee {
          id
          firstName
          lastName
          pictureThumbnail
          employeePosition {
            jobPosition {
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
          code
        }
        totalAmount
        title
      }
      amount
      description
      currency {
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

  const fetchAdvancePaymentData = async (
    paymentId: string
  ): Promise<AdvancePaymentData | null> => {
    try {
      const result = await graphqlClient.request<{
        AdvancePaymentByPk: AdvancePaymentData;
      }>(GET_ADVANCE_PAYMENT_FOR_APPROVAL, { paymentId });
      return result.AdvancePaymentByPk;
    } catch (error) {
      console.error("Error fetching advance payment data:", error);
      throw error;
    }
  };

  return { fetchAdvancePaymentData };
};
