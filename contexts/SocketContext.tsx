'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/src/lib/types/socket.types';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinClientRoom: (clientId: string) => void;
  joinProviderRoom: (organizationId: string) => void;
  joinQuoteRequestRoom: (quoteRequestId: string) => void;
  leaveClientRoom: (clientId: string) => void;
  leaveProviderRoom: (organizationId: string) => void;
  leaveQuoteRequestRoom: (quoteRequestId: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinClientRoom = useCallback(
    (clientId: string) => {
      if (socket && isConnected) {
        socket.emit(SOCKET_EVENTS.JOIN_CLIENT, clientId);
      }
    },
    [socket, isConnected]
  );

  const joinProviderRoom = useCallback(
    (organizationId: string) => {
      if (socket && isConnected) {
        socket.emit(SOCKET_EVENTS.JOIN_PROVIDER, organizationId);
      }
    },
    [socket, isConnected]
  );

  const joinQuoteRequestRoom = useCallback(
    (quoteRequestId: string) => {
      if (socket && isConnected) {
        socket.emit(SOCKET_EVENTS.JOIN_QUOTE_REQUEST, quoteRequestId);
      }
    },
    [socket, isConnected]
  );

  const leaveClientRoom = useCallback(
    (clientId: string) => {
      if (socket) {
        socket.emit(SOCKET_EVENTS.LEAVE_CLIENT, clientId);
      }
    },
    [socket]
  );

  const leaveProviderRoom = useCallback(
    (organizationId: string) => {
      if (socket) {
        socket.emit(SOCKET_EVENTS.LEAVE_PROVIDER, organizationId);
      }
    },
    [socket]
  );

  const leaveQuoteRequestRoom = useCallback(
    (quoteRequestId: string) => {
      if (socket) {
        socket.emit(SOCKET_EVENTS.LEAVE_QUOTE_REQUEST, quoteRequestId);
      }
    },
    [socket]
  );

  const value: SocketContextValue = {
    socket,
    isConnected,
    joinClientRoom,
    joinProviderRoom,
    joinQuoteRequestRoom,
    leaveClientRoom,
    leaveProviderRoom,
    leaveQuoteRequestRoom,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
