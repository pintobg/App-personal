import { useState, useEffect, useRef } from 'react';
import { syncService } from '../services/syncService';
import { add, round } from '../domain/money';

export function useAssets(user = null) {
  const [assets, setAssets] = useState(() => {
    const saved = localStorage.getItem('personal_assets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const assetsRef = useRef(assets);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('personal_assets', JSON.stringify(assets));
  }, [assets]);

  const addAsset = (asset) => {
    const nowIso = new Date().toISOString();
    const roundedAmount = round(asset.amount, asset.name);
    const newAsset = {
      ...asset,
      id: asset.id || crypto.randomUUID(),
      initialAmount: asset.initialAmount != null ? round(asset.initialAmount, asset.name) : roundedAmount,
      amount: roundedAmount,
      updated_at: nowIso
    };
    const nextList = [...assetsRef.current, newAsset];
    assetsRef.current = nextList;
    setAssets(nextList);

    if (user?.id) {
      syncService.queueChange('assets', 'upsert', newAsset, user.id);
    }
    return newAsset;
  };

  const deleteAsset = (id) => {
    const existing = assetsRef.current.find(a => a.id === id);
    const nowIso = new Date().toISOString();
    const nextList = assetsRef.current.filter(a => a.id !== id);
    assetsRef.current = nextList;
    setAssets(nextList);

    if (user?.id) {
      syncService.queueChange('assets', 'delete', { id, deleted_at: nowIso, updated_at: nowIso, ...existing }, user.id);
    }
  };

  const updateAssetBalance = (assetId, amountDelta) => {
    const nowIso = new Date().toISOString();
    const currentList = assetsRef.current;
    const existingAssetIndex = currentList.findIndex(a => a.id === assetId);

    if (existingAssetIndex >= 0) {
      const targetAsset = currentList[existingAssetIndex];
      const newAmount = round(add(targetAsset.amount, amountDelta), targetAsset.name);
      const updated = {
        ...targetAsset,
        amount: newAmount,
        updated_at: nowIso
      };
      const nextList = [...currentList];
      nextList[existingAssetIndex] = updated;

      assetsRef.current = nextList;
      setAssets(nextList);

      if (user?.id) {
        syncService.queueChange('assets', 'upsert', updated, user.id);
      }
      return updated;
    }
    // Si la cuenta no existe, retorna null
    return null;
  };

  return { assets, setAssets, addAsset, deleteAsset, updateAssetBalance };
}
