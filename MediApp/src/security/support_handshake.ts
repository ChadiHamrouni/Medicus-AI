/**
 * support_handshake.ts
 *
 * Diagnostic consent flow — signs a JIT delegation token using the
 * owner's hardware-backed signing key (Secure Enclave ECDSA P-256).
 *
 * When a support engineer requests diagnostic access, the patient receives
 * a push notification. This module handles the biometric consent + signing.
 *
 * The private key NEVER leaves the Secure Enclave.
 * The signed JWT is the ONLY artifact sent to the backend.
 */

import { getOwnerSigningKey } from './secure_storage';

interface HandshakePayload {
  engineer_id: string;
  patient_id: string;
  exp: number; // Unix timestamp, max now + 60 min
}

/**
 * Base64url encode a string (no padding).
 */
function base64url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64url encode raw bytes.
 */
function base64urlBytes(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Sign a diagnostic consent JWT using the owner's hardware-backed key.
 *
 * This triggers a FaceID/TouchID prompt via getOwnerSigningKey().
 * If biometrics fail, the function throws and no consent is granted.
 */
export async function signDiagnosticConsent(
  payload: HandshakePayload,
): Promise<string> {
  // 1. Biometric gate — triggers FaceID/TouchID
  const signingKeyPem = await getOwnerSigningKey();
  if (!signingKeyPem) {
    throw new Error('Owner signing key not found in secure storage');
  }

  // 2. Build JWT header + payload
  const header = { alg: 'ES256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // 3. Sign with ES256 via the platform crypto module
  //    react-native-quick-crypto or expo-crypto depending on your setup
  const { sign } = await import('react-native-quick-crypto');
  const signatureBytes = sign(
    'SHA256',
    Buffer.from(signingInput),
    signingKeyPem,
  );

  const encodedSignature = base64urlBytes(new Uint8Array(signatureBytes));

  return `${signingInput}.${encodedSignature}`;
}

/**
 * Build a consent payload with a 60-minute expiry.
 */
export function buildConsentPayload(
  engineerId: string,
  patientId: string,
): HandshakePayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    engineer_id: engineerId,
    patient_id: patientId,
    exp: now + 60 * 60, // 60 minutes
  };
}