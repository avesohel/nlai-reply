import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Brain, Settings, Zap, MessageSquare, FlaskConical, BarChart3 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AISettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testReply, setTestReply] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm();

  const watchedValues = watch();

  useEffect(() => {
    fetchSettings();
    fetchAnalytics();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/ai/settings');
      setSettings(response.data.settings);

      // Set form values
      Object.keys(response.data.settings).forEach(key => {
        setValue(key, response.data.settings[key]);
      });
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/ai/analytics');
      setAnalytics(response.data.analytics);
    } catch (error) {
      console.error('Error fetching AI analytics:', error);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await api.put('/ai/settings', data);
      toast.success('AI settings updated successfully!');
      await fetchSettings();
    } catch (error) {
      console.error('Error updating AI settings:', error);
      toast.error('Failed to update AI settings');
    } finally {
      setSaving(false);
    }
  };

  const testAIReply = async () => {
    const testComment = (document.getElementById('testComment') as HTMLInputElement)?.value;
    if (!testComment.trim()) {
      toast.error('Please enter a test comment');
      return;
    }

    setTestLoading(true);
    try {
      const response = await api.post('/ai/test-reply', {
        comment: {
          text: testComment,
          author: 'Test User'
        },
        settings: watchedValues
      });

      setTestReply(response.data.reply);
      toast.success('Test reply generated!');
    } catch (error) {
      console.error('Error testing AI reply:', error);
      toast.error('Failed to generate test reply');
      setTestReply('');
    } finally {
      setTestLoading(false);
    }
  };

  const triggerCommentMonitoring = async () => {
    setTestLoading(true);

    try {
      const response = await api.post('/ai/monitor-comments');
      toast.success(`Comment monitoring completed! Processed: ${response.data.processed}, Replies: ${response.data.replies}`);
    } catch (error) {
      console.error('Error triggering comment monitoring:', error);
      toast.error('Failed to trigger comment monitoring');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Reply Settings</h1>
          </div>
          <p className="text-gray-600 mt-2">
            Configure AI-powered natural reply generation for your Youtube comments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Settings */}
              <div className="card">
                <div className="flex items-center space-x-2 mb-6">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Basic Settings</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register('isEnabled')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable AI Replies</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reply Tone
                    </label>
                    <select {...register('replyTone')} className="input">
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="informative">Informative</option>
                      <option value="humorous">Humorous</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reply Length
                    </label>
                    <select {...register('replyLength')} className="input">
                      <option value="short">Short (1-2 sentences)</option>
                      <option value="medium">Medium (2-3 sentences)</option>
                      <option value="long">Long (3-4 sentences)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Model
                    </label>
                    <select {...register('aiModel')} className="input">
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, Cheaper)</option>
                      <option value="gpt-4">GPT-4 (Better Quality)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo (Best Quality)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Personality Settings */}
              <div className="card">
                <div className="flex items-center space-x-2 mb-6">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Personality Traits</h2>
                </div>

                <div className="space-y-6">
                  {[
                    { key: 'enthusiasmLevel', label: 'Enthusiasm Level', description: 'How excited and energetic your replies sound' },
                    { key: 'formalityLevel', label: 'Formality Level', description: 'How formal or casual your tone is' },
                    { key: 'humorLevel', label: 'Humor Level', description: 'How much humor to include in responses' },
                    { key: 'helpfulnessLevel', label: 'Helpfulness Level', description: 'How much you try to be helpful and informative' }
                  ].map(trait => (
                    <div key={trait.key}>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">{trait.label}</label>
                        <span className="text-sm text-gray-500">
                          {watchedValues.personalityTraits?.[trait.key] || 5}/10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        {...register(`personalityTraits.${trait.key}`, { valueAsNumber: true })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <p className="text-xs text-gray-500 mt-1">{trait.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Instructions</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Instructions
                  </label>
                  <textarea
                    {...register('customInstructions')}
                    rows={3}
                    className="input"
                    placeholder="Add any specific instructions for how you want the AI to respond..."
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(watchedValues.customInstructions || '').length}/500 characters
                  </p>
                </div>
              </div>

              {/* Automatic Replies */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Automatic Replies</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-blue-800 mb-1">Automatic Reply System</h3>
                      <p className="text-sm text-blue-700">
                        When enabled, the system will automatically monitor your videos for new comments and generate AI replies every 15 minutes.
                        Only comments from the last 24 hours on videos from the last 7 days will be processed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register('automaticReplies.enabled')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Automatic Replies</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically generate and post replies to new comments
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delay Between Replies (seconds)
                    </label>
                    <select {...register('automaticReplies.delayBetweenReplies')} className="input">
                      <option value="30000">30 seconds</option>
                      <option value="60000">1 minute</option>
                      <option value="120000">2 minutes</option>
                      <option value="300000">5 minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Replies Per Video
                    </label>
                    <select {...register('automaticReplies.maxRepliesPerVideo')} className="input">
                      <option value="5">5 replies</option>
                      <option value="10">10 replies</option>
                      <option value="20">20 replies</option>
                      <option value="50">50 replies</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register('automaticReplies.onlyReplyToQuestions')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Only Reply to Questions</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Only generate replies for comments that contain questions
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register('automaticReplies.monitorNewVideos')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Monitor New Videos Only</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Only monitor videos published in the last 7 days
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register('automaticReplies.skipIfAlreadyReplied')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Skip If Already Replied</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Don't reply to comments that already have responses
                    </p>
                  </div>

                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={triggerCommentMonitoring}
                      disabled={testLoading}
                      className="btn btn-secondary flex items-center space-x-2"
                    >
                      {testLoading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                      ) : (
                        <FlaskConical className="h-4 w-4" />
                      )}
                      <span>Test Comment Monitoring Now</span>
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Manually trigger comment monitoring to test the automatic reply system
                    </p>
                  </div>
                </div>
              </div>

              {/* Reply Filters */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Reply Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Sentiment Score
                    </label>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      {...register('replyFilters.minimumSentimentScore', { valueAsNumber: true })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Negative</span>
                      <span>Neutral</span>
                      <span>Positive</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Word Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      {...register('replyFilters.minimumWordCount', { valueAsNumber: true })}
                      className="input"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('replyFilters.excludeSpam')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">Exclude Spam Comments</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('replyFilters.requiresQuestion')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">Only Reply to Questions</label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Test Reply */}
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <FlaskConical className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Test AI Reply</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Comment
                  </label>
                  <textarea
                    id="testComment"
                    rows={3}
                    className="input"
                    placeholder="Enter a sample comment to test your AI settings..."
                  />
                </div>

                <button
                  type="button"
                  onClick={testAIReply}
                  disabled={testLoading}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>{testLoading ? 'Generating...' : 'Generate Test Reply'}</span>
                </button>

                {testReply && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <h4 className="text-sm font-medium text-green-800 mb-2">AI Generated Reply:</h4>
                    <p className="text-sm text-green-700">{testReply}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Usage Analytics */}
            {analytics?.ai && (
              <div className="card">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Usage Stats</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total AI Replies</span>
                    <span className="font-semibold">{analytics.ai.totalRepliesGenerated}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="font-semibold">{analytics.ai.currentMonthUsage}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-semibold">{analytics.ai.successRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Response Time</span>
                    <span className="font-semibold">{analytics.ai.averageResponseTime}ms</span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Features Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Features</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <span>Context-aware replies using video transcripts</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <span>Sentiment analysis and spam filtering</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <span>Customizable personality and tone</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <span>Vector-based content similarity matching</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;