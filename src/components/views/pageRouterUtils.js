import { convertForPayment } from '../../domain/money';

export function prepareObligationPaymentData(ob, assets, rates, veRates) {
  const isIndexedToBs = Boolean(ob.payInBs);
  const vesAccount = assets.find(a => (a.name || '').toUpperCase() === 'VES');
  const targetAsset = (isIndexedToBs && vesAccount) ? vesAccount : null;
  const chosenRateType = ob.indexRateType || ((ob.currency || '').toUpperCase() === 'EUR' ? 'EUR' : 'BCV_USD');

  let initialAmountStr = ob.amount.toString();
  if (isIndexedToBs && targetAsset) {
    let activeVeRate = null;
    if (chosenRateType === 'PARALELO') activeVeRate = veRates?.paralelo;
    else if (chosenRateType === 'BCV_EUR' || chosenRateType === 'EUR') activeVeRate = veRates?.bcvEur || veRates?.bcvUsd;
    else activeVeRate = veRates?.bcvUsd || rates?.bcvUsd || rates?.VES;

    const converted = convertForPayment(
      ob.amount,
      ob.currency,
      'VES',
      { ...rates, ...veRates },
      activeVeRate
    );
    if (converted != null) initialAmountStr = converted.toString();
  }

  return {
    assetId: targetAsset ? targetAsset.id : '',
    actualAmount: initialAmountStr,
    rateType: chosenRateType,
    customRate: ''
  };
}
