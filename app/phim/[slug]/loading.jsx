export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Poster skeleton */}
        <div className="w-full md:w-1/3 lg:w-1/4">
          <div className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse"></div>
        </div>
        {/* Info skeleton */}
        <div className="flex-1 space-y-4">
          <div className="h-8 bg-gray-700/50 rounded w-3/4 animate-pulse"></div>
          <div className="h-6 bg-gray-700/50 rounded w-1/2 animate-pulse"></div>
          <div className="flex gap-2 mt-4">
            <div className="h-8 bg-gray-700/50 rounded w-20 animate-pulse"></div>
            <div className="h-8 bg-gray-700/50 rounded w-20 animate-pulse"></div>
            <div className="h-8 bg-gray-700/50 rounded w-20 animate-pulse"></div>
          </div>
          <div className="space-y-2 mt-6">
            <div className="h-4 bg-gray-700/50 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-700/50 rounded w-5/6 animate-pulse"></div>
            <div className="h-4 bg-gray-700/50 rounded w-4/6 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
