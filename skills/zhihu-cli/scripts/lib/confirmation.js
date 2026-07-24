import crypto from 'node:crypto';

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

export function createOperationToken(context) {
  return crypto.createHash('sha256').update(JSON.stringify(sortValue(context))).digest('hex');
}

export function verifyOperationToken(context, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
  const expected = createOperationToken(context);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function contentDigest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
