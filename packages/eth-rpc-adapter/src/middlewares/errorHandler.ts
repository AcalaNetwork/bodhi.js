import { ErrorHandleFunction } from 'connect';
import { InternalError, InvalidRequest, JSONRPCError } from '../errors';

export const errorHandler: ErrorHandleFunction = (err, req, res, next) => {
  if (err) {
    let error: JSONRPCError;

    if (JSONRPCError.isJSONRPCError(err)) {
      error = err;
    } else if (err.type === 'entity.parse.failed') {
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
        error: error.json()
      })
    );
  }
};
