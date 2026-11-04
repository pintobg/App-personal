/**
 * Resumen de "Mis cambios": las veces que cambiaste divisas por bolívares (o al revés).
 * La tasa siempre se expresa en Bs. por unidad de la divisa para poder compararlas.
 */
const isVes = (c) => (c || '').toUpperCase() === 'VES';

export function summarizeExchanges(transactions = [], { days = 30, now = new Date() } = {}) {
  const items = [];
  for (const tx of transactions || []) {
    if (!tx || tx.type !== 'transfer') continue;
    const from = (tx.currency || '').toUpperCase();
    const to = (tx.destCurrency || '').toUpperCase();
    if (!from || !to || from === to) continue;
    if (isVes(from) === isVes(to)) continue; // solo cambios que involucran bolívares
    const fromAmount = Number(tx.amount) + (Number(tx.commission) || 0);
    const toAmount = Number(tx.destAmount);
    if (!(fromAmount > 0) || !(toAmount > 0)) continue;

    const direction = isVes(to) ? 'sell' : 'buy';
    const foreign = direction === 'sell' ? from : to;
    const foreignAmount = direction === 'sell' ? fromAmount : toAmount;
    const vesAmount = direction === 'sell' ? toAmount : fromAmount;
    items.push({
      id: tx.id,
      date: tx.date,
      direction,
      foreign,
      foreignAmount,
      vesAmount,
      rate: vesAmount / foreignAmount,
      bcvDiffPct: tx.effectiveRateData?.bcvDiffPct ?? null,
      from: tx.origin || '',
      to: tx.destOrigin || ''
    });
  }
  items.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  const recent = items.filter(i => String(i.date).slice(0, 10) >= sinceStr);

  const total = (direction) => {
    const list = recent.filter(i => i.direction === direction);
    const foreignTotal = list.reduce((s, i) => s + i.foreignAmount, 0);
    const vesTotal = list.reduce((s, i) => s + i.vesAmount, 0);
    return {
      count: list.length,
      foreignTotal,
      vesTotal,
      avgRate: foreignTotal > 0 ? vesTotal / foreignTotal : null
    };
  };

  return { items, recent, sold: total('sell'), bought: total('buy'), days };
}
