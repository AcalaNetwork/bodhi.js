export const DONT_TRACE_ETH_RPCS = ['net_health'];

// we can also config these in dd agent, but with code it is more flexible
export const shouldNotTrace = (ethRpcName: string) => DONT_TRACE_ETH_RPCS.includes(ethRpcName);
