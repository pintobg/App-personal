import { useState, useEffect, useRef } from 'react';
import { syncService } from '../services/syncService';

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
    const newAsset = { ...asset, id: asset.id || crypto.randomUUID(), updated_at: nowIso };
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

  const updateAssetBalance = (name, location, amountDelta) => {
    const nowIso = new Date().toISOString();
    const currentList = assetsRef.current;
    const existingAssetIndex = currentList.findIndex(a => a.name === name && a.location === location);

    if (existingAssetIndex >= 0) {
      const updated = {
        ...currentList[existingAssetIndex],
        amount: Number(currentList[existingAssetIndex].amount) + Number(amountDelta),
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
    } else {
      if (amountDelta > 0) {
        const created = { id: crypto.randomUUID(), name, type: 'fiat', amount: Number(amountDelta), location, updated_at: nowIso };
        const nextList = [...currentList, created];

        assetsRef.current = nextList;
        setAssets(nextList);

        if (user?.id) {
          syncService.queueChange('assets', 'upsert', created, user.id);
        }
        return created;
      }
      return null;
    }
  };

  return { assets, setAssets, addAsset, deleteAsset, updateAssetBalance };
}
