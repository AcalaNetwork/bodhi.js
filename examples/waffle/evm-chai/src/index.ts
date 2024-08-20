import 'chai';
import { supportEmit } from './supportEmit';

export function evmChai(chai: Chai.ChaiStatic): void {
  supportEmit(chai.Assertion);
}
