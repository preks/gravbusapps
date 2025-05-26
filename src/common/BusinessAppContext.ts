export interface UserInfoProps {
    id: string;
    userName: string;
    givenName: string;
    familyName: string;
    nickName: string;
    tenantId?: string;
    employeeDetails: {
      employeeId: string;
      firstName: string;
      lastName: string;
      supervisor: {
        id: string;
        firstName: string;
        lastName: string;
        userId: string;
      };
      organizationalUnit: {
        id: string;
        name: string;
      };
    };
}

export interface BusinessAppContextProps {
  accessToken: string;
  userInfo?: UserInfoProps;
  additionalData?: { [k: string]: any };
}