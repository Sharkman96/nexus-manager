import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { nodesAPI } from '../utils/api';
import toast from 'react-hot-toast';

export const NodeForm = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    prover_id: '',
    config: {
      rpc_url: 'https://rpc.nexus.xyz/http',
      ws_url: 'wss://rpc.nexus.xyz/ws',
      explorer_url: 'https://explorer.nexus.xyz/api/v1'
    }
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await nodesAPI.create(formData);
      
      if (response.data.success) {
        toast.success('Node created successfully!');
        onSuccess(response.data.data);
        handleClose();
      } else {
        toast.error(response.data.error || 'Failed to create node');
      }
    } catch (error) {
      console.error('Error creating node:', error);
      toast.error(error.response?.data?.error || 'Failed to create node');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      prover_id: '',
      config: {
        rpc_url: 'https://rpc.nexus.xyz/http',
        ws_url: 'wss://rpc.nexus.xyz/ws',
        explorer_url: 'https://explorer.nexus.xyz/api/v1'
      }
    });
    onClose();
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Add New Node</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Node Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Nexus Node"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prover ID *
              </label>
              <input
                type="text"
                required
                value={formData.prover_id}
                onChange={(e) => handleInputChange('prover_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="prover_123456789"
              />
              <p className="text-sm text-gray-500 mt-1">
                Unique identifier for your prover node
              </p>
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Configuration</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RPC URL
              </label>
              <input
                type="url"
                value={formData.config.rpc_url}
                onChange={(e) => handleInputChange('config.rpc_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://rpc.nexus.xyz/http"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WebSocket URL
              </label>
              <input
                type="url"
                value={formData.config.ws_url}
                onChange={(e) => handleInputChange('config.ws_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="wss://rpc.nexus.xyz/ws"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explorer API URL
              </label>
              <input
                type="url"
                value={formData.config.explorer_url}
                onChange={(e) => handleInputChange('config.explorer_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://explorer.nexus.xyz/api/v1"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Node
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 