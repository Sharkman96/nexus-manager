import React, { useState } from 'react';
import { 
  Server, 
  Play, 
  Square, 
  Settings, 
  Trash2, 
  Activity, 
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { nodesAPI } from '../utils/api';
import toast from 'react-hot-toast';

export const NodeCard = ({ node, onUpdate, onDelete }) => {
  const [loading, setLoading] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'stopped':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'starting':
        return <Activity className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'stopped':
        return 'bg-red-100 text-red-800';
      case 'starting':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await nodesAPI.start(node.id);
      if (response.data.success) {
        toast.success('Node started successfully!');
        onUpdate();
      } else {
        toast.error(response.data.error || 'Failed to start node');
      }
    } catch (error) {
      console.error('Error starting node:', error);
      toast.error(error.response?.data?.error || 'Failed to start node');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const response = await nodesAPI.stop(node.id);
      if (response.data.success) {
        toast.success('Node stopped successfully!');
        onUpdate();
      } else {
        toast.error(response.data.error || 'Failed to stop node');
      }
    } catch (error) {
      console.error('Error stopping node:', error);
      toast.error(error.response?.data?.error || 'Failed to stop node');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete node "${node.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await nodesAPI.delete(node.id);
      if (response.data.success) {
        toast.success('Node deleted successfully!');
        onDelete(node.id);
      } else {
        toast.error(response.data.error || 'Failed to delete node');
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      toast.error(error.response?.data?.error || 'Failed to delete node');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Server className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{node.name}</h3>
            <p className="text-sm text-gray-500">ID: {node.prover_id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon(node.status)}
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(node.status)}`}>
            {node.status}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Created:</span>
          <span className="text-gray-900">
            {new Date(node.created_at).toLocaleDateString()}
          </span>
        </div>
        
        {node.last_seen && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last seen:</span>
            <span className="text-gray-900">
              {new Date(node.last_seen).toLocaleString()}
            </span>
          </div>
        )}

        {node.latest_metrics && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Uptime:</span>
            <span className="text-gray-900">
              {node.latest_metrics.uptime || 'N/A'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {node.status === 'stopped' && (
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </button>
        )}

        {node.status === 'running' && (
          <button
            onClick={handleStop}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            <Square className="w-4 h-4 mr-1" />
            Stop
          </button>
        )}

        <button
          onClick={() => window.location.href = `/nodes/${node.id}`}
          className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <Settings className="w-4 h-4 mr-1" />
          Details
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex items-center px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </button>
      </div>
    </div>
  );
}; 