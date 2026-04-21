import { useEffect, useMemo, useState } from 'react';
import PaginationControls from './PaginationControls';

function PaginatedCardList({
  items = [],
  renderItem,
  itemLabel = 'items',
  initialPageSize = 5,
  pageSizeOptions = [5, 10, 15],
  className = '',
  emptyState = null
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
    <div className={`paginated-card-list ${className}`.trim()}>
      {paginatedItems.length ? paginatedItems.map((item, index) => renderItem(item, index)) : emptyState}
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

export default PaginatedCardList;
