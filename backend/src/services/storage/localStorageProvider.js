/**
 * CareConnect Ethiopia - Local Private Disk Storage Provider
 * Implements private file storage on the local server filesystem.
 * Stores files outside web roots, preventing direct HTTP exposure.
 */

import fs from 'fs';
import path from 'path';
import { StorageProvider } from './storageProvider.js';
import { NotFoundError } from '../../utils/errors.js';

export class LocalStorageProvider extends StorageProvider {
  constructor(baseDir) {
    super();
    this.baseDir = path.resolve(baseDir);
    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Resolve and sanitize full filesystem path ensuring no escape from baseDir
   */
  resolvePath(storageKey) {
    // Strip leading slashes
    const cleanKey = String(storageKey).replace(/^[/\\]+/, '');
    const fullPath = path.resolve(this.baseDir, cleanKey);

    // Prevent path traversal outside baseDir
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error(`Path traversal attempt detected in storage key: ${storageKey}`);
    }

    return fullPath;
  }

  async saveFile(storageKey, buffer, metadata = {}) {
    const targetPath = this.resolvePath(storageKey);
    const parentDir = path.dirname(targetPath);

    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true, mode: 0o700 });
    }

    await fs.promises.writeFile(targetPath, buffer, { mode: 0o600 });

    return {
      storageKey,
      storageUri: `private://${storageKey}`,
      bytesWritten: buffer.length
    };
  }

  async getFileBuffer(storageKey) {
    const targetPath = this.resolvePath(storageKey);
    try {
      return await fs.promises.readFile(targetPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Storage object not found: ${storageKey}`);
      }
      throw err;
    }
  }

  async getFileStream(storageKey) {
    const targetPath = this.resolvePath(storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundError(`Storage object not found: ${storageKey}`);
    }
    return fs.createReadStream(targetPath);
  }

  async fileExists(storageKey) {
    try {
      const targetPath = this.resolvePath(storageKey);
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  }

  async deleteFile(storageKey) {
    try {
      const targetPath = this.resolvePath(storageKey);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }
  }

  async getMetadata(storageKey) {
    const targetPath = this.resolvePath(storageKey);
    try {
      const stats = await fs.promises.stat(targetPath);
      return {
        size: stats.size,
        modifiedAt: stats.mtime
      };
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Storage object not found: ${storageKey}`);
      }
      throw err;
    }
  }
}

export default LocalStorageProvider;
