import React from "react";
import "../styles/tabs.css";

const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 12,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // number of pages around current page

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (
        (i === currentPage - delta - 1 && i > 1) ||
        (i === currentPage + delta + 1 && i < totalPages)
      ) {
        pages.push("...");
      }
    }

    // Deduplicate consecutive ellipses
    return pages.filter((item, index) => item !== "..." || pages[index - 1] !== "...");
  };

  const pages = getPageNumbers();

  const handlePageClick = (page) => {
    if (page === "..." || page === currentPage) return;
    onPageChange(page);
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  return (
    <div className="pagination-container" style={{ animation: "fadeIn 0.3s ease" }}>
      <div className="pagination-info">
        Showing <strong>{startItem}</strong> – <strong>{endItem}</strong> of <strong>{totalItems}</strong> opportunities
      </div>

      <div className="pagination-controls">
        {/* Previous Button */}
        <button
          type="button"
          className="pagination-btn pagination-nav"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous Page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Previous</span>
        </button>

        {/* Page Numbers */}
        <div className="pagination-numbers">
          {pages.map((page, idx) => {
            if (page === "...") {
              return (
                <span key={`dots-${idx}`} className="pagination-dots">
                  &hellip;
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={`page-${page}`}
                type="button"
                className={`pagination-number ${isActive ? "active" : ""}`}
                onClick={() => handlePageClick(page)}
                aria-current={isActive ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          className="pagination-btn pagination-nav"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next Page"
        >
          <span>Next</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
