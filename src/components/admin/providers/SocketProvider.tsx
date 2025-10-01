"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAdminAuth } from "./AdminAuthProvider";
import { toast } from "@/hooks/use-toast";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAdminAuth();

  useEffect(() => {
    // Socket.io temporarily disabled
    // TODO: Re-enable when WebSocket server is properly configured
    console.log("Socket.io connections are currently disabled");

    // Keep socket as null and disconnected
    setSocket(null);
    setIsConnected(false);
    setConnectionError("Socket.io temporarily disabled");
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionError }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    // Return safe defaults if provider not available
    // This allows components to work without Socket.io
    return {
      socket: null,
      isConnected: false,
      connectionError: "SocketProvider not available"
    };
  }
  return context;
}