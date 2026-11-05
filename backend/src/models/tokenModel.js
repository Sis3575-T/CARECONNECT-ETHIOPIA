/**
 * CareConnect Ethiopia - Refresh Token Model & Revocation Store
 */

const refreshTokensStore = new Map(); // token -> { userId, expiresAt, revoked: boolean }

export class TokenModel {
  static async saveRefreshToken(userId, token, ttlMs = 7 * 24 * 60 * 60 * 1000) {
    refreshTokensStore.set(token, {
      userId: Number(userId),
      expiresAt: Date.now() + ttlMs,
      revoked: false
    });
    return true;
  }

  static async isTokenValid(token) {
    const record = refreshTokensStore.get(token);
    if (!record) return false;
    if (record.revoked) return false;
    if (Date.now() > record.expiresAt) return false;
    return true;
  }

  static async revokeToken(token) {
    const record = refreshTokensStore.get(token);
    if (record) {
      record.revoked = true;
      return true;
    }
    return false;
  }

  static async revokeAllUserTokens(userId) {
    const uId = Number(userId);
    for (const record of refreshTokensStore.values()) {
      if (record.userId === uId) {
        record.revoked = true;
      }
    }
    return true;
  }

  static clearStore() {
    refreshTokensStore.clear();
  }
}

export default TokenModel;
