import assert from 'node:assert/strict';
import test from 'node:test';

import {
  chooseSignInMethod,
  clickTargetPriority,
} from '../utils/sign-in-method.ts';

test('password wins when Google offers password and passkey', () => {
  assert.equal(chooseSignInMethod(true, true), 'password');
});

test('passkey is used only when password is unavailable', () => {
  assert.equal(chooseSignInMethod(false, true), 'passkey');
});

test('no method is chosen when Google offers neither', () => {
  assert.equal(chooseSignInMethod(false, false), undefined);
});

test('interactive challenge child outranks its list-item wrapper', () => {
  const wrapper = clickTargetPriority('LI', null, false);
  const challenge = clickTargetPriority('DIV', 'link', true);
  assert.ok(challenge < wrapper);
});
