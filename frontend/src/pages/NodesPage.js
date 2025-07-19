import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
import { nodesAPI } from '../utils/api';
import { NodeForm } from '../components/NodeForm';
import { NodeCard } from '../components/NodeCard';
import toast from 'react-hot-toast';

export const NodesPage = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: nodesData,
    isLoading,
    error,
    refetch
  } = useQuery('nodes', nodesAPI.getAll, {
    refetchInterval: 30000, // Обновлять каждые 30 секунд
    staleTime: 10000
  });

  // Добавляем логирование для отладки
  console.log('NodesPage - nodesData:', nodesData);
  
  const nodes = Array.isArray(nodesData?.data) ? nodesData.data : (Array.isArray(nodesData) ? nodesData : []);
  
  console.log('NodesPage - processed nodes:', nodes);

  const handleNodeCreated = (newNode) => {
    queryClient.invalidateQueries('nodes');
    toast.success(`Node "${newNode.name}" created successfully!`);
  };

  const handleNodeUpdated = () => {
    queryClient.invalidateQueries('nodes');
  };

  const handleNodeDeleted = (nodeId) => {
    queryClient.invalidateQueries('nodes');
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nodes</h1>
            <p className="text-gray-600">Manage your Nexus prover nodes</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading nodes: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nodes</h1>
          <p className="text-gray-600">Manage your Nexus prover nodes</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Node
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading nodes...</span>
        </div>
      ) : nodes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No nodes yet</h3>
          <p className="text-gray-600 mb-6">
            Get started by adding your first Nexus prover node to the manager.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Your First Node
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              onUpdate={handleNodeUpdated}
              onDelete={handleNodeDeleted}
            />
          ))}
        </div>
      )}

      <NodeForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={handleNodeCreated}
      />
    </div>
  );
}; 