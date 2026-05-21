import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for SSO token in URL (from Zoho callback redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const ssoToken = urlParams.get('token') || urlParams.get('ssoToken');
    
    if (ssoToken) {
      localStorage.setItem('token', ssoToken);
      setToken(ssoToken);
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const activeToken = ssoToken || token;
    if (activeToken) {
      fetchUser(activeToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (activeToken) => {
    const t = activeToken || token;
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${t}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch user', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
