import { useState, useEffect, useRef, useCallback } from 'react';
import { syncService } from '../services/syncService';
import { db } from '../services/db';
import {
  duplicateShoppingList,
  updateProductCatalogWithPurchase,
  normalizeSection
} from '../domain/shopping';

export function useShopping(user = null, showToast = null) {
  // 1. Listas de compras
  const [shoppingLists, setShoppingLists] = useState(() => {
    try {
      const saved = localStorage.getItem('personal_shopping_lists');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(l => !l.deleted_at) : [];
    } catch {
      return [];
    }
  });

  // 2. Artículos de las listas
  const [shoppingItems, setShoppingItems] = useState(() => {
    try {
      const saved = localStorage.getItem('personal_shopping_items');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(i => !i.deleted_at) : [];
    } catch {
      return [];
    }
  });

  // 3. Catálogo de productos para autocompletado e historial
  const [shoppingProducts, setShoppingProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('personal_shopping_products');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(p => !p.deleted_at) : [];
    } catch {
      return [];
    }
  });

  const listsRef = useRef(shoppingLists);
  const itemsRef = useRef(shoppingItems);
  const productsRef = useRef(shoppingProducts);

  useEffect(() => { listsRef.current = shoppingLists; }, [shoppingLists]);
  useEffect(() => { itemsRef.current = shoppingItems; }, [shoppingItems]);
  useEffect(() => { productsRef.current = shoppingProducts; }, [shoppingProducts]);

  // Carga inicial asíncrona desde IndexedDB si hay datos guardados
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (db?.shopping_lists) {
          const count = await db.shopping_lists.count();
          if (count > 0 && isMounted) {
            const dbLists = (await db.shopping_lists.toArray()).filter(l => !l.deleted_at);
            const dbItems = (await db.shopping_items.toArray()).filter(i => !i.deleted_at);
            const dbProds = (await db.shopping_products.toArray()).filter(p => !p.deleted_at);
            setShoppingLists(dbLists);
            setShoppingItems(dbItems);
            setShoppingProducts(dbProds);
          }
        }
      } catch (err) {
        console.warn('[useShopping] Fallo leyendo de IndexedDB:', err);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Persistir cambios en localStorage e IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem('personal_shopping_lists', JSON.stringify(shoppingLists));
      if (db?.shopping_lists) {
        db.shopping_lists.bulkPut(shoppingLists).catch(() => {});
      }
    } catch {}
  }, [shoppingLists]);

  useEffect(() => {
    try {
      localStorage.setItem('personal_shopping_items', JSON.stringify(shoppingItems));
      if (db?.shopping_items) {
        db.shopping_items.bulkPut(shoppingItems).catch(() => {});
      }
    } catch {}
  }, [shoppingItems]);

  useEffect(() => {
    try {
      localStorage.setItem('personal_shopping_products', JSON.stringify(shoppingProducts));
      if (db?.shopping_products) {
        db.shopping_products.bulkPut(shoppingProducts).catch(() => {});
      }
    } catch {}
  }, [shoppingProducts]);

  // CREAR LISTA
  const createList = useCallback(({ name, store = '', currency = 'USD', budget = null }) => {
    const nowIso = new Date().toISOString();
    const cleanId = crypto.randomUUID();
    const newList = {
      id: cleanId,
      name: (name || 'Nueva lista').trim(),
      store: (store || '').trim() || null,
      status: 'active',
      currency: (currency || 'USD').toUpperCase(),
      budget: budget != null && budget !== '' && !isNaN(Number(budget)) ? Number(budget) : null,
      transaction_id: null,
      completed_at: null,
      created_at: nowIso,
      updated_at: nowIso
    };

    const nextLists = [newList, ...listsRef.current];
    listsRef.current = nextLists;
    setShoppingLists(nextLists);

    if (user?.id) {
      syncService.queueChange('shopping_lists', 'upsert', newList, user.id);
    }
    if (showToast) showToast('Lista de compras creada');
    return newList;
  }, [user?.id, showToast]);

  // ACTUALIZAR LISTA (renombrar, cambiar tienda, etc.)
  const updateList = useCallback((id, updates) => {
    const nowIso = new Date().toISOString();
    let updatedList = null;

    const nextLists = listsRef.current.map(l => {
      if (l.id === id) {
        updatedList = {
          ...l,
          ...updates,
          updated_at: nowIso
        };
        return updatedList;
      }
      return l;
    });

    if (!updatedList) return null;

    listsRef.current = nextLists;
    setShoppingLists(nextLists);

    if (user?.id) {
      syncService.queueChange('shopping_lists', 'upsert', updatedList, user.id);
    }
    return updatedList;
  }, [user?.id]);

  // ELIMINAR LISTA CON DESHACER (5 SEGUNDOS)
  const deleteListWithUndo = useCallback((id) => {
    const listToDelete = listsRef.current.find(l => l.id === id);
    if (!listToDelete) return;

    const prevLists = [...listsRef.current];
    const prevItems = [...itemsRef.current];
    const nowIso = new Date().toISOString();

    const nextLists = listsRef.current.filter(l => l.id !== id);
    // Eliminar también los ítems de esa lista
    const nextItems = itemsRef.current.filter(i => i.list_id !== id);

    listsRef.current = nextLists;
    itemsRef.current = nextItems;
    setShoppingLists(nextLists);
    setShoppingItems(nextItems);

    if (user?.id) {
      syncService.queueChange('shopping_lists', 'delete', { id, deleted_at: nowIso, updated_at: nowIso }, user.id);
    }

    if (showToast) {
      showToast({
        message: `Lista "${listToDelete.name}" eliminada`,
        undoText: 'Deshacer',
        duration: 5000,
        onUndo: () => {
          listsRef.current = prevLists;
          itemsRef.current = prevItems;
          setShoppingLists(prevLists);
          setShoppingItems(prevItems);

          if (user?.id) {
            syncService.queueChange('shopping_lists', 'upsert', { ...listToDelete, deleted_at: null, updated_at: new Date().toISOString() }, user.id);
            prevItems.filter(i => i.list_id === id).forEach(i => {
              syncService.queueChange('shopping_items', 'upsert', { ...i, deleted_at: null, updated_at: new Date().toISOString() }, user.id);
            });
          }
          if (showToast) showToast('Lista restaurada');
        }
      });
    }
  }, [user?.id, showToast]);

  // DUPLICAR LISTA ("repetir lista de la semana pasada")
  const duplicateList = useCallback((listId) => {
    const origList = listsRef.current.find(l => l.id === listId);
    if (!origList) return null;

    const { newList, newItems } = duplicateShoppingList(origList, itemsRef.current);
    const nextLists = [newList, ...listsRef.current];
    const nextItems = [...newItems, ...itemsRef.current];

    listsRef.current = nextLists;
    itemsRef.current = nextItems;
    setShoppingLists(nextLists);
    setShoppingItems(nextItems);

    if (user?.id) {
      syncService.queueChange('shopping_lists', 'upsert', newList, user.id);
      newItems.forEach(it => {
        syncService.queueChange('shopping_items', 'upsert', it, user.id);
      });
    }

    if (showToast) showToast('Lista duplicada como activa');
    return newList;
  }, [user?.id, showToast]);

  // AGREGAR ARTÍCULO A UNA LISTA
  const addItem = useCallback((listId, itemData) => {
    const nowIso = new Date().toISOString();
    const cleanId = crypto.randomUUID();
    const cleanSection = normalizeSection(itemData.section);

    const newItem = {
      id: cleanId,
      list_id: listId,
      product_id: itemData.product_id || null,
      name: (itemData.name || '').trim(),
      quantity: Number(itemData.quantity) > 0 ? Number(itemData.quantity) : 1,
      unit: itemData.unit || 'und',
      estimated_price: Number(itemData.estimated_price) || 0,
      price_currency: (itemData.price_currency || 'USD').toUpperCase(),
      actual_price: itemData.actual_price != null && itemData.actual_price !== '' ? Number(itemData.actual_price) : null,
      is_checked: Boolean(itemData.is_checked),
      sort_order: itemsRef.current.filter(i => i.list_id === listId).length,
      section: cleanSection,
      created_at: nowIso,
      updated_at: nowIso
    };

    const nextItems = [...itemsRef.current, newItem];
    itemsRef.current = nextItems;
    setShoppingItems(nextItems);

    if (user?.id) {
      syncService.queueChange('shopping_items', 'upsert', newItem, user.id);
    }
    return newItem;
  }, [user?.id]);

  // ACTUALIZAR ARTÍCULO
  const updateItem = useCallback((id, updates) => {
    const nowIso = new Date().toISOString();
    let updatedItem = null;

    const nextItems = itemsRef.current.map(it => {
      if (it.id === id) {
        updatedItem = {
          ...it,
          ...updates,
          updated_at: nowIso
        };
        return updatedItem;
      }
      return it;
    });

    if (!updatedItem) return null;

    itemsRef.current = nextItems;
    setShoppingItems(nextItems);

    if (user?.id) {
      syncService.queueChange('shopping_items', 'upsert', updatedItem, user.id);
    }
    return updatedItem;
  }, [user?.id]);

  // TOGGLE CHECK DE UN ARTÍCULO
  const toggleItemCheck = useCallback((id, actualPrice = null) => {
    const existing = itemsRef.current.find(it => it.id === id);
    if (!existing) return null;

    const nextChecked = !existing.is_checked;
    const updates = {
      is_checked: nextChecked
    };

    if (actualPrice != null && actualPrice !== '') {
      updates.actual_price = Number(actualPrice);
    } else if (nextChecked && existing.actual_price == null) {
      // Si se marca por primera vez y no tiene actual_price, sugiere el estimated_price
      updates.actual_price = existing.estimated_price;
    }

    return updateItem(id, updates);
  }, [updateItem]);

  // ELIMINAR ARTÍCULO
  const deleteItem = useCallback((id) => {
    const existing = itemsRef.current.find(it => it.id === id);
    if (!existing) return;

    const nowIso = new Date().toISOString();
    const nextItems = itemsRef.current.filter(it => it.id !== id);
    itemsRef.current = nextItems;
    setShoppingItems(nextItems);

    if (user?.id) {
      syncService.queueChange('shopping_items', 'delete', { id, deleted_at: nowIso, updated_at: nowIso }, user.id);
    }
  }, [user?.id]);

  // COMPLETAR LISTA CON COMPRA REGISTRADA
  const completeListPurchase = useCallback((listId, transactionId) => {
    const list = listsRef.current.find(l => l.id === listId);
    if (!list) return;

    const nowIso = new Date().toISOString();
    const updatedList = {
      ...list,
      status: 'done',
      completed_at: nowIso,
      transaction_id: transactionId,
      updated_at: nowIso
    };

    const nextLists = listsRef.current.map(l => l.id === listId ? updatedList : l);
    listsRef.current = nextLists;
    setShoppingLists(nextLists);

    if (user?.id) {
      syncService.queueChange('shopping_lists', 'upsert', updatedList, user.id);
    }

    // Actualizar catálogo de productos con precios reales de esta compra
    const listPurchasedItems = itemsRef.current.filter(i => i.list_id === listId && !i.deleted_at && i.is_checked);
    const updatedProducts = updateProductCatalogWithPurchase(
      productsRef.current,
      listPurchasedItems,
      list.currency,
      listId
    );

    productsRef.current = updatedProducts;
    setShoppingProducts(updatedProducts);

    if (user?.id) {
      updatedProducts.forEach(p => {
        syncService.queueChange('shopping_products', 'upsert', p, user.id);
      });
    }

    if (showToast) showToast('¡Compra registrada y lista completada!');
  }, [user?.id, showToast]);

  // AUTOCOMPLETADO DE PRODUCTOS
  const searchProducts = useCallback((query) => {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    return productsRef.current
      .filter(p => p.name && p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, []);

  return {
    shoppingLists,
    setShoppingLists,
    shoppingItems,
    setShoppingItems,
    shoppingProducts,
    setShoppingProducts,
    createList,
    updateList,
    deleteListWithUndo,
    duplicateList,
    addItem,
    updateItem,
    toggleItemCheck,
    deleteItem,
    completeListPurchase,
    searchProducts
  };
}
