import { useContext, useCallback, useMemo, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import TransactionsViewHeader from './transactions/TransactionsViewHeader';
import TransactionFilters from './transactions/TransactionFilters';
import TransactionsVirtualList from './transactions/TransactionsVirtualList';
import TransactionActionSheet from './transactions/TransactionActionSheet';
import { useTransactionFiltering } from './transactions/useTransactionFiltering';

export default function TransactionsView({
  transactions = [],
  assets = [],
  txFilter = 'all',
  setTxFilter = () => {},
  deleteMode = false,
  setDeleteMode = () => {},
  selectedTxs = [],
  toggleSelectTx = () => {},
  actionTxId: actionTxIdProp = null,
  setActionTxId: setActionTxIdProp,
  rates = {},
  onEdit,
  onRepeat,
  onOpenReportsModal,
  getCategoryName,
  getSubcategoryName,
  deleteTransactionWithUndo: propDeleteTransactionWithUndo
}) {
  const finance = useContext(FinanceContext);
  // La hoja de acciones puede controlarse desde fuera (botón atrás de Android) o localmente.
  const [localActionTxId, setLocalActionTxId] = useState(null);
  const actionTxId = setActionTxIdProp ? actionTxIdProp : localActionTxId;
  const setActionTxId = setActionTxIdProp || setLocalActionTxId;
  const handleDeleteWithUndo = propDeleteTransactionWithUndo || finance?.deleteTransactionWithUndo;
  const categoriesMap = finance?.categoriesMap;
  const categories = finance?.categories || [];

  const {
    searchQuery,
    setSearchQuery,
    dateRangeFilter,
    setDateRangeFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    accountFilter,
    setAccountFilter,
    categoryFilter,
    setCategoryFilter,
    currencyFilter,
    setCurrencyFilter,
    dateOptions,
    accountOptions,
    categoryOptions,
    currencyOptions,
    exchangeMonthStats,
    filteredTransactions,
    filteredTotals,
    hasActiveFilters,
    handleClearFilters
  } = useTransactionFiltering({
    transactions,
    assets,
    rates,
    txFilter,
    setTxFilter,
    getCategoryName,
    getSubcategoryName
  });

  const handleOpenActions = useCallback((tx) => {
    setActionTxId(tx?.id || null);
  }, [setActionTxId]);

  const actionTx = useMemo(
    () => (actionTxId ? transactions.find(t => t.id === actionTxId) || null : null),
    [actionTxId, transactions]
  );

  const handleDelete = useCallback((tx) => {
    handleDeleteWithUndo?.(tx);
  }, [handleDeleteWithUndo]);

  return (
    <div className="view-container" style={{ padding: '0 1rem', marginTop: '2rem' }}>
      {/* Encabezado y pestañas de tipo */}
      <TransactionsViewHeader
        txFilter={txFilter}
        setTxFilter={setTxFilter}
        deleteMode={deleteMode}
        setDeleteMode={setDeleteMode}
        selectedCount={selectedTxs.length}
        onOpenReportsModal={onOpenReportsModal}
        exchangeMonthStats={exchangeMonthStats}
        hasActiveFilters={hasActiveFilters}
        filteredCount={filteredTransactions.length}
        onClearFilters={handleClearFilters}
      />

      {/* Buscador, selectores y totales */}
      <TransactionFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateRangeFilter={dateRangeFilter}
        setDateRangeFilter={setDateRangeFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        accountFilter={accountFilter}
        setAccountFilter={setAccountFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        currencyFilter={currencyFilter}
        setCurrencyFilter={setCurrencyFilter}
        txFilter={txFilter}
        setTxFilter={setTxFilter}
        dateOptions={dateOptions}
        accountOptions={accountOptions}
        categoryOptions={categoryOptions}
        currencyOptions={currencyOptions}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        filteredTotals={filteredTotals}
        getCategoryName={getCategoryName}
      />

      {/* Lista virtualizada de transacciones con filas memoizadas */}
      <TransactionsVirtualList
        transactions={filteredTransactions}
        rates={rates}
        onOpenActions={handleOpenActions}
        deleteMode={deleteMode}
        selectedTxs={selectedTxs}
        onToggleSelect={toggleSelectTx}
        onClearFilters={handleClearFilters}
        getCategoryName={getCategoryName}
        getSubcategoryName={getSubcategoryName}
        categoriesMap={categoriesMap}
        categories={categories}
        hasActiveFilters={hasActiveFilters}
      />

      {actionTx && !deleteMode && (
        <TransactionActionSheet
          tx={actionTx}
          rates={rates}
          onClose={() => setActionTxId(null)}
          onEdit={onEdit}
          onRepeat={onRepeat}
          onDelete={handleDelete}
          getCategoryName={getCategoryName}
          getSubcategoryName={getSubcategoryName}
        />
      )}
    </div>
  );
}
