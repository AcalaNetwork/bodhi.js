'use strict';

/**
 * When using the PNPM package manager, you can use pnpmfile.js to workaround
 * dependencies that have mistakes in their package.json file.  (This feature is
 * functionally similar to Yarn's "resolutions".)
 *
 * For details, see the PNPM documentation:
 * https://pnpm.js.org/docs/en/hooks.html
 *
 * IMPORTANT: SINCE THIS FILE CONTAINS EXECUTABLE CODE, MODIFYING IT IS LIKELY TO INVALIDATE
 * ANY CACHED DEPENDENCY ANALYSIS.  After any modification to pnpmfile.js, it's recommended to run
 * "rush update --full" so that PNPM will recalculate all version selections.
 */
module.exports = {
  hooks: {
    readPackage
  }
};

const polkadotDeps = {
  "@polkadot/api": "9.10.3",
  "@polkadot/api-augment": "9.10.3",
  "@polkadot/api-base": "9.10.3",
  "@polkadot/api-derive": "9.10.3",
  "@polkadot/rpc-augment": "9.10.3",
  "@polkadot/rpc-core": "9.10.3",
  "@polkadot/rpc-provider": "9.10.3",
  "@polkadot/types-augment": "9.10.3",
  "@polkadot/types-codec": "9.10.3",
  "@polkadot/keyring": "^10.2.1",
  "@polkadot/types": "9.10.3",
  "@polkadot/types-create": "9.10.3",
  "@polkadot/types-known": "9.10.3",
  "@polkadot/util": "^10.2.1",
  "@polkadot/util-crypto": "^10.2.1"
}

const fixedDeps = {
  ...polkadotDeps,
  "bn.js": "5.2.0",
  "@types/bn.js": "5.1.0",
} 

// const projects = [
//   "@acala-network/eth-rpc-adapter",
//   "@acala-network/evm-subql",
//   "@acala-network/bodhi"
// ]

/**
 * This hook is invoked during installation before a package's dependencies
 * are selected.
 * The `packageJson` parameter is the deserialized package.json
 * contents for the package that is about to be installed.
 * The `context` parameter provides a log() function.
 * The return value is the updated object.
 */
function readPackage(packageJson, context) {
  
  for(const dep of Object.keys(fixedDeps)) {
    if(packageJson.dependencies && packageJson.dependencies[dep]) {
      // context.log('Fixed up dependencies for ' + packageJson.name);
      packageJson.dependencies[dep] = fixedDeps[dep]
    }
  }

  // // The karma types have a missing dependency on typings from the log4js package.
  // if (packageJson.name && packageJson.name.startsWith && packageJson.name.startsWith('@polkadot/')) {
  //  context.log('Fixed up dependencies for @polkadot/*');

  //  console.log(packageJson.name, omit(packageJson.name, polkadotDeps))
  //   packageJson.dependencies = {
  //     ...packageJson.dependencies,
  //     ...omit(packageJson.name, polkadotDeps)
  //   }
  // }

  return packageJson;
}
