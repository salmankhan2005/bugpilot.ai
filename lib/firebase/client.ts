'use client';

import { getApp, getApps, initializeApp } from '@firebase/app';
import { getAuth } from '@firebase/auth';

const requiredConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseAuth() {
  if (Object.values(requiredConfig).some((value) => !value)) {
    throw new Error('Firebase client settings are missing. Configure NEXT_PUBLIC_FIREBASE_* in .env.');
  }

  const app = getApps().length > 0
    ? getApp()
    : initializeApp({
      ...requiredConfig,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    });

  return getAuth(app);
}
