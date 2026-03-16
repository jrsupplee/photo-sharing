import { StorageBackend } from './index';
import { DiskStorage } from './disk';

let storageInstance: StorageBackend | null = null;

export function getStorage(): StorageBackend {
  if (!storageInstance) {
    const backend = process.env.STORAGE_BACKEND || 'disk';
    switch (backend) {
      case 'disk':
      default:
        storageInstance = new DiskStorage();
        break;
    }
  }
  return storageInstance;
}
