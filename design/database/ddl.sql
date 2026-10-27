CREATE TABLE equipment (
  id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  location VARCHAR(80) NOT NULL,
  category VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('operational', 'maintenance', 'retired')),
  owner VARCHAR(40) NOT NULL,
  last_inspection_at TIMESTAMP NULL
);

CREATE TABLE inspections (
  id VARCHAR(16) PRIMARY KEY,
  equipment_id VARCHAR(16) NOT NULL,
  inspector VARCHAR(40) NOT NULL,
  result VARCHAR(10) NOT NULL CHECK (result IN ('pass', 'issue')),
  note VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

CREATE TABLE tickets (
  id VARCHAR(16) PRIMARY KEY,
  equipment_id VARCHAR(16) NOT NULL,
  title VARCHAR(120) NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status VARCHAR(20) NOT NULL CHECK (
    status IN ('open', 'assigned', 'repairing', 'resolved', 'closed')
  ),
  assignee VARCHAR(40) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

CREATE INDEX idx_inspections_equipment ON inspections(equipment_id);
CREATE INDEX idx_tickets_equipment ON tickets(equipment_id);
CREATE INDEX idx_tickets_status ON tickets(status);
