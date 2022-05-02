import WebSocketTransport, { WebSocketServerTransportOptions } from './websocket';
import HTTPTransport, { HTTPServerTransportOptions } from './http';
import { ServerTransport } from './server-transport';
export { HTTPTransport, WebSocketTransport, ServerTransport };

export type TransportNames = 'IPCTransport' | 'HTTPTransport' | 'HTTPSTransport' | 'WebSocketTransport';

export type TransportClasses = WebSocketTransport | HTTPTransport | ServerTransport;

export type TransportOptions = WebSocketServerTransportOptions | HTTPServerTransportOptions;

export interface TransportsMapping {
  [name: string]: any;
}

const transports: TransportsMapping = {
  HTTPTransport,
  WebSocketTransport
};

export default transports;
