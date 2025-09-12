import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useApp } from '../contexts/AppContext';

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface SocketEvents {
  // WhatsApp events
  'whatsapp-message-received': (data: any) => void;
  'new-whatsapp-session': (data: any) => void;
  'session-status-changed': (data: any) => void;
  'agent-assigned': (data: any) => void;
  'session-transferred': (data: any) => void;
  'agent-typing': (data: any) => void;
  
  // Agent events
  'agent-status-changed': (data: any) => void;
  'session-assigned': (data: any) => void;
  'session-transferred-in': (data: any) => void;
  'session-transferred-out': (data: any) => void;
  'new-whatsapp-message': (data: any) => void;
  
  // Admin events
  'agent-updated': (data: any) => void;
  'conversation-created': (data: any) => void;
  'message-received': (data: any) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { state } = useApp();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventListenersRef = useRef<Map<string, Function[]>>(new Map());

  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000
  } = options;

  useEffect(() => {
    if (!state.user || !autoConnect) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Initialize socket connection
    socketRef.current = io('http://localhost:3001', {
      auth: {
        token
      },
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔌 Connected to server');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Re-register all event listeners
    eventListenersRef.current.forEach((listeners, event) => {
      listeners.forEach(listener => {
        socket.on(event, listener);
      });
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [state.user, autoConnect, reconnection, reconnectionAttempts, reconnectionDelay]);

  const connect = () => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const emit = (event: string, data?: any) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  };

  const on = <K extends keyof SocketEvents>(event: K, listener: SocketEvents[K]) => {
    if (socketRef.current) {
      socketRef.current.on(event, listener);
      
      // Store listener for re-registration on reconnect
      if (!eventListenersRef.current.has(event)) {
        eventListenersRef.current.set(event, []);
      }
      eventListenersRef.current.get(event)!.push(listener);
    }
  };

  const off = <K extends keyof SocketEvents>(event: K, listener?: SocketEvents[K]) => {
    if (socketRef.current) {
      if (listener) {
        socketRef.current.off(event, listener);
        
        // Remove from stored listeners
        const listeners = eventListenersRef.current.get(event);
        if (listeners) {
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      } else {
        socketRef.current.off(event);
        eventListenersRef.current.delete(event);
      }
    }
  };

  // WhatsApp specific methods
  const joinWhatsAppSession = (sessionId: string) => {
    emit('join-whatsapp-session', sessionId);
  };

  const leaveWhatsAppSession = (sessionId: string) => {
    emit('leave-whatsapp-session', sessionId);
  };

  const sendTypingIndicator = (sessionId: string, isTyping: boolean) => {
    emit('agent-typing', { sessionId, isTyping });
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    connect,
    disconnect,
    emit,
    on,
    off,
    // WhatsApp specific methods
    joinWhatsAppSession,
    leaveWhatsAppSession,
    sendTypingIndicator
  };
};

export default useSocket;