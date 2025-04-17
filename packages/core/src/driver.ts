import { Queue } from './queue.js';

export type CreateQueueParams = {
  name: string;
};

export interface Driver {
  createQueue(params: CreateQueueParams): Promise<Queue>;
}
