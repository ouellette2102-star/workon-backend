/* eslint-disable @typescript-eslint/no-namespace */
import { RequestContext } from '../common/middleware/request-context.middleware';

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

