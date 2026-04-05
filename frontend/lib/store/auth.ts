import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isSuperAdmin?: boolean;
  avatar?: string;
  phone?: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface WorkspaceMember {
  id: string;
  role: string;
  permissions?: string[];
  userId: string;
  workspaceId: string;
}

interface AuthState {
  user: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentWorkspaceMember: WorkspaceMember | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  fetchProfile: () => Promise<void>;
  fetchWorkspaceMember: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      workspaces: [],
      currentWorkspace: null,
      currentWorkspaceMember: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      initialize: async () => {
        const token = get().token;
        
        if (!token) {
          set({ isInitialized: true, isAuthenticated: false });
          return;
        }

        // Restore axios header from persisted token
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        try {
          // Validate token by fetching profile with timeout
          const response = await axios.get(`${API_URL}/auth/me`, {
            timeout: 10000, // 10-second timeout for auth check
          });
          const { user, workspaces } = response.data;

          set({
            user,
            workspaces,
            currentWorkspace: get().currentWorkspace || workspaces[0],
            isAuthenticated: true,
            isInitialized: true,
          });

          // Fetch workspace member permissions after successful initialization
          await get().fetchWorkspaceMember();
        } catch (error) {
          // Token is invalid, clear auth state
          console.error('Token validation failed:', error);
          get().logout();
          set({ isInitialized: true });
        }
      },

      login: async (email: string, password: string) => {
        const response = await axios.post(`${API_URL}/auth/login`, {
          email,
          password,
        });

        const { user, workspaces, accessToken } = response.data;

        set({
          user,
          workspaces,
          currentWorkspace: workspaces[0] || null,
          token: accessToken,
          isAuthenticated: true,
        });

        // Set default axios header
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      register: async (data: any) => {
        const response = await axios.post(`${API_URL}/auth/register`, data);

        const { user, workspace, accessToken } = response.data;

        set({
          user,
          workspaces: [workspace],
          currentWorkspace: workspace,
          token: accessToken,
          isAuthenticated: true,
        });

        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      logout: () => {
        set({
          currentWorkspaceMember: null,
          user: null,
          workspaces: [],
          currentWorkspace: null,
          token: null,
          isAuthenticated: false,
          isInitialized: true,
        });

        delete axios.defaults.headers.common['Authorization'];
      },

      setCurrentWorkspace: (workspace: Workspace) => {
        set({ currentWorkspace: workspace });
        // Fetch workspace member permissions when workspace changes
        get().fetchWorkspaceMember();
      },

      fetchWorkspaceMember: async () => {
        const token = get().token;
        const currentWorkspace = get().currentWorkspace;
        
        if (!token || !currentWorkspace) return;

        try {
          const response = await axios.get(
            `${API_URL}/workspace/members/me`,
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'x-workspace-id': currentWorkspace.id
              }
            }
          );
          
          set({ currentWorkspaceMember: response.data });
        } catch (error) {
          console.error('Failed to fetch workspace member:', error);
        }
      },

      fetchProfile: async () => {
        const token = get().token;
        if (!token) return;

        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          const response = await axios.get(`${API_URL}/auth/me`);
          const { user, workspaces } = response.data;

          set({
            user,
            workspaces,
            currentWorkspace: get().currentWorkspace || workspaces[0],
            isAuthenticated: true,
          });

          // Fetch workspace member permissions after profile fetch
          await get().fetchWorkspaceMember();
        } catch (error) {
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        workspaces: state.workspaces,
        currentWorkspace: state.currentWorkspace,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Auto-initialize on client-side
if (typeof window !== 'undefined') {
  // Check if we have a token and initialize
  const state = useAuthStore.getState();
  if (state.token && !state.isInitialized) {
    state.initialize();
  } else if (!state.token) {
    useAuthStore.setState({ isInitialized: true });
  }
}
