import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        const id = localStorage.getItem("userId");
        const name = localStorage.getItem("userName");

        if (token && role) {
            setUser({ token, role, id, name });
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        localStorage.setItem("token", userData.token);
        localStorage.setItem("role", userData.role);
        if (userData.id) localStorage.setItem("userId", userData.id);
        if (userData.name) localStorage.setItem("userName", userData.name);

        setUser(userData);
    };

    const logout = () => {
        localStorage.clear();
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
