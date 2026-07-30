import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
interface AdminInfo {
  username: string;
  fullName: string;
  role: string;
  groupId: string | null;
  lastLogin: string | null;
}
interface AuthContextType {
  token: string | null;
  admin: AdminInfo | null;
  login: (token: string, admin: AdminInfo) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("mkhonde_token"),
  );
  const [admin, setAdmin] = useState<AdminInfo | null>(() => {
    const stored = localStorage.getItem("mkhonde_admin");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (newToken: string, adminInfo: AdminInfo) => {
    setToken(newToken);
    setAdmin(adminInfo);
    localStorage.setItem("mkhonde_token", newToken);
    localStorage.setItem("mkhonde_admin", JSON.stringify(adminInfo));
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem("mkhonde_token");
    localStorage.removeItem("mkhonde_admin");
  };

  return (
    <AuthContext.Provider
      value={{ token, admin, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use this in any component
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
