import { useState, useEffect } from "react";
import { authApi } from "../services/api.js";
import {
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  clearStoredAuth,
} from "../services/apiClient.js";
import { AuthContext, DEMO_ACCOUNTS, DEMO_PASSWORD } from "./useAuth.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  // If no saved token, loading is immediately false without synchronous setState in effect
  const [loading, setLoading] = useState(() => !!getStoredToken());

  // Restore and verify session asynchronously on startup
  useEffect(() => {
    let active = true;
    const savedToken = getStoredToken();

    if (savedToken) {
      authApi
        .me()
        .then((data) => {
          if (active && data?.user) {
            setUser(data.user);
            setStoredUser(data.user);
          }
        })
        .catch((err) => {
          if (active && (err.status === 401 || err.status === 403)) {
            clearStoredAuth();
            setUser(null);
            setToken(null);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, []);

  // Standard Login
  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res && res.token && res.user) {
      setStoredToken(res.token);
      setStoredUser(res.user);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res?.message || "Login failed");
  };

  // Standard Register
  const register = async (payload) => {
    const res = await authApi.register(payload);
    if (res && res.token && res.user) {
      setStoredToken(res.token);
      setStoredUser(res.user);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res?.message || "Registration failed");
  };

  // Logout
  const logout = () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  };

  // Genuine Demo Role Switcher via Backend Login
  const demoSwitchRole = async (targetRole) => {
    const account = DEMO_ACCOUNTS.find((a) => a.role === targetRole);
    if (!account) {
      throw new Error(`No seeded demo account configured for role: ${targetRole}`);
    }

    // Executes real login via backend API
    const user = await login(account.email, DEMO_PASSWORD);
    return user;
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    register,
    logout,
    demoSwitchRole,
    demoAccounts: DEMO_ACCOUNTS,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
