import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { validateStrongPassword } from '@/lib/utils/password';

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
  isImpersonating: boolean;
  originalUserId: string | null;
  workspaceUsers: User[];
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<any>;
  logout: () => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  fetchProfile: () => Promise<void>;
  fetchWorkspaceMember: () => Promise<void>;
  initialize: () => Promise<void>;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  fetchWorkspaceUsers: () => Promise<void>;
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
      isImpersonating: false,
      originalUserId: null,
      workspaceUsers: [],

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
        
        // Fetch workspace member role after login
        await get().fetchWorkspaceMember();
      },

      register: async (data: any) => {
        const passwordCheck = validateStrongPassword(data?.password || '');
        if (!passwordCheck.isValid) {
          throw new Error(
            'Password must be at least 12 characters and include uppercase, lowercase, number, and special character.',
          );
        }

        const response = await axios.post(`${API_URL}/auth/register`, data);
        return response.data;
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

      impersonateUser: async (userId: string) => {
        const token = get().token;
        if (!token) return;

        try {
          set({ isLoading: true });
          
          // Store original auth state in localStorage before impersonation
          const originalState = {
            token: get().token,
            user: get().user,
            workspaces: get().workspaces,
            currentWorkspace: get().currentWorkspace,
            currentWorkspaceMember: get().currentWorkspaceMember,
          };
          localStorage.setItem('originalAuthState', JSON.stringify(originalState));
          
          const response = await axios.post(
            `${API_URL}/auth/impersonate/${userId}`,
            {},
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'x-workspace-id': get().currentWorkspace?.id
              }
            }
          );

          const { user, role, accessToken, isImpersonating, originalUserId } = response.data;

          set({
            user,
            token: accessToken,
            isImpersonating,
            originalUserId,
            isLoading: false,
          });

          // Update axios header with new token
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          // Fetch new user's permissions
          await get().fetchWorkspaceMember();
        } catch (error) {
          console.error('Failed to impersonate user:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      stopImpersonation: async () => {
        const token = get().token;
        const currentWorkspace = get().currentWorkspace;
        
        // Try to restore from localStorage first (for non-owner roles)
        const originalStateJson = localStorage.getItem('originalAuthState');
        if (originalStateJson) {
          try {
            const originalState = JSON.parse(originalStateJson);
            
            set({
              user: originalState.user,
              token: originalState.token,
              workspaces: originalState.workspaces,
              currentWorkspace: originalState.currentWorkspace,
              currentWorkspaceMember: originalState.currentWorkspaceMember,
              isImpersonating: false,
              originalUserId: null,
              isLoading: false,
            });

            // Update axios header with original token
            axios.defaults.headers.common['Authorization'] = `Bearer ${originalState.token}`;
            
            // Clean up localStorage
            localStorage.removeItem('originalAuthState');
            
            // Fetch workspace member to ensure sync
            await get().fetchWorkspaceMember();
            
            return;
          } catch (parseError) {
            console.error('Failed to restore from localStorage:', parseError);
            // Fall through to API call
          }
        }

        // Fallback to API call if localStorage restore fails or doesn't exist
        if (!token) return;

        try {
          set({ isLoading: true });

          const response = await axios.post(
            `${API_URL}/auth/stop-impersonation`,
            {},
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'x-workspace-id': currentWorkspace?.id
              }
            }
          );

          const { user, role, accessToken } = response.data;

          set({
            user,
            token: accessToken,
            isImpersonating: false,
            originalUserId: null,
            isLoading: false,
          });

          // Update axios header with original token
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          
          // Clean up localStorage
          localStorage.removeItem('originalAuthState');

          // Fetch original user's permissions
          await get().fetchWorkspaceMember();
        } catch (error) {
          console.error('Failed to stop impersonation:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      fetchWorkspaceUsers: async () => {
        const token = get().token;
        const currentWorkspace = get().currentWorkspace;
        
        if (!token || !currentWorkspace) return;

        try {
          const response = await axios.get(
            `${API_URL}/auth/workspace-users`,
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'x-workspace-id': currentWorkspace.id
              }
            }
          );
          
          set({ workspaceUsers: response.data });
        } catch (error) {
          console.error('Failed to fetch workspace users:', error);
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
        isImpersonating: state.isImpersonating,
        originalUserId: state.originalUserId,
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
