import { EvmRpcProvider } from '@acala-network/eth-providers';
import { first, map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

export const monitorRuntime = async (provider: EvmRpcProvider) => {
  await provider.isReady();

  const runtimeVersion$ = provider.api.rx.rpc.state.subscribeRuntimeVersion();

  const initialRuntimeVersion = await firstValueFrom(
    runtimeVersion$.pipe(map(runtime => runtime.specVersion.toNumber()))
  );

  runtimeVersion$.subscribe(runtime => {
    const version = runtime.specVersion.toNumber();
    provider.verbose && console.log(`runtime version: ${version}`);
  });

  runtimeVersion$.pipe(
    // runtime changed
    first(runtime => runtime.specVersion.toNumber() !== initialRuntimeVersion)
  ).subscribe(runtime => {
    console.warn(
      `runtime version changed: ${initialRuntimeVersion} => ${runtime.specVersion.toNumber()}, shutting down myself... good bye 👋`
    );
    process.exit(1);
  });
};
