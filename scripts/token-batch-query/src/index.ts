import TokenABI from '@acala-network/contracts/build/contracts/Token.json';
import { parseUnits, Interface } from 'ethers/lib/utils';
import axios from 'axios';

export const rpcGet =
  (method: string, rpcUrl: string) =>
    (params: any[] = []): any =>
      axios.get(rpcUrl, {
        data: {
          id: 0,
          jsonrpc: '2.0',
          method,
          params
        }
      });

const queryTokenInfo = async (tokenAddr: string, rpcUrl: string) => {
  const eth_call = rpcGet('eth_call', rpcUrl);

  const iface = new Interface(TokenABI.abi);
  const res = { tokenAddr };

  for (const method of ['name', 'symbol', 'decimals']) {
    const data = iface.encodeFunctionData(method, []);
    const rawRes = (await eth_call([{ to: tokenAddr, data }, 'latest'])).data.result;
    res[method] = iface.decodeFunctionResult(method, rawRes)[0];
  }

  console.log(res)
  return res;
}


const main = async () => {
  const KARURA_ETH_RPC = 'https://eth-rpc-karura.aca-api.network';

  const addresses = [
    '0xc621aBc3aFa3f24886ea278FffA7E10E8969d755',
    '0xb4CE1f6109854243d1Af13b8EA34Ed28542f31e0',
    '0x9759CA009CbCD75A84786Ac19BB5D02f8e68BcD9',
    '0xa2A37aAF4730AEedADA5Aa8eE20A4451CB8b1c4e',
    '0xE278651E8fF8E2EFa83d7F84205084ebC90688be',
    '0x77Cf14F938Cb97308d752647D554439D99B39a3f',
    '0x577f6A0718a468e8A995F6075F2325F86A07C83b',
    '0x2C7De70b32Cf5f20e02329A88d2e3B00eF85eb90',
    '0x30b1f4BA0b07789bE9986fA090A57e0FE5631eBB',
    '0x1F3a10587A20114EA25Ba1b388EE2dD4A337ce27',
    '0x4bB6afB5Fa2b07a5D1c499E1c3DDb5A15e709a71',
    '0xE20683ad1ED8bbeED7E1aE74Be10F19D8045B530',
    '0xecE0cc38021e734bEF1D5Da071B027Ac2f71181f',
    '0x66291c7D88D2Ed9a708147Bae4E0814A76705e2f',
  ]

  for (const addr of addresses) {
    queryTokenInfo(addr, KARURA_ETH_RPC);
  }
};

main();
