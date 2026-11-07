/**
 * CareConnect Ethiopia - Storage Provider Interface Abstraction
 * Defines contract for private document storage (Local Private Disk, S3, etc.).
 */

export class StorageProvider {
  /**
   * Save buffer to private storage
   * @param {string} storageKey - Safe generated storage key
   * @param {Buffer} buffer - File buffer
   * @param {Object} metadata - Optional metadata (mimeType, originalName, etc.)
   * @returns {Promise<{ storageKey: string, storageUri: string, bytesWritten: number }>}
   */
  async saveFile(storageKey, buffer, metadata = {}) {
    throw new Error('saveFile() must be implemented by concrete StorageProvider');
  }

  /**
   * Retrieve file as Buffer
   * @param {string} storageKey
   * @returns {Promise<Buffer>}
   */
  async getFileBuffer(storageKey) {
    throw new Error('getFileBuffer() must be implemented by concrete StorageProvider');
  }

  /**
   * Retrieve file as readable stream
   * @param {string} storageKey
   * @returns {Promise<ReadableStream>}
   */
  async getFileStream(storageKey) {
    throw new Error('getFileStream() must be implemented by concrete StorageProvider');
  }

  /**
   * Check if file exists in storage
   * @param {string} storageKey
   * @returns {Promise<boolean>}
   */
  async fileExists(storageKey) {
    throw new Error('fileExists() must be implemented by concrete StorageProvider');
  }

  /**
   * Delete file from storage
   * @param {string} storageKey
   * @returns {Promise<boolean>}
   */
  async deleteFile(storageKey) {
    throw new Error('deleteFile() must be implemented by concrete StorageProvider');
  }

  /**
   * Get file metadata from storage
   * @param {string} storageKey
   * @returns {Promise<{ size: number, modifiedAt: Date }>}
   */
  async getMetadata(storageKey) {
    throw new Error('getMetadata() must be implemented by concrete StorageProvider');
  }
}

export default StorageProvider;
