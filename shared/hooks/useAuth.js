import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

/**
 * CareConnect Ethiopia - useAuth Hook
 * Access current user, token, authentication state, login/logout, and RBAC helpers.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Provide safe standalone fallback if outside AuthProvider (e.g. tests or standalone components)
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('careconnect_user') : null;
    const token = typeof window !== 'undefined' ? (localStorage.getItem('careconnect_access_token') || localStorage.getItem('careconnect_token')) : null;
    let user = null;
    try {
      if (userStr) user = JSON.parse(userStr);
    } catch {
      // ignore
    }

    return {
      user,
      token,
      isAuthenticated: Boolean(token || user),
      loading: false,
      login: () => {},
      logout: () => {},
      hasRole: (roles) => {
        if (!user) return false;
        if (user.role === 'SYSTEM_ADMINISTRATOR') return true;
        const roleList = Array.isArray(roles) ? roles : [roles];
        return roleList.includes(user.role);
      },
      hasPermission: () => true
    };
  }
  return context;
}

export default useAuth;
