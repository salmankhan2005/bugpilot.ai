import 'server-only';

import { randomBytes } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from './admin';
import {
  getVerificationTxtName,
  getVerifiedOriginId,
  hasVerificationTxt,
  parseVerifiableOrigin,
} from './origin-verification';
import { getAllowedOrigins, isAllowedBrowserRequest } from '@/lib/local-worker/security';

const CHALLENGE_LIFETIME_MS = 60 * 60 * 1000;

export interface OriginVerificationChallenge {
  id: string;
  origin: string;
  txtName: string;
  txtValue: string;
  expiresAt: string;
}

export class OriginVerificationError extends Error {}

export function isUserOriginAuthorized(uid: string, origin: string): Promise<boolean> {
  if (getAllowedOrigins().has(origin)) return Promise.resolve(true);
  const originRef = getFirebaseAdminFirestore()
    .collection('users')
    .doc(uid)
    .collection('verifiedOrigins')
    .doc(getVerifiedOriginId(origin));
  return originRef.get().then((snapshot) =>
    snapshot.exists && snapshot.data()?.origin === origin,
  );
}

export async function createOriginVerificationChallenge(
  uid: string,
  value: unknown,
): Promise<OriginVerificationChallenge> {
  let url: URL;
  try {
    url = parseVerifiableOrigin(value);
  } catch (error) {
    throw new OriginVerificationError(error instanceof Error ? error.message : 'Enter a valid website origin.');
  }

  const firestore = getFirebaseAdminFirestore();
  const originId = getVerifiedOriginId(url.origin);
  const originRef = firestore.collection('users').doc(uid).collection('verifiedOrigins').doc(originId);
  const challengeRef = firestore.collection('users').doc(uid).collection('originChallenges').doc(originId);
  return firestore.runTransaction(async (transaction) => {
    const [verified, challenge] = await Promise.all([
      transaction.get(originRef),
      transaction.get(challengeRef),
    ]);
    if (verified.exists && verified.data()?.origin === url.origin) {
      throw new OriginVerificationError('This website origin is already verified.');
    }

    const existing = challenge.data();
    const expiry = existing?.expiresAt;
    if (challenge.exists
      && typeof existing?.txtValue === 'string'
      && typeof existing?.txtName === 'string'
      && expiry instanceof Timestamp
      && expiry.toMillis() > Date.now()) {
      return {
        id: originId,
        origin: url.origin,
        txtName: existing.txtName,
        txtValue: existing.txtValue,
        expiresAt: expiry.toDate().toISOString(),
      };
    }

    const txtValue = `bugpilot-verification=${randomBytes(32).toString('base64url')}`;
    const expiresAt = Timestamp.fromMillis(Date.now() + CHALLENGE_LIFETIME_MS);
    const txtName = getVerificationTxtName(url.hostname);
    transaction.set(challengeRef, {
      origin: url.origin,
      hostname: url.hostname,
      txtName,
      txtValue,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });
    return {
      id: originId,
      origin: url.origin,
      txtName,
      txtValue,
      expiresAt: expiresAt.toDate().toISOString(),
    };
  });
}

export async function verifyOriginChallenge(uid: string, originId: string): Promise<string> {
  if (!/^[a-f0-9]{64}$/.test(originId)) {
    throw new OriginVerificationError('Invalid domain verification request.');
  }
  const firestore = getFirebaseAdminFirestore();
  const userRef = firestore.collection('users').doc(uid);
  const challengeRef = userRef.collection('originChallenges').doc(originId);
  const challengeSnapshot = await challengeRef.get();
  if (!challengeSnapshot.exists) throw new OriginVerificationError('Domain verification request expired or not found.');

  const challenge = challengeSnapshot.data();
  if (typeof challenge?.origin !== 'string'
    || typeof challenge.hostname !== 'string'
    || typeof challenge.txtName !== 'string'
    || typeof challenge.txtValue !== 'string'
    || !(challenge.expiresAt instanceof Timestamp)
    || challenge.expiresAt.toMillis() <= Date.now()) {
    await challengeRef.delete();
    throw new OriginVerificationError('Domain verification request expired. Create a new DNS challenge.');
  }

  let records: string[][];
  try {
    records = await resolveTxt(challenge.txtName);
  } catch (error) {
    const code = getErrorCode(error);
    if (code === 'ENODATA' || code === 'ENOTFOUND') {
      throw new OriginVerificationError('The verification TXT record was not found yet. Check the DNS record and try again.');
    }
    console.error('Could not resolve domain verification TXT record:', code || 'unknown DNS error');
    throw new Error('Could not check the DNS record. Try again shortly.');
  }
  if (!hasVerificationTxt(records, challenge.txtValue)) {
    throw new OriginVerificationError('The verification TXT record does not match yet. Check the record and try again.');
  }

  if (!await isAllowedBrowserRequest(challenge.origin, new Set([challenge.origin]))) {
    throw new OriginVerificationError('This domain currently resolves to a private or blocked network address.');
  }

  const verifiedRef = userRef.collection('verifiedOrigins').doc(originId);
  await firestore.runTransaction(async (transaction) => {
    const current = await transaction.get(challengeRef);
    if (!current.exists || current.data()?.txtValue !== challenge.txtValue) {
      throw new OriginVerificationError('Domain verification request changed. Create a new DNS challenge.');
    }
    transaction.set(verifiedRef, {
      origin: challenge.origin,
      hostname: challenge.hostname,
      verifiedAt: FieldValue.serverTimestamp(),
    });
    transaction.delete(challengeRef);
  });
  return challenge.origin;
}

function getErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}
