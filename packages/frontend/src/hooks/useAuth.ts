import { useState, useCallback, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  createdAt?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ accessToken: string; refreshToken: string }>;
  signup: (
    email: string,
    password: string,
  ) => Promise<{ userId: string; email: string }>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  loadUserFromStorage: () => void;
}

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar dados do localStorage ao montar o componente
  const loadUserFromStorage = useCallback(() => {
    const storedAccessToken = localStorage.getItem("accessToken");
    const storedRefreshToken = localStorage.getItem("refreshToken");
    const storedUser = localStorage.getItem("user");

    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
    }
    if (storedRefreshToken) {
      setRefreshToken(storedRefreshToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        console.log(
          "Usuário carregado do localStorage:",
          JSON.parse(storedUser),
        );
      } catch (err) {
        console.error("Erro ao parsear usuário:", err);
      }
    } else {
      console.log("Nenhum usuário encontrado no localStorage");
    }
  }, []);

  // Carregar dados ao montar
  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:1080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao fazer login");
      }

      const data = await response.json();

      // Salvar no estado e localStorage
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Signup
  const signup = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:1080/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao registrar");
      }

      const data = await response.json();

      return {
        userId: data.userId,
        email: data.email,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (accessToken) {
        await fetch("http://localhost:1080/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    } finally {
      // Limpar estado e localStorage
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setIsLoading(false);
    }
  }, [accessToken]);

  // Refresh Access Token
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch("http://localhost:1080/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar token");
      }

      const data = await response.json();

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      return data.accessToken;
    } catch (err) {
      console.error("Erro ao atualizar token:", err);
      // Se refresh token expirou, fazer logout
      await logout();
      return null;
    }
  }, [refreshToken, logout]);

  return {
    user,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    accessToken,
    refreshToken,
    login,
    signup,
    logout,
    refreshAccessToken,
    loadUserFromStorage,
  };
};
