"use client";
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// Singleton socket instance survives HMR and re-renders
const globalAny = globalThis as any;

if (!globalAny.socketInstance) {
  globalAny.socketInstance = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true,
  });
}

// Track which room is currently joined to prevent duplicate join emissions
if (!globalAny.currentSocketRoom) {
  globalAny.currentSocketRoom = null;
}

export const useSocket = (projectId: string) => {
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const socket = globalAny.socketInstance;

    // Cancel any pending leave for this same room (covers Strict Mode double-mount)
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    // Ensure the socket is connected
    if (!socket.connected) {
      socket.connect();
    }

    // Only emit join if we are not already in this room
    if (globalAny.currentSocketRoom !== projectId) {
      socket.emit('join-project', projectId);
      globalAny.currentSocketRoom = projectId;
    }

    // Cleanup: debounce the leave by 1 second
    return () => {
      leaveTimerRef.current = setTimeout(() => {
        if (globalAny.socketInstance && globalAny.currentSocketRoom === projectId) {
          globalAny.socketInstance.emit('leave-project', projectId);
          globalAny.currentSocketRoom = null;
        }
      }, 1000);
    };
  }, [projectId]);

  return globalAny.socketInstance;
};