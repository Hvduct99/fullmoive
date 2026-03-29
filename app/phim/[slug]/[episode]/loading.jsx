export default function Loading() {
  return (
    <div className="container mx-auto px-0 md:px-4 py-4">
      <div className="bg-[#111] p-4 rounded-xl">
        {/* Title skeleton */}
        <div className="mb-4">
          <div className="h-8 bg-gray-700/50 rounded w-3/4 mb-2 animate-pulse"></div>
          <div className="h-6 bg-gray-700/50 rounded w-1/2 animate-pulse"></div>
        </div>

        {/* Player skeleton */}
        <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-800 mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Episode list skeleton */}
        <div className="bg-[#1a1a1a] p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
            <div className="h-6 bg-gray-700/50 rounded w-1/4 animate-pulse"></div>
            <div className="h-4 bg-gray-700/50 rounded w-16 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-700/50 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
