import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        const newSocket = io(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}`, {
            auth: { token: user?.token || null }
        });
        setSocket(newSocket);

        newSocket.on("connect_error", (err) => {
            console.error("Socket Auth Error:", err.message);
        });

        return () => newSocket.close();
    }, [user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
