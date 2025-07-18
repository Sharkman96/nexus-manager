import React from 'react';
import { useQuery } from 'react-query';
import { metricsAPI, nodesAPI } from '../utils/api';
import { formatters } from '../utils/api';
import { Activity, Server, Zap, AlertCircle, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', trend = null }) => (
  <div className="card p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className={`text-sm flex items-center mt-1 ${
            trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className="w-4 h-4 mr-1" />
            {trend > 0 ? '+' : ''}{trend}%
          </p>
        )}
      </div>
      <div className={`p-3 rounded-full bg-${color}-100`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
    </div>
  </div>
);

const NodeCard = ({ node, onStart, onStop }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'green';
      case 'stopped': return 'gray';
      case 'error': return 'red';
      case 'starting': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <div className="card p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{node.name}</h3>
        <span className={`status-badge status-${node.status}`}>
          {node.status}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-500">NEX Points:</span>
          <span className="font-medium ml-2">{formatters.formatNumber(node.latest_metrics?.nex_points || 0)}</span>
        </div>
        <div>
          <span className="text-gray-500">Tasks:</span>
          <span className="font-medium ml-2">{formatters.formatNumber(node.latest_metrics?.tasks_completed || 0)}</span>
        </div>
        <div>
          <span className="text-gray-500">CPU:</span>
          <span className="font-medium ml-2">{formatters.formatPercentage(node.latest_metrics?.cpu_usage || 0)}</span>
        </div>
        <div>
          <span className="text-gray-500">Memory:</span>
          <span className="font-medium ml-2">{formatters.formatPercentage(node.latest_metrics?.memory_usage || 0)}</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        {node.status === 'running' ? (
          <button
            onClick={() => onStop(node.id)}
            className="btn btn-danger btn-sm flex-1"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => onStart(node.id)}
            className="btn btn-success btn-sm flex-1"
          >
            Start
          </button>
        )}
        <button className="btn btn-secondary btn-sm">
          Logs
        </button>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  // Получение данных через React Query
  const { data: summary, isLoading: summaryLoading } = useQuery(
    'metrics-summary',
    () => metricsAPI.getSummary(),
    { refetchInterval: 30000 }
  );

  const { data: nodes, isLoading: nodesLoading } = useQuery(
    'nodes',
    () => nodesAPI.getAll(),
    { refetchInterval: 30000 }
  );

  const { data: systemHealth } = useQuery(
    'system-health',
    () => metricsAPI.getSystem(),
    { refetchInterval: 60000 }
  );

  const handleStartNode = async (nodeId) => {
    try {
      await nodesAPI.start(nodeId);
      // Обновление данных после успешного запуска
    } catch (error) {
      console.error('Failed to start node:', error);
    }
  };

  const handleStopNode = async (nodeId) => {
    try {
      await nodesAPI.stop(nodeId);
      // Обновление данных после успешной остановки
    } catch (error) {
      console.error('Failed to stop node:', error);
    }
  };

  if (summaryLoading || nodesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  const summaryData = summary?.data?.data || {};
  const nodesData = nodes?.data?.data || [];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your Nexus nodes and performance</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button className="btn btn-primary">
            <Server className="w-4 h-4 mr-2" />
            Add Node
          </button>
        </div>
      </div>

      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Nodes"
          value={summaryData.overview?.total_nodes || 0}
          icon={Server}
          color="blue"
        />
        <StatCard
          title="Running Nodes"
          value={summaryData.overview?.running_nodes || 0}
          icon={Activity}
          color="green"
        />
        <StatCard
          title="NEX Points"
          value={formatters.formatNumber(summaryData.overview?.total_points || 0)}
          icon={Zap}
          color="yellow"
        />
        <StatCard
          title="Tasks Completed"
          value={formatters.formatNumber(summaryData.overview?.total_tasks || 0)}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Системные метрики */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">CPU Usage</span>
              <span className="font-medium">{formatters.formatPercentage(summaryData.system?.cpu_usage || 0)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${summaryData.system?.cpu_usage || 0}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <span className="font-medium">{formatters.formatPercentage(summaryData.system?.memory_usage || 0)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${summaryData.system?.memory_usage || 0}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Uptime</span>
              <span className="font-medium">{formatters.formatUptime(summaryData.system?.uptime || 0)}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">RPC Connection</span>
              <span className="status-badge status-running">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">WebSocket</span>
              <span className="status-badge status-running">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Nexus CLI</span>
              <span className="status-badge status-running">Available</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Node started successfully
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              New metrics collected
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              System health check
            </div>
          </div>
        </div>
      </div>

      {/* Узлы */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Nodes</h2>
          <button className="btn btn-primary btn-sm">
            View All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodesData.slice(0, 6).map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              onStart={handleStartNode}
              onStop={handleStopNode}
            />
          ))}
        </div>
        
        {nodesData.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No nodes found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first Nexus node</p>
            <button className="btn btn-primary">
              Add Node
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 