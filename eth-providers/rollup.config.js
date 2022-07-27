import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import { builtinModules } from 'module';
import { defineConfig } from 'rollup';
import externals from 'rollup-plugin-node-externals';
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';

const entries = {
  index: 'src/index.ts',
  utils: 'src/utils/index.ts'
};

const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
];

const plugins = [
  externals(),
  resolve({
    preferBuiltins: true
  }),
  json(),
  commonjs(),
  typescript()
];

function onwarn(message) {
  if (message.code === 'EMPTY_BUNDLE') return;
  if (message.code === 'PREFER_NAMED_EXPORTS') return;
  console.error(message);
}

export default defineConfig([
  {
    input: entries,
    output: {
      dir: 'dist',
      format: 'esm',
      entryFileNames: '[name].mjs',
      chunkFileNames: 'chunk-[name].mjs'
    },
    external,
    plugins,
    onwarn
  },
  {
    input: entries,
    output: {
      dir: 'dist',
      format: 'cjs',
      entryFileNames: '[name].cjs',
      chunkFileNames: 'chunk-[name].cjs'
    },
    external,
    plugins,
    onwarn
  }
]);
