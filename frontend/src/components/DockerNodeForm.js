import React, { useState } from 'react';
import { Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import { PlusCircle, Docker } from 'react-bootstrap-icons';

const DockerNodeForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    prover_id: '',
    container_name: '',
    rebuild: true,
    skip_build: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Сначала создаем ноду в базе данных
      const createResponse = await fetch('/api/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          prover_id: formData.prover_id,
          node_type: 'docker',
          container_name: formData.container_name || `nexus-node-${formData.prover_id}`,
          status: 'stopped'
        }),
      });

      const createData = await createResponse.json();

      if (createData.success) {
        const nodeId = createData.data.id;
        
        // Затем запускаем Docker ноду
        const startResponse = await fetch(`/api/docker/nodes/${nodeId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            containerName: formData.container_name || `nexus-node-${formData.prover_id}`,
            rebuild: formData.rebuild,
            skipBuild: formData.skip_build
          }),
        });

        const startData = await startResponse.json();

        if (startData.success) {
          onSubmit && onSubmit(createData.data);
          // Сброс формы
          setFormData({
            name: '',
            prover_id: '',
            container_name: '',
            rebuild: true,
            skip_build: false
          });
        } else {
          setError(`Failed to start Docker node: ${startData.error}`);
        }
      } else {
        setError(`Failed to create node: ${createData.error}`);
      }
    } catch (error) {
      setError(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const generateProverId = () => {
    const randomId = Math.floor(Math.random() * 100000000);
    setFormData(prev => ({
      ...prev,
      prover_id: randomId.toString()
    }));
  };

  const generateContainerName = () => {
    if (formData.prover_id) {
      setFormData(prev => ({
        ...prev,
        container_name: `nexus-node-${formData.prover_id}`
      }));
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex align-items-center">
        <Docker className="me-2" />
        <h5 className="mb-0">Create Docker Node</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Node Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter node name"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Prover ID *</Form.Label>
                <div className="d-flex">
                  <Form.Control
                    type="text"
                    name="prover_id"
                    value={formData.prover_id}
                    onChange={handleChange}
                    placeholder="Enter prover ID"
                    required
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={generateProverId}
                    className="ms-2"
                  >
                    Generate
                  </Button>
                </div>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Container Name</Form.Label>
                <div className="d-flex">
                  <Form.Control
                    type="text"
                    name="container_name"
                    value={formData.container_name}
                    onChange={handleChange}
                    placeholder="Auto-generated if empty"
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={generateContainerName}
                    className="ms-2"
                    disabled={!formData.prover_id}
                  >
                    Auto
                  </Button>
                </div>
                <Form.Text className="text-muted">
                  Leave empty to auto-generate based on prover ID
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Build Options</Form.Label>
                <div>
                  <Form.Check
                    type="checkbox"
                    name="rebuild"
                    checked={formData.rebuild}
                    onChange={handleChange}
                    label="Rebuild Docker image"
                    className="mb-2"
                  />
                  <Form.Check
                    type="checkbox"
                    name="skip_build"
                    checked={formData.skip_build}
                    onChange={handleChange}
                    label="Skip build (use existing image)"
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>

          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}

          <div className="d-flex justify-content-between mt-3">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading || !formData.name || !formData.prover_id}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="me-2" />
                  Create Docker Node
                </>
              )}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default DockerNodeForm; 