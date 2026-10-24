/**
 * Servicio de merge bidireccional basado en updated_at (Last-Write-Wins)
 * Soporta borrado lógico (deleted_at).
 */

/**
 * Compara dos marcas de tiempo (strings ISO o timestamps)
 * Devuelve un número > 0 si a es más reciente que b.
 */
function getTimestamp(record) {
  if (!record) return 0;
  const time = record.updated_at || record.updatedAt || record.date || record.created_at || record.createdAt;
  if (!time) return 0;
  const t = new Date(time).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Fusiona dos listas de registros por id.
 * - Por cada id gana el registro con updated_at más reciente.
 * - Los registros con deleted_at también cuentan como cambio (gana el más reciente).
 * - Retorna la lista resultante con los registros activos (filtrando los que tienen deleted_at no nulo).
 */
export function mergeById(localList = [], remoteList = []) {
  const map = new Map();

  // 1. Indexar registros locales
  for (const item of (localList || [])) {
    if (!item) continue;
    const validId = (item.id && String(item.id).trim() !== '')
      ? String(item.id).trim()
      : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    const record = item.id === validId ? item : { ...item, id: validId };
    map.set(validId, record);
  }

  // 2. Resolver con registros remotos
  for (const remoteItem of (remoteList || [])) {
    if (!remoteItem || !remoteItem.id || String(remoteItem.id).trim() === '') continue;
    const remoteId = String(remoteItem.id).trim();
    const existing = map.get(remoteId);

    if (!existing) {
      map.set(remoteId, remoteItem);
    } else {
      const localTime = getTimestamp(existing);
      const remoteTime = getTimestamp(remoteItem);

      if (remoteTime >= localTime) {
        map.set(remoteId, remoteItem);
      }
      // Si localTime > remoteTime, gana el local que ya estaba en map
    }
  }

  // 3. Filtrar registros con borrado lógico (deleted_at)
  const result = [];
  for (const record of map.values()) {
    if (!record.deleted_at && !record.deletedAt) {
      result.push(record);
    }
  }

  return result;
}

/**
 * Fusiona dos objetos de presupuestos (donde la clave es la categoría o id).
 * Retorna el mapa { [category]: amount } resultante de las categorías no borradas.
 */
export function mergeBudgets(localBudgets = {}, remoteBudgets = {}) {
  // remoteBudgets puede venir como mapa { cat: { amount, updated_at, deleted_at } }
  // o { cat: amount }
  const merged = { ...localBudgets };

  for (const [cat, remoteVal] of Object.entries(remoteBudgets || {})) {
    if (typeof remoteVal === 'object' && remoteVal !== null) {
      if (remoteVal.deleted_at || remoteVal.deletedAt) {
        delete merged[cat];
      } else {
        merged[cat] = Number(remoteVal.amount) || 0;
      }
    } else {
      merged[cat] = Number(remoteVal) || 0;
    }
  }

  return merged;
}
