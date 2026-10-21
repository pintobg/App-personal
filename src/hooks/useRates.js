/**
 * useRates.js
 * Adaptador de compatibilidad que reexporta useExchangeRates y constantes asociadas.
 */
import { useExchangeRates } from './useExchangeRates';
export { useExchangeRates };
export { KNOWN_FIAT_CURRENCIES, DEFAULT_BINANCE_CRYPTOS } from '../services/ratesService';

export function useRates(assets = []) {
  return useExchangeRates(assets);
}

export default useRates;
