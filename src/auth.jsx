import React, { createContext, useContext, useEffect, useState } from 'react';

const KEY = 'inv_current_user_v1';

const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
  hasRole: () => true,
  canAccess: () => true,
  refreshPermissions: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (user) sessionStorage.setItem(KEY, JSON.stringify(user));
    else sessionStorage.removeItem(KEY);
  }, [user]);

  const login = (u) => setUser(u);
  const logout = () => setUser(null);
  const hasRole = (...roles) => {
    if (!roles || !roles.length) return true;
    if (!user) return false;
    return roles.includes(user.role);
  };
  const canAccess = (pageKey) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!pageKey) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(pageKey);
  };
  const refreshPermissions = async () => {
    if (!user) return;
    try {
      if (window.electron?.invoke) {
        const perms = await window.electron.invoke('getUserPermissions', user.id);
        setUser(u => (u ? { ...u, permissions: perms || [] } : u));
      }
    } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole, canAccess, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function actorUsername() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw)?.username : null;
  } catch { return null; }
}
