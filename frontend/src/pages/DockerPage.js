import React, { useState, useEffect } from 'react';
import { Plus, Docker, RefreshCw } from 'react-icons/fi';
import DockerNodeCard from '../components/DockerNodeCard';
import DockerNodeForm from '../components/DockerNodeForm';

const DockerPage = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/docker/nodes');
      const data = await response.json();
      
      if (data.success) {
        setNodes(data.data.nodes);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNodes();
    setRefreshing(false);
  };

  const handleCreateNode = (newNode) => {
    setNodes(prev => [...prev, newNode]);
    setShowForm(false);
  };

  const handleUpdateNode = (nodeId, updates) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  };

  const handleDeleteNode = async (nodeId) => {
    if (!window.confirm('Are you sure you want to delete this node?')) {
      return;
    }

    try {
      const response = await fetch(`/api/docker/nodes/${nodeId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setNodes(prev => prev.filter(node => node.id !== nodeId));
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const dockerNodes = nodes.filter(node => node.node_type === 'docker');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-3">
          <Docker className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Docker Nodes</h1>
            <p className="text-gray-600">Manage your Nexus Docker nodes</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Node</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-8">
          <DockerNodeForm
            onSubmit={handleCreateNode}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : dockerNodes.length === 0 ? (
        <div className="text-center py-12">
          <Docker className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Docker nodes found</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first Docker node</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mx-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Create First Node</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {dockerNodes.map(node => (
            <DockerNodeCard
              key={node.id}
              node={node}
              onUpdate={handleUpdateNode}
              onDelete={handleDeleteNode}
            />
          ))}
        </div>
      )}

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Docker Node Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Features</h4>
            <ul className="space-y-1">
              <li>• Create and manage Docker containers</li>
              <li>• Real-time metrics and monitoring</li>
              <li>• Container logs viewing</li>
              <li>• Start/stop/rebuild operations</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
            <ul className="space-y-1">
              <li>• Docker installed on server</li>
              <li>• Docker Compose available</li>
              <li>• Valid Prover ID from Nexus</li>
              <li>• Sufficient system resources</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Tips</h4>
            <ul className="space-y-1">
              <li>• Use unique container names</li>
              <li>• Monitor resource usage</li>
              <li>• Keep logs for debugging</li>
              <li>• Regular backups recommended</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DockerPage; 