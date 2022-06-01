export interface JSONRPCRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: any[] | Record<string, unknown>;
}

export interface JSONRPCErrorObject {
  code: number;
  message: string;
  data?: any;
}

export interface JSONRPCResponse {
  jsonrpc: string;
  id: string | null;
  result?: any;
  error?: JSONRPCErrorObject;
}
