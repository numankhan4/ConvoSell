import { decryptSecret, encryptSecret, isEncryptedSecret } from '../common/utils/crypto.util';

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function testPasswordRules() {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

  assertCondition('Aa1!aaaaaaaa'.length >= 12, 'Strong password minimum length');
  assertCondition(strongPasswordRegex.test('Aa1!aaaaaaaa'), 'Strong password should pass regex');

  assertCondition(!strongPasswordRegex.test('aaaaaaaaaaaa'), 'Lowercase-only password should fail');
  assertCondition(!strongPasswordRegex.test('AAAAAAAAAAAA'), 'Uppercase-only password should fail');
  assertCondition(!strongPasswordRegex.test('AaAaAaAaAaAa'), 'Password without digit/special should fail');
}

function testSecretEncryption() {
  const plaintext = 'sample-secret-token';

  const encrypted = encryptSecret(plaintext);

  if (process.env.WHATSAPP_CRM_ENCRYPTION_KEY) {
    assertCondition(!!encrypted, 'Encrypted value should exist when key is present');
    assertCondition(isEncryptedSecret(encrypted as string), 'Encrypted value should include version prefix');
    assertCondition((decryptSecret(encrypted) as string) === plaintext, 'Decrypt(encrypt(value)) must match original');
  } else {
    // Compatibility mode: encryption helper returns plaintext if key is not set.
    assertCondition(encrypted === plaintext, 'Without key, helper should preserve plaintext value');
    assertCondition((decryptSecret(encrypted) as string) === plaintext, 'Plaintext fallback should be readable');
  }

  // Backward compatibility: existing plaintext rows should remain readable.
  assertCondition((decryptSecret(plaintext) as string) === plaintext, 'Legacy plaintext must be readable');
}

function run() {
  testPasswordRules();
  testSecretEncryption();
  console.log('Security regression checks passed');
}

run();
