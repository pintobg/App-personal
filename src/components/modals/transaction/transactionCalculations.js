import { parseAmount, round, add, sub } from '../../../domain/money';

export function calculateAssetFees(amountStr, asset, isSpent) {
  const parsedAmt = parseAmount(amountStr);
  let igtfAmount = '';
  let includeIgtf = false;
  let commissionAmount = '';
  let includeCommission = false;

  if (asset && isSpent) {
    if (asset.name !== 'VES' && asset.appliesIgtf) {
      if (parsedAmt !== null && parsedAmt > 0) {
        const igtfRate = asset.igtfPercent != null ? Number(asset.igtfPercent) : 3;
        igtfAmount = round((parsedAmt * igtfRate) / 100, asset.name).toString();
        includeIgtf = true;
      }
    }

    if (asset.hasTransferCommission || asset.commissionPercent > 0 || asset.commissionFixed > 0) {
      if (parsedAmt !== null && parsedAmt > 0) {
        const pct = Number(asset.commissionPercent) || 0;
        const fix = Number(asset.commissionFixed) || 0;
        const calcComm = round((parsedAmt * (pct / 100)) + fix, asset.name);
        if (calcComm > 0) {
          commissionAmount = calcComm.toString();
          includeCommission = true;
        }
      }
    }
  }

  return { igtfAmount, includeIgtf, commissionAmount, includeCommission };
}

export function getCurrencyOptions(assets = []) {
  // Si el usuario ya tiene cuentas, solo se ofrecen las monedas/activos que realmente maneja.
  const hasAssets = Array.isArray(assets) && assets.some(a => (a.name || '').trim());
  const list = hasAssets ? [] : ['USD', 'VES', 'EUR', 'USDT'];
  if (Array.isArray(assets)) {
    assets.forEach(a => {
      const c = (a.name || '').toUpperCase().trim();
      if (c && !list.includes(c)) list.push(c);
    });
  }
  return list.map(c => ({ value: c, label: c }));
}

export function sortAssetsByCurrency(assets = [], currentCurrency = '') {
  if (!Array.isArray(assets) || assets.length === 0) return [];
  const cur = (currentCurrency || '').toUpperCase();
  return [...assets].sort((a, b) => {
    const aMatches = (a.name || '').toUpperCase() === cur ? 0 : 1;
    const bMatches = (b.name || '').toUpperCase() === cur ? 0 : 1;
    if (aMatches !== bMatches) return aMatches - bMatches;
    return (a.location || '').localeCompare(b.location || '');
  });
}

export function findMatchingAssetForCurrency(assets = [], transactions = [], targetCurrency = '') {
  if (!Array.isArray(assets) || assets.length === 0) return null;
  const clean = (targetCurrency || '').toUpperCase();
  const lastMatchedTx = Array.isArray(transactions)
    ? transactions.slice().reverse().find(t => (t.currency || '').toUpperCase() === clean && t.assetId && assets.some(a => a.id === t.assetId))
    : null;
  if (lastMatchedTx) {
    const found = assets.find(a => a.id === lastMatchedTx.assetId);
    if (found) return found;
  }
  return assets.find(a => (a.name || '').toUpperCase() === clean) || null;
}

/**
 * Cuentas que manejan la moneda/activo indicado, ordenadas por nombre.
 * Sin moneda elegida devuelve todas (ordenadas igual que sortAssetsByCurrency).
 */
export function filterAssetsByCurrency(assets = [], currentCurrency = '') {
  if (!Array.isArray(assets) || assets.length === 0) return [];
  const cur = (currentCurrency || '').toUpperCase().trim();
  if (!cur) return sortAssetsByCurrency(assets, '');
  return assets
    .filter(a => (a.name || '').toUpperCase().trim() === cur)
    .sort((a, b) => (a.location || '').localeCompare(b.location || ''));
}

/** Saldo que quedará en la cuenta después de guardar el movimiento. */
export function computeNewBalance({ newTx, oldTx, currentBalance }) {
  const parsedEntered = parseAmount(newTx.amount);
  const amountEntered = parsedEntered !== null ? parsedEntered : 0;
  const igtfEntered = (newTx.type === 'spent' && newTx.includeIgtf && newTx.igtfAmount) ? (parseAmount(newTx.igtfAmount) || 0) : 0;
  const commEntered = (newTx.type === 'spent' && newTx.includeCommission && newTx.commissionAmount) ? (parseAmount(newTx.commissionAmount) || 0) : 0;
  const totalDeducted = add(add(amountEntered, igtfEntered), commEntered);

  const isSameAccount = oldTx && (
    (oldTx.assetId && newTx.assetId ? oldTx.assetId === newTx.assetId : false) ||
    ((oldTx.currency || '').toUpperCase() === (newTx.currency || '').toUpperCase() && oldTx.origin === newTx.origin)
  );
  let newBalance = 0;
  if (isSameAccount) {
    const oldAmount = Number(oldTx.amount) || 0;
    if (oldTx.type === 'spent' && newTx.type === 'spent') {
      newBalance = sub(add(currentBalance, oldAmount), totalDeducted);
    } else if (oldTx.type === 'income' && newTx.type === 'income') {
      newBalance = add(sub(currentBalance, oldAmount), amountEntered);
    } else if (oldTx.type === 'spent' && newTx.type === 'income') {
      newBalance = add(add(currentBalance, oldAmount), amountEntered);
    } else {
      newBalance = sub(sub(currentBalance, oldAmount), totalDeducted);
    }
  } else {
    newBalance = newTx.type === 'income' ? add(currentBalance, amountEntered) : sub(currentBalance, totalDeducted);
  }
  return round(newBalance, newTx.currency);
}
