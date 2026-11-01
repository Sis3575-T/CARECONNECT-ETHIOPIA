import { dataService } from './dataService';

export const referralService = {
  async getAll() {
    return dataService.getReferrals();
  },

  async getById(id) {
    const refs = await dataService.getReferrals();
    return refs.find(r => r.id === id) || null;
  },

  async create(referralData) {
    return dataService.createReferral(referralData);
  },

  async updateStatus(id, newStatus, notes = '', meta = {}) {
    return dataService.updateReferralStatus(id, newStatus, notes, meta);
  }
};

export default referralService;
