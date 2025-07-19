import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Progress, Alert, Modal, Form } from 'react-bootstrap';
import { 
  PlayFill, 
  StopFill, 
  GearFill, 
  TrashFill, 
  ArrowClockwise,
  BoxArrowUpRight,
  ExclamationTriangle,
  CheckCircle,
  XCircle
} from 'react-bootstrap-icons';

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
    switch (status) {
      case 'running':
        return <Badge bg="success">Running</Badge>;
      case 'stopped':
        return <Badge bg="secondary">Stopped</Badge>;
      case 'starting':
        return <Badge bg="warning">Starting</Badge>;
      case 'error':
        return <Badge bg="danger">Error</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <CheckCircle className="text-success" />;
      case 'stopped':
        return <XCircle className="text-secondary" />;
      case 'starting':
        return <ArrowClockwise className="text-warning" />;
      case 'error':
        return <ExclamationTriangle className="text-danger" />;
      default:
        return <XCircle className="text-secondary" />;
    }
  };

  return (
    <>
      <Card className="mb-3 docker-node-card">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            {getStatusIcon()}
            <span className="ms-2 fw-bold">{node.name}</span>
            {getStatusBadge()}
          </div>
          <div className="btn-group">
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => setShowLogs(true)}
              disabled={loading}
            >
              <BoxArrowUpRight />
            </Button>
            <Button
              size="sm"
              variant="outline-warning"
              onClick={() => setShowRebuild(true)}
              disabled={loading}
            >
              <ArrowClockwise />
            </Button>
          </div>
        </Card.Header>

        <Card.Body>
          <div className="row">
            <div className="col-md-6">
              <p><strong>Prover ID:</strong> {node.prover_id}</p>
              <p><strong>Container:</strong> {node.container_name || 'N/A'}</p>
              <p><strong>Type:</strong> <Badge bg="info">Docker</Badge></p>
            </div>
            <div className="col-md-6">
              {metrics && (
                <>
                  <p><strong>Uptime:</strong> {metrics.uptime}</p>
                  <p><strong>CPU:</strong> {metrics.cpu_usage || 'N/A'}</p>
                  <p><strong>Memory:</strong> {metrics.memory_usage || 'N/A'}</p>
                </>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="danger" className="mt-2">
              {error}
            </Alert>
          )}

          <div className="d-flex justify-content-between mt-3">
            <div className="btn-group">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleAction('start')}
                disabled={loading || status === 'running'}
              >
                <PlayFill /> Start
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleAction('stop')}
                disabled={loading || status === 'stopped'}
              >
                <StopFill /> Stop
              </Button>
            </div>
            
            <div className="btn-group">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => onDelete && onDelete(node.id)}
                disabled={loading}
              >
                <TrashFill /> Delete
              </Button>
            </div>
          </div>

          {loading && (
            <div className="mt-3">
              <Progress animated now={100} />
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Модальное окно для логов */}
      <Modal show={showLogs} onHide={() => setShowLogs(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Docker Logs - {node.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="logs-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="log-line">
                  <code>{log}</code>
                </div>
              ))
            ) : (
              <p>No logs available</p>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogs(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={fetchLogs}>
            Refresh Logs
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Модальное окно для пересборки */}
      <Modal show={showRebuild} onHide={() => setShowRebuild(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Rebuild Docker Node - {node.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Container Name</Form.Label>
              <Form.Control
                type="text"
                value={rebuildOptions.containerName}
                onChange={(e) => setRebuildOptions({
                  ...rebuildOptions,
                  containerName: e.target.value
                })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Rebuild image"
                checked={rebuildOptions.rebuild}
                onChange={(e) => setRebuildOptions({
                  ...rebuildOptions,
                  rebuild: e.target.checked
                })}
              />
            </Form.Group>
          </Form>
          <Alert variant="warning">
            <ExclamationTriangle /> This will stop the current node, rebuild the Docker image, and restart it.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRebuild(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleRebuild} disabled={loading}>
            {loading ? 'Rebuilding...' : 'Rebuild & Restart'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default DockerNodeCard; 