import Dexie, { Table } from 'dexie';
import type { ElectorData } from '../components/CaptureForm';

export interface PendingChange {
  id?: number; // auto-increment
  operation: 'create' | 'update' | 'delete';
  entityId: string;
  payload?: ElectorData;
  timestamp: string;
}

class AtlasDB extends Dexie {
  electors!: Table<ElectorData, string>;
  pendingChanges!: Table<PendingChange, number>;

  constructor() {
    super('atlas');
    this.version(1).stores({
      electors: 'id, createdBy, dataCadastro',
      pendingChanges: '++id, entityId, timestamp',
    });
    this.version(2).stores({
      electors: 'id, createdBy, dataCadastro, updatedAt',
      pendingChanges: '++id, entityId, timestamp',
    });
  }
}

export const db = new AtlasDB();
