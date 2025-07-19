import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Settings, 
  Trash2, 
  RotateCcw,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'react-icons/fi';

const DockerNodeCard = ({ node, onUpdate, onDelete }) => {
  const [status, setStatus] = useState(node.status || 'stopped');
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showRebuild, setShowRebuild] = useState(false);
  const [rebuildOptions, setRebuildOptions] = useState({
    rebuild: true,
    containerName: node.container_name || `nexus-node-${node.prover_id}`
  });

  useEffect(() => {
    if (status === 'running') {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 30000); // Обновляем каждые 30 секунд
      return () => clearInterval(interval);
    }
  }, [status, node.id]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/docker/nodes/${node.id}/metrics`);
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data.metrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/docker/nodes/${node.id}/logs?lines=50`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleAction = async (action, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/docker/nodes/${node.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (data.success) {
        setStatus(action === 'start' ? 'running' : 'stopped');
        onUpdate && onUpdate(node.id, { status: action === 'start' ? 'running' : 'stopped' });
        
        // Показываем уведомление
        showNotification('success', `Node ${action === 'start' ? 'started' : 'stopped'} successfully`);
      } else {
        setError(data.error);
        showNotification('error', `Failed to ${action} node: ${data.error}`);
      }
    } catch (error) {
      setError(error.message);
      showNotification('error', `Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRebuild = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/docker/nodes/${node.id}/rebuild`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rebuildOptions),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('running');
        onUpdate && onUpdate(node.id, { status: 'running' });
        setShowRebuild(false);
        showNotification('success', 'Node rebuilt and restarted successfully');
      } else {
        setError(data.error);
        showNotification('error', `Failed to rebuild node: ${data.error}`);
      }
    } catch (error) {
      setError(error.message);
      showNotification('error', `Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    // Здесь можно интегрировать с системой уведомлений
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const getStatusBadge = () => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'running':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Running</span>;
      case 'stopped':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Stopped</span>;
      case 'starting':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Starting</span>;
      case 'error':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Error</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
  };

  const getStatusIcon = () => {
    const iconClasses = "w-5 h-5";
    switch (status) {
      case 'running':
        return <CheckCircle className={`${iconClasses} text-green-500`} />;
      case 'stopped':
        return <XCircle className={`${iconClasses} text-gray-500`} />;
      case 'starting':
        return <RotateCcw className={`${iconClasses} text-yellow-500 animate-spin`} />;
      case 'error':
        return <AlertTriangle className={`${iconClasses} text-red-500`} />;
      default:
        return <XCircle className={`${iconClasses} text-gray-500`} />;
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md mb-4 border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="font-semibold text-gray-900">{node.name}</span>
            {getStatusBadge()}
          </div>
          <div className="flex space-x-2">
            <button
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              onClick={() => setShowLogs(true)}
              disabled={loading}
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors"
              onClick={() => setShowRebuild(true)}
              disabled={loading}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600"><span className="font-medium">Prover ID:</span> {node.prover_id}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Container:</span> {node.container_name || 'N/A'}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Type:</span> <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Docker</span></p>
            </div>
            <div>
              {metrics && (
                <>
                  <p className="text-sm text-gray-600"><span className="font-medium">Uptime:</span> {metrics.uptime}</p>
                  <p className="text-sm text-gray-600"><span className="font-medium">CPU:</span> {metrics.cpu_usage || 'N/A'}</p>
                  <p className="text-sm text-gray-600"><span className="font-medium">Memory:</span> {metrics.memory_usage || 'N/A'}</p>
                  <p className="text-sm text-gray-600"><span className="font-medium">Network:</span> {metrics.network_usage || 'N/A'}</p>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => handleAction('start')}
              disabled={loading || status === 'running'}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Start</span>
            </button>
            <button
              onClick={() => handleAction('stop')}
              disabled={loading || status === 'stopped'}
              className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </button>
            <button
              onClick={() => onDelete(node.id)}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-96 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Logs - {node.name}</h3>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-md h-64 overflow-y-auto font-mono text-sm">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              ) : (
                <div>No logs available</div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowLogs(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rebuild Modal */}
      {showRebuild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Rebuild Node</h3>
              <button
                onClick={() => setShowRebuild(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rebuildOptions.rebuild}
                    onChange={(e) => setRebuildOptions({...rebuildOptions, rebuild: e.target.checked})}
                    className="mr-2"
                  />
                  <span>Rebuild container</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Container Name
                </label>
                <input
                  type="text"
                  value={rebuildOptions.containerName}
                  onChange={(e) => setRebuildOptions({...rebuildOptions, containerName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowRebuild(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRebuild}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Rebuilding...' : 'Rebuild'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DockerNodeCard; 