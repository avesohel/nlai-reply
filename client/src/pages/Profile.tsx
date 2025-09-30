import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Key,
  Bell,
  Youtube,
  Shield,
  Save,
  Edit3,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle,
  Settings,
  Clock,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  });
  const [settings, setSettings] = useState({
    emailNotifications: true,
    replyDelay: 60,
    maxRepliesPerHour: 10
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [youtubeChannels, setYoutubeChannels] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || ''
      });
      setSettings({
        emailNotifications: user.settings?.emailNotifications ?? true,
        replyDelay: user.settings?.replyDelay ?? 60,
        maxRepliesPerHour: user.settings?.maxRepliesPerHour ?? 10
      });
      setYoutubeChannels(user.youtubeChannels || []);
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.put('/users/profile', profileData);
      updateUser(response.data.user);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.put('/users/profile', { settings });
      updateUser(response.data.user);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await api.put('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeAuth = async () => {
    try {
      const response = await api.get('/youtube/auth-url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      toast.error('Failed to connect YouTube account');
    }
  };

  const handleDisconnectChannel = async (channelId) => {
    try {
      await api.delete(`/youtube/channel/${channelId}`);
      setYoutubeChannels(youtubeChannels.filter(ch => ch.channelId !== channelId));
      toast.success('Channel disconnected successfully');
    } catch (error) {
      toast.error('Failed to disconnect channel');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/account');
      toast.success('Account deleted successfully');
      // Redirect to login or home
      window.location.href = '/login';
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    }
    setShowDeleteModal(false);
  };

  const tabs = [
    { id: 'profile', name: 'Profile Info', icon: User },
    { id: 'settings', name: 'Reply Settings', icon: Settings },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'youtube', name: 'YouTube', icon: Youtube },
    { id: 'danger', name: 'Danger Zone', icon: AlertTriangle }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
          {/* Sidebar */}
          <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full group rounded-md px-3 py-2 flex items-center text-sm font-medium ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 hover:text-blue-700 hover:bg-blue-50'
                        : 'text-gray-900 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 ${
                      activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    <span className="truncate">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
            {/* Profile Info Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    Profile Information
                  </h3>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email Address
                        </label>
                        <div className="mt-1 relative">
                          <input
                            type="email"
                            name="email"
                            id="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border pr-10"
                            required
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            {user.emailVerified ? (
                              <CheckCircle className="h-5 w-5 text-green-400" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-yellow-400" />
                            )}
                          </div>
                        </div>
                        {!user.emailVerified && (
                          <p className="mt-1 text-sm text-yellow-600">
                            Email not verified. Please check your inbox.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Status</label>
                      <div className="mt-1 flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          Member since {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Reply Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-blue-600" />
                    Reply Settings
                  </h3>
                  <form onSubmit={handleSettingsUpdate} className="space-y-6">
                    <div>
                      <label htmlFor="replyDelay" className="block text-sm font-medium text-gray-700">
                        Reply Delay (seconds)
                      </label>
                      <div className="mt-1 flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-gray-400" />
                        <input
                          type="number"
                          name="replyDelay"
                          id="replyDelay"
                          min="30"
                          max="3600"
                          value={settings.replyDelay}
                          onChange={(e) => setSettings({ ...settings, replyDelay: parseInt(e.target.value) })}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Minimum time to wait before sending a reply (30-3600 seconds)
                      </p>
                    </div>

                    <div>
                      <label htmlFor="maxRepliesPerHour" className="block text-sm font-medium text-gray-700">
                        Max Replies Per Hour
                      </label>
                      <div className="mt-1 flex items-center">
                        <MessageSquare className="h-5 w-5 mr-2 text-gray-400" />
                        <input
                          type="number"
                          name="maxRepliesPerHour"
                          id="maxRepliesPerHour"
                          min="1"
                          max="100"
                          value={settings.maxRepliesPerHour}
                          onChange={(e) => setSettings({ ...settings, maxRepliesPerHour: parseInt(e.target.value) })}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Maximum number of replies to send per hour (1-100)
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Security Settings
                  </h3>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        id="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        id="newPassword"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                        required
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        id="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        {loading ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-blue-600" />
                    Notification Preferences
                  </h3>
                  <form onSubmit={handleSettingsUpdate} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label htmlFor="emailNotifications" className="block text-sm font-medium text-gray-700">
                          Email Notifications
                        </label>
                        <p className="text-sm text-gray-500">
                          Receive email notifications for important updates and reply status
                        </p>
                      </div>
                      <div className="ml-4">
                        <input
                          type="checkbox"
                          name="emailNotifications"
                          id="emailNotifications"
                          checked={settings.emailNotifications}
                          onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* YouTube Tab */}
            {activeTab === 'youtube' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                    <Youtube className="h-5 w-5 mr-2 text-red-600" />
                    YouTube Channel Management
                  </h3>

                  {youtubeChannels.length === 0 ? (
                    <div className="text-center py-6">
                      <Youtube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No channels connected</h4>
                      <p className="text-gray-600 mb-4">Connect your YouTube channels to start automating replies</p>
                      <button
                        onClick={handleYouTubeAuth}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Connect YouTube Channel
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                          {youtubeChannels.length} channel{youtubeChannels.length !== 1 ? 's' : ''} connected
                        </p>
                        <button
                          onClick={handleYouTubeAuth}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Another
                        </button>
                      </div>

                      <div className="divide-y divide-gray-200">
                        {youtubeChannels.map((channel) => (
                          <div key={channel.channelId} className="py-4 flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <Youtube className="h-8 w-8 text-red-600" />
                              </div>
                              <div className="ml-4">
                                <h4 className="text-sm font-medium text-gray-900">{channel.channelName}</h4>
                                <div className="flex items-center mt-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    channel.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {channel.connected ? 'Connected' : 'Disconnected'}
                                  </span>
                                  {channel.lastSync && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      Last sync: {new Date(channel.lastSync).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDisconnectChannel(channel.channelId)}
                              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Disconnect
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <div className="bg-white shadow rounded-lg border-red-200">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-red-900 mb-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                    Danger Zone
                  </h3>

                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Delete Account</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>
                            Once you delete your account, there is no going back. Please be certain.
                          </p>
                        </div>
                        <div className="mt-4">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => setShowDeleteModal(true)}
                              className="bg-red-600 text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Delete Account
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Account</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete your account? All of your data will be permanently removed.
                    This action cannot be undone.
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 mb-2"
                  >
                    Yes, Delete Account
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;