// Nombre de la clase CSS del badge de estado de una cita (ver .badge-* en
// index.css). Antes cada dashboard tenia su propio mapa local de
// {bg, color} por estado -copiado identico en 4 archivos- mas un style
// inline; el color ahora vive una sola vez en el CSS, y esto solo arma
// el nombre de clase a partir del enum que ya manda el backend
// (CONFIRMADA, COMPLETADA, CANCELADA, NO_SHOW, RECONSULTA, ...).
export function citaStatusClass(estado) {
  return `badge badge-${(estado || '').toLowerCase().replace(/_/g, '-')}`;
}
