export function parseArgs(tokens) {
  const options = {};
  const positionals = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const equalIndex = token.indexOf('=');
    if (equalIndex !== -1) {
      options[token.slice(2, equalIndex)] = token.slice(equalIndex + 1);
      continue;
    }

    const key = token.slice(2);
    const next = tokens[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return { options, positionals };
}

export function requiredOption(options, name) {
  const value = options[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new UsageError(`缺少必需参数 --${name}`);
  }
  return value.trim();
}

export function integerOption(options, name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = options[name];
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new UsageError(`--${name} 必须是整数`);
  }
  const value = Number.parseInt(raw, 10);
  if (value < min || value > max) {
    throw new UsageError(`--${name} 必须在 ${min} 到 ${max} 之间`);
  }
  return value;
}

export function booleanOption(options, name, fallback = false) {
  const raw = options[name];
  if (raw === undefined) return fallback;
  if (raw === true || raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw new UsageError(`--${name} 必须是 true 或 false`);
}

export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
    this.exitCode = 2;
  }
}
