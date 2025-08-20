import styled from 'styled-components';

export const LocationContainerWrapper = styled.div`
  &.withDivider {
    border-bottom: 1px solid #e8e8e8;
    padding: 16px 0px;
  }
`;

export const VerticalLine = styled.div`
  position: relative;
  padding-left: 32px;
  padding-bottom: 10px;

  &::before {
    content: "";
    position: absolute;
    left: 12px;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: #000000;
  }
`;

export const RemoveButtonContainer = styled.div`
  margin-top: 12px;
  margin-bottom: 8px;

  > button {
    padding: 0px 10px !important;
    margin-left: -10px;
    border-radius: 20px !important;
  }
`;

export const AddDestinationContainer = styled.div`
  display: flex;
  padding: 0px 0px 0px 48px;

  &.withDivider {
    border-bottom: 1px solid #e8e8e8;
    padding: 16px 0px;
  }

  > button {
    padding: 0px 10px !important;
    margin-left: -10px;
    border-radius: 20px !important;
  }
`;

export const SkipAdvancePaymentContainer = styled.div`
  font-weight: 500;
  padding: 16px 0px;
  
  label {
    flex-direction: row-reverse;
  }
`;

export const NoSpinner = styled.div`
  input[type=number] {
    appearance: textfield;
    -moz-appearance: textfield;
  }

  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

export const ExpenseSummaryContainer = styled.div`
  padding: 0 0.5rem;
  
  :where(.css-dev-only-do-not-override-ut69n1).ant-divider-horizontal,
  .ant-divider-horizontal {
    margin: 24px 0;
  }
`;
