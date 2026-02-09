export const fetchMovies = async (section) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  
  try {
    const res = await fetch(`${API_URL}/api/home?section=${section}`, {
        next: { revalidate: 60 }, // Revalidate every 60 seconds
        headers: {
          'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
       console.warn(`Fetch failed for section ${section}: ${res.status}`);
       return [];
    }
    
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.warn(`Error fetching ${section}:`, error.message);
    return [];
  }
};

export const fetchMovieDetail = async (slug) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  
  try {
    const res = await fetch(`${API_URL}/api/movie/${slug}`, { 
      cache: 'no-store' 
    });
    
    if (!res.ok) return null;
    const json = await res.json();
    return json.movie;
  } catch (error) {
    console.error('Error fetching movie detail:', error);
    return null;
  }
};
