import 'server-only';

import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function getFirebaseAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is required for Firebase Admin.');
  }

  const appName = 'bugpilot-admin';
  return getApps().some((candidate) => candidate.name === appName)
    ? getApp(appName)
    : initializeApp({ credential: applicationDefault(), projectId }, appName);
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getFirebaseAdminApp());
}
