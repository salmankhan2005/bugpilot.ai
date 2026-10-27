import 'server-only';

import { randomUUID } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from './admin';
import { parseProjectInput, ProjectValidationError, type ProjectEnvironment } from './project-validation';
import { isUserOriginAuthorized } from './verified-origins';

export { ProjectValidationError } from './project-validation';

export type UserProject = {
  id: string;
  name: string;
  targetUrl: string;
  environment: ProjectEnvironment;
  createdAt: string;
  updatedAt: string;
};

export async function listUserProjects(uid: string): Promise<UserProject[]> {
  const snapshot = await getFirebaseAdminFirestore()
    .collection('users')
    .doc(uid)
    .collection('projects')
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map((project) => parseProject(project.id, project.data()));
}

export async function getUserProject(uid: string, projectId: string): Promise<UserProject | null> {
  if (!isProjectId(projectId)) return null;
  const snapshot = await getFirebaseAdminFirestore()
    .collection('users')
    .doc(uid)
    .collection('projects')
    .doc(projectId)
    .get();
  return snapshot.exists ? parseProject(snapshot.id, snapshot.data()) : null;
}

export async function createUserProject(
  uid: string,
  input: unknown,
): Promise<UserProject> {
  const project = parseProjectInput(input);
  if (!await isUserOriginAuthorized(uid, new URL(project.targetUrl).origin)) {
    throw new ProjectValidationError('Verify this website domain before creating a project, or add its exact origin to LOCAL_WORKER_ALLOWED_ORIGINS.');
  }
  const projectId = `proj_${randomUUID()}`;
  const now = new Date().toISOString();
  const ref = getFirebaseAdminFirestore()
    .collection('users')
    .doc(uid)
    .collection('projects')
    .doc(projectId);

  await ref.create({
    ...project,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: projectId, ...project, createdAt: now, updatedAt: now };
}

export async function updateUserProject(
  uid: string,
  projectId: string,
  input: unknown,
): Promise<UserProject | null> {
  if (!isProjectId(projectId)) throw new ProjectValidationError('Invalid project ID.');
  const project = parseProjectInput(input);
  if (!await isUserOriginAuthorized(uid, new URL(project.targetUrl).origin)) {
    throw new ProjectValidationError('Verify this website domain before saving it, or add its exact origin to LOCAL_WORKER_ALLOWED_ORIGINS.');
  }
  const ref = getFirebaseAdminFirestore()
    .collection('users')
    .doc(uid)
    .collection('projects')
    .doc(projectId);

  return getFirebaseAdminFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const current = parseProject(snapshot.id, snapshot.data());
    transaction.update(ref, { ...project, updatedAt: FieldValue.serverTimestamp() });
    return { ...current, ...project, updatedAt: new Date().toISOString() };
  });
}

function parseProject(id: string, value: unknown): UserProject {
  if (!isRecord(value)
    || typeof value.name !== 'string'
    || typeof value.targetUrl !== 'string'
    || (value.environment !== 'preview' && value.environment !== 'staging' && value.environment !== 'production')) {
    throw new Error(`Stored project ${id} has an invalid shape.`);
  }

  return {
    id,
    name: value.name,
    targetUrl: value.targetUrl,
    environment: value.environment,
    createdAt: timestampToIso(value.createdAt, `project ${id} createdAt`),
    updatedAt: timestampToIso(value.updatedAt, `project ${id} updatedAt`),
  };
}

function timestampToIso(value: unknown, field: string): string {
  if (!(value instanceof Timestamp)) throw new Error(`Stored ${field} is invalid.`);
  return value.toDate().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProjectId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}
