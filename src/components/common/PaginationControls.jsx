import { useMemo } from 'react';

function PaginationControls({
  currentPage,
  pageSize,
  pageSizeOptions = [5, 10, 15],
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items'
}) {
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    const adjustedStart = Math.max(1, end - 2);
    const pages = [];
    for (let page = adjustedStart; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  }, [currentPage, totalPages]);

  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  return (
    <div className="pagination-controls">
      <div className="pagination-controls__summary">
        <strong>{totalItems}</strong> {itemLabel}
        <span>
          Showing {startItem}-{endItem}
        </span>
      </div>

      <div className="pagination-controls__actions">
        <label className="pagination-controls__page-size">
          <span>Rows</span>
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <div className="pagination-controls__buttons">
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
            Previous
          </button>
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              className={`btn btn-sm ${page === currentPage ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          ))}
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaginationControls;
