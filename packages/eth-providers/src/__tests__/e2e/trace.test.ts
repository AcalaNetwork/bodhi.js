import { afterAll, describe, expect, it } from 'vitest';

import { EvmRpcProvider } from '../../rpc-provider';

const LOCAL_NODE_WITH_TRACING = 'ws://localhost:8000';
const ACALA_SUBQL = 'https://subql-query-acala.aca-api.network';

describe('tracing', async () => {
  const provider = EvmRpcProvider.from(LOCAL_NODE_WITH_TRACING, { subqlUrl: ACALA_SUBQL });
  await provider.isReady();

  afterAll(async () => {
    await provider.disconnect();
  });

  describe('trace calls', () => {
    const tracerConf = { tracer: 'callTracer' };

    it('send native token', async () => {
      const trace = await provider.traceTx('0x89dd673cd8527943939904cb0d1f11992a9fd60a171ad7588c4dedf8712cfb7c', tracerConf);
      expect(trace).to.toMatchSnapshot();
    });

    it('transfer erc20', async () => {
      const trace = await provider.traceTx('0xf93095f41414f28b09866553ba2ac9957d865f32b6d2b0e220b08ff20e47612a', tracerConf);
      expect(trace).to.toMatchSnapshot();
    });

    it('euphrates stake', async () => {
      const trace = await provider.traceTx('0x16a70b2202ceb4968dcd1c44ee782a145a51bf016b92cc871b25ca5723ceffc8', tracerConf);
      expect(trace).to.toMatchSnapshot();
    });

    // it('dex swap', async () => {
    //   const trace = await provider.traceTx('0x42c61da1a663e7c097399b2031d6bc38e0dff083e04de7083e145884bbfe8d9f', tracerConf);
    //   expect(trace).to.toMatchSnapshot();
    // });
  });

  // describe('trace opcodes', () => {
  //   const tracerConf = { tracer: 'opcodeTracer' };
  // });

});
