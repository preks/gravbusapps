// Type declarations for modules without TypeScript definitions

declare module 'express' {
  import * as express from 'express';
  export = express;
}

declare module 'cors' {
  import * as cors from 'cors';
  export = cors;
}

declare module 'http-status-codes' {
  export const StatusCodes: {
    OK: number;
    CREATED: number;
    BAD_REQUEST: number;
    UNAUTHORIZED: number;
    FORBIDDEN: number;
    NOT_FOUND: number;
    INTERNAL_SERVER_ERROR: number;
    NO_CONTENT: number;
  };
}

declare module 'express-validator' {
  export function body(field: string): any;
  export function param(field: string): any;
  export function query(field: string): any;
  export function header(field: string): any;
  export function validationResult(req: any): { isEmpty(): boolean; array(): any[] };
}
