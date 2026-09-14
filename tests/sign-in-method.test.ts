import assert from 'node:assert/strict';
import test from 'node:test';

import { chooseSignInMethod } from '../utils/sign-in-method.ts';

test('password wins when Google offers password and passkey', () => {
  assert.equal(chooseSignInMethod(true, true), 'password');
});

test('passkey is used only when password is unavailable', () => {
  assert.equal(chooseSignInMethod(false, true), 'passkey');
});

test('no method is chosen when Google offers neither', () => {
  assert.equal(chooseSignInMethod(false, false), undefined);
});
