import { useEffect, useMemo, useState } from 'react';
import PaginationControls from './PaginationControls';

function PaginatedTable({
  items = [],
  columns = [],
  renderRow,
  rowKey,
  emptyText = 'No records found.',
  itemLabel = 'items',
  initialPageSize = 5,
  pageSizeOptions = [5, 10, 15],
  className = '',
  tableClassName = ''
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, page, pageSize]);

  return (
    <div className={`paginated-table ${className}`.trim()}>
      <div className="table-responsive">
        <table className={`table align-middle mb-0 ${tableClassName}`.trim()}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length ? paginatedItems.map((item, index) => renderRow(item, index, rowKey ? rowKey(item) : item.id || index)) : (
              <tr>
                <td colSpan={columns.length}>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalItems ? (
        <PaginationControls
          currentPage={page}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={(nextPage) => setCurrentPage(Math.min(Math.max(1, nextPage), totalPages))}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setCurrentPage(1);
          }}
          itemLabel={itemLabel}
        />
      ) : null}
    </div>
  );
}

export default PaginatedTable;
