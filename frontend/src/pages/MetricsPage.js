import React from 'react';
import { BarChart3 } from 'lucide-react';

export const MetricsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Metrics</h1>
        <p className="text-gray-600">Performance metrics and analytics</p>
      </div>

      <div className="card p-8 text-center">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Metrics Page</h3>
        <p className="text-gray-600">This page will show detailed performance metrics and charts.</p>
      </div>
    </div>
  );
}; 