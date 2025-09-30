import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Heart,
  Clock,
  Calendar,
  RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(30);
  const [overview, setOverview] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [templateStats, setTemplateStats] = useState([]);
  const [channelStats, setChannelStats] = useState([]);
  const [sentimentData, setSentimentData] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewRes, timeSeriesRes, templatesRes, channelsRes, sentimentRes] = await Promise.all([
        api.get(`/analytics/overview?period=${period}`),
        api.get(`/analytics/timeseries?period=${period}&granularity=day`),
        api.get(`/analytics/templates?period=${period}`),
        api.get(`/analytics/channels?period=${period}`),
        api.get(`/analytics/sentiment?period=${period}`)
      ]);

      setOverview(overviewRes.data);
      setTimeSeriesData(timeSeriesRes.data);
      setTemplateStats(templatesRes.data);
      setChannelStats(channelsRes.data);
      setSentimentData(sentimentRes.data);
    } catch (error) {
      toast.error('Failed to fetch analytics data');
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [period, fetchAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-2 text-gray-600">Track your reply performance and engagement metrics</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {/* Period Selector */}
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Replies</p>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(overview.overview.totalReplies)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              {overview.overview.growth !== 0 && (
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className={`h-4 w-4 mr-1 ${
                    overview.overview.growth > 0 ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <span className={overview.overview.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                    {overview.overview.growth > 0 ? '+' : ''}{overview.overview.growth}%
                  </span>
                  <span className="text-gray-500 ml-1">vs previous period</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Engagement</p>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(overview.overview.totalEngagement)}</p>
                </div>
                <div className="p-3 bg-pink-100 rounded-full">
                  <Heart className="h-6 w-6 text-pink-600" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-sm text-gray-600">
                  {formatNumber(overview.engagement.likes)} likes, {formatNumber(overview.engagement.replies)} replies
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Templates Used</p>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(overview.overview.templatesUsed)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-3xl font-bold text-gray-900">{formatDuration(overview.overview.avgResponseTime)}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Reply Trends Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reply Trends</h3>
            {timeSeriesData.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {timeSeriesData.slice(-7).map((item, index) => {
                  const totalReplies = item.data.find(d => d.type === 'reply_sent')?.count || 0;
                  const maxReplies = Math.max(...timeSeriesData.map(d =>
                    d.data.find(dt => dt.type === 'reply_sent')?.count || 0
                  ));
                  const percentage = maxReplies > 0 ? (totalReplies / maxReplies) * 100 : 0;

                  return (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600 w-20">{item._id}</span>
                      <div className="flex-1 mx-4">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">{totalReplies}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No reply data available</p>
              </div>
            )}
          </div>

          {/* Sentiment Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Analysis</h3>
            {sentimentData ? (
              <div className="space-y-4">
                {Object.entries(sentimentData).map(([sentiment, data]) => {
                  const colors = {
                    positive: 'bg-green-500',
                    negative: 'bg-red-500',
                    neutral: 'bg-yellow-500'
                  };

                  const total = Object.values(sentimentData).reduce((acc, curr) => acc + ((curr as any).count || 0), 0);
                  const percentage = total > 0 ? (((data as any).count || 0) / Number(total)) * 100 : 0;

                  return (
                    <div key={sentiment}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-900 capitalize">{sentiment}</span>
                        <span className="text-sm text-gray-600">{(data as any).count || 0} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[sentiment]}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      {(data as any).avgEngagement > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Avg engagement: {(data as any).avgEngagement}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Heart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No sentiment data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Templates and Channels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Templates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Templates</h3>
            {templateStats.length > 0 ? (
              <div className="space-y-3">
                {templateStats.slice(0, 5).map((template, index) => (
                  <div key={template._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">{template.templateName}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {template.usageCount} uses • {template.engagementRate} avg engagement
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{template.avgLikes}</div>
                      <div className="text-xs text-gray-500">avg likes</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No template data available</p>
              </div>
            )}
          </div>

          {/* Channel Performance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Performance</h3>
            {channelStats.length > 0 ? (
              <div className="space-y-3">
                {channelStats.slice(0, 5).map((channel, index) => (
                  <div key={channel.channelId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{channel.channelName}</div>
                      <div className="text-sm text-gray-600">
                        {channel.totalReplies} replies • {channel.avgEngagement.toFixed(1)} avg engagement
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex space-x-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          {channel.positiveSentiment} +
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          {channel.negativeSentiment} -
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No channel data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Usage Progress */}
        {overview && overview.overview.usageLimit > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Usage</h3>
              <span className="text-sm text-gray-600">
                {overview.overview.currentPeriodUsage} / {overview.overview.usageLimit} replies used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((overview.overview.currentPeriodUsage / overview.overview.usageLimit) * 100, 100)}%`
                }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {overview.overview.usageLimit - overview.overview.currentPeriodUsage} replies remaining this period
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;