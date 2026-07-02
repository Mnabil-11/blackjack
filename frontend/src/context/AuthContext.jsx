import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { login as apiLogin, register as apiRegister, setAuthToken, heartbeat } from '../api';
import useInterval from '../hooks/useInterval';

const AuthContext = createContext(null);
const STORAGE_KEY = 'blackjack.auth';

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null); // { token, username }
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setAuthToken(parsed.token);
      setAuth(parsed);
    }
    setReady(true);
  }, []);

  const persist = useCallback((next) => {
    setAuthToken(next?.token || null);
    setAuth(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async (username, password) => {
      const result = await apiLogin(username, password);
      persist({ token: result.token, username: result.username });
      return result;
    },
    [persist]
  );

  const register = useCallback(
    async (username, password) => {
      const result = await apiRegister(username, password);
      persist({ token: result.token, username: result.username });
      return result;
    },
    [persist]
  );

  const logout = useCallback(() => persist(null), [persist]);

  useInterval(() => {
    if (auth) heartbeat().catch(() => {});
  }, auth ? 20000 : null);

  useEffect(() => {
    if (auth) heartbeat().catch(() => {});
  }, [auth]);

  return (
    <AuthContext.Provider value={{ auth, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
