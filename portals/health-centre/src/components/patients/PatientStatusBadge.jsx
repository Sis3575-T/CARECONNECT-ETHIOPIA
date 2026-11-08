import React from 'react';
import { Badge } from '@shared/components/display/Badge.jsx';

export function PatientStatusBadge({ status = 'ACTIVE' }) {
  const norm = String(status || 'ACTIVE').toUpperCase();

  switch (norm) {
    case 'ACTIVE':
      return <Badge variant="success">Active</Badge>;
    case 'INACTIVE':
      return <Badge variant="neutral">Inactive</Badge>;
    case 'DECEASED':
      return <Badge variant="danger">Deceased</Badge>;
    case 'MERGED':
      return <Badge variant="warning">Merged</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export default PatientStatusBadge;
