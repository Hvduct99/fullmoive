// components/Pagination.jsx
import Link from 'next/link';

const Pagination = ({ currentPage, basePath, totalItems, itemsPerPage = 24 }) => {
  // If API logic doesn't return totalPage, we assume "Next" is possible if full page
  // But user wants "Previous 1 2 3 4 5 Next" style if possible
  
  // Since we rely on external API that might return total, let's use a window approach
  // Assuming total pages is unknown or we just show a window around current page
  
  const page = currentPage;
  const hasNext = (itemsPerPage && totalItems === itemsPerPage); // If full page, likely has next

  // Generate range of pages to show
  const getPageNumbers = () => {
    const pages = [];
    // Show current page and surrounding pages (e.g. current - 2, current - 1, current, current + 1, current + 2)
    // But ensure we start at 1
    let start = Math.max(1, page - 2);
    let end = start + 4; // Show 5 pages
    
    // Adjust logic if near start
    if (start === 1) {
        end = 5;
    }
    
    for (let i = start; i <= end; i++) {
        // We don't know the max limit easily without API return, so we might optimistically show next few
        // If current page is high, we assume these pages exist
        // But better to only show Next if we know
        if (i <= page) pages.push(i);
        // Only add forward pages if we suspect there are more? 
        // Or just let user click?
        // User asked for "preview 1 2 3 4 5 next"
        // Let's implement a standard window
        if (i > page) pages.push(i);
    }
    return pages;
  };
  
  const pageNumbers = getPageNumbers();

  return (
    <div className="mt-12 flex justify-center items-center gap-2 flex-wrap">
      {/* Previous Button */}
      {page > 1 && (
        <Link 
            href={`${basePath}?page=${page - 1}`}
            className="px-3 py-2 bg-gray-800 hover:bg-primary hover:text-black rounded transition text-sm font-medium"
        >
            Previous
        </Link>
      )}

      {/* Numbered Pages */}
      {pageNumbers.map((num) => (
        <Link
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

      {/* Next Button */}
      {hasNext && (
        <Link 
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
