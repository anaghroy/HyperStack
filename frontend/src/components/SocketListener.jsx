import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { API_BASE } from '../services/api';
import { setSandboxStatus } from '../redux/slices/projectSlice';

const SocketListener = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;

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
      
      if (data.type === 'SANDBOX_READY') {
        dispatch(setSandboxStatus('ready'));
      }
      
      window.dispatchEvent(new CustomEvent('new_notification', { detail: data }));
    });

    return () => {
      socket.disconnect();
    };
  }, [user, dispatch]);


  return null;
};

export default SocketListener;
