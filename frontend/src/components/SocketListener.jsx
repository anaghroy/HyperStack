import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { API_BASE } from '../services/api';

const SocketListener = () => {
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) return;

    // Use window.location.host for production/preview routing if needed
    // Assuming API_BASE is the root origin handling the ingress route
    // Since ingress maps /api/notification to port 4000
    const socket = io(API_BASE, {
      path: '/socket.io', // default path
      query: { userId: user._id }
    });

    socket.on('connect', () => {
      console.log('Connected to real-time notifications');
    });

    socket.on('notification', (data) => {
      toast.success(data.message || 'New notification', {
        duration: 5000,
        icon: '🔔',
      });
      window.dispatchEvent(new CustomEvent('new_notification', { detail: data }));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return null;
};

export default SocketListener;
