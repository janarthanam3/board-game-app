// ULID generation. docs/07-api-contract.md: "Ids: ULIDs as strings".
//
// Hand-rolled rather than taken from a package because the id format is fixed and tiny, and this
// file is imported by the mobile app, the server and the tests — one implementation, no native code.
// A ULID is 26 characters of Crockford base32: 10 encoding a 48-bit millisecond timestamp, then 16
// encoding 80 bits of randomness. Sorting the strings sorts by creation time, which is why the
// database uses them as primary keys.

/** Crockford base32: no I, L, O or U, so a spoken or hand-copied id cannot be misread. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;

/** The largest timestamp 10 base32 characters can hold: 2^48 - 1, i.e. some time in 10889. */
const MAX_TIME = 281_474_976_710_655;

export interface NewIdOptions {
  /** Milliseconds since the epoch. Tests pass a fixed value to get a predictable prefix. */
  now?: number;
  /** Returns `count` random bytes. Tests pass a stub; production uses the platform's CSPRNG. */
  randomBytes?: (count: number) => Uint8Array;
}

export function newId(options: NewIdOptions = {}): string {
  const now = options.now ?? Date.now();
  if (!Number.isInteger(now) || now < 0 || now > MAX_TIME) {
    throw new Error(`newId: timestamp ${now} is out of range for a ULID`);
  }
  return encodeTime(now) + encodeRandom(options.randomBytes ?? defaultRandomBytes);
}

function encodeTime(now: number): string {
  let remaining = now;
  let out = "";
  for (let position = 0; position < TIME_LENGTH; position++) {
    // Build from the least significant character up, so the string ends up big-endian.
    out = ALPHABET[remaining % 32] + out;
    remaining = Math.floor(remaining / 32);
  }
  return out;
}

function encodeRandom(randomBytes: (count: number) => Uint8Array): string {
  // One byte per character and only its low 5 bits are used: wasteful of entropy, but it keeps the
  // distribution uniform, which slicing a bit stream across byte boundaries would not.
  const bytes = randomBytes(RANDOM_LENGTH);
  let out = "";
  for (let position = 0; position < RANDOM_LENGTH; position++) {
    out += ALPHABET[(bytes[position] ?? 0) % 32];
  }
  return out;
}

function defaultRandomBytes(count: number): Uint8Array {
  const out = new Uint8Array(count);
  // globalThis.crypto is present in Node 20, Hermes and every browser, so no import is needed and
  // this file stays free of platform code.
  const webCrypto = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
  if (!webCrypto?.getRandomValues) {
    throw new Error("newId: no crypto.getRandomValues on this platform");
  }
  webCrypto.getRandomValues(out);
  return out;
}

/** True for a string that is exactly a ULID. Used to refuse a malformed id at the route edge. */
export function isId(value: string): boolean {
  if (value.length !== TIME_LENGTH + RANDOM_LENGTH) {
    return false;
  }
  for (const character of value) {
    if (!ALPHABET.includes(character)) {
      return false;
    }
  }
  return true;
}
