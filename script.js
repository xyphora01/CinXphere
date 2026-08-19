// =========================================================================
// CINXPHERE ENGINE - CORE LOGIC & API SYSTEM
// =========================================================================

const API_KEY = "663865dfa7771571f4edddf76b8e370c"; // <-- INSERT YOUR ACTIVE TMDB API KEY HERE
const BASE_URL = "https://api.tmdb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p/original";
const THUMB_URL = "https://image.tmdb.org/t/p/w500";

// Global local state to manage active details and bookmarks
let moviesInMemory = [];
let myList = [];
try { myList = JSON.parse(localStorage.getItem("cinxphere_mylist")) || []; } catch (e) { }

// Featured hero state (pool of candidates to cycle through)
let featuredItems = [];
let featuredIndex = 0;

// Pagination State for Infinite Scroll
let searchPage = 1;
let currentSearchQuery = "";
let hasMorePages = true;
let activeTab = "home"; // "home", "movies", "tv", "mylist"

// Target DOM Nodes
const searchInput = document.getElementById("search");
const headerNavbar = document.getElementById("navbar");
const mainContentWrapper = document.getElementById("category-rows");
const searchSection = document.getElementById("search-section");
const searchGrid = document.getElementById("search-grid");
const heroSection = document.getElementById("heroBanner");
const paginationControls = document.getElementById("pagination-controls");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageIndicator = document.getElementById("pageIndicator");

const detailSection = document.getElementById("detail-section");
const detailBackdrop = document.getElementById("detailBackdrop");
const detailPoster = document.getElementById("detailPoster");
const detailTitle = document.getElementById("detailTitle");
const detailOverview = document.getElementById("detailOverview");
const detailRating = document.getElementById("detailRating");
const detailDate = document.getElementById("detailDate");
const detailStreamBtn = document.getElementById("detailStreamBtn");
const detailTrailerBtn = document.getElementById("detailTrailerBtn");
const detailSaveBtn = document.getElementById("detailSaveBtn");
const detailTVSeasons = document.getElementById("detailTVSeasons");
const detailSeasonSelector = document.getElementById("detailSeasonSelector");
const detailEpisodesGrid = document.getElementById("detailEpisodesGrid");
const detailVideoContainer = document.getElementById("detailVideoContainer");
const backToBrowseBtn = document.getElementById("backToBrowseBtn");

// ==========================================
// BOOTSTRAP INITIALIZATION
// ==========================================

async function init() {
    setupNavbarScroll();
    setupLogoEvent();
    setupNavMenuEvents();
    setupPagination();
    setupChangeFeaturedBtn();

    // Load default home screen configuration
    await loadHomeScreen();
}

// ==========================================
// SKELETON LOADER MANAGERS
// ==========================================

function buildSkeletonRowHTML(title) {
    return `
        <section class="movie-section">
            <h2>${title}</h2>
            <div class="carousel-container">
                <div class="movie-row">
                    ${Array(12).fill(`<div class="skeleton skeleton-card"></div>`).join("")}
                </div>
            </div>
        </section>
    `;
}

function showSkeletonsOnGrid() {
    searchGrid.innerHTML = Array(24).fill(`<div class="skeleton skeleton-card"></div>`).join("");
}

// ==========================================
// DYNAMIC NAVIGATION TABS (HOME, MOVIES, TV)
// ==========================================

async function loadHomeScreen() {
    activeTab = "home";
    mainContentWrapper.innerHTML = `
        ${buildSkeletonRowHTML("🔥 Popular on CinXphere")}
        ${buildSkeletonRowHTML("🎥 Hindi Blockbusters")}
        ${buildSkeletonRowHTML("🎬 Hollywood Hits")}
        ${buildSkeletonRowHTML("💎 Korean Gems")}
        ${buildSkeletonRowHTML("📺 Web Series")}
        ${buildSkeletonRowHTML("⚡️ South Movies")}
        ${buildSkeletonRowHTML("😂 Comedy Club")}
        ${buildSkeletonRowHTML("🧸 Animated Shows")}
        ${buildSkeletonRowHTML("💕 Romantic Escapes")}
        ${buildSkeletonRowHTML("👻 Horror: Fear Unleashed")}
        ${buildSkeletonRowHTML("🎗️ Famous K-Dramas")}
        ${buildSkeletonRowHTML("🥊 Action Arena")}
        ${buildSkeletonRowHTML("⚔️ Anime")}
        ${buildSkeletonRowHTML("⭐ Top Rated Movies")}
        ${buildSkeletonRowHTML("💥 Blockbuster Hits")}
        ${buildSkeletonRowHTML("🔍 Mystery")}
        ${buildSkeletonRowHTML("🏆 All Time Hits")}
        ${buildSkeletonRowHTML("🎵 Old Golds")}
    `;

    try {
        const response = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`);
        const data = await response.json();
        const items = data.results;

        cacheMovies(items);

        // Build featured pool from top candidates and pick a random starting position
        featuredItems = items.filter(item => item.backdrop_path).slice(0, 12);
        featuredIndex = Math.floor(Math.random() * featuredItems.length);
        if (featuredItems.length > 0) {
            populateHero(featuredItems[featuredIndex]);
        }

        mainContentWrapper.innerHTML = ""; // Clear skeletons
        // Sequence order per user spec (numbers 1–17, then Old Golds)
        createSectionRow("🔥 Popular on CinXphere", "/trending/all/week");                                                                              // 1
        createSectionRow("🎥 Hindi Blockbusters", "/discover/movie", "movie", "&with_original_language=hi&with_genres=28&sort_by=revenue.desc");       // 2
        createSectionRow("🎬 Hollywood Hits", "/discover/movie", "movie", "&with_original_language=en&sort_by=popularity.desc&without_genres=16");       // 3
        createSectionRow("💎 Korean Gems", "/discover/movie", "movie", "&with_original_language=ko&sort_by=vote_average.desc&vote_count.gte=200");       // 4
        createSectionRow("📺 Web Series", "/discover/tv", "tv", "&with_type=4|6&sort_by=popularity.desc");                                              // 5
        createSectionRow("⚡️ South Movies", "/discover/movie", "movie", "&with_original_language=ta|te|kn|ml&sort_by=popularity.desc");                  // 6
        createSectionRow("😂 Comedy Club", "/discover/movie", "movie", "&with_genres=35&sort_by=popularity.desc");                                       // 7
        createSectionRow("🧸 Animated Shows", "/discover/tv", "tv", "&with_genres=16&sort_by=popularity.desc");                                         // 8
        createSectionRow("💕 Romantic Escapes", "/discover/movie", "movie", "&with_genres=10749&sort_by=popularity.desc");                              // 9
        createSectionRow("👻 Horror: Fear Unleashed", "/discover/movie", "movie", "&with_genres=27&sort_by=popularity.desc");                           // 10
        createSectionRow("🎗️ Famous K-Dramas", "/discover/tv", "tv", "&with_original_language=ko&sort_by=popularity.desc");                            // 11
        createSectionRow("🥊 Action Arena", "/discover/movie", "movie", "&with_genres=28&sort_by=popularity.desc");                                     // 12
        createSectionRow("⚔️ Anime", "/discover/tv", "tv", "&with_genres=16&with_original_language=ja&sort_by=popularity.desc");                        // 13
        createSectionRow("⭐ Top Rated Movies", "/movie/top_rated", "movie");                                                                            // 14
        createSectionRow("💥 Blockbuster Hits", "/discover/movie", "movie", "&with_genres=28&vote_count.gte=1000&sort_by=revenue.desc");                // 15
        createSectionRow("🔍 Mystery", "/discover/movie", "movie", "&with_genres=9648&sort_by=popularity.desc");                                        // 16
        createSectionRow("🏆 All Time Hits", "/movie/top_rated", "movie", "&vote_count.gte=5000&sort_by=vote_average.desc");                            // 17
        createSectionRow("🎵 Old Golds", "/discover/movie", "movie", "&with_original_language=hi&primary_release_date.lte=1995-12-31&sort_by=popularity.desc&vote_count.gte=30"); // 18
    } catch (err) {
        console.error("Home loading error: ", err);
    }
}

async function loadMoviesScreen() {
    activeTab = "movies";
    mainContentWrapper.innerHTML = `
        ${buildSkeletonRowHTML("🎬 Popular Movies")}
        ${buildSkeletonRowHTML("🍿 Now Playing")}
        ${buildSkeletonRowHTML("⭐ Top Rated Movies")}
    `;

    try {
        const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`);
        const data = await response.json();
        // Repopulate featured pool for Movies tab
        featuredItems = (data.results || []).filter(item => item.backdrop_path).slice(0, 12);
        featuredIndex = 0;
        if (featuredItems.length > 0) {
            populateHero(featuredItems[featuredIndex]);
        }
        mainContentWrapper.innerHTML = "";
        createSectionRow("🎬 Popular Movies", "/movie/popular", "movie");
        createSectionRow("🍿 Now Playing", "/movie/now_playing", "movie");
        createSectionRow("⭐ Top Rated Movies", "/movie/top_rated", "movie");
    } catch (err) {
        console.error("Movies loading error: ", err);
    }
}

async function loadTVScreen() {
    activeTab = "tv";
    mainContentWrapper.innerHTML = `
        ${buildSkeletonRowHTML("📺 Popular TV Shows")}
        ${buildSkeletonRowHTML("🌟 Top Rated TV Shows")}
        ${buildSkeletonRowHTML("🔥 On The Air")}
    `;

    try {
        const response = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`);
        const data = await response.json();
        // Repopulate featured pool for TV tab
        featuredItems = (data.results || []).filter(item => item.backdrop_path).slice(0, 12);
        featuredIndex = 0;
        if (featuredItems.length > 0) {
            populateHero(featuredItems[featuredIndex]);
        }
        mainContentWrapper.innerHTML = "";
        createSectionRow("📺 Popular TV Shows", "/tv/popular", "tv");
        createSectionRow("🌟 Top Rated TV Shows", "/tv/top_rated", "tv");
        createSectionRow("🔥 On The Air", "/tv/on_the_air", "tv");
    } catch (err) {
        console.error("TV loading error: ", err);
    }
}

// Generic Row Assembler
async function createSectionRow(title, endpoint, fallbackType = "movie", queryParams = "") {
    const section = document.createElement("section");
    section.className = "movie-section";
    section.innerHTML = `
        <h2>${title}</h2>
        <div class="carousel-container">
            <button class="carousel-btn left-btn" style="display: none;"><i class="fa-solid fa-chevron-left"></i></button>
            <div class="movie-row"></div>
            <button class="carousel-btn right-btn"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
    `;
    mainContentWrapper.appendChild(section);
    const rowContainer = section.querySelector(".movie-row");
    const leftBtn = section.querySelector(".left-btn");
    const rightBtn = section.querySelector(".right-btn");

    try {
        const res = await fetch(`${BASE_URL}${endpoint}?api_key=${API_KEY}${queryParams}`);
        const data = await res.json();
        const results = data.results || [];
        cacheMovies(results);

        rowContainer.innerHTML = "";
        results.forEach(item => {
            rowContainer.insertAdjacentHTML("beforeend", buildCardHTML(item, item.media_type || fallbackType));
        });

        const scrollAmount = 800;

        rowContainer.addEventListener('scroll', () => {
            if (rowContainer.scrollLeft > 20) {
                leftBtn.style.display = 'block';
            } else {
                leftBtn.style.display = 'none';
            }
        });

        rightBtn.addEventListener('click', () => {
            rowContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            setTimeout(() => {
                if (rowContainer.scrollLeft + rowContainer.clientWidth >= rowContainer.scrollWidth - 15) {
                    const firstCard = rowContainer.firstElementChild;
                    if (firstCard) {
                        rowContainer.appendChild(firstCard);
                        rowContainer.scrollBy({ left: -(firstCard.clientWidth + 15), behavior: 'instant' });
                    }
                }
            }, 350);
        });

        leftBtn.addEventListener('click', () => {
            rowContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });

    } catch (err) {
        rowContainer.innerHTML = `<p style="color: var(--text-muted);">Failed to load catalog assets.</p>`;
    }
}

// ==========================================
// DATA INGESTION & UI RENDERING
// ==========================================

function cacheMovies(movies) {
    movies.forEach(item => {
        if (!moviesInMemory.some(cached => cached.id === item.id)) {
            moviesInMemory.push(item);
        }
    });
}

function populateHero(movie) {
    if (!heroSection || !movie) return;

    const backdropUrl = movie.backdrop_path ? `${IMAGE_URL}${movie.backdrop_path}` : "";
    heroSection.style.backgroundImage = backdropUrl ? `url('${backdropUrl}')` : "none";

    const titleNode = document.getElementById("heroTitle");
    const overviewNode = document.getElementById("heroOverview");

    if (titleNode) titleNode.textContent = movie.title || movie.name;
    if (overviewNode) overviewNode.textContent = truncateString(movie.overview, 160);

    const playBtn = document.getElementById("heroPlayBtn");
    const infoBtn = document.getElementById("heroInfoBtn");
    const mediaType = movie.title ? "movie" : "tv";

    if (playBtn) playBtn.onclick = () => {
        loadDetailScreen(movie.id, mediaType);
        // Give the detail section time to render, then auto-start the stream
        setTimeout(() => triggerStreamInterface(movie.id, mediaType), 150);
    };
    if (infoBtn) infoBtn.onclick = () => loadDetailScreen(movie.id, mediaType);
}

function buildCardHTML(item, mediaType = "movie") {
    const title = item.title || item.name;
    const thumbnail = item.poster_path ? `${THUMB_URL}${item.poster_path}` : "https://via.placeholder.com/500x750?text=Poster+Unavailable";
    const actualType = item.media_type || mediaType;

    const rawDate = item.release_date || item.first_air_date;
    const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A";
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "NR";

    return `
        <div class="movie-card" data-id="${item.id}" data-type="${actualType}">
            <div class="movie-card-img-wrapper">
                <img src="${thumbnail}" alt="${title}" loading="lazy">
                <div class="movie-rating"><i class="fa-solid fa-star"></i> ${rating}</div>
            </div>
            <div class="movie-card-text">
                <h3>${title}</h3>
                <p>${formattedDate}</p>
            </div>
        </div>
    `;
}

function truncateString(str, num) {
    if (!str) return "No preview overview is currently available for this title.";
    return str.length > num ? str.slice(0, num) + "..." : str;
}

// ==========================================
// SEARCH LOGIC WITH STABLE DEBOUNCING
// ==========================================

function debounce(func, delay = 500) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
}

const performSearch = async () => {
    const query = searchInput.value.trim();

    if (query === "") {
        currentSearchQuery = "";
        searchSection.style.display = "none";
        detailSection.style.display = "none";
        detailVideoContainer.innerHTML = "";
        mainContentWrapper.style.display = "block";
        headerNavbar.classList.remove("search-active");
        if (heroSection) heroSection.style.display = "flex";
        // Restore active navigation view (skip mylist since hero is hidden there)
        if (activeTab === "home") loadHomeScreen();
        else if (activeTab === "movies") loadMoviesScreen();
        else if (activeTab === "tv") loadTVScreen();
        else if (activeTab === "mylist") {
            if (heroSection) heroSection.style.display = "none";
            viewMyList();
        }
        return;
    }

    currentSearchQuery = query;
    searchPage = 1;
    hasMorePages = true;

    if (heroSection) heroSection.style.display = "none";
    mainContentWrapper.style.display = "none";
    searchSection.style.display = "block";

    const heading = document.getElementById("search-heading");
    heading.textContent = `Search Results for "${query}"`;

    showSkeletonsOnGrid();

    try {
        const response = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=1`);
        const data = await response.json();
        const results = (data.results || []).filter(item => item.media_type === "movie" || item.media_type === "tv");

        cacheMovies(results);
        searchGrid.innerHTML = "";

        if (results.length === 0) {
            searchGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 18px; margin-top: 40px;">No movies or TV shows found matching your query.</p>`;
            hasMorePages = false;
            updatePaginationControls(1);
            return;
        }

        results.forEach(item => {
            searchGrid.insertAdjacentHTML("beforeend", buildCardHTML(item, item.media_type));
        });

        if (searchPage >= data.total_pages) {
            hasMorePages = false;
        }
        updatePaginationControls(data.total_pages);
    } catch (err) {
        console.error("Search API lookup error: ", err);
    }
};

searchInput.addEventListener("input", debounce(performSearch, 500));

// ==========================================
// PAGINATION LOGIC
// ==========================================

function setupPagination() {
    prevPageBtn.onclick = async () => {
        if (searchPage > 1) {
            searchPage--;
            await fetchPageResults();
        }
    };
    nextPageBtn.onclick = async () => {
        if (hasMorePages) {
            searchPage++;
            await fetchPageResults();
        }
    };
}

function updatePaginationControls(totalPages) {
    if (totalPages > 1) {
        paginationControls.style.display = "flex";
        pageIndicator.textContent = `Page ${searchPage} of ${totalPages}`;
        prevPageBtn.disabled = searchPage === 1;
        nextPageBtn.disabled = searchPage >= totalPages;
        hasMorePages = searchPage < totalPages;
    } else {
        paginationControls.style.display = "none";
    }
}

async function fetchPageResults() {
    showSkeletonsOnGrid();
    window.scrollTo({ top: searchSection.offsetTop - 100, behavior: "smooth" });
    try {
        const response = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(currentSearchQuery)}&page=${searchPage}`);
        const data = await response.json();
        const results = (data.results || []).filter(item => item.media_type === "movie" || item.media_type === "tv");

        cacheMovies(results);
        searchGrid.innerHTML = "";

        if (results.length === 0) {
            searchGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 18px; margin-top: 40px;">No movies or TV shows found matching your query.</p>`;
            updatePaginationControls(1);
            return;
        }

        results.forEach(item => {
            searchGrid.insertAdjacentHTML("beforeend", buildCardHTML(item, item.media_type));
        });

        updatePaginationControls(data.total_pages);
    } catch (err) {
        console.error("Failed executing page fetch: ", err);
    }
}

// ==========================================
// DETAILS PAGE (SPA)
// ==========================================

function loadDetailScreen(movieId, mediaType = "movie") {
    const movie = moviesInMemory.find(m => m.id == movieId);
    if (!movie) return;

    if (heroSection) heroSection.style.display = "none";
    mainContentWrapper.style.display = "none";
    searchSection.style.display = "none";
    detailSection.style.display = "block";
    detailVideoContainer.style.display = "none";
    detailVideoContainer.innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" });

    const backdropUrl = movie.backdrop_path ? `${IMAGE_URL}${movie.backdrop_path}` : "";
    detailBackdrop.style.backgroundImage = backdropUrl ? `url('${backdropUrl}')` : "none";
    detailPoster.src = movie.poster_path ? `${THUMB_URL}${movie.poster_path}` : "https://via.placeholder.com/500x750?text=No+Poster";

    detailTitle.textContent = movie.title || movie.name;
    detailOverview.textContent = movie.overview || "No review summary is currently declared.";
    detailRating.textContent = movie.vote_average ? `${movie.vote_average.toFixed(1)}/10` : "N/A";

    const rawDate = movie.release_date || movie.first_air_date;
    detailDate.textContent = rawDate ? rawDate.split("-")[0] : "N/A";

    detailTrailerBtn.onclick = () => triggerTrailerInterface(movie.id, mediaType);
    detailStreamBtn.onclick = () => triggerStreamInterface(movie.id, mediaType);

    updateBookmarkButtonUI(detailSaveBtn, movie.id);
    detailSaveBtn.onclick = () => toggleBookmark(movie, mediaType);

    if (mediaType === "tv") {
        detailTVSeasons.style.display = "block";
        fetchTVSeasons(movie.id);
    } else {
        detailTVSeasons.style.display = "none";
    }
}

backToBrowseBtn.onclick = () => {
    detailSection.style.display = "none";
    detailVideoContainer.innerHTML = "";

    if (currentSearchQuery !== "") {
        // Return to active search results
        searchSection.style.display = "block";
    } else if (activeTab === "mylist") {
        // Return to watchlist view
        viewMyList();
    } else {
        mainContentWrapper.style.display = "block";
        if (heroSection) {
            heroSection.style.display = "flex";
        }
    }
};

async function fetchTVSeasons(tvId) {
    detailSeasonSelector.innerHTML = "";
    detailEpisodesGrid.innerHTML = "";
    try {
        const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}`);
        const data = await res.json();

        if (data.seasons && data.seasons.length > 0) {
            data.seasons.forEach(season => {
                // Only show seasons that have actually aired (episode_count > 0), skip specials & future seasons
                if (season.season_number > 0 && season.episode_count > 0) {
                    const option = document.createElement("option");
                    option.value = season.season_number;
                    option.textContent = season.name;
                    detailSeasonSelector.appendChild(option);
                }
            });

            if (detailSeasonSelector.options.length > 0) {
                fetchTVEpisodes(tvId, detailSeasonSelector.value);
                detailSeasonSelector.onchange = () => {
                    fetchTVEpisodes(tvId, detailSeasonSelector.value);
                };
            } else {
                detailEpisodesGrid.innerHTML = "<p>No seasons available.</p>";
            }
        }
    } catch (err) {
        console.error(err);
        detailEpisodesGrid.innerHTML = "<p>Failed to load seasons.</p>";
    }
}

async function fetchTVEpisodes(tvId, seasonNumber) {
    detailEpisodesGrid.innerHTML = "<div class='spinner'></div>";
    try {
        const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}`);
        const data = await res.json();

        detailEpisodesGrid.innerHTML = "";
        if (data.episodes && data.episodes.length > 0) {
            data.episodes.forEach(ep => {
                const img = ep.still_path ? `${THUMB_URL}${ep.still_path}` : "https://via.placeholder.com/320x180?text=No+Image";
                const epEl = document.createElement("div");
                epEl.className = "episode-item";
                epEl.innerHTML = `
                    <img src="${img}" class="episode-img" loading="lazy">
                    <div class="episode-details">
                        <h4>${ep.episode_number}. ${ep.name}</h4>
                        <p>${truncateString(ep.overview, 100)}</p>
                    </div>
                `;
                epEl.onclick = () => {
                    triggerStreamInterface(tvId, "tv", seasonNumber, ep.episode_number);
                };
                detailEpisodesGrid.appendChild(epEl);
            });
        } else {
            detailEpisodesGrid.innerHTML = "<p>No episodes found.</p>";
        }
    } catch (err) {
        console.error(err);
        detailEpisodesGrid.innerHTML = "<p>Failed to load episodes.</p>";
    }
}

// ==========================================
// NETFLIX-STYLE PLAYER MODAL
// ==========================================

const playerModal = document.getElementById("player-modal");
const playerFrame = document.getElementById("playerFrame");
const playerCloseBtn = document.getElementById("playerCloseBtn");
const playerModalTitle = document.getElementById("playerModalTitle");
const playerModalSub = document.getElementById("playerModalSubtitle");

function openPlayerModal(embedUrl, title = "", subtitle = "") {
    playerModalTitle.textContent = title;
    playerModalSub.textContent = subtitle;
    playerFrame.innerHTML = `<iframe src="${embedUrl}" allowfullscreen scrolling="no" allow="autoplay; encrypted-media; accelerometer; clipboard-write; gyroscope; picture-in-picture"></iframe>`;
    playerModal.classList.add("active");
    document.body.style.overflow = "hidden"; // prevent background scroll
}

function closePlayerModal() {
    playerModal.classList.remove("active");
    playerFrame.innerHTML = ""; // stop playback
    document.body.style.overflow = "";
}

// Close on button click
playerCloseBtn.addEventListener("click", closePlayerModal);

// Close on ESC key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && playerModal.classList.contains("active")) {
        closePlayerModal();
    }
});

async function triggerTrailerInterface(movieId, mediaType = "movie") {
    try {
        const response = await fetch(`${BASE_URL}/${mediaType}/${movieId}/videos?api_key=${API_KEY}`);
        const data = await response.json();
        const mainTrailer = data.results.find(v => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));

        if (mainTrailer) {
            const title = detailTitle.textContent || "";
            const embedUrl = `https://www.youtube.com/embed/${mainTrailer.key}?autoplay=1`;
            openPlayerModal(embedUrl, title, "Official Trailer");
        } else {
            alert("No promotional previews or trailers found for this title.");
        }
    } catch (err) {
        console.error("Failed obtaining trailer link: ", err);
    }
}

function triggerStreamInterface(movieId, mediaType = "movie", season = 1, episode = 1) {
    const overrides = JSON.parse(localStorage.getItem("cinxphere_overrides") || "[]");
    const activeProvider = localStorage.getItem("cinxphere_provider") || "nxsha.space";
    const customTemplate = localStorage.getItem("cinxphere_custom_template") || "";

    // Search for a matching override for this TMDB ID and type
    const match = overrides.find(o =>
        o.tmdbId === String(movieId) &&
        o.mediaType === mediaType &&
        (mediaType === "movie" || (o.season === String(season) && o.episode === String(episode)))
    );

    let targetEmbedUrl;
    if (match) {
        // Use custom override source
        targetEmbedUrl = match.url;
    } else {
        // Use default settings engine
        if (activeProvider === "custom" && customTemplate) {
            targetEmbedUrl = customTemplate
                .replace("{type}", mediaType)
                .replace("{id}", movieId)
                .replace("{season}", season)
                .replace("{episode}", episode);
        } else {
            const domain = activeProvider;
            if (mediaType === "movie") {
                targetEmbedUrl = `https://${domain}/embed/movie/${movieId}`;
            } else {
                targetEmbedUrl = `https://${domain}/embed/tv/${movieId}/${season}/${episode}`;
            }
        }
    }

    const title = detailTitle.textContent || "";
    const subtitle = mediaType === "tv" ? `Season ${season} • Episode ${episode}` : "Full Movie";

    // Log playback event to Firebase Firestore for admin dashboard charts
    if (window.logPlaybackEventToFirestore) {
        window.logPlaybackEventToFirestore(movieId, mediaType, title);
    }

    openPlayerModal(targetEmbedUrl, title, subtitle);
}

// Global delegated event listeners for movie cards
document.addEventListener("click", function (e) {
    const bookmarkBtn = e.target.closest(".fav-btn");
    if (bookmarkBtn) {
        e.stopPropagation();
        const id = parseInt(bookmarkBtn.getAttribute("data-id"));
        const mediaType = bookmarkBtn.getAttribute("data-type") || "movie";
        const movie = moviesInMemory.find(m => m.id === id);
        if (movie) {
            toggleBookmark(movie, mediaType);
            bookmarkBtn.textContent = isBookmarked(id) ? '✔️' : '❤';
        }
        return;
    }

    const card = e.target.closest(".movie-card");
    if (!card) return;

    const movieId = card.getAttribute("data-id");
    const mediaType = card.getAttribute("data-type") || "movie";
    loadDetailScreen(movieId, mediaType);
});

// ==========================================
// MY LIST BOOKMARK UTILITIES (LOCAL STORAGE)
// ==========================================

function toggleBookmark(movie, mediaType = "movie") {
    // Require login to use the watchlist
    if (!window.isLoggedIn || !window.isLoggedIn()) {
        showAuthToast('Login to save titles to your Watchlist');
        if (window.openAuthModal) window.openAuthModal('login');
        return;
    }

    const index = myList.findIndex(item => item.id === movie.id);
    if (index === -1) {
        // Map media types on save state compatibility
        movie.media_type = movie.media_type || mediaType;
        myList.push(movie);
    } else {
        myList.splice(index, 1);
    }
    localStorage.setItem("cinxphere_mylist", JSON.stringify(myList));

    // Sync watchlist to Firebase Firestore for admin view
    if (window.syncWatchlistToFirestore) {
        window.syncWatchlistToFirestore(myList);
    }

    const modalSaveBtn = document.getElementById("detailSaveBtn");
    if (modalSaveBtn) {
        updateBookmarkButtonUI(modalSaveBtn, movie.id);
    }

    document.querySelectorAll(`.fav-btn[data-id="${movie.id}"]`).forEach(btn => {
        btn.textContent = isBookmarked(movie.id) ? '✔️' : '❤';
    });

    if (activeTab === "mylist") {
        viewMyList();
    }
}

// ── Auth toast notification ───────────────────────────────
function showAuthToast(message) {
    const existing = document.getElementById('authToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'authToast';
    toast.innerHTML = `<i class="fa-solid fa-lock"></i> ${message}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 32px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: linear-gradient(135deg, rgba(229,9,20,0.95), rgba(150,5,12,0.95));
        color: #fff;
        padding: 14px 26px;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 600;
        font-family: 'Poppins', sans-serif;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 40px rgba(229,9,20,0.45);
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.15);
        pointer-events: none;
    `;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
    });

    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

function isBookmarked(movieId) {
    return myList.some(item => item.id === movieId);
}

function updateBookmarkButtonUI(btn, movieId) {
    if (isBookmarked(movieId)) {
        btn.innerHTML = `✔️ In My Watchlist`;
        btn.style.background = "#2e7d32";
    } else {
        btn.innerHTML = `❤️ My Watchlist`;
        btn.style.background = "rgba(255, 255, 255, 0.1)";
    }
}

function viewMyList() {
    activeTab = "mylist";
    hasMorePages = false; // Disable scroll fetches on personal catalog List
    if (heroSection) heroSection.style.display = "none";
    mainContentWrapper.style.display = "none";
    searchSection.style.display = "block";

    const heading = document.getElementById("search-heading");
    heading.textContent = "My Watchlist";

    searchGrid.innerHTML = "";
    if (myList.length === 0) {
        searchGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 18px; margin-top: 40px;">Your Watchlist is empty. Browse titles and click ❤️ to save them!</p>`;
        return;
    }

    myList.forEach(item => {
        searchGrid.insertAdjacentHTML("beforeend", buildCardHTML(item, item.media_type));
    });
}

// ==========================================
// GENERAL NAVBAR & NAVIGATION EVENTS
// ==========================================

function setupNavbarScroll() {
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            headerNavbar.classList.add("scrolled");
        } else {
            headerNavbar.classList.remove("scrolled");
        }
    });
}

function setupLogoEvent() {
    const logo = document.getElementById("brandLogo");
    logo.onclick = () => {
        searchInput.value = "";
        searchSection.style.display = "none";
        mainContentWrapper.style.display = "block";
        if (heroSection) heroSection.style.display = "flex";
        loadHomeScreen();
        resetActiveNav(document.getElementById("navHome"));
    };
}

function setupNavMenuEvents() {
    const navHome = document.getElementById("navHome");
    const navMovies = document.getElementById("navMovies");
    const navTV = document.getElementById("navTV");
    const navMyList = document.getElementById("navMyList");

    const clearSearchingState = () => {
        searchInput.value = "";
        currentSearchQuery = "";
        searchSection.style.display = "none";
        detailSection.style.display = "none";
        detailVideoContainer.innerHTML = "";
        mainContentWrapper.style.display = "block";
        if (heroSection) heroSection.style.display = "flex";
        headerNavbar.classList.remove("search-active");
    };

    navHome.onclick = (e) => {
        e.preventDefault();
        clearSearchingState();
        loadHomeScreen();
        resetActiveNav(navHome);
    };

    navMovies.onclick = (e) => {
        e.preventDefault();
        clearSearchingState();
        loadMoviesScreen();
        resetActiveNav(navMovies);
    };

    navTV.onclick = (e) => {
        e.preventDefault();
        clearSearchingState();
        loadTVScreen();
        resetActiveNav(navTV);
    };

    navMyList.onclick = (e) => {
        e.preventDefault();
        if (!window.isLoggedIn || !window.isLoggedIn()) {
            showAuthToast('Login to access your Watchlist');
            if (window.openAuthModal) window.openAuthModal('login');
            return;
        }
        searchInput.value = "";
        detailSection.style.display = "none";
        viewMyList();
        resetActiveNav(navMyList);
    };
}

function resetActiveNav(activeNode) {
    document.querySelectorAll(".nav-links a").forEach(node => {
        node.classList.remove("active");
    });
    activeNode.classList.add("active");
}

// ==========================================
// CHANGE FEATURED BUTTON
// ==========================================

function setupChangeFeaturedBtn() {
    const changeBtn = document.getElementById("heroChangeBtn");
    if (!changeBtn) return;

    changeBtn.addEventListener("click", () => {
        if (featuredItems.length < 2) return; // nothing to cycle through

        // Fade hero out
        heroSection.classList.add("hero-changing");

        setTimeout(() => {
            // Advance to next item (wraps around)
            featuredIndex = (featuredIndex + 1) % featuredItems.length;
            populateHero(featuredItems[featuredIndex]);

            // Fade hero back in
            heroSection.classList.remove("hero-changing");
        }, 350);
    });
}

// Execute initial landing sequence
cacheMovies(myList);
init();

// ==========================================
// WATCHLIST SYNC INTERFACE
// ==========================================

window.loadMyListFromLocalStorage = function () {
    try {
        myList = JSON.parse(localStorage.getItem("cinxphere_mylist")) || [];
    } catch (e) {
        myList = [];
    }
    if (activeTab === "mylist") {
        viewMyList();
    }
};