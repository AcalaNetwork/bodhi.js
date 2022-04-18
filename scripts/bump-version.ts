const fs = require('fs');
const path = require('path');

const packagePaths = ['../bodhi/', '../eth-transactions/', '../eth-providers/', '../eth-rpc-adapter/'];

const packageJSONPaths = packagePaths.map((p) => path.join(__dirname, `${p}package.json`));
const versionsPaths = packagePaths.map((p) => path.join(__dirname, `${p}src/_version.ts`));

/* --------------- compute next patch version --------------- */
const packageJson = JSON.parse(fs.readFileSync(packageJSONPaths[0], { encoding: 'utf8', flag: 'r' }));

const curVersion = packageJson.version;
const curVersionSplit = curVersion.split('.');
const nextPatchVersion = [curVersionSplit[0], curVersionSplit[1], parseInt(curVersionSplit[2]) + 1].join('.');

/* --------------- bump --------------- */
packageJSONPaths.forEach((p, index) => {
  // package.json
  const packageJson = JSON.parse(fs.readFileSync(p, { encoding: 'utf8', flag: 'r' }));
  packageJson.version = nextPatchVersion;
  fs.writeFileSync(p, JSON.stringify(packageJson, null, 2) + '\n');

  // _version.ts
  const versionString = fs.readFileSync(versionsPaths[index], { encoding: 'utf8', flag: 'r' });
  const newVersionString = versionString.replace(curVersion, nextPatchVersion);
  fs.writeFileSync(versionsPaths[index], newVersionString);

  const pkgName = p.split('/').at(-2);
  console.log(`bumped ${pkgName}: ${curVersion} => ${nextPatchVersion}`);
});
