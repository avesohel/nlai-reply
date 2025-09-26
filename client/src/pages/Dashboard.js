import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { YouTube, MessageSquare, BarChart3, Plus, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalReplies: 0,
    remainingReplies: 0,
    connectedChannels: 0
  });
  const [channels, setChannels] = useState([]);
  const [recentReplies, setRecentReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usageRes, channelsRes, repliesRes] = await Promise.all([
        api.get('/users/usage'),
        api.get('/youtube/channels'),
        api.get('/youtube/replies?limit=5')
      ]);

      setStats({
        totalReplies: usageRes.data.usage.repliesSent || 0,
        remainingReplies: usageRes.data.remainingReplies || 0,
        connectedChannels: channelsRes.data.channels.length || 0
      });

      setChannels(channelsRes.data.channels || []);
      setRecentReplies(repliesRes.data.replies || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectYouTube = async () => {
    try {
      const response = await api.get('/youtube/auth-url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      toast.error('Failed to connect YouTube');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      sent: 'badge-success',
      failed: 'badge-danger',
      pending: 'badge-warning'
    };
    return badges[status] || 'badge-primary';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user.name}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100">
                <MessageSquare className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Replies</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReplies}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-success-100">
                <BarChart3 className="h-6 w-6 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Remaining This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.remainingReplies}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-warning-100">
                <YouTube className="h-6 w-6 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Connected Channels</p>
                <p className="text-2xl font-bold text-gray-900">{stats.connectedChannels}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* YouTube Channels */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">YouTube Channels</h2>
              <button
                onClick={connectYouTube}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Connect Channel</span>
              </button>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-8">
                <YouTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No channels connected</h3>
                <p className="text-gray-500 mb-4">Connect your YouTube channel to start automating replies</p>
                <button
                  onClick={connectYouTube}
                  className="btn btn-primary"
                >
                  Connect Your First Channel
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {channels.map((channel, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-full">
                        <YouTube className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{channel.channelName}</h3>
                        <p className="text-sm text-gray-500">
                          Last sync: {new Date(channel.lastSync).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${channel.connected ? 'badge-success' : 'badge-danger'}`}>
                      {channel.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Replies */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Replies</h2>
              <Link to="/analytics" className="text-primary-600 hover:text-primary-700 flex items-center space-x-1">
                <span>View all</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            {recentReplies.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No replies yet</h3>
                <p className="text-gray-500 mb-4">Start creating reply templates to automate responses</p>
                <Link to="/templates" className="btn btn-primary">
                  Create Template
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReplies.map((reply, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {reply.videoTitle || 'Unknown Video'}
                      </h3>
                      <span className={`badge ${getStatusBadge(reply.status)}`}>
                        {reply.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {reply.replyContent}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(reply.createdAt).toLocaleDateString()} • {reply.channelName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/templates"
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
            >
              <MessageSquare className="h-8 w-8 text-primary-600 mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">Create Reply Template</h3>
              <p className="text-sm text-gray-600">Set up automated responses for common comments</p>
            </Link>

            <Link
              to="/analytics"
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
            >
              <BarChart3 className="h-8 w-8 text-primary-600 mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">View Analytics</h3>
              <p className="text-sm text-gray-600">Track your reply performance and engagement</p>
            </Link>

            <Link
              to="/subscription"
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
            >
              <YouTube className="h-8 w-8 text-primary-600 mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">Manage Subscription</h3>
              <p className="text-sm text-gray-600">Upgrade or modify your current plan</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;