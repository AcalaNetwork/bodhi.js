import { supportEmit } from './supportEmit';

export function evmChai(chai: Chai.ChaiStatic) {
  supportEmit(chai.Assertion);
}
