// El backend usa el enum en MAYUSCULAS (ACTIVO/BAJA/VACACION); mostramos una
// etiqueta capitalizada pero enviamos el valor que la API valida.
export const statusMeta = {
  ACTIVO: { label: 'Activo', bg: '#dcfce7', color: '#16a34a' },
  BAJA: { label: 'Baja', bg: '#fee2e2', color: '#dc2626' },
  VACACION: { label: 'Vacacion', bg: '#fef3c7', color: '#d97706' },
};

export const statusOptions = ['ACTIVO', 'BAJA', 'VACACION'];
