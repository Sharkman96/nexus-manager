import React from 'react';
import { Bell } from 'lucide-react';

export const NotificationsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-600">System notifications and alerts</p>
      </div>

      <div className="card p-8 text-center">
        <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Notifications Page</h3>
        <p className="text-gray-600">This page will show all system notifications and alerts.</p>
      </div>
    </div>
  );
}; 