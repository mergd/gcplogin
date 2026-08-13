import { encodeCbor } from '@/utils/cbor';
import { base64UrlToBytes, bytesToBase64Url } from '@/utils/base64url';

export const GOOGLE_RP_ID = 'google.com';

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_BE = 0x08;
const FLAG_BS = 0x10;
const FLAG_AT = 0x40;
const CREATE_FLAGS = FLAG_UP | FLAG_UV | FLAG_BE | FLAG_BS | FLAG_AT;
const GET_FLAGS = FLAG_UP | FLAG_UV | FLAG_BE | FLAG_BS;
const AAGUID = new Uint8Array(16);

export interface StoredGooglePasskey {
  credentialId: string;
  rpId: string;
  userHandle: string;
  userName: string;
  privateKey: JsonWebKey;
  publicKey: JsonWebKey;
  signCount: number;
  createdAt: number;
}

export interface SerializedPasskeyCredential {
  id: string;
  rawId: string;
  type: 'public-key';
  authenticatorAttachment: 'platform';
  clientExtensionResults: Record<string, unknown>;
  response: {
    clientDataJSON: string;
    attestationObject?: string;
    authenticatorData: string;
    signature?: string;
    userHandle?: string | null;
    publicKey?: string;
    publicKeyAlgorithm: -7;
    transports: string[];
  };
}

export function isGoogleRpId(rpId: string | undefined): boolean {
  return rpId === GOOGLE_RP_ID || rpId === undefined;
}

export async function createGooglePasskey(input: {
  origin: string;
  challenge: string;
  userId: string;
  userName: string;
}): Promise<{
  passkey: StoredGooglePasskey;
  credential: SerializedPasskeyCredential;
}> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const privateKey = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const credentialIdBytes = crypto.getRandomValues(new Uint8Array(32));
  const credentialId = bytesToBase64Url(credentialIdBytes);
  const userHandle = input.userId;
  const passkey: StoredGooglePasskey = {
    credentialId,
    rpId: GOOGLE_RP_ID,
    userHandle,
    userName: input.userName,
    privateKey,
    publicKey,
    signCount: 1,
    createdAt: Date.now(),
  };

  const authData = await buildAuthData({
    rpId: GOOGLE_RP_ID,
    flags: CREATE_FLAGS,
    signCount: passkey.signCount,
    credentialId: credentialIdBytes,
    publicKey,
  });
  const clientDataJSON = encodeClientData(
    'webauthn.create',
    input.challenge,
    input.origin,
  );
  const attestationObject = encodeCbor({
    map: [
      ['attStmt', { map: [] }],
      ['authData', authData],
      ['fmt', 'none'],
    ],
  });

  return {
    passkey,
    credential: {
      id: credentialId,
      rawId: credentialId,
      type: 'public-key',
      authenticatorAttachment: 'platform',
      clientExtensionResults: { credProps: { rk: true } },
      response: {
        clientDataJSON: bytesToBase64Url(clientDataJSON),
        attestationObject: bytesToBase64Url(attestationObject),
        authenticatorData: bytesToBase64Url(authData),
        publicKey: bytesToBase64Url(coseKey(publicKey)),
        publicKeyAlgorithm: -7,
        transports: ['internal'],
      },
    },
  };
}

export async function assertGooglePasskey(input: {
  origin: string;
  challenge: string;
  passkey: StoredGooglePasskey;
}): Promise<{
  passkey: StoredGooglePasskey;
  credential: SerializedPasskeyCredential;
}> {
  const signCount = input.passkey.signCount + 1;
  const authData = await buildAuthData({
    rpId: input.passkey.rpId,
    flags: GET_FLAGS,
    signCount,
  });
  const clientDataJSON = encodeClientData(
    'webauthn.get',
    input.challenge,
    input.origin,
  );
  const clientDataHash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', ownedBuffer(clientDataJSON)),
  );
  const signed = concat(authData, clientDataHash);
  const key = await crypto.subtle.importKey(
    'jwk',
    input.passkey.privateKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      ownedBuffer(signed),
    ),
  );
  const passkey = { ...input.passkey, signCount };

  return {
    passkey,
    credential: {
      id: input.passkey.credentialId,
      rawId: input.passkey.credentialId,
      type: 'public-key',
      authenticatorAttachment: 'platform',
      clientExtensionResults: {},
      response: {
        clientDataJSON: bytesToBase64Url(clientDataJSON),
        authenticatorData: bytesToBase64Url(authData),
        signature: bytesToBase64Url(signature),
        userHandle: input.passkey.userHandle || null,
        publicKeyAlgorithm: -7,
        transports: ['internal'],
      },
    },
  };
}

async function buildAuthData(input: {
  rpId: string;
  flags: number;
  signCount: number;
  credentialId?: Uint8Array;
  publicKey?: JsonWebKey;
}): Promise<Uint8Array> {
  const rpIdHash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.rpId)),
  );
  const prefix = new Uint8Array(37);
  prefix.set(rpIdHash, 0);
  prefix[32] = input.flags;
  const count = input.signCount;
  prefix[33] = (count >>> 24) & 0xff;
  prefix[34] = (count >>> 16) & 0xff;
  prefix[35] = (count >>> 8) & 0xff;
  prefix[36] = count & 0xff;

  if (!input.credentialId || !input.publicKey) return prefix;

  const credentialId = input.credentialId;
  const key = coseKey(input.publicKey);
  const attested = new Uint8Array(16 + 2 + credentialId.length + key.length);
  attested.set(AAGUID, 0);
  attested[16] = (credentialId.length >> 8) & 0xff;
  attested[17] = credentialId.length & 0xff;
  attested.set(credentialId, 18);
  attested.set(key, 18 + credentialId.length);
  return concat(prefix, attested);
}

function coseKey(publicKey: JsonWebKey): Uint8Array {
  const x = coordinate(publicKey.x);
  const y = coordinate(publicKey.y);
  return encodeCbor({
    map: [
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, x],
      [-3, y],
    ],
  });
}

function coordinate(value: string | undefined): Uint8Array {
  const bytes = base64UrlToBytes(value ?? '');
  if (bytes.length === 32) return bytes;
  const padded = new Uint8Array(32);
  padded.set(bytes, 32 - bytes.length);
  return padded;
}

function encodeClientData(
  type: 'webauthn.create' | 'webauthn.get',
  challenge: string,
  origin: string,
): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      type,
      challenge,
      origin,
      crossOrigin: false,
    }),
  );
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function allowListIncludes(
  allowCredentials: Array<{ id: string }> | undefined,
  credentialId: string,
): boolean {
  if (!allowCredentials || allowCredentials.length === 0) return true;
  return allowCredentials.some((item) => item.id === credentialId);
}
