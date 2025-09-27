import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Power,
  Save,
  X,
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    triggers: [],
    conditions: {
      sentiment: 'any',
      keywords: [],
      minLikes: 0
    },
    variables: []
  });
  const [newTrigger, setNewTrigger] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newVariable, setNewVariable] = useState({ name: '', defaultValue: '' });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates');
      setTemplates(response.data);
    } catch (error) {
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        const response = await api.put(`/templates/${editingTemplate._id}`, formData);
        setTemplates(templates.map(t =>
          t._id === editingTemplate._id ? response.data : t
        ));
        toast.success('Template updated successfully');
      } else {
        const response = await api.post('/templates', formData);
        setTemplates([response.data, ...templates]);
        toast.success('Template created successfully');
      }
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    }
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.delete(`/templates/${templateId}`);
      setTemplates(templates.filter(t => t._id !== templateId));
      toast.success('Template deleted successfully');
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleToggleActive = async (template) => {
    try {
      const response = await api.patch(`/templates/${template._id}/toggle`);
      setTemplates(templates.map(t =>
        t._id === template._id ? response.data : t
      ));
      toast.success(`Template ${response.data.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to toggle template status');
    }
  };

  const handlePreview = async (template) => {
    try {
      const variables = {
        username: 'John Doe',
        channelName: 'Your Channel',
        topic: 'this topic'
      };

      const response = await api.post(`/templates/${template._id}/preview`, { variables });
      setPreviewContent(response.data.content);
      setShowPreview(true);
    } catch (error) {
      toast.error('Failed to preview template');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      triggers: [],
      conditions: {
        sentiment: 'any',
        keywords: [],
        minLikes: 0
      },
      variables: []
    });
    setEditingTemplate(null);
    setShowModal(false);
  };

  const startEdit = (template) => {
    setFormData({
      name: template.name,
      content: template.content,
      triggers: template.triggers || [],
      conditions: template.conditions || {
        sentiment: 'any',
        keywords: [],
        minLikes: 0
      },
      variables: template.variables || []
    });
    setEditingTemplate(template);
    setShowModal(true);
  };

  const addTrigger = () => {
    if (newTrigger.trim()) {
      setFormData({
        ...formData,
        triggers: [...formData.triggers, newTrigger.trim()]
      });
      setNewTrigger('');
    }
  };

  const removeTrigger = (index) => {
    setFormData({
      ...formData,
      triggers: formData.triggers.filter((_, i) => i !== index)
    });
  };

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setFormData({
        ...formData,
        conditions: {
          ...formData.conditions,
          keywords: [...formData.conditions.keywords, newKeyword.trim()]
        }
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (index) => {
    setFormData({
      ...formData,
      conditions: {
        ...formData.conditions,
        keywords: formData.conditions.keywords.filter((_, i) => i !== index)
      }
    });
  };

  const addVariable = () => {
    if (newVariable.name.trim()) {
      setFormData({
        ...formData,
        variables: [...formData.variables, { ...newVariable }]
      });
      setNewVariable({ name: '', defaultValue: '' });
    }
  };

  const removeVariable = (index) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter((_, i) => i !== index)
    });
  };

  if (loading) {
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reply Templates</h1>
            <p className="mt-2 text-gray-600">Create and manage your automated reply templates</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>New Template</span>
          </button>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-6">Create your first template to start automating replies</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Template Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        template.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-sm text-gray-500">
                        Used {template.usageCount} times
                      </span>
                    </div>
                  </div>
                </div>

                {/* Template Content Preview */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {template.content.substring(0, 100)}...
                  </p>
                </div>

                {/* Triggers */}
                {template.triggers && template.triggers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Triggers:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.triggers.slice(0, 3).map((trigger, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {trigger}
                        </span>
                      ))}
                      {template.triggers.length > 3 && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          +{template.triggers.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePreview(template)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => startEdit(template)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(template)}
                      className={`p-2 rounded ${
                        template.isActive
                          ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={template.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(template._id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Template Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingTemplate ? 'Edit Template' : 'Create New Template'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Template Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      placeholder="e.g., Thank You Response"
                    />
                  </div>

                  {/* Template Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Content *
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      placeholder="Thank you {{username}} for your comment! I really appreciate your support."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use {'{{username}}'}, {'{{channelName}}'}, and other variables in your template
                    </p>
                  </div>

                  {/* Triggers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Triggers
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={newTrigger}
                        onChange={(e) => setNewTrigger(e.target.value)}
                        placeholder="e.g., thanks, thank you"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTrigger())}
                      />
                      <button
                        type="button"
                        onClick={addTrigger}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.triggers.map((trigger, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                          {trigger}
                          <button
                            type="button"
                            onClick={() => removeTrigger(index)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Conditions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conditions
                    </label>

                    {/* Sentiment */}
                    <div className="mb-4">
                      <label className="block text-xs text-gray-600 mb-1">Sentiment</label>
                      <select
                        value={formData.conditions.sentiment}
                        onChange={(e) => setFormData({
                          ...formData,
                          conditions: { ...formData.conditions, sentiment: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="any">Any</option>
                        <option value="positive">Positive</option>
                        <option value="negative">Negative</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>

                    {/* Keywords */}
                    <div className="mb-4">
                      <label className="block text-xs text-gray-600 mb-1">Keywords</label>
                      <div className="flex space-x-2 mb-2">
                        <input
                          type="text"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          placeholder="e.g., great, awesome"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                        />
                        <button
                          type="button"
                          onClick={addKeyword}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.conditions.keywords.map((keyword, index) => (
                          <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                            {keyword}
                            <button
                              type="button"
                              onClick={() => removeKeyword(index)}
                              className="ml-2 text-green-600 hover:text-green-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Min Likes */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Minimum Likes</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.conditions.minLikes}
                        onChange={(e) => setFormData({
                          ...formData,
                          conditions: { ...formData.conditions, minLikes: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Variables */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Variables
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={newVariable.name}
                        onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                        placeholder="Variable name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={newVariable.defaultValue}
                        onChange={(e) => setNewVariable({ ...newVariable, defaultValue: e.target.value })}
                        placeholder="Default value"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addVariable}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.variables.map((variable, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                          <span className="text-sm">
                            <strong>{'{{' + variable.name + '}}'}</strong> = "{variable.defaultValue}"
                          </span>
                          <button
                            type="button"
                            onClick={() => removeVariable(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>{editingTemplate ? 'Update' : 'Create'} Template</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-wrap">{previewContent}</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Close
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

export default Templates;