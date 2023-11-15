import { hexZeroPad } from 'ethers/lib/utils';
import WebSocket from 'ws';

export class SubsManager {
  curReqId = 0;
  msgs: any[] = [];
  ws: WebSocket;
  isReady: Promise<void>;

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.isReady = new Promise((resolve) => {
      this.ws.on('open', () => {
        this.ws.on('message', (data) => {
          const parsedData = JSON.parse(data.toString());
          this.msgs.push(parsedData);
        });
        resolve();
      });
    });
  }

  clear() {
    this.msgs.length = 0;
  }

  buildRequest(params: any[], method = 'eth_subscribe') {
    return JSON.stringify({
      jsonrpc: '2.0',
      id: ++this.curReqId,
      method,
      params,
    })
  }

  async waitForMsg(
    subId: string,
    filterFn = (_msg: any) => true,
    timeout = 5000,
  ) {
    return new Promise<any>(resolve => {
      const interval = setInterval(() => {
        const msg = this.msgs
          .filter(msg => msg.params?.subscription === subId)
          .find(msg => filterFn(msg.params.result));

        if (msg) {
          clearInterval(interval);
          resolve(msg);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(interval);
        resolve(null);
      }, timeout);
    });
  }

  async waitForSubs(reqId: number) {
    return new Promise<any>(resolve => {
      const interval = setInterval(() => {
        const msg = this.msgs.find(msg => msg.id === reqId)

        if (msg) {
          clearInterval(interval);
          resolve(msg);
        }
      }, 1000);
    });
  }

  async subscribeNewHeads() {
    this.ws.send(
      this.buildRequest(['newHeads'])
    );

    const resp = await this.waitForSubs(this.curReqId);
    return resp.result as string;
  }

  async subscribeLogs(params: any) {
    this.ws.send(
      this.buildRequest(['logs', params])
    );

    const resp = await this.waitForSubs(this.curReqId);
    return resp.result as string;
  }

  async unSubscribe(subId: string) {
    this.ws.send(
      this.buildRequest([subId], 'eth_unsubscribe')
    );

    const resp = await this.waitForSubs(this.curReqId);
    return resp.result as string;
  }

  close() {
    this.ws.close();
  }
}

export const getAddrSelector = (addr: string) => hexZeroPad(addr, 32);
