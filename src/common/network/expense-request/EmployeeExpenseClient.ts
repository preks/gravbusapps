import { env } from '../../env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { RestClient } from '../rest/RestClient'

const BASE_PATH = 'employee-expense'

export class EmployeeExpenseClient extends RestClient {
  constructor() {
    let url: string = env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')!
    if (!url.endsWith('/')) {
      url += '/'
    }

    super(url, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  public async getEmployeeRule(employeeId: string, allowanceDate: string): Promise<any> {
    return this.get<any>(`/${BASE_PATH}/getEmployeeRule/${employeeId}/${allowanceDate}`)
  }
}

export const employeeExpenseClient = new EmployeeExpenseClient()
