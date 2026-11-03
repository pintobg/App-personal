import { parseAmount, round } from '../../../domain/money';

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
