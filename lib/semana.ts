/**
 * Devuelve el identificador de la semana actual como el lunes de esa semana,
 * en formato YYYY-MM-DD. Se usa como llave para que el check-in y la
 * operación de una misma semana queden agrupados, aunque no coincidan
 * en el día exacto en que se registran.
 */
export function getSemanaActual(fecha: Date = new Date()): string {
  const d = new Date(fecha);
  const dia = d.getDay(); // 0 = domingo, 1 = lunes, ...
  const diferencia = d.getDate() - dia + (dia === 0 ? -6 : 1);
  const lunes = new Date(d);
  lunes.setDate(diferencia);
  lunes.setHours(0, 0, 0, 0);
  return lunes.toISOString().slice(0, 10);
}