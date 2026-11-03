import { useContext, useCallback } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import TransactionsViewHeader from './transactions/TransactionsViewHeader';
import TransactionFilters from './transactions/TransactionFilters';
import TransactionsVirtualList from './transactions/TransactionsVirtualList';
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
  flippedTxId = null,
  setFlippedTxId = () => {},
  rates = {},
  onEdit,
  onOpenReportsModal,
  getCategoryName,
  getSubcategoryName,
  deleteTransactionWithUndo: propDeleteTransactionWithUndo
}) {
  const finance = useContext(FinanceContext);
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

  const handleFlip = useCallback((id) => {
    setFlippedTxId(prev => (prev === id ? null : id));
  }, [setFlippedTxId]);

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
        flippedTxId={flippedTxId}
        onFlip={handleFlip}
        deleteMode={deleteMode}
        selectedTxs={selectedTxs}
        onToggleSelect={toggleSelectTx}
        onEdit={onEdit}
        onDelete={handleDelete}
        getCategoryName={getCategoryName}
        getSubcategoryName={getSubcategoryName}
        categoriesMap={categoriesMap}
        categories={categories}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}
