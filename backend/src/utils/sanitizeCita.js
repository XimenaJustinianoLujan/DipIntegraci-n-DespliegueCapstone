// El campo `citas.notas` es una nota privada del medico tratante (no del
// paciente). Se corta por defecto en cualquier respuesta que no sea la
// vista propia del medico sobre SUS citas (GET /citas/medico), asi el
// paciente, la secretaria o un medico consultando el historial de un
// paciente ajeno nunca la reciben por accidente en el JSON.
function omitNotas(cita) {
  if (!cita) return cita;
  const { notas, ...rest } = cita;
  return rest;
}

function omitNotasFromList(citas) {
  return (citas || []).map(omitNotas);
}

module.exports = { omitNotas, omitNotasFromList };
