import React from 'react';
import { Server, Plus } from 'lucide-react';

export const NodesPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nodes</h1>
          <p className="text-gray-600">Manage your Nexus prover nodes</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Node
        </button>
      </div>

      <div className="card p-8 text-center">
        <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nodes page</h3>
        <p className="text-gray-600">This page will show all your Nexus nodes with detailed management options.</p>
      </div>
    </div>
  );
}; 