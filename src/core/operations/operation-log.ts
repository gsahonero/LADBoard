/**
 * Append-only Operation Log for LAD Standard version history and audit trails
 */

import { LADOperation } from '../standard/types';
import { validateLADOperation } from '../standard/validators';
import { IStorageProvider } from '../storage/provider.interface';

export class OperationLog {
  private spaceId: string;
  private storage: IStorageProvider;
  private operations: LADOperation[] = [];

  constructor(spaceId: string, storage: IStorageProvider) {
    this.spaceId = spaceId;
    this.storage = storage;
  }

  private getBatchPath(batchIndex: number): string {
    const pad = String(batchIndex).padStart(6, '0');
    return `LAD/${this.spaceId}/operations/ops_${pad}.json`;
  }

  private getIndexFilePath(): string {
    return `LAD/${this.spaceId}/operations/index.json`;
  }

  async loadAll(): Promise<void> {
    const indexData = await this.storage.readFile<{ batchCount: number; totalOps: number }>(
      this.getIndexFilePath()
    );

    this.operations = [];

    if (indexData && indexData.batchCount > 0) {
      for (let i = 0; i < indexData.batchCount; i++) {
        const batch = await this.storage.readFile<LADOperation[]>(this.getBatchPath(i));
        if (batch && Array.isArray(batch)) {
          for (const op of batch) {
            try {
              validateLADOperation(op);
              this.operations.push(op);
            } catch {
              // Ignore corrupt entry
            }
          }
        }
      }
    } else {
      // Fallback: list all json files in operations/
      const files = await this.storage.listFiles(`LAD/${this.spaceId}/operations`);
      for (const file of files) {
        if (file.name.startsWith('ops_') && file.name.endsWith('.json')) {
          const batch = await this.storage.readFile<LADOperation[]>(file.path);
          if (batch && Array.isArray(batch)) {
            for (const op of batch) {
              if (op.operation_id) this.operations.push(op);
            }
          }
        }
      }
    }

    // Sort in causal Lamport order
    this.operations.sort((a, b) => {
      if (a.lamport_clock !== b.lamport_clock) {
        return a.lamport_clock - b.lamport_clock;
      }
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  getOperations(): LADOperation[] {
    return [...this.operations];
  }

  getLatestLamportClock(): number {
    if (this.operations.length === 0) return 0;
    return Math.max(...this.operations.map((o) => o.lamport_clock));
  }

  async append(operation: LADOperation): Promise<void> {
    validateLADOperation(operation);
    this.operations.push(operation);

    // Save batch (100 ops per batch)
    const BATCH_SIZE = 100;
    const batchIndex = Math.floor((this.operations.length - 1) / BATCH_SIZE);
    const startIdx = batchIndex * BATCH_SIZE;
    const currentBatch = this.operations.slice(startIdx);

    await this.storage.writeFile(this.getBatchPath(batchIndex), currentBatch);
    await this.storage.writeFile(this.getIndexFilePath(), {
      batchCount: batchIndex + 1,
      totalOps: this.operations.length,
      updatedAt: new Date().toISOString(),
    });
  }
}
