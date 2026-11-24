// components/Pagination.jsx
import Link from 'next/link';

/**
 * totalPages (nếu có) quyết định chính xác có trang sau hay không.
 * Không có totalPages → đoán theo "trang đầy" như trước.
 */
const Pagination = ({ currentPage, basePath, totalItems, itemsPerPage = 24, totalPages }) => {
  const page = currentPage;
  const known = Number.isFinite(totalPages) && totalPages > 0;
  const hasNext = known ? page < totalPages : totalItems === itemsPerPage;
  const last = known ? totalPages : page + (hasNext ? 2 : 0);

  let start = Math.max(1, page - 2);
  let end = Math.min(last, start + 4);
  start = Math.max(1, Math.min(start, end - 4));
  const pageNumbers = [];
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  if (pageNumbers.length <= 1 && !hasNext && page === 1) return null;

  return (
    <div className="mt-12 flex justify-center items-center gap-2 flex-wrap">
      {page > 1 && (
        <Link prefetch={false}
          href={`${basePath}?page=${page - 1}`}
          className="px-3 py-2 bg-gray-800 hover:bg-primary hover:text-black rounded transition text-sm font-medium"
        >
          Previous
        </Link>
      )}

      {pageNumbers.map((num) => (
        <Link prefetch={false}
          key={num}
          href={`${basePath}?page=${num}`}
          className={`px-3 py-2 rounded transition text-sm font-bold ${
            page === num
              ? 'bg-primary text-black'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {num}
        </Link>
      ))}

      {hasNext && (
        <Link prefetch={false}
          href={`${basePath}?page=${page + 1}`}
          className="px-3 py-2 bg-gray-800 hover:bg-primary hover:text-black rounded transition text-sm font-medium"
        >
          Next
        </Link>
      )}
    </div>
  );
};

export default Pagination;
