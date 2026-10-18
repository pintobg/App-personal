import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function exportBackup({ assets, transactions, obligations, veRates, budgets }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const filename = `respaldo_finanzas_${year}-${month}-${day}.json`;

  const backupData = {
    version: 1,
    exportedAt: now.toISOString(),
    assets: assets || [],
    transactions: transactions || [],
    obligations: obligations || [],
    veRates: veRates || { bcvUsd: 0, bcvEur: 0, paralelo: 0, custom: 0, lastUpdated: null },
    budgets: budgets || {}
  };

  const jsonStr = JSON.stringify(backupData, null, 2);

  // Si se ejecuta dentro del APK nativo de Android/iOS, usar Filesystem + Share nativo
  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: jsonStr,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });

    await Share.share({
      title: 'Copia de seguridad - Finanzas',
      text: `Respaldo de Finanzas (${year}-${month}-${day})`,
      url: written.uri,
      dialogTitle: 'Guardar o compartir copia de seguridad'
    });

    return filename;
  }

  // En navegador web estándar
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

export function validateBackupData(data) {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'El archivo no contiene un objeto JSON válido.' };
  }

  if (!Array.isArray(data.assets)) {
    return { isValid: false, error: 'La copia de seguridad no contiene la lista de cuentas (assets).' };
  }

  if (!Array.isArray(data.transactions)) {
    return { isValid: false, error: 'La copia de seguridad no contiene la lista de transacciones (transactions).' };
  }

  if (!Array.isArray(data.obligations)) {
    return { isValid: false, error: 'La copia de seguridad no contiene la lista de deudas/obligaciones (obligations).' };
  }

  const isValidAsset = data.assets.every(a => a && typeof a === 'object' && a.name && a.location);
  if (!isValidAsset) {
    return { isValid: false, error: 'Algunas cuentas dentro del respaldo tienen datos corruptos o incompletos.' };
  }

  const isValidTx = data.transactions.every(t => t && typeof t === 'object' && t.type != null);
  if (!isValidTx) {
    return { isValid: false, error: 'Algunas transacciones dentro del respaldo tienen datos corruptos o incompletos.' };
  }

  const isValidOb = data.obligations.every(o => o && typeof o === 'object' && o.title);
  if (!isValidOb) {
    return { isValid: false, error: 'Algunas obligaciones dentro del respaldo tienen datos corruptos o incompletos.' };
  }

  return { isValid: true };
}
