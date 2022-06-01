import { ErrorHandleFunction } from 'connect';
import { InvalidRequest, InternalError, JSONRPCError } from '../errors';

export const errorHandler: ErrorHandleFunction = (err, req, res, next) => {
  if (err) {
    let error: JSONRPCError;

    if (err.type === 'entity.parse.failed') {
      error = new InvalidRequest();
    } else {
      error = new InternalError();
    }

    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        id: null,
        jsonrpc: '2.0',
        error: {
          code: error.code,
          message: error.message,
          data: error.data
        }
      })
    );
  }
};
