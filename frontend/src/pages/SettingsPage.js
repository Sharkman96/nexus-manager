import React from 'react';
import { Settings } from 'lucide-react';

export const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Application settings and configuration</p>
      </div>

      <div className="card p-8 text-center">
        <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Page</h3>
        <p className="text-gray-600">This page will show application settings and configuration options.</p>
      </div>
    </div>
  );
}; 