/**
 * Offline Queue tracking pending LADOperations waiting for remote synchronization
 */

import { LADOperation } from '../standard/types';
import { IStorageProvider } from '../storage/provider.interface';

export class OfflineQueue {
  private spaceId: string;
  private storage: IStorageProvider;
  private queue: LADOperation[] = [];

  constructor(spaceId: string, storage: IStorageProvider) {
    this.spaceId = spaceId;
    this.storage = storage;
  }

  private getQueuePath(): string {
    return `LAD/${this.spaceId}/offline_queue.json`;
  }

  async load(): Promise<void> {
    const raw = await this.storage.readFile<LADOperation[]>(this.getQueuePath());
    this.queue = raw && Array.isArray(raw) ? raw : [];
  }

  async save(): Promise<void> {
    await this.storage.writeFile(this.getQueuePath(), this.queue);
  }

  async enqueue(op: LADOperation): Promise<void> {
    this.queue.push(op);
    await this.save();
  }

  getQueue(): LADOperation[] {
    return [...this.queue];
  }

  size(): number {
    return this.queue.length;
  }

  async remove(operationId: string): Promise<void> {
    this.queue = this.queue.filter((op) => op.operation_id !== operationId);
    await this.save();
  }

  async clear(): Promise<void> {
    this.queue = [];
    await this.save();
  }
}
