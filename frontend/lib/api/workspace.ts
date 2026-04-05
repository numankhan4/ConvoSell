import api from '../api';

// Workspace API
export const workspaceApi = {
  // Get workspace information
  getWorkspace: async () => {
    const response = await api.get('/workspace');
    return response.data;
  },

  // Update workspace name
  updateWorkspace: async (data: { name?: string }) => {
    const response = await api.patch('/workspace', data);
    return response.data;
  },

  // Invite member to workspace
  inviteMember: async (email: string, role: string = 'agent') => {
    const response = await api.post('/workspace/members', { email, role });
    return response.data;
  },

  // Remove member from workspace
  removeMember: async (userId: string) => {
    const response = await api.delete(`/workspace/members/${userId}`);
    return response.data;
  },
};
