export type CborValue =
  | number
  | string
  | Uint8Array
  | CborValue[]
  | { map: Array<[CborValue, CborValue]> };

export function encodeCbor(value: CborValue): Uint8Array {
  return concat(encode(value));
}

function encode(value: CborValue): Uint8Array {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new Error('CBOR floats are not supported');
    }
    if (value >= 0) return encodeType(0, value);
    return encodeType(1, -1 - value);
  }

  if (typeof value === 'string') {
    const bytes = new TextEncoder().encode(value);
    return concat(encodeType(3, bytes.length), bytes);
  }

  if (value instanceof Uint8Array) {
    return concat(encodeType(2, value.length), value);
  }

  if (Array.isArray(value)) {
    return concat(encodeType(4, value.length), ...value.map(encode));
  }

  return concat(
    encodeType(5, value.map.length),
    ...value.map.flatMap(([key, entry]) => [encode(key), encode(entry)]),
  );
}

function encodeType(major: number, n: number): Uint8Array {
  if (n < 24) return Uint8Array.of((major << 5) | n);
  if (n < 256) return Uint8Array.of((major << 5) | 24, n);
  if (n < 65_536) {
    return Uint8Array.of((major << 5) | 25, (n >> 8) & 0xff, n & 0xff);
  }
  return Uint8Array.of(
    (major << 5) | 26,
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
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
