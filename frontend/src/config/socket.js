// src/config/socket.js
import { io } from 'socket.io-client';

let socketInstance = null;

export const initializeSocket = (projectId) => {
  if (!socketInstance) {
    socketInstance = io(import.meta.env.VITE_API_URL, {
      auth: {
        token: localStorage.getItem('token'),
      },
      query: {
        projectId,
      },
    });
    console.log('Socket initialized for project:', projectId);
  } else {
    // Update query if projectId changes
    socketInstance.io.opts.query = { projectId };
    socketInstance.disconnect().connect(); // Reconnect with new query
    console.log('Socket reconnected for project:', projectId);
  }
  return socketInstance;
};

export const receiveMessage = (eventName, cb) => {
  if (socketInstance) {
    socketInstance.on(eventName, cb);
  }
};

export const sendMessage = (eventName, data) => {
  if (socketInstance) {
    socketInstance.emit(eventName, data);
  }
};