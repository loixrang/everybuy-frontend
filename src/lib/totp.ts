export interface TotpSetupDetails {
  /** Base32 secret, without spaces. */
  secret: string;
  issuer: string | null;
  account: string | null;
  digits: number;
  period: number;
}

const BASE32_SECRET = /^[A-Z2-7]+=*$/i;

/**
 * Extracts the displayable setup details from the `otpauth://totp/...` URI
 * returned by Better Auth's `/two-factor/enable`.
 *
 * The URI itself contains the TOTP secret, so callers must only render the
 * parsed values locally and never log, store, or put the URI in a URL.
 */
export function parseTotpSetupUri(uri: string): TotpSetupDetails | null {
  if (typeof uri !== 'string' || uri.trim() === '') return null;

  let parsed: URL;
  try {
    parsed = new URL(uri.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== 'otpauth:' || parsed.hostname.toLowerCase() !== 'totp') {
    return null;
  }

  const secret = (parsed.searchParams.get('secret') ?? '').replace(/\s+/g, '');
  if (!BASE32_SECRET.test(secret)) return null;

  const rawLabel = parsed.pathname.replace(/^\/+/, '');
  let label = rawLabel;
  try {
    label = decodeURIComponent(rawLabel);
  } catch {
    // Keep the raw label if the backend sent malformed percent-encoding.
  }

  const separator = label.indexOf(':');
  const labelIssuer = separator >= 0 ? label.slice(0, separator).trim() : '';
  const account = (separator >= 0 ? label.slice(separator + 1) : label).trim();
  const queryIssuer = (parsed.searchParams.get('issuer') ?? '').trim();

  const digitsValue = Number(parsed.searchParams.get('digits') ?? '6');
  const periodValue = Number(parsed.searchParams.get('period') ?? '30');

  return {
    secret,
    issuer: queryIssuer || labelIssuer || null,
    account: account || null,
    digits: Number.isInteger(digitsValue) && digitsValue >= 6 && digitsValue <= 8
      ? digitsValue
      : 6,
    period: Number.isInteger(periodValue) && periodValue > 0 && periodValue <= 120
      ? periodValue
      : 30,
  };
}

/** Groups a Base32 secret for easier manual entry, e.g. `JBSW Y3DP EHPK`. */
export function formatTotpSecret(secret: string): string {
  return secret
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim();
}
