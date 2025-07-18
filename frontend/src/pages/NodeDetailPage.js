import React from 'react';
import { useParams } from 'react-router-dom';
import { Server } from 'lucide-react';

export const NodeDetailPage = () => {
  const { id } = useParams();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Node Details</h1>
        <p className="text-gray-600">Detailed information for node {id}</p>
      </div>

      <div className="card p-8 text-center">
        <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Node Detail Page</h3>
        <p className="text-gray-600">This page will show detailed information about node {id}.</p>
      </div>
    </div>
  );
}; 