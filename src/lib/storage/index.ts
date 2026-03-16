export interface StorageBackend {
  save(file: Buffer, filename: string, mimeType: string): Promise<string>; // returns storage key
  getUrl(key: string): string;
  delete(key: string): Promise<void>;
}

export { DiskStorage } from './disk';
