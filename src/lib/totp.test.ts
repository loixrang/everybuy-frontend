import { describe, expect, test } from 'bun:test';
import { formatTotpSecret, parseTotpSetupUri } from './totp';

describe('parseTotpSetupUri', () => {
  test('reads issuer, account, secret and defaults from a standard URI', () => {
    const setup = parseTotpSetupUri(
      'otpauth://totp/Everybuy:owner%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Everybuy',
    );

    expect(setup).not.toBeNull();
    expect(setup?.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(setup?.issuer).toBe('Everybuy');
    expect(setup?.account).toBe('owner@example.com');
    expect(setup?.digits).toBe(6);
    expect(setup?.period).toBe(30);
  });

  test('prefers the issuer query parameter and keeps custom digits/period', () => {
    const setup = parseTotpSetupUri(
      'otpauth://totp/Old%20Label:sam?secret=abcd2345&issuer=EveryBuy&digits=8&period=45',
    );

    expect(setup?.issuer).toBe('EveryBuy');
    expect(setup?.account).toBe('sam');
    expect(setup?.secret).toBe('abcd2345');
    expect(setup?.digits).toBe(8);
    expect(setup?.period).toBe(45);
  });

  test('falls back to safe defaults for out-of-range options', () => {
    const setup = parseTotpSetupUri(
      'otpauth://totp/Everybuy?secret=JBSWY3DP&digits=99&period=-1',
    );

    expect(setup?.digits).toBe(6);
    expect(setup?.period).toBe(30);
    expect(setup?.issuer).toBeNull();
    expect(setup?.account).toBe('Everybuy');
  });

  test('rejects malformed, non-TOTP and missing-secret URIs', () => {
    expect(parseTotpSetupUri('')).toBeNull();
    expect(parseTotpSetupUri('not a uri')).toBeNull();
    expect(parseTotpSetupUri('otpauth://hotp/Everybuy?secret=JBSWY3DP')).toBeNull();
    expect(parseTotpSetupUri('https://example.com/?secret=JBSWY3DP')).toBeNull();
    expect(parseTotpSetupUri('otpauth://totp/Everybuy?issuer=Everybuy')).toBeNull();
    expect(parseTotpSetupUri('otpauth://totp/Everybuy?secret=not-base32!')).toBeNull();
  });
});

describe('formatTotpSecret', () => {
  test('groups the secret in four-character blocks', () => {
    expect(formatTotpSecret('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP');
  });

  test('removes whitespace and normalises case', () => {
    expect(formatTotpSecret(' jbsw y3dp ehpk ')).toBe('JBSW Y3DP EHPK');
  });
});
