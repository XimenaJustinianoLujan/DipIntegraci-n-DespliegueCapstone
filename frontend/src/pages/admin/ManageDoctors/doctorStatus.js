// El backend usa el enum en MAYUSCULAS (ACTIVO/BAJA/VACACION); mostramos una
// etiqueta capitalizada pero enviamos el valor que la API valida. Los
// colores viven en index.css (mismas clases que otros badges de la app:
// verde/rojo/ambar tienen el mismo significado en todos lados).
export const statusMeta = {
  ACTIVO: { label: 'Activo', badgeClass: 'badge-activa' },
  BAJA: { label: 'Baja', badgeClass: 'badge-cancelada' },
  VACACION: { label: 'Vacacion', badgeClass: 'badge-no-show' },
};

export const statusOptions = ['ACTIVO', 'BAJA', 'VACACION'];
