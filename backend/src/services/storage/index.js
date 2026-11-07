/**
 * CareConnect Ethiopia - Storage Provider Factory & Singleton Gateway
 * Resolves active private storage engine based on runtime configuration.
 */

import config from '../../config/env.js';
import { LocalStorageProvider } from './localStorageProvider.js';
import { S3StorageProvider } from './s3StorageProvider.js';

export function createStorageProvider(overrideConfig = {}) {
  const storageConfig = {
    ...config.storage,
    ...overrideConfig
  };

  const providerType = (storageConfig.provider || 'local').toLowerCase().trim();

  switch (providerType) {
    case 's3':
    case 'minio':
      return new S3StorageProvider(storageConfig.s3 || {});
    case 'local':
    default:
      return new LocalStorageProvider(storageConfig.localDir || config.uploads?.dir);
  }
}

export const defaultStorageProvider = createStorageProvider();
export default defaultStorageProvider;
