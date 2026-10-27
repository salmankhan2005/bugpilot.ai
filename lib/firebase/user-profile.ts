import 'server-only';

import type { DecodedIdToken } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from './admin';

export type FirebaseUserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  signInProvider: string | null;
};

export async function syncFirebaseUserProfile(
  user: DecodedIdToken,
): Promise<FirebaseUserProfile> {
  const firestore = getFirebaseAdminFirestore();
  const profileRef = firestore.collection('users').doc(user.uid);
  const profile: FirebaseUserProfile = {
    uid: user.uid,
    email: optionalClaimString(user.email, 'email', 254),
    displayName: optionalClaimString(user.name, 'display name', 100),
    photoURL: optionalClaimString(user.picture, 'photo URL', 2048),
    emailVerified: user.email_verified === true,
    signInProvider: optionalClaimString(user.firebase?.sign_in_provider, 'sign-in provider', 64),
  };

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(profileRef);
    transaction.set(profileRef, {
      ...profile,
      ...(snapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return profile;
}

export async function getFirebaseUserProfile(uid: string): Promise<FirebaseUserProfile | null> {
  const snapshot = await getFirebaseAdminFirestore().collection('users').doc(uid).get();
  if (!snapshot.exists) return null;

  const data: unknown = snapshot.data();
  if (!isRecord(data) || data.uid !== uid) {
    throw new Error('Stored Firebase user profile has an invalid shape.');
  }

  return {
    uid,
    email: optionalClaimString(data.email, 'stored email', 254),
    displayName: optionalClaimString(data.displayName, 'stored display name', 100),
    photoURL: optionalClaimString(data.photoURL, 'stored photo URL', 2048),
    emailVerified: data.emailVerified === true,
    signInProvider: optionalClaimString(data.signInProvider, 'stored sign-in provider', 64),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalClaimString(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new Error(`Firebase user profile has an invalid ${field}.`);
  }
  return value;
}
