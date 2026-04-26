import { api } from './client';

export const usersApi = {
  list: (includeInactive = false) =>
    api.get('/users', { params: { includeInactive } }).then((r) => r.data),
  get: (id) => api.get(`/users/${id}`).then((r) => r.data),
  create: (data) => api.post('/users', data).then((r) => r.data),
  update: (id, data) => api.patch(`/users/${id}`, data).then((r) => r.data),
  resendInvite: (id) => api.post(`/users/${id}/resend-invite`).then((r) => r.data),
};

export const availabilityApi = {
  list: (year, month, userId) =>
    api.get('/availability', { params: { year, month, userId } }).then((r) => r.data),
  save: (year, month, entries) =>
    api.post('/availability', { year, month, entries }).then((r) => r.data),
};

export const schedulesApi = {
  get: (year, month) => api.get(`/schedules/${year}/${month}`).then((r) => r.data),
  create: (year, month) => api.post('/schedules', { year, month }).then((r) => r.data),
  saveEntries: (id, entries) =>
    api.put(`/schedules/${id}/entries`, { entries }).then((r) => r.data),
  publish: (id) => api.post(`/schedules/${id}/publish`).then((r) => r.data),
  shifts: () => api.get('/schedules/shifts/all').then((r) => r.data),
};

export const leaveRequestsApi = {
  list: (status) => api.get('/leave-requests', { params: { status } }).then((r) => r.data),
  create: (date, reason) => api.post('/leave-requests', { date, reason }).then((r) => r.data),
  review: (id, status) => api.patch(`/leave-requests/${id}`, { status }).then((r) => r.data),
  cancel: (id) => api.delete(`/leave-requests/${id}`).then((r) => r.data),
};

export const shiftSwapsApi = {
  list: () => api.get('/shift-swaps').then((r) => r.data),
  create: (scheduleEntryId, targetId, proposedEntryId) =>
    api
      .post('/shift-swaps', { scheduleEntryId, targetId, proposedEntryId })
      .then((r) => r.data),
  respond: (id, status) => api.patch(`/shift-swaps/${id}`, { status }).then((r) => r.data),
};

export const notificationsApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
};
