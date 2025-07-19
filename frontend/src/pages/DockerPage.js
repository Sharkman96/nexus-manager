import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Tabs, Tab } from 'react-bootstrap';
import { Plus, Docker, Server, ExclamationTriangle } from 'react-bootstrap-icons';
import DockerNodeCard from '../components/DockerNodeCard';
import DockerNodeForm from '../components/DockerNodeForm';

const DockerPage = () => {
  const [nodes, setNodes] = useState([]);
  const [dockerStatus, setDockerStatus] = useState(null);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('nodes');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Обновляем каждые 30 секунд
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Получаем статус Docker
      const dockerResponse = await fetch('/api/docker/status');
      const dockerData = await dockerResponse.json();
      setDockerStatus(dockerData.data);

      // Получаем список контейнеров
      const containersResponse = await fetch('/api/docker/containers');
      const containersData = await containersResponse.json();
      setContainers(containersData.data);

      // Получаем список нод
      const nodesResponse = await fetch('/api/nodes');
      const nodesData = await nodesResponse.json();
      
      // Фильтруем только Docker ноды
      const dockerNodes = nodesData.data.filter(node => node.node_type === 'docker');
      setNodes(dockerNodes);

    } catch (error) {
      setError('Failed to fetch data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeUpdate = (nodeId, updates) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  };

  const handleNodeDelete = async (nodeId) => {
    if (window.confirm('Are you sure you want to delete this node?')) {
      try {
        const response = await fetch(`/api/nodes/${nodeId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setNodes(prev => prev.filter(node => node.id !== nodeId));
        } else {
          setError('Failed to delete node');
        }
      } catch (error) {
        setError('Network error: ' + error.message);
      }
    }
  };

  const handleNodeCreate = (newNode) => {
    setNodes(prev => [...prev, newNode]);
    setShowForm(false);
  };

  const installDocker = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/docker/install', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchData(); // Обновляем данные
      } else {
        setError('Failed to install Docker: ' + data.error);
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDockerStatusBadge = () => {
    if (!dockerStatus) return <Badge bg="secondary">Unknown</Badge>;
    
    return dockerStatus.available ? 
      <Badge bg="success">Available</Badge> : 
      <Badge bg="danger">Not Available</Badge>;
  };

  const getDockerStatusIcon = () => {
    if (!dockerStatus) return <ExclamationTriangle className="text-secondary" />;
    
    return dockerStatus.available ? 
      <Docker className="text-success" /> : 
      <ExclamationTriangle className="text-danger" />;
  };

  if (loading && nodes.length === 0) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading Docker nodes...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2 className="d-flex align-items-center">
            <Docker className="me-2" />
            Docker Node Management
          </h2>
        </Col>
        <Col xs="auto">
          <Button
            variant="primary"
            onClick={() => setShowForm(true)}
            disabled={!dockerStatus?.available}
          >
            <Plus className="me-2" />
            Add Docker Node
          </Button>
        </Col>
      </Row>

      {/* Docker Status */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0 d-flex align-items-center">
            {getDockerStatusIcon()}
            <span className="ms-2">Docker Status</span>
            {getDockerStatusBadge()}
          </h5>
        </Card.Header>
        <Card.Body>
          {dockerStatus ? (
            <Row>
              <Col md={6}>
                <p><strong>Docker Version:</strong> {dockerStatus.dockerVersion || 'N/A'}</p>
                <p><strong>Compose Version:</strong> {dockerStatus.composeVersion || 'N/A'}</p>
              </Col>
              <Col md={6}>
                <p><strong>Status:</strong> {dockerStatus.available ? 'Available' : 'Not Available'}</p>
                {!dockerStatus.available && (
                  <Button variant="warning" size="sm" onClick={installDocker}>
                    Install Docker
                  </Button>
                )}
              </Col>
            </Row>
          ) : (
            <p>Loading Docker status...</p>
          )}
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        <Tab eventKey="nodes" title={`Docker Nodes (${nodes.length})`}>
          {showForm ? (
            <DockerNodeForm
              onSubmit={handleNodeCreate}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <div>
              {nodes.length === 0 ? (
                <Card>
                  <Card.Body className="text-center">
                    <Docker size={48} className="text-muted mb-3" />
                    <h5>No Docker Nodes</h5>
                    <p className="text-muted">
                      Create your first Docker node to get started.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => setShowForm(true)}
                      disabled={!dockerStatus?.available}
                    >
                      <Plus className="me-2" />
                      Create Docker Node
                    </Button>
                  </Card.Body>
                </Card>
              ) : (
                <Row>
                  {nodes.map(node => (
                    <Col key={node.id} lg={6} xl={4}>
                      <DockerNodeCard
                        node={node}
                        onUpdate={handleNodeUpdate}
                        onDelete={handleNodeDelete}
                      />
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          )}
        </Tab>

        <Tab eventKey="containers" title={`All Containers (${containers.length})`}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Docker Containers</h5>
            </Card.Header>
            <Card.Body>
              {containers.length === 0 ? (
                <p className="text-muted">No containers found.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Container ID</th>
                        <th>Image</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Names</th>
                      </tr>
                    </thead>
                    <tbody>
                      {containers.map((container, index) => (
                        <tr key={index}>
                          <td>
                            <code>{container.Id.substring(0, 12)}</code>
                          </td>
                          <td>{container.Image}</td>
                          <td>
                            <Badge bg={container.Status === 'running' ? 'success' : 'secondary'}>
                              {container.Status}
                            </Badge>
                          </td>
                          <td>{container.CreatedAt}</td>
                          <td>{container.Names}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default DockerPage; 