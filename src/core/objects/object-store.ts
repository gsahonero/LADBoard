/**
 * Object Store managing extensible LAD document objects and persistence
 */

import { LADObject } from '../standard/types';
import { validateLADObject } from '../standard/validators';
import { IStorageProvider } from '../storage/provider.interface';
import { fuzzyFilterObjects } from '../utils/fuzzy-search';

export class ObjectStore {
  private spaceId: string;
  private storage: IStorageProvider;
  private objects: Map<string, LADObject> = new Map();

  constructor(spaceId: string, storage: IStorageProvider) {
    this.spaceId = spaceId;
    this.storage = storage;
  }

  private getObjectPath(objectId: string): string {
    return `LAD/${this.spaceId}/objects/${objectId}.json`;
  }

  private getObjectsDir(): string {
    return `LAD/${this.spaceId}/objects`;
  }

  async loadAll(): Promise<void> {
    const files = await this.storage.listFiles(this.getObjectsDir());
    this.objects.clear();

    for (const f of files) {
      if (f.name.endsWith('.json')) {
        const obj = await this.storage.readFile<LADObject>(f.path);
        if (obj) {
          try {
            validateLADObject(obj);
            this.objects.set(obj.object_id, obj);
          } catch {
            // Skip invalid object
          }
        }
      }
    }
  }

  getAll(): LADObject[] {
    return Array.from(this.objects.values()).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  get(objectId: string): LADObject | undefined {
    return this.objects.get(objectId);
  }

  getByDomain(domain: string): LADObject[] {
    return this.getAll().filter((o) => o.domain === domain);
  }

  search(query: string): LADObject[] {
    return fuzzyFilterObjects(this.getAll(), query);
  }

  async save(obj: LADObject): Promise<void> {
    validateLADObject(obj);
    obj.updated_at = new Date().toISOString();
    this.objects.set(obj.object_id, obj);
    await this.storage.writeFile(this.getObjectPath(obj.object_id), obj);
  }

  async delete(objectId: string): Promise<boolean> {
    const removed = this.objects.delete(objectId);
    if (removed) {
      await this.storage.deleteFile(this.getObjectPath(objectId));
    }
    return removed;
  }

  async update(objectId: string, updates: Partial<LADObject>): Promise<LADObject | null> {
    const existing = this.objects.get(objectId);
    if (!existing) return null;
    const updated: LADObject = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
      version: (existing.version || 1) + 1,
    };
    validateLADObject(updated);
    this.objects.set(objectId, updated);
    await this.storage.writeFile(this.getObjectPath(objectId), updated);
    return updated;
  }

  createObject(params: {
    title: string;
    description?: string;
    domain?: string;
    tags?: string[];
    priority?: LADObject['priority'];
    dueDate?: string;
    assignedTo?: string;
    attributes?: Record<string, any>;
    actorUserId: string;
  }): LADObject {
    const rand = Math.random().toString(36).substring(2, 10);
    const objectId = `obj_${rand}`;

    const newObj: LADObject = {
      object_id: objectId,
      space_id: this.spaceId,
      title: params.title,
      description: params.description || '',
      domain: params.domain || 'general',
      tags: params.tags || [],
      priority: params.priority || 'medium',
      status: 'active',
      due_date: params.dueDate,
      assigned_to: params.assignedTo,
      attributes: params.attributes || {},
      last_checked_at: new Date().toISOString(),
      created_by: params.actorUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    validateLADObject(newObj);
    return newObj;
  }
}
