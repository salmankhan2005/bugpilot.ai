import { Queue } from 'bullmq';
import IORedis from 'ioredis';

declare global {
  var bugPilotLocalRedis: IORedis | undefined;
  var bugPilotLocalQueue: Queue | undefined;
}

export const LOCAL_RUN_QUEUE = 'bugpilot-local-runs';

export function getLocalRedis(): IORedis {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL is required for the local worker.');

  if (!global.bugPilotLocalRedis) {
    global.bugPilotLocalRedis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectTimeout: 8_000,
    });
    global.bugPilotLocalRedis.on('error', (error) => {
      console.error('Local worker Redis connection error:', error.message);
    });
  }

  return global.bugPilotLocalRedis;
}

export function getLocalRunQueue(): Queue {
  if (!global.bugPilotLocalQueue) {
    global.bugPilotLocalQueue = new Queue(LOCAL_RUN_QUEUE, {
      connection: getLocalRedis(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return global.bugPilotLocalQueue;
}
