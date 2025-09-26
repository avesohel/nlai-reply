import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const YoutubeCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Youtube connection failed');
        navigate('/dashboard');
        return;
      }

      if (code) {
        try {
          await api.post('/youtube/connect', { code });
          toast.success('Youtube channel connected successfully!');
          navigate('/dashboard');
        } catch (error) {
          toast.error('Failed to connect Youtube channel');
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Connecting your Youtube channel...</p>
      </div>
    </div>
  );
};

export default YoutubeCallback;