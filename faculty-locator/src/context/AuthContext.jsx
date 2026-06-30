import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const token = sessionStorage.getItem("token");
        const role = sessionStorage.getItem("role");
        const id = sessionStorage.getItem("userId");
        const name = sessionStorage.getItem("userName");

        if (token && role) {
            return { token, role, id, name };
        }
        return null;
    });
    const [loading, setLoading] = useState(false);

    const login = (userData) => {
        sessionStorage.setItem("token", userData.token);
        sessionStorage.setItem("role", userData.role);
        if (userData.id) sessionStorage.setItem("userId", userData.id);
        if (userData.name) sessionStorage.setItem("userName", userData.name);

        setUser(userData);
    };

    const logout = () => {
        sessionStorage.clear();
        setUser(null);
        window.location.href = "/";
    };

    // Global fetch interceptor-like behavior (optional for demo)
    // For now, ensure we check validity in App.jsx or here.

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
