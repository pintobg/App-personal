import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';
import { generateTestData } from '../utils/testData';

export function useAssets(user = null) {
  const [assets, setAssets] = useState(() => {
    const saved = localStorage.getItem('personal_assets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return generateTestData().assets;
      }
    }
    return generateTestData().assets;
  });

  useEffect(() => {
    localStorage.setItem('personal_assets', JSON.stringify(assets));
  }, [assets]);

  const addAsset = (asset) => {
    const newAsset = { ...asset, id: asset.id || crypto.randomUUID() };
    setAssets(prev => [...prev, newAsset]);
    if (user?.id) {
      syncService.queueChange('assets', 'upsert', newAsset, user.id);
    }
    return newAsset;
  };

  const deleteAsset = (id) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    if (user?.id) {
      syncService.queueChange('assets', 'delete', { id }, user.id);
    }
  };

  const updateAssetBalance = (name, location, amountDelta) => {
    setAssets(prevAssets => {
      const existingAssetIndex = prevAssets.findIndex(a => a.name === name && a.location === location);

      if (existingAssetIndex >= 0) {
        const newAssets = [...prevAssets];
        const updated = {
          ...newAssets[existingAssetIndex],
          amount: Number(newAssets[existingAssetIndex].amount) + Number(amountDelta)
        };
        newAssets[existingAssetIndex] = updated;
        if (user?.id) {
          syncService.queueChange('assets', 'upsert', updated, user.id);
        }
        return newAssets;
      } else {
        if (amountDelta > 0) {
          const created = { id: crypto.randomUUID(), name, type: 'fiat', amount: Number(amountDelta), location };
          if (user?.id) {
            syncService.queueChange('assets', 'upsert', created, user.id);
          }
          return [...prevAssets, created];
        }
        return prevAssets;
      }
    });
  };

  return { assets, setAssets, addAsset, deleteAsset, updateAssetBalance };
}
