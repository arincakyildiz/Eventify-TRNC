// Eventify TRNC - Full Stack Application
// Connects to backend API for data persistence

const STORAGE_KEY_EVENTS = "eventify_events";
const STORAGE_KEY_REGISTRATIONS = "eventify_registrations";
const STORAGE_KEY_ADMIN_AUTH = "eventify_admin_auth";
const STORAGE_KEY_USER = "eventify_current_user";
const STORAGE_KEY_AUTH_USER = "eventify_auth_user";
const STORAGE_KEY_MANAGED_USERS = "eventify_admin_users";
const STORAGE_KEY_SCHEMA = "eventify_schema_version";

const APP_SCHEMA_VERSION = 8; // Incremented for API integration

// API Configuration (API_BASE_URL defined in api.js)
const getAPIServerURL = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Production: use same origin or relative
      return window.location.origin;
    }
  }
  return "http://localhost:5000";
};

const API_SERVER_URL = getAPIServerURL();
let useAPI = false; // Will be set to true if API is available

const IMAGE_BASE_PATH = (() => {
  const attr = document.body?.dataset?.imagesBase || "assets/images/";
  return attr.endsWith("/") ? attr : `${attr}/`;
})();

function resolveImageSrc(value) {
  if (!value) return "";
  // If already a full URL (http, https, data, blob), return as is
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  // If it's an API upload path, prepend API base URL
  if (value.startsWith("/uploads")) {
    // In production, use relative URL; in development, use full URL
    const isProduction = typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';
    return isProduction ? value : `${API_SERVER_URL}${value}`;
  }
  // If starts with / or ./ or ../, return as is (absolute or relative path)
  if (value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) return value;
  // If already contains a path separator and starts with assets/, return as is
  if (value.includes("/") && value.startsWith("assets/")) return value;
  // Otherwise, prepend IMAGE_BASE_PATH
  return `${IMAGE_BASE_PATH}${value}`;
}

const HERO_IMAGES = [
  { id: 0, file: "nicosia.jpg" },
  { id: 1, file: "famagustaa.jpg" },
  { id: 2, file: "kyrenia.jpg" },
];
const DEFAULT_VIEW =
  (document.body && document.body.dataset.initialView) || "view-events";

// Seed a demo citizen account for easier testing if none exists yet.
(function seedDemoAuthUser() {
  const existing = loadFromStorage(STORAGE_KEY_AUTH_USER, null);
  if (existing) return;

  const demoUser = {
    fullName: "Demo Citizen",
    email: "demo@eventify.trnc",
    // Must satisfy: >= 8 chars, at least 1 uppercase, at least one dot (.)
    password: "Demo.Pass1",
    country: "Türkiye",
    marketing: false,
  };

  saveToStorage(STORAGE_KEY_AUTH_USER, demoUser);
})();

// ----- Utilities -----

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors for this prototype
  }
}

function generateId() {
  return "ev_" + Math.random().toString(36).slice(2, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDay(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit" });
}

function formatMonth(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { month: "long" });
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function toDateKey(dateObj) {
  if (!(dateObj instanceof Date)) return "";
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDate(first, second) {
  if (!(first instanceof Date) || !(second instanceof Date)) return false;
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getEventsForDate(dateObj) {
  const key = toDateKey(dateObj);
  return events
    .filter((ev) => ev.date === key)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

function getStartOfWeek(dateObj) {
  const start = new Date(dateObj);
  const day = start.getDay(); // 0 = Sunday
  const offset = (day + 6) % 7; // make Monday = 0
  start.setDate(start.getDate() - offset);
  return start;
}

function applyHeroSlide(index) {
  const hero = document.querySelector(".ef-hero");
  if (!hero || !HERO_IMAGES.length) return;

  const safeIndex = ((index % HERO_IMAGES.length) + HERO_IMAGES.length) % HERO_IMAGES.length;

  // first load: just show image without flip
  if (heroIndex === -1) {
    const initial = HERO_IMAGES[safeIndex];
    const initialSrc = resolveImageSrc(initial.file);
    hero.style.backgroundImage = `linear-gradient(to right, rgba(15,23,42,0.85), rgba(15,23,42,0.7)), url("${initialSrc}")`;
    const dotsFirst = document.querySelectorAll("[data-hero-dot]");
    dotsFirst.forEach((dot) => {
      const dotIndex = parseInt(dot.dataset.heroDot, 10);
      dot.classList.toggle("active", dotIndex === safeIndex);
    });
    heroIndex = safeIndex;
    return;
  }

  const runIn = () => {
    const slide = HERO_IMAGES[safeIndex];
    const slideSrc = resolveImageSrc(slide.file);
    hero.style.backgroundImage = `linear-gradient(to right, rgba(15,23,42,0.85), rgba(15,23,42,0.7)), url("${slideSrc}")`;

    const dots = document.querySelectorAll("[data-hero-dot]");
    dots.forEach((dot) => {
      const dotIndex = parseInt(dot.dataset.heroDot, 10);
      dot.classList.toggle("active", dotIndex === safeIndex);
    });

    heroIndex = safeIndex;

    hero.classList.remove("ef-hero-rotate-out");
    void hero.offsetWidth;
    hero.classList.add("ef-hero-rotate-in");
  };

  const handleOutEnd = (e) => {
    if (e.animationName !== "ef-hero-rotate-out") return;
    hero.removeEventListener("animationend", handleOutEnd);
    runIn();
  };

  hero.removeEventListener("animationend", handleOutEnd);
  hero.addEventListener("animationend", handleOutEnd);

  hero.classList.remove("ef-hero-rotate-in");
  void hero.offsetWidth;
  hero.classList.add("ef-hero-rotate-out");
}

function startHeroTimer() {
  if (heroTimerId) window.clearInterval(heroTimerId);
  heroTimerId = window.setInterval(() => {
    applyHeroSlide(heroIndex + 1);
  }, 8000);
}
// ----- Data Model -----

let events = loadFromStorage(STORAGE_KEY_EVENTS, null);
let registrations = loadFromStorage(STORAGE_KEY_REGISTRATIONS, null);
const storedSchemaVersion = loadFromStorage(STORAGE_KEY_SCHEMA, null);
if (storedSchemaVersion !== APP_SCHEMA_VERSION) {
  events = null;
  registrations = null;
}
let adminAuthenticated = !!loadFromStorage(STORAGE_KEY_ADMIN_AUTH, false);
let currentUser = loadFromStorage(STORAGE_KEY_USER, null);
let authMode = "signin";
let pendingSignup = null;
let heroIndex = -1;
let heroTimerId = null;
let verificationTimerId = null;
let managedUsers = loadFromStorage(STORAGE_KEY_MANAGED_USERS, [
  {
    id: "user-001",
    name: "Ayşe Kara",
    email: "ayse.kara@example.com",
    city: "Nicosia",
    role: "citizen",
  },
  {
    id: "user-002",
    name: "Mehmet Aksoy",
    email: "mehmet.aksoy@example.com",
    city: "Famagusta",
    role: "citizen",
  },
  {
    id: "user-003",
    name: "Selin Yıldız",
    email: "selin.yildiz@example.com",
    city: "Kyrenia",
    role: "citizen",
  },
]);
let calendarViewOffset = 0;
let calendarViewMode = "month";

if (!events || !Array.isArray(events) || events.length === 0) {
  // Seed with example data for demo purposes
  const baseDate = new Date();
  const addDays = (days) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  events = [
    {
      id: generateId(),
      title: "Nicosia Spring Culture Festival",
      city: "Nicosia",
      category: "Culture",
      date: addDays(5),
      time: "18:30",
      location: "Nicosia City Park",
      capacity: 200,
      description:
        "Open-air festival with local music, traditional food stands, and art workshops for families.",
      imageUrl: "nicosia.jpg",
    },
    {
      id: generateId(),
      title: "Famagusta Beach Volleyball Tournament",
      city: "Famagusta",
      category: "Sports",
      date: addDays(10),
      time: "16:00",
      location: "Glapsides Beach",
      capacity: 32,
      description:
        "Amateur beach volleyball tournament for youth and adults. Teams of 4 players can register.",
      imageUrl: "famagustaa.jpg",
    },
    {
      id: generateId(),
      title: "Digital Skills Workshop for Seniors",
      city: "Kyrenia",
      category: "Education",
      date: addDays(3),
      time: "10:00",
      location: "Kyrenia Municipality Culture Center",
      capacity: 40,
      description:
        "Hands-on training for seniors on using smartphones, online banking, and e-government portals.",
      imageUrl: "kyrenia.jpg",
    },
    {
      id: generateId(),
      title: "City Clean-Up & Tree Planting Day",
      city: "Iskele",
      category: "Environment",
      date: addDays(1),
      time: "09:30",
      location: "Iskele Seafront Promenade",
      capacity: 120,
      description:
        "Community clean-up of coastal areas followed by planting new trees in public spaces.",
      imageUrl: "city-cleanup-tree-planting.jpg",
    },
    {
      id: generateId(),
      title: "Nicosia Open-Air Jazz Night",
      city: "Nicosia",
      category: "Music & Entertainment",
      date: addDays(7),
      time: "20:30",
      location: "Old City Square, Nicosia",
      capacity: 150,
      description:
        "Evening jazz concert with local bands, food trucks, and a relaxed open-air atmosphere.",
      imageUrl: "avlu-nicosia.jpg",
    },
    {
      id: generateId(),
      title: "Kyrenia Sunset Harbour Concert",
      city: "Kyrenia",
      category: "Music & Entertainment",
      date: addDays(12),
      time: "19:00",
      location: "Kyrenia Harbour Stage",
      capacity: 300,
      description:
        "Live music by the harbour at sunset featuring young bands and municipal orchestra performances.",
      imageUrl: "sunset-concert.jpg",
    },
    {
      id: generateId(),
      title: "Morphou Local Food & Handcraft Fair",
      city: "Morphou",
      category: "Culture",
      date: addDays(8),
      time: "11:00",
      location: "Morphou Central Square",
      capacity: 250,
      description:
        "Day-long fair with local food stalls, handcraft exhibitions, and children’s activities.",
      imageUrl: "morphou-food-fair.jpg",
    },
    {
      id: generateId(),
      title: "Iskele Family Movie Night Outdoors",
      city: "Iskele",
      category: "Music & Entertainment",
      date: addDays(14),
      time: "21:00",
      location: "Iskele Seafront Open Cinema Area",
      capacity: 180,
      description:
        "Family-friendly movie screening under the stars with popcorn stands and kids’ corner.",
      imageUrl: "iskele-movie-night.jpg",
    },
    {
      id: generateId(),
      title: "Nicosia Community Fun Run",
      city: "Nicosia",
      category: "Sports",
      date: addDays(18),
      time: "09:00",
      location: "Ataturk Stadium, Nicosia",
      capacity: 400,
      description:
        "5K and 10K fun run for all ages with charity booths and warm-up sessions led by trainers.",
      imageUrl: "ataturk-stadium.jpg",
    },
    {
      id: generateId(),
      title: "Famagusta Youth Coding Camp",
      city: "Famagusta",
      category: "Education",
      date: addDays(20),
      time: "10:30",
      location: "Famagusta Innovation Center",
      capacity: 60,
      description:
        "Weekend bootcamp introducing high school students to web development and basic programming.",
      imageUrl: "famagusta-coding-camp.jpg",
    },
    {
      id: generateId(),
      title: "Kyrenia Coastal Cycling Tour",
      city: "Kyrenia",
      category: "Sports",
      date: addDays(22),
      time: "08:30",
      location: "Kyrenia Old Harbour Stage",
      capacity: 120,
      description:
        "Guided cycling tour along the Kyrenia coastline with safety briefing and refreshment stops.",
      imageUrl: "cycling-tour.jpg",
    },
    {
      id: generateId(),
      title: "Lefke Green Living Workshop",
      city: "Lefke",
      category: "Environment",
      date: addDays(16),
      time: "15:00",
      location: "Lefke Community Center",
      capacity: 80,
      description:
        "Interactive talks and hands-on demos about recycling, composting, and sustainable home habits.",
      imageUrl: "lefke-green-living.jpg",
    },
    {
      id: generateId(),
      title: "Avenue Cinemax Indie Premiere",
      city: "Nicosia",
      category: "Culture",
      date: addDays(6),
      time: "19:30",
      location: "Avenue Cinemax – Nicosia",
      capacity: 450,
      description:
        "Exclusive screening of local indie films followed by a director Q&A session at Avenue Cinemax.",
      imageUrl: "avenue.jpg",
    },
    {
      id: generateId(),
      title: "Bellapais Classical Nights",
      city: "Kyrenia",
      category: "Culture",
      date: addDays(11),
      time: "20:00",
      location: "Bellapais Monastery",
      capacity: 600,
      description:
        "Open-air chamber music concert inside Bellapais Monastery featuring regional orchestras.",
      imageUrl: "bellapais-manastiri.jpg",
    },
    {
      id: generateId(),
      title: "Iskele Summer Festival Opening",
      city: "Iskele",
      category: "Music & Entertainment",
      date: addDays(9),
      time: "18:00",
      location: "Iskele Municipality Festival Area",
      capacity: 2000,
      description:
        "Festival kickoff with folk dances, municipal choir and street food market in the heart of Iskele.",
      imageUrl: "bogazici-belediyesi-festival-alani.jpg",
    },
    {
      id: generateId(),
      title: "Catalkoy Community Theatre Night",
      city: "Kyrenia",
      category: "Culture",
      date: addDays(13),
      time: "19:30",
      location: "Catalkoy Municipality Cultural Center",
      capacity: 320,
      description:
        "Local theatre troupe presents a bilingual play celebrating Cypriot folklore at Catalkoy Cultural Center.",
      imageUrl: "catalkoy-erol-avgoren-kultur-merkezi.jpg",
    },
    {
      id: generateId(),
      title: "Rauf Raif Denktaş Summit",
      city: "Famagusta",
      category: "Education",
      date: addDays(4),
      time: "10:00",
      location: "Rauf Raif Denktaş Culture and Congress Center",
      capacity: 900,
      description:
        "Regional innovation summit with keynote speakers, workshops, and networking sessions for youth.",
      imageUrl: "rauf-raif-denktas-kultur-ve-kongre-sarayi.jpg",
    },
    {
      id: generateId(),
      title: "BKM Mutfak Stand-up Special",
      city: "Nicosia",
      category: "Music & Entertainment",
      date: addDays(15),
      time: "21:00",
      location: "BKM Mutfak Nicosia",
      capacity: 240,
      description:
        "Comedy night featuring rising stand-up artists from Istanbul and Nicosia at BKM Mutfak.",
      imageUrl: "BKM-Mutfak-Nicosia.jpg",
    },
  ];

  // Seed empty registrations and pre-register demo user for a few events
  registrations = {};
  const demoEmail = "demo@eventify.trnc";

  events.forEach((ev, index) => {
    const list = [];

    // For the first few upcoming events, add a demo registration so that
    // notifications and My Registrations have some example data.
    if (index < 3) {
      list.push({
        userId: demoEmail,
        registeredAt: new Date().toISOString(),
      });
    }

    registrations[ev.id] = list;
  });

  saveToStorage(STORAGE_KEY_EVENTS, events);
  saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);
  saveToStorage(STORAGE_KEY_SCHEMA, APP_SCHEMA_VERSION);
}

// Update event dates to be relative to today if they are in the past
function updateEventDatesToCurrent() {
  if (!events || !Array.isArray(events) || events.length === 0) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  let updated = false;
  const daysOffset = [5, 10, 3, 1, 7, 12, 8, 14, 18, 20, 22, 16, 6, 11, 9, 13, 4, 15]; // Days offset for events
  let offsetIndex = 0;

  events.forEach((event) => {
    if (!event.date) return;

    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);

    // If event date is in the past, update it to a future date
    if (eventDate < today) {
      const daysToAdd = daysOffset[offsetIndex % daysOffset.length];
      const newDate = new Date(today);
      newDate.setDate(newDate.getDate() + daysToAdd);
      event.date = newDate.toISOString().slice(0, 10);
      updated = true;
      offsetIndex++;
    }
  });

  if (updated) {
    saveToStorage(STORAGE_KEY_EVENTS, events);
  }
}

// Update event dates on load
updateEventDatesToCurrent();

// ----- View Switching (Public + Admin) -----

function showView(viewId) {
  if (!viewId) {
    console.warn('[Eventify] showView called without viewId');
    return;
  }
  
  console.log('[Eventify] Switching to view:', viewId);
  
  const views = document.querySelectorAll(".ef-view");
  console.log('[Eventify] Found', views.length, 'views');
  
  views.forEach((view) => {
    if (view.id === viewId) {
      view.classList.add("active");
      console.log('[Eventify] Activated view:', view.id);
    } else {
      view.classList.remove("active");
    }
  });

  const navButtons = document.querySelectorAll(".ef-nav-link");
  navButtons.forEach((btn) => {
    const target = btn.dataset.view;
    if (target === viewId) {
      btn.classList.add("active");
    } else if (!target?.startsWith("view-admin")) {
      // keep admin nav independent when already in dashboard
      btn.classList.remove("active");
    }
  });

  // Ensure content is rendered when switching to specific views
  // Use a small delay to ensure DOM is ready
  setTimeout(async () => {
    if (viewId === "view-registrations") {
      await renderMyRegistrations();
    } else if (viewId === "view-events") {
      renderEventList();
    } else if (viewId === "view-calendar") {
      renderEventCalendar();
    } else if (viewId === "view-home") {
      renderHomeFeaturedList();
    } else if (viewId === "view-admin-dashboard" || viewId === "view-admin-users") {
      // Refresh user list when admin views are opened
      await renderAdminUserList();
    }
  }, 50);
}

function setupNavigation() {
  const navButtons = document.querySelectorAll(".ef-nav-link");
  
  console.log('[Eventify] Setting up navigation for', navButtons.length, 'buttons');

  navButtons.forEach((btn) => {
    const targetId = btn.dataset.view;
    console.log('[Eventify] Adding click listener to nav button:', targetId);
    
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetId = btn.dataset.view;
      console.log('[Eventify] Nav button clicked, switching to view:', targetId);

      if (targetId) {
        showView(targetId);
        // render functions are now called automatically in showView with a delay
      }
    });
  });
}

function setupMobileNav() {
  const toggle = document.querySelector(".ef-nav-toggle");
  const navLinks = document.querySelectorAll(".ef-nav-link");

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("ef-nav-open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("ef-nav-open");
    });
  });
}

function setupUserProfileMenu() {
  const pill = document.getElementById("header-user-pill");
  const menu = document.getElementById("header-user-menu");
  const headerNotifBtn = document.getElementById("header-notifications-btn");
  const headerNotifMenu = document.getElementById("header-notifications-menu");

  // Setup notification button FIRST (before pill/menu check)
  if (headerNotifBtn) {
    headerNotifBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const isOpen = document.body.classList.toggle("ef-notifications-open");
      if (isOpen) {
        // Close user menu if open
        if (pill) {
          document.body.classList.remove("ef-user-menu-open");
          pill.setAttribute("aria-expanded", "false");
        }
        // Refresh notifications when menu opens (always refresh to get latest data)
        await renderNotifications();
      }
    });
  }

  if (!pill || !menu) return;

  // Only attach listener if not already attached
  if (!pill.hasAttribute('data-listener-attached')) {
    pill.setAttribute('data-listener-attached', 'true');
    pill.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = document.body.classList.toggle("ef-user-menu-open");
      if (isOpen) {
        document.body.classList.remove("ef-notifications-open");
      }
      pill.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  document.addEventListener("click", (e) => {
    // Don't close if clicking inside user menu or user pill
    const clickedInsideUserMenu = (menu && menu.contains(e.target)) || (pill && pill.contains(e.target));
    // Don't close if clicking inside notification menu or notification button
    const clickedInsideNotifMenu = (headerNotifMenu && headerNotifMenu.contains(e.target)) || 
                                    (headerNotifBtn && headerNotifBtn.contains(e.target));
    
    if (!clickedInsideUserMenu) {
      if (document.body.classList.contains("ef-user-menu-open")) {
        document.body.classList.remove("ef-user-menu-open");
        if (pill) pill.setAttribute("aria-expanded", "false");
      }
    }

    if (!clickedInsideNotifMenu) {
      if (document.body.classList.contains("ef-notifications-open")) {
        document.body.classList.remove("ef-notifications-open");
      }
    }
  });

  menu.addEventListener("click", (e) => {
    e.stopPropagation();
    const target = e.target.closest("[data-user-nav]");
    if (!target) return;

    const action = target.dataset.userNav;

    if (action === "registrations") {
      showView("view-registrations");
    } else if (action === "notifications") {
      showView("view-events");
      window.requestAnimationFrame(() => {
        const box = document.getElementById("upcoming-notifications");
        if (box) {
          box.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } else if (action === "logout") {
      setCurrentUser(null);
      renderEventList();
      (async () => {
        await renderMyRegistrations();
        await renderNotifications();
      })();
    }

    document.body.classList.remove("ef-user-menu-open");
    pill.setAttribute("aria-expanded", "false");
  });

  if (headerNotifMenu) {
    headerNotifMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
}

// ----- Citizen View: Filters & List -----

function getFilterValues() {
  const city = document.getElementById("filter-city").value;
  const category = document.getElementById("filter-category").value;
  const date = document.getElementById("filter-date").value;
  const search = document
    .getElementById("filter-search")
    .value.trim()
    .toLowerCase();
  return { city, category, date, search };
}

function applyFiltersToEvents() {
  const { city, category, date, search } = getFilterValues();
  return events.filter((ev) => {
    const matchesCity = !city || ev.city === city;
    const matchesCategory = !category || ev.category === category;
    const matchesDate = !date || ev.date === date;
    const searchTarget = (ev.title + " " + ev.description)
      .toLowerCase()
      .trim();
    const matchesSearch = !search || searchTarget.includes(search);
    return matchesCity && matchesCategory && matchesDate && matchesSearch;
  });
}

function isEventFull(ev) {
  const regs = registrations[ev.id] || [];
  return regs.length >= ev.capacity;
}

function isUserRegistered(ev) {
  // Support both local events (with id) and API events (with _id)
  const eventId = ev._id || ev.id;
  if (!eventId) return false;
  
  const regs = registrations[eventId] || [];
  if (!currentUser || !currentUser.email) return false;
  const userEmail = currentUser.email.toLowerCase().trim();
  // Check both userId and email fields for compatibility
  return regs.some((r) => {
    const regUserId = (r.userId || '').toLowerCase().trim();
    const regEmail = (r.email || '').toLowerCase().trim();
    return regUserId === userEmail || regEmail === userEmail;
  });
}

async function renderMyRegistrations() {
  const container = document.getElementById("my-registrations-list");
  if (!container) {
    console.warn('[Eventify] renderMyRegistrations: container not found');
    return;
  }

  // Ensure events are loaded
  if (!events || !Array.isArray(events)) {
    console.warn('[Eventify] renderMyRegistrations: events not loaded yet');
    container.innerHTML = '<div class="ef-empty-state">Loading...</div>';
    return;
  }

  if (!currentUser || !currentUser.email) {
    container.innerHTML =
      '<div class="ef-empty-state">Please sign in with your email address to see your registrations.</div>';
    return;
  }

  // Try to load registrations from API if available
  if (window.EventifyAPI && window.EventifyAPI.Auth.isLoggedIn()) {
    try {
      const response = await window.EventifyAPI.Registrations.getMyRegistrations();
      if (response.success && response.data) {
        // Update local registrations with API data
        response.data.forEach(reg => {
          const eventId = reg.event?._id || reg.event;
          if (eventId) {
            if (!registrations[eventId]) {
              registrations[eventId] = [];
            }
            // Add registration if not already exists
            const exists = registrations[eventId].some(r => r.userId === currentUser.email);
            if (!exists) {
              registrations[eventId].push({
                userId: currentUser.email,
                fullName: reg.participants?.[0]?.name || currentUser.fullName,
                email: reg.participants?.[0]?.email || currentUser.email,
                phone: reg.participants?.[0]?.phone || '',
                birthdate: reg.participants?.[0]?.birthdate || '',
                registeredAt: reg.registeredAt || new Date().toISOString()
              });
            }
          }
        });
        // Save to localStorage
        saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);
      }
    } catch (error) {
      console.error('[Eventify] Failed to load registrations from API:', error);
      // Continue with local storage data
    }
  }

  const registeredEvents = events.filter((ev) => {
    if (!ev || !ev.id) return false;
    return isUserRegistered(ev);
  });

  if (registeredEvents.length === 0) {
    container.innerHTML =
      '<div class="ef-empty-state">You are not registered for any events yet.</div>';
    return;
  }

  container.innerHTML = "";

  registeredEvents
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((ev) => {
      const regs = registrations[ev.id] || [];
      const filledRatio = Math.min(regs.length / ev.capacity, 1);
      
      const card = document.createElement("div");
      card.className = "ef-registration-card";
      
      // Event image if available
      const resolvedImage = resolveImageSrc(ev.imageUrl);
      const hasImage = !!resolvedImage;
      let imageHTML = "";
      if (hasImage) {
        imageHTML = `
          <div class="ef-registration-card-image">
            <img src="${resolvedImage}" alt="${ev.title}" loading="lazy" />
            <div class="ef-registration-card-image-overlay"></div>
          </div>
        `;
      }
      
      card.innerHTML = `
        ${imageHTML}
        <div class="ef-registration-card-content">
          <div class="ef-registration-card-header">
            <div class="ef-registration-card-main">
              <h3 class="ef-registration-card-title">${ev.title}</h3>
              <div class="ef-registration-card-meta">
                <span class="ef-registration-card-date">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.5 2.5H11.5V1.5C11.5 1.22386 11.2761 1 11 1C10.7239 1 10.5 1.22386 10.5 1.5V2.5H5.5V1.5C5.5 1.22386 5.27614 1 5 1C4.72386 1 4.5 1.22386 4.5 1.5V2.5H3.5C2.67157 2.5 2 3.17157 2 4V13.5C2 14.3284 2.67157 15 3.5 15H12.5C13.3284 15 14 14.3284 14 13.5V4C14 3.17157 13.3284 2.5 12.5 2.5ZM3.5 4H12.5V6H3.5V4ZM12.5 13.5H3.5V7.5H12.5V13.5Z" fill="currentColor"/>
                  </svg>
                  ${formatDate(ev.date)} · ${ev.time}
                </span>
                <span class="ef-registration-card-location">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 0C4.13401 0 1 3.13401 1 7C1 11.5 8 16 8 16C8 16 15 11.5 15 7C15 3.13401 11.866 0 8 0ZM8 9.5C6.61929 9.5 5.5 8.38071 5.5 7C5.5 5.61929 6.61929 4.5 8 4.5C9.38071 4.5 10.5 5.61929 10.5 7C10.5 8.38071 9.38071 9.5 8 9.5Z" fill="currentColor"/>
                  </svg>
                  ${ev.city} · ${ev.location}
                </span>
              </div>
            </div>
            <div class="ef-registration-card-badge">
              <span class="ef-registration-card-badge-dot"></span>
              <span>${regs.length}/${ev.capacity}</span>
            </div>
          </div>
          <div class="ef-registration-card-footer">
            <div class="ef-registration-card-progress">
              <div class="ef-registration-card-progress-bar">
                <div class="ef-registration-card-progress-fill" style="width: ${filledRatio * 100}%"></div>
              </div>
              <span class="ef-registration-card-progress-text">${Math.round(filledRatio * 100)}% full</span>
            </div>
            <button class="ef-btn ef-btn-danger" data-cancel-id="${ev.id}">
              Cancel Registration
            </button>
          </div>
        </div>
      `;

      const cancelBtn = card.querySelector("[data-cancel-id]");
      cancelBtn.addEventListener("click", async () => {
        await toggleRegistration(ev.id);
        await renderMyRegistrations();
      });

      container.appendChild(card);
    });
}

function renderEventList() {
  const container = document.getElementById("event-list");
  const filtered = applyFiltersToEvents().sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="ef-empty-state">No events match the selected filters. Try changing the city, category, or date.</div>';
    return;
  }

  container.innerHTML = "";

  filtered.forEach((ev) => {
    const regs = registrations[ev.id] || [];
    const isFull = isEventFull(ev);
    const userReg = isUserRegistered(ev);
    const filledRatio = Math.min(regs.length / ev.capacity, 1);

    const card = document.createElement("article");
    card.className = "ef-card";

    const cardImage = resolveImageSrc(ev.imageUrl);

    if (cardImage) {
      const imgWrapper = document.createElement("div");
      imgWrapper.className = "ef-card-image-wrapper";

      const img = document.createElement("img");
      img.className = "ef-card-image";
      img.src = cardImage;
      img.alt = ev.title;
      img.loading = "lazy";

      const overlay = document.createElement("div");
      overlay.className = "ef-card-image-overlay";

      const labels = document.createElement("div");
      labels.className = "ef-card-image-labels";
      labels.innerHTML = `
        <div>
          <div class="ef-card-image-title">${ev.title}</div>
          <div class="ef-card-image-meta">${ev.city} &middot; ${ev.category}</div>
        </div>
      `;

      const dateBadge = document.createElement("div");
      dateBadge.className = "ef-card-date";
      dateBadge.innerHTML = `
        <span class="ef-card-date-day">${formatDay(ev.date)}</span>
        <span class="ef-card-date-month">${formatMonth(ev.date)}</span>
      `;

      imgWrapper.appendChild(img);
      imgWrapper.appendChild(overlay);
      imgWrapper.appendChild(labels);
      imgWrapper.appendChild(dateBadge);
      card.appendChild(imgWrapper);
    }

    const header = document.createElement("div");
    header.className = "ef-card-header";
    header.innerHTML = `
      <div class="ef-card-header-main">
        <div class="ef-card-category">${ev.category}</div>
        <div class="ef-card-title">${ev.title}</div>
        <div class="ef-card-meta-row">
          <span class="ef-card-meta-icon ef-icon-location"></span>
          <span class="ef-card-meta-text">${ev.location}</span>
        </div>
        <div class="ef-card-meta-row">
          <span class="ef-card-meta-icon ef-icon-calendar"></span>
          <span class="ef-card-meta-text">${formatDate(ev.date)}</span>
        </div>
        <div class="ef-card-meta-row">
          <span class="ef-card-meta-icon ef-icon-clock"></span>
          <span class="ef-card-meta-text">${ev.time}</span>
        </div>
      </div>
      <div class="ef-tag-row">
        <span class="ef-tag">${ev.city}</span>
        <span class="ef-tag ef-tag-outline">${ev.category}</span>
      </div>
    `;

    const body = document.createElement("div");
    body.className = "ef-card-body";
    body.textContent = ev.description;

    const footer = document.createElement("div");
    footer.className = "ef-card-footer";
    footer.innerHTML = `
      <div class="ef-capacity">
        <span class="ef-text-muted">${regs.length} / ${ev.capacity} registered</span>
        <div class="ef-capacity-bar">
          <div class="ef-capacity-bar-fill" style="width: ${
            filledRatio * 100
          }%"></div>
        </div>
      </div>
      <div>
        ${
          isFull
            ? '<span class="ef-badge ef-badge-full">Event is full</span>'
            : userReg
            ? '<span class="ef-badge ef-badge-success">You are registered</span>'
            : ""
        }
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "ef-card-actions";

    const detailBtn = document.createElement("button");
    detailBtn.className = "ef-btn ef-btn-ghost ef-btn-sm";
    detailBtn.textContent = "View details";
    detailBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openEventDetail(ev);
    });

    const btn = document.createElement("button");
    btn.className = "ef-btn ef-btn-sm";
    btn.dataset.eventId = ev.id;

    if (userReg) {
      btn.textContent = "Cancel";
      btn.classList.add("ef-btn-ghost");
    } else if (isFull) {
      btn.textContent = "Full";
      btn.disabled = true;
    } else {
      btn.textContent = "Register";
    }

    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isEventFull(ev) && !isUserRegistered(ev)) return;
      toggleRegistration(ev.id);
    });

    actions.appendChild(detailBtn);
    actions.appendChild(btn);

    card.addEventListener("click", () => {
      openEventDetail(ev);
    });

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

function openEventDetail(eventData) {
  const layer = document.getElementById("event-detail-layer");
  if (!layer) return;

  const titleEl = layer.querySelector("[data-detail-title]");
  const metaEl = layer.querySelector("[data-detail-meta]");
  const descEl = layer.querySelector("[data-detail-description]");
  const longEl = layer.querySelector("[data-detail-long]");
  const locationEl = layer.querySelector("[data-detail-location]");
  const dateEl = layer.querySelector("[data-detail-date]");
  const timeEl = layer.querySelector("[data-detail-time]");
  const categoryEl = layer.querySelector("[data-detail-category]");
  const registerBtn = layer.querySelector("[data-detail-register]");
  const imageArea = layer.querySelector("[data-detail-image]");
  const statusEl = document.getElementById("detail-registration-status");

  if (titleEl) titleEl.textContent = eventData.title;
  if (metaEl)
    metaEl.textContent = `${eventData.city} · ${eventData.category} · ${formatDate(
      eventData.date
    )} ${eventData.time}`;
  if (descEl) descEl.textContent = eventData.description;
  if (longEl) longEl.textContent = eventData.description;
  if (locationEl) locationEl.textContent = eventData.location;
  if (dateEl) dateEl.textContent = formatDate(eventData.date);
  if (timeEl) timeEl.textContent = eventData.time;
  if (categoryEl) categoryEl.textContent = eventData.category;
  if (registerBtn) registerBtn.setAttribute("data-event-id", eventData.id);

  // Update registration status badge and button
  const userReg = isUserRegistered(eventData);
  const isFull = isEventFull(eventData);
  if (statusEl) {
    if (isFull && !userReg) {
      statusEl.innerHTML = '<span class="ef-badge ef-badge-full">Event is full</span>';
    } else if (userReg) {
      statusEl.innerHTML = '<span class="ef-badge ef-badge-success">You are registered</span>';
    } else {
      statusEl.innerHTML = "";
    }
  }
  if (registerBtn) {
    if (userReg) {
      registerBtn.textContent = "Cancel Registration";
      registerBtn.classList.add("ef-btn-ghost");
    } else if (isFull) {
      registerBtn.textContent = "Event is Full";
      registerBtn.disabled = true;
    } else {
      registerBtn.textContent = "Register Now";
      registerBtn.classList.remove("ef-btn-ghost");
      registerBtn.disabled = false;
    }
  }

  if (imageArea) {
    const detailImage = resolveImageSrc(eventData.imageUrl);
    if (detailImage) {
      imageArea.style.backgroundImage = `url("${detailImage}")`;
      imageArea.style.backgroundSize = "cover";
      imageArea.style.backgroundPosition = "center";
    } else {
      imageArea.style.backgroundImage = "none";
      imageArea.style.background = "linear-gradient(135deg, #f97316, #facc15)";
    }
  }

  const tabButtons = layer.querySelectorAll("[data-detail-tab]");
  const sections = layer.querySelectorAll(".ef-detail-section");
  tabButtons.forEach((btn) => {
    const isInfo = btn.dataset.detailTab === "info";
    btn.classList.toggle("active", isInfo);
  });
  sections.forEach((section) => {
    section.classList.toggle("active", section.id === "detail-info");
  });

  layer.style.display = "flex";
  layer.classList.add("open");
}

function closeEventDetail() {
  const layer = document.getElementById("event-detail-layer");
  if (layer) {
    layer.classList.remove("open");
    layer.style.display = "none";
  }
}

function setupDetailPanel() {
  const layer = document.getElementById("event-detail-layer");
  if (!layer) return;

  const closeBtn = layer.querySelector("[data-detail-close]");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeEventDetail());
  }

  layer.addEventListener("click", (e) => {
    if (e.target === layer) {
      closeEventDetail();
    }
  });

  const registerBtn = layer.querySelector("[data-detail-register]");
  if (registerBtn) {
    registerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const eventId = registerBtn.getAttribute("data-event-id");
      if (eventId) {
        toggleRegistration(eventId);
        // Re-open detail with updated registration status
        const ev = events.find((e) => e.id === eventId);
        if (ev) {
          openEventDetail(ev);
        }
      }
    });
  }

  const tabButtons = layer.querySelectorAll("[data-detail-tab]");
  const sections = layer.querySelectorAll(".ef-detail-section");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = btn.dataset.detailTab;
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      sections.forEach((section) => {
        section.classList.toggle("active", section.id === "detail-" + target);
      });
    });
  });
}

// ----- Registrations & Notifications -----

let registrationParticipants = [];

function createParticipantCard(index, isMain = false) {
  const card = document.createElement("div");
  card.className = "ef-participant-card";
  card.dataset.participantIndex = index;

  const ticketTypes = [
    { value: "standard", label: "Standard Ticket", price: 0 },

  ];

  card.innerHTML = `
    <div class="ef-participant-header">
      <div class="ef-participant-header-left">
        <span class="ef-participant-icon">👤</span>
        <div>
          <div class="ef-participant-title">${isMain ? "Main Participant" : `Participant ${index + 1}`}</div>
          <div class="ef-participant-ticket-info" id="participant-ticket-info-${index}">
            Standard Ticket
          </div>
        </div>
      </div>
      ${!isMain ? `<button type="button" class="ef-participant-remove" data-remove-participant="${index}">×</button>` : ""}
    </div>
    <div class="ef-participant-fields">
      <div class="ef-form-group">
        <label for="participant-name-${index}">Full Name *</label>
        <input
          type="text"
          id="participant-name-${index}"
          class="auth-input"
          placeholder="e.g. John Smith"
          required
          ${isMain && currentUser ? `value="${currentUser.fullName || ""}"` : ""}
        />
      </div>
      <div class="ef-form-group">
        <label for="participant-email-${index}">Email *</label>
        <input
          type="email"
          id="participant-email-${index}"
          class="auth-input"
          placeholder="example@email.com"
          required
          ${isMain && currentUser ? `value="${currentUser.email || ""}"` : ""}
        />
      </div>
      <div class="ef-form-group">
        <label for="participant-phone-${index}">Phone *</label>
        <input
          type="tel"
          id="participant-phone-${index}"
          class="auth-input"
          placeholder="+90 555 123 4567"
          maxlength="20"
          required
        />
      </div>
      <div class="ef-form-group">
        <label for="participant-birthdate-${index}">Date of Birth *</label>
        <div class="ef-date-input-wrapper">
          <input
            type="date"
            id="participant-birthdate-${index}"
            class="auth-input"
            max="${todayISO()}"
            required
          />
        </div>
      </div>
      <div class="ef-form-group">
        <label>Ticket Type</label>
        <div class="auth-input" style="background: #f8fafc; color: #64748b; cursor: default;">
          Standard Ticket
        </div>
        <input type="hidden" id="participant-ticket-select-${index}" value="standard" />
      </div>
    </div>
  `;

  // Ticket is always Standard, no need for change listener

  // Remove participant button
  const removeBtn = card.querySelector(`[data-remove-participant="${index}"]`);
  if (removeBtn) {
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.remove();
      updateParticipantCount();
    });
  }

  return card;
}

function updateParticipantCount() {
  const container = document.getElementById("registration-participants-list");
  const countEl = document.getElementById("participant-count");
  if (container && countEl) {
    const count = container.querySelectorAll(".ef-participant-card").length;
    countEl.textContent = `${count} ${count === 1 ? "participant" : "participants"}`;
  }
}

function openRegistrationForm(eventId) {
  const ev = events.find((e) => e.id === eventId);
  if (!ev) return;

  if (!currentUser || !currentUser.email) {
    alert("Please sign in or create an account to register for events.");
    openAuthLayer();
    return;
  }

  if (isEventFull(ev)) {
    alert("This event is full. Please try another event.");
    return;
  }

  const layer = document.getElementById("registration-form-layer");
  const titleEl = document.getElementById("registration-event-title");
  const form = document.getElementById("registration-form");
  const participantsList = document.getElementById("registration-participants-list");

  if (titleEl) titleEl.textContent = ev.title;
  if (form) form.dataset.eventId = eventId;

  // Reset and add first participant
  registrationParticipants = [];
  if (participantsList) {
    participantsList.innerHTML = "";
    const firstCard = createParticipantCard(0, true);
    participantsList.appendChild(firstCard);
  }

  updateParticipantCount();
  
  // Reset to information step
  showRegistrationStep('information');
  
  if (layer) {
    layer.style.display = "flex";
    layer.classList.add("open");
  }
}

function closeRegistrationForm() {
  const layer = document.getElementById("registration-form-layer");
  if (layer) {
    layer.classList.remove("open");
    layer.style.display = "none";
  }
  const form = document.getElementById("registration-form");
  if (form) form.reset();
  registrationParticipants = [];
  // Reset to information step
  showRegistrationStep('information');
}

// Flag to prevent accidental submission from Next button
let isSubmittingRegistration = false;

async function submitRegistration(eventId, participantsData) {
  console.log('[Eventify] submitRegistration called - this should ONLY happen from Confirm button');
  
  if (isSubmittingRegistration) {
    console.warn('[Eventify] submitRegistration already in progress, ignoring duplicate call');
    return;
  }
  
  isSubmittingRegistration = true;
  
  // Try API registration if available
  if (useAPI && window.EventifyAPI && window.EventifyAPI.Auth.isLoggedIn()) {
    try {
      const participants = participantsData.map(p => ({
        name: p.fullName,
        email: p.email,
        phone: p.phone,
        birthdate: p.birthdate
      }));
      
      await window.EventifyAPI.Registrations.register(eventId, participants);
      console.log('[Eventify] API registration successful');
      
      // Reload events from API to get updated counts
      await loadEventsFromAPI();
      
      // Also update local registrations array from API for notifications to work
      // This ensures isUserRegistered() can find the registration
      try {
        const myRegsResponse = await window.EventifyAPI.Registrations.getMyRegistrations();
        if (myRegsResponse.success && myRegsResponse.data) {
          // Update local registrations array
          myRegsResponse.data.forEach(reg => {
            const eventIdFromReg = reg.event?._id || reg.event;
            if (eventIdFromReg) {
              if (!registrations[eventIdFromReg]) {
                registrations[eventIdFromReg] = [];
              }
              // Add registration if not already exists
              const exists = registrations[eventIdFromReg].some(r => 
                (r.userId || '').toLowerCase() === currentUser.email.toLowerCase() ||
                (r.email || '').toLowerCase() === currentUser.email.toLowerCase()
              );
              if (!exists) {
                registrations[eventIdFromReg].push({
                  userId: currentUser.email,
                  fullName: reg.participants?.[0]?.name || currentUser.fullName,
                  email: reg.participants?.[0]?.email || currentUser.email,
                  phone: reg.participants?.[0]?.phone || '',
                  birthdate: reg.participants?.[0]?.birthdate || '',
                  registeredAt: reg.registeredAt || new Date().toISOString()
                });
              }
            }
          });
          // Save to localStorage
          saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);
        }
      } catch (regError) {
        console.warn('[Eventify] Failed to load registrations from API after registration:', regError);
        // Continue anyway - notifications might not show but registration is successful
      }
    } catch (error) {
      console.error('[Eventify] API registration failed:', error);
      alert(error.message || 'Registration failed. Please try again.');
      isSubmittingRegistration = false;
      return;
    }
  } else {
    // Fallback to localStorage
    const list = registrations[eventId] || [];
    
    participantsData.forEach((participant) => {
      list.push({
        userId: currentUser.email,
        fullName: participant.fullName,
        phone: participant.phone,
        email: participant.email,
        birthdate: participant.birthdate,
        ticketType: participant.ticketType,
        registeredAt: new Date().toISOString(),
      });
    });

    registrations[eventId] = list;
    saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);
  }

  // Don't close form here - it's already showing completed step
  // The form will be closed when user clicks "Close" button

  renderEventList();
  renderEventCalendar();
  await renderNotifications();
  renderStatistics();
  renderAdminEventList();
  await renderMyRegistrations();
  renderHomeFeaturedList();
  
  isSubmittingRegistration = false;
  console.log('[Eventify] submitRegistration completed');
}

async function toggleRegistration(eventId) {
  if (!currentUser || !currentUser.email) {
    alert("Please sign in or create an account before registering for an event.");
    openAuthLayer();
    return;
  }

  const list = registrations[eventId] || [];
  const existingIndex = list.findIndex((r) => r.userId === currentUser.email);

  if (existingIndex >= 0) {
    // Cancel registration
    if (!confirm("Are you sure you want to cancel your registration for this event?")) {
      return;
    }
    
    // Try API first if available
    if (window.EventifyAPI && window.EventifyAPI.Auth.isLoggedIn()) {
      try {
        // First, try to get the registration ID from API
        const myRegsResponse = await window.EventifyAPI.Registrations.getMyRegistrations();
        if (myRegsResponse.success && myRegsResponse.data) {
          const registration = myRegsResponse.data.find(reg => reg.event === eventId || reg.event?._id === eventId);
          if (registration && registration._id) {
            await window.EventifyAPI.Registrations.cancel(registration._id);
            console.log('[Eventify] Registration cancelled via API');
            
            // Reload events from API to get updated counts
            await loadEventsFromAPI();
          }
        }
      } catch (error) {
        console.error('[Eventify] API cancel registration failed:', error);
        // Fallback to localStorage
        list.splice(existingIndex, 1);
        registrations[eventId] = list;
        saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);
      }
    } else {
      // Fallback to localStorage
      list.splice(existingIndex, 1);
      registrations[eventId] = list;
      saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);
    }

    renderEventList();
    renderEventCalendar();
    await renderNotifications();
    renderStatistics();
    renderAdminEventList();
    await renderMyRegistrations();
    renderHomeFeaturedList();
  } else {
    // Open registration form
    openRegistrationForm(eventId);
  }
}

async function renderNotifications() {
  const container = document.getElementById("upcoming-notifications");
  const headerMenu = document.getElementById("header-notifications-menu");
  const today = new Date(todayISO());

  // Load registrations from API if user is logged in
  if (window.EventifyAPI && window.EventifyAPI.Auth.isLoggedIn() && currentUser && currentUser.email) {
    try {
      const response = await window.EventifyAPI.Registrations.getMyRegistrations();
      if (response.success && response.data) {
        // Update local registrations with API data
        response.data.forEach(reg => {
          const eventId = reg.event?._id || reg.event;
          if (eventId) {
            if (!registrations[eventId]) {
              registrations[eventId] = [];
            }
            // Add registration if not already exists
            const exists = registrations[eventId].some(r => 
              (r.userId || '').toLowerCase() === currentUser.email.toLowerCase() ||
              (r.email || '').toLowerCase() === currentUser.email.toLowerCase()
            );
            if (!exists) {
              registrations[eventId].push({
                userId: currentUser.email,
                fullName: reg.participants?.[0]?.name || currentUser.fullName,
                email: reg.participants?.[0]?.email || currentUser.email,
                phone: reg.participants?.[0]?.phone || '',
                birthdate: reg.participants?.[0]?.birthdate || '',
                registeredAt: reg.registeredAt || new Date().toISOString()
              });
            }
          }
        });
        // Save to localStorage
        saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);
      }
    } catch (error) {
      console.error('[Eventify] Failed to load registrations from API for notifications:', error);
      // Continue with local storage data
    }
  }

  const upcoming = events
    .filter((ev) => isUserRegistered(ev))
    .map((ev) => {
      const d = new Date(ev.date);
      const diffDays = Math.round(
        (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return { ev, diffDays };
    })
    .filter(({ diffDays }) => diffDays >= 0 && diffDays <= 7)
    .sort((a, b) => a.diffDays - b.diffDays);

  // Show/hide notification badge
  const badge = document.getElementById("notification-badge");
  if (badge) {
    if (upcoming.length > 0) {
      badge.style.display = "block";
      badge.textContent = upcoming.length > 9 ? "9+" : upcoming.length.toString();
    } else {
      badge.style.display = "none";
    }
  }

  if (upcoming.length === 0) {
    container.innerHTML = "";
    if (headerMenu) {
      headerMenu.innerHTML =
        '<div class="ef-notification-menu-empty">No upcoming event notifications yet.</div>';
    }
    return;
  }

  container.innerHTML = "";
  if (headerMenu) {
    headerMenu.innerHTML = "";
  }

  upcoming.forEach(({ ev, diffDays }, index) => {
    let statusText;
    if (diffDays === 0) {
      statusText = `Your event is today at ${ev.time}.`;
    } else if (diffDays === 1) {
      statusText = `Your event is tomorrow at ${ev.time}.`;
    } else {
      statusText = `Your event is in ${diffDays} days at ${ev.time}.`;
    }

    const card = document.createElement("div");
    card.className = "ef-notification-card";
    card.innerHTML = `
      <div>
        <div>
          <strong>${ev.title}</strong>
        </div>
        <div class="ef-text-muted">
          ${formatDate(ev.date)} · ${ev.time} · ${ev.location}
        </div>
        <div class="ef-text-muted">
          ${statusText}
        </div>
      </div>
      <div class="ef-chip">
        <span class="ef-chip-dot"></span>
        <span>${
          diffDays === 0
            ? "Today"
            : diffDays === 1
            ? "Tomorrow"
            : `In ${diffDays} days`
        }</span>
      </div>
    `;
    container.appendChild(card);

    // Show ALL items in header menu (not just first 3)
    if (headerMenu) {
      const item = document.createElement("div");
      item.className = "ef-notification-menu-item";
      item.innerHTML = `
        <div class="ef-notification-menu-item-title">${ev.title}</div>
        <div class="ef-notification-menu-item-meta">${statusText}</div>
      `;
      headerMenu.appendChild(item);
    }
  });
  
  console.log('[Eventify] Rendered', upcoming.length, 'notifications in menu');
}


// ----- Places: show events at each sample location -----
function renderPlaceEvents() {
  const cards = document.querySelectorAll(".ef-place-card");
  if (!cards.length) return;

  cards.forEach((card) => {
    const overlay = card.querySelector(".ef-place-overlay");
    if (overlay) overlay.remove();
    card.classList.remove("ef-place-card--no-events");

    const city = card.dataset.placeCity;
    const key = card.dataset.placeKey || "";
    const target = card.querySelector("[data-place-events]");
    if (!target || !city) return;
    let highlight = card.querySelector(".ef-place-highlight");
    if (!highlight) {
      highlight = document.createElement("div");
      highlight.className = "ef-place-highlight";
      highlight.setAttribute("role", "status");
      card.insertBefore(highlight, target);
    }

    const toggleCard = () => {
      const willExpand = !card.classList.contains("ef-place-card--expanded");

      cards.forEach((c) => {
        c.classList.remove("ef-place-card--expanded");
        c.classList.remove("ef-place-card--highlight");
      });

      if (willExpand) {
        card.classList.add("ef-place-card--expanded");
        if (!card.classList.contains("ef-place-card--no-events")) {
          card.classList.add("ef-place-card--highlight");
        }
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    if (!card.dataset.boundPlaceClick) {
      card.addEventListener("click", toggleCard);
      card.dataset.boundPlaceClick = "true";
    }

    const thumb = card.querySelector(".ef-place-thumb");
    if (thumb && !thumb.dataset.boundPlaceThumb) {
      thumb.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleCard();
      });
      thumb.dataset.boundPlaceThumb = "true";
    }

    const matchedByKey = events.filter((ev) => {
      if (ev.city !== city) return false;
      if (!key) return true;
      return (ev.location || "").toLowerCase().includes(key.toLowerCase());
    });

    // Fallback: if no location-key match, at least show events in the same city
    const matched =
      matchedByKey.length > 0
        ? matchedByKey
        : events.filter((ev) => ev.city === city);

    target.innerHTML = "";
    card.classList.remove("ef-place-card--highlight");

    if (matched.length === 0) {
      const emptyOverlay = document.createElement("div");
      emptyOverlay.className = "ef-place-overlay";
      emptyOverlay.innerHTML = `
        <div class="ef-place-overlay-content">
          <strong>No events linked yet</strong>
          <span>This venue doesn't have any events right now.</span>
        </div>
      `;
      card.appendChild(emptyOverlay);
      card.classList.add("ef-place-card--no-events");
      highlight.innerHTML = `
        <div class="ef-place-highlight-title">No events yet</div>
        <div class="ef-place-highlight-body">
          <span>We will announce upcoming programs for this venue soon.</span>
        </div>
      `;
      target.innerHTML =
        '<div class="ef-place-events-item ef-place-events-meta">No events linked to this venue yet.</div>';
      return;
    }

    const spotlight = matched[0];
    highlight.innerHTML = `
      <div class="ef-place-highlight-title">Upcoming here</div>
      <div class="ef-place-highlight-body">
        ${spotlight.title}
        <span>${formatDate(spotlight.date)} · ${spotlight.time}</span>
      </div>
    `;

    matched
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3)
      .forEach((ev) => {
        const item = document.createElement("div");
        item.className = "ef-place-events-item";
        item.innerHTML = `
          <span class="ef-place-events-title">${ev.title}</span>
          <span class="ef-place-events-meta">
            · ${formatDate(ev.date)} · ${ev.time}
          </span>
        `;
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          openEventDetail(ev);
        });
        target.appendChild(item);
      });
  });
}

// ----- Calendar -----
function renderEventCalendar() {
  const container = document.getElementById("calendar-list");
  const labelEl = document.getElementById("calendar-month-label");
  if (!container) return;

  const today = new Date();
  const base = new Date(today);

  if (calendarViewMode === "week") {
    base.setDate(base.getDate() + calendarViewOffset * 7);
    const weekStart = getStartOfWeek(base);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    if (labelEl) {
      const startLabel = weekStart.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
      const endLabel = weekEnd.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      labelEl.textContent = `Week of ${startLabel} – ${endLabel}`;
    }

    container.dataset.view = "week";
    renderWeekCalendar(container, weekStart, today);
    return;
  }

  if (calendarViewMode === "day") {
    base.setDate(base.getDate() + calendarViewOffset);
    if (labelEl) {
      labelEl.textContent = base.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    container.dataset.view = "day";
    renderDayCalendar(container, base, today);
    return;
  }

  base.setMonth(base.getMonth() + calendarViewOffset);
  if (labelEl) {
    labelEl.textContent = base.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  }

  container.dataset.view = "month";
  renderMonthCalendar(container, base, today);
}

function renderMonthCalendar(container, baseDate, today) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const eventsByDay = {};
  events.forEach((ev) => {
    if (!ev.date) return;
    const d = new Date(ev.date);
    if (Number.isNaN(d.getTime())) return;
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(ev);
  });

  container.innerHTML = "";

  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  weekdayNames.forEach((name) => {
    const el = document.createElement("div");
    el.className = "ef-calendar-weekday";
    el.textContent = name;
    container.appendChild(el);
  });

  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // shift so Monday is first

  for (let i = 0; i < 42; i++) {
    const dayNumber = i - startOffset + 1;
    const cell = document.createElement("div");

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      cell.className = "ef-calendar-cell ef-calendar-cell--empty";
      container.appendChild(cell);
      continue;
    }

    const currentDate = new Date(year, month, dayNumber);
    cell.className = "ef-calendar-cell";
    if (isSameDate(currentDate, today)) {
      cell.classList.add("ef-calendar-cell--today");
    }

    const dayEl = document.createElement("div");
    dayEl.className = "ef-calendar-cell-day";
    dayEl.textContent = String(dayNumber);
    cell.appendChild(dayEl);

    const eventsEl = document.createElement("div");
    eventsEl.className = "ef-calendar-cell-events";

    const items = (eventsByDay[dayNumber] || []).sort((a, b) =>
      (a.time || "").localeCompare(b.time || "")
    );

    if (items.length === 0) {
      const meta = document.createElement("div");
      meta.className = "ef-calendar-event-meta";
      meta.textContent = "No events";
      eventsEl.appendChild(meta);
    } else {
      items.slice(0, 2).forEach((ev) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ef-calendar-event";
        btn.innerHTML = `
          ${ev.title}
          <div class="ef-calendar-event-meta">
            ${ev.time} · ${ev.city}
          </div>
        `;
        btn.addEventListener("click", () => openEventDetail(ev));
        eventsEl.appendChild(btn);
      });

      if (items.length > 2) {
        const more = document.createElement("div");
        more.className = "ef-calendar-event-more";
        more.textContent = `+${items.length - 2} more`;
        eventsEl.appendChild(more);
      }
    }

    cell.appendChild(eventsEl);
    container.appendChild(cell);
  }
}

function renderWeekCalendar(container, weekStart, today) {
  container.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const current = new Date(weekStart);
    current.setDate(weekStart.getDate() + i);

    const cell = document.createElement("div");
    cell.className = "ef-calendar-cell";
    if (isSameDate(current, today)) {
      cell.classList.add("ef-calendar-cell--today");
    }

    const dayEl = document.createElement("div");
    dayEl.className = "ef-calendar-cell-day";
    dayEl.textContent = `${current.toLocaleDateString("en-GB", {
      weekday: "short",
    })} ${current.getDate()}`;
    cell.appendChild(dayEl);

    const eventsEl = document.createElement("div");
    eventsEl.className = "ef-calendar-cell-events";
    const items = getEventsForDate(current);

    if (items.length === 0) {
      const meta = document.createElement("div");
      meta.className = "ef-calendar-event-meta";
      meta.textContent = "No events";
      eventsEl.appendChild(meta);
    } else {
      items.forEach((ev) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ef-calendar-event";
        btn.innerHTML = `
          ${ev.title}
          <div class="ef-calendar-event-meta">
            ${ev.time} · ${ev.city}
          </div>
        `;
        btn.addEventListener("click", () => openEventDetail(ev));
        eventsEl.appendChild(btn);
      });
    }

    cell.appendChild(eventsEl);
    container.appendChild(cell);
  }
}

function renderDayCalendar(container, targetDate, today) {
  container.innerHTML = "";

  const card = document.createElement("div");
  card.className = "ef-calendar-day-card";
  if (isSameDate(targetDate, today)) {
    card.classList.add("ef-calendar-day-card--today");
  }

  const heading = document.createElement("div");
  heading.className = "ef-calendar-day-heading";

  const headingTitle = document.createElement("div");
  headingTitle.className = "ef-calendar-day-heading-weekday";
  headingTitle.textContent = targetDate.toLocaleDateString("en-GB", {
    weekday: "long",
  });

  const headingDate = document.createElement("div");
  headingDate.className = "ef-calendar-day-heading-date";
  headingDate.textContent = targetDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  heading.appendChild(headingTitle);
  heading.appendChild(headingDate);

  const eventsWrap = document.createElement("div");
  eventsWrap.className = "ef-calendar-day-events";
  const items = getEventsForDate(targetDate);

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "ef-calendar-day-empty";
    empty.textContent = "No events scheduled for this day.";
    eventsWrap.appendChild(empty);
  } else {
    items.forEach((ev) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ef-calendar-day-event";
      btn.innerHTML = `
        <div class="ef-calendar-day-event-title">${ev.title}</div>
        <div class="ef-calendar-day-event-meta">
          <span>${ev.time}</span>
          <span>${ev.city}</span>
          <span>${ev.location || "Location TBA"}</span>
        </div>
      `;
      btn.addEventListener("click", () => openEventDetail(ev));
      eventsWrap.appendChild(btn);
    });
  }

  card.appendChild(heading);
  card.appendChild(eventsWrap);
  container.appendChild(card);
}

// Home: featured & upcoming events (with its own filters)
function getHomeFilterValues() {
  const city = document.getElementById("home-filter-city");
  const category = document.getElementById("home-filter-category");
  const date = document.getElementById("home-filter-date");
  const search = document.getElementById("home-filter-search");

  return {
    city: city ? city.value : "",
    category: category ? category.value : "",
    date: date ? date.value : "",
    search: search ? search.value.trim().toLowerCase() : "",
  };
}

function applyHomeFiltersToEvents() {
  const today = todayISO();
  const { city, category, date, search } = getHomeFilterValues();

  return events
    .filter((ev) => !ev.date || ev.date >= today)
    .filter((ev) => {
      const matchesCity = !city || ev.city === city;
      const matchesCategory = !category || ev.category === category;
      const matchesDate = !date || ev.date === date;
      const searchTarget = (ev.title + " " + ev.description)
        .toLowerCase()
        .trim();
      const matchesSearch = !search || searchTarget.includes(search);
      return matchesCity && matchesCategory && matchesDate && matchesSearch;
    });
}

function renderHomeFeaturedList() {
  const container = document.getElementById("home-featured-list");
  if (!container) return;

  const items = applyHomeFiltersToEvents()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  if (items.length === 0) {
    container.innerHTML =
      '<div class="ef-empty-state">No upcoming events match your filters on the home view.</div>';
    return;
  }

  container.innerHTML = "";

  items.forEach((ev) => {
    const regs = registrations[ev.id] || [];
    const userReg = isUserRegistered(ev);
    const isFull = isEventFull(ev);
    const filledRatio = ev.capacity > 0 ? regs.length / ev.capacity : 0;
    const card = document.createElement("article");
    card.className = "ef-card";

    const homeCardImage = resolveImageSrc(ev.imageUrl);
    if (homeCardImage) {
      const imgWrapper = document.createElement("div");
      imgWrapper.className = "ef-card-image-wrapper";

      const img = document.createElement("img");
      img.className = "ef-card-image";
      img.src = homeCardImage;
      img.alt = ev.title;
      img.loading = "lazy";

      const overlay = document.createElement("div");
      overlay.className = "ef-card-image-overlay";

      const labels = document.createElement("div");
      labels.className = "ef-card-image-labels";
      labels.innerHTML = `
        <div>
          <div class="ef-card-image-title">${ev.title}</div>
          <div class="ef-card-image-meta">${ev.city} &middot; ${ev.category}</div>
        </div>
      `;

      const dateBadge = document.createElement("div");
      dateBadge.className = "ef-card-date";
      dateBadge.innerHTML = `
        <span class="ef-card-date-day">${formatDay(ev.date)}</span>
        <span class="ef-card-date-month">${formatMonth(ev.date)}</span>
      `;

      imgWrapper.appendChild(img);
      imgWrapper.appendChild(overlay);
      imgWrapper.appendChild(labels);
      imgWrapper.appendChild(dateBadge);
      card.appendChild(imgWrapper);
    }

    const header = document.createElement("div");
    header.className = "ef-card-header";
    header.innerHTML = `
      <div class="ef-card-header-main">
        <div class="ef-card-category">${ev.category}</div>
        <div class="ef-card-title">${ev.title}</div>
        <div class="ef-card-meta-row">
          <span class="ef-card-meta-icon ef-icon-location"></span>
          <span class="ef-card-meta-text">${ev.location}</span>
        </div>
        <div class="ef-card-meta-row">
          <span class="ef-card-meta-icon ef-icon-calendar"></span>
          <span class="ef-card-meta-text">${formatDate(ev.date)}</span>
        </div>
        <div class="ef-card-meta-row">
          <span class="ef-card-meta-icon ef-icon-clock"></span>
          <span class="ef-card-meta-text">${ev.time}</span>
        </div>
      </div>
      <div class="ef-tag-row">
        <span class="ef-tag">${ev.city}</span>
        <span class="ef-tag ef-tag-outline">${ev.category}</span>
      </div>
    `;

    const body = document.createElement("div");
    body.className = "ef-card-body";
    body.textContent = ev.description;

    const footer = document.createElement("div");
    footer.className = "ef-card-footer";
    footer.innerHTML = `
      <div class="ef-capacity">
        <span class="ef-text-muted">${regs.length} / ${ev.capacity} registered</span>
        <div class="ef-capacity-bar">
          <div class="ef-capacity-bar-fill" style="width: ${
            filledRatio * 100
          }%"></div>
        </div>
      </div>
      <div>
        ${
          isFull
            ? '<span class="ef-badge ef-badge-full">Event is full</span>'
            : userReg
            ? '<span class="ef-badge ef-badge-success">You are registered</span>'
            : ""
        }
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "ef-card-actions";

    const detailBtn = document.createElement("button");
    detailBtn.className = "ef-btn ef-btn-ghost ef-btn-sm";
    detailBtn.textContent = "View details";
    detailBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openEventDetail(ev);
    });

    const registerBtn = document.createElement("button");
    registerBtn.className = "ef-btn ef-btn-sm";
    registerBtn.dataset.eventId = ev.id;

    if (userReg) {
      registerBtn.textContent = "Cancel";
      registerBtn.classList.add("ef-btn-ghost");
    } else if (isFull) {
      registerBtn.textContent = "Full";
      registerBtn.disabled = true;
    } else {
      registerBtn.textContent = "Register";
    }

    registerBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isEventFull(ev) && !isUserRegistered(ev)) return;
      toggleRegistration(ev.id);
    });

    actions.appendChild(detailBtn);
    actions.appendChild(registerBtn);

    card.addEventListener("click", () => openEventDetail(ev));

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    card.appendChild(actions);

    container.appendChild(card);
  });
}

// ----- Success Notification/Toast -----

function showSuccessNotification(message, duration = 3000) {
  // Remove existing notification if any
  const existing = document.getElementById('admin-success-notification');
  if (existing) {
    existing.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'admin-success-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: #ffffff;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 500;
    font-size: 0.9rem;
    max-width: 400px;
    animation: slideInRight 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <span style="font-size: 1.25rem;">✓</span>
    <span>${message}</span>
  `;
  
  // Add animation keyframes if not already added
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto remove after duration
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, duration);
}

// ----- Admin View -----

function fillEventForm(ev) {
  document.getElementById("event-id").value = ev.id;
  document.getElementById("event-title").value = ev.title;
  document.getElementById("event-city").value = ev.city;
  document.getElementById("event-category").value = ev.category;
  document.getElementById("event-date").value = ev.date;
  document.getElementById("event-time").value = ev.time;
  document.getElementById("event-location").value = ev.location;
  document.getElementById("event-capacity").value = ev.capacity;
  document.getElementById("event-image").value = ev.imageUrl || "";
  document.getElementById("event-description").value = ev.description;
  
  // Switch to Create Event section
  const createLink = document.querySelector('[data-admin-section="admin-create"]');
  if (createLink) {
    createLink.click();
  }
}

function resetEventForm() {
  document.getElementById("event-form").reset();
  document.getElementById("event-id").value = "";
}

async function handleEventFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("event-id").value;
  const title = document.getElementById("event-title").value.trim();
  const city = document.getElementById("event-city").value;
  const category = document.getElementById("event-category").value;
  const date = document.getElementById("event-date").value;
  const time = document.getElementById("event-time").value;
  const location = document.getElementById("event-location").value.trim();
  const capacity = parseInt(
    document.getElementById("event-capacity").value,
    10
  );
  const imageUrl = document.getElementById("event-image").value.trim();
  const description = document
    .getElementById("event-description")
    .value.trim();

  if (!title || !city || !category || !date || !time || !location || !capacity) {
    alert("Please fill in all required fields.");
    return;
  }

  const eventPayload = {
    title,
    city,
    category,
    date,
    time,
    location,
    capacity,
    description,
    imageUrl: imageUrl || "",
  };

  // Try API if available
  if (useAPI && window.EventifyAPI && window.EventifyAPI.Admin.isLoggedIn()) {
    try {
      if (id) {
        // Update existing event
        await window.EventifyAPI.Events.update(id, eventPayload);
        console.log('[Eventify] Event updated via API');
        showSuccessNotification('Event updated successfully!');
      } else {
        // Create new event
        await window.EventifyAPI.Events.create(eventPayload);
        console.log('[Eventify] Event created via API');
        showSuccessNotification('Event created successfully!');
      }
      
      // Reload events from API
      await loadEventsFromAPI();
      
      resetEventForm();
      renderEventList();
      renderEventCalendar();
      renderAdminEventList();
      renderStatistics();
      renderPlaceEvents();
      renderHomeFeaturedList();
      return;
    } catch (error) {
      console.error('[Eventify] API event save failed:', error);
      alert(error.message || 'Failed to save event. Please try again.');
      return;
    }
  }

  // Fallback to localStorage
  const localId = id || generateId();
  eventPayload.id = localId;
  
  const existingIndex = events.findIndex((ev) => ev.id === localId);

  if (existingIndex >= 0) {
    events[existingIndex] = eventPayload;
  } else {
    events.push(eventPayload);
    registrations[localId] = [];
  }

  saveToStorage(STORAGE_KEY_EVENTS, events);
  saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);

  // Show success message
  if (existingIndex >= 0) {
    showSuccessNotification('Event updated successfully!');
  } else {
    showSuccessNotification('Event created successfully!');
  }

  resetEventForm();
  renderEventList();
  renderEventCalendar();
  renderAdminEventList();
  renderStatistics();
  renderPlaceEvents();
}

async function deleteEvent(id) {
  if (!confirm("Are you sure you want to delete this event?")) return;
  
  // Try API if available
  if (useAPI && window.EventifyAPI && window.EventifyAPI.Admin.isLoggedIn()) {
    try {
      await window.EventifyAPI.Events.delete(id);
      console.log('[Eventify] Event deleted via API');
      
      // Reload events from API
      await loadEventsFromAPI();
      
      showSuccessNotification('Event deleted successfully!');
      
      renderEventList();
      renderEventCalendar();
      renderAdminEventList();
      renderStatistics();
      renderPlaceEvents();
      renderHomeFeaturedList();
      return;
    } catch (error) {
      console.error('[Eventify] API event delete failed:', error);
      alert(error.message || 'Failed to delete event. Please try again.');
      return;
    }
  }

  // Fallback to localStorage
  const index = events.findIndex((ev) => ev.id === id);
  if (index >= 0) {
    events.splice(index, 1);
  }
  delete registrations[id];

  saveToStorage(STORAGE_KEY_EVENTS, events);
  saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);

  showSuccessNotification('Event deleted successfully!');

  renderEventList();
  renderEventCalendar();
  renderAdminEventList();
  renderStatistics();
  renderPlaceEvents();
}

function renderAdminEventList() {
  const container = document.getElementById("admin-event-list");
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML =
      '<div class="ef-empty-state">No events created yet. Use the Create Event form to add the first event.</div>';
    return;
  }

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  container.innerHTML = "";

  sorted.forEach((ev) => {
    const regs = registrations[ev.id] || [];
    const item = document.createElement("div");
    item.className = "ef-list-item";
    item.innerHTML = `
      <div class="ef-list-item-main">
        <span class="ef-list-item-title">${ev.title}</span>
        <span class="ef-list-item-meta">
          ${formatDate(ev.date)} · ${ev.time} · ${ev.city} · ${ev.category}
        </span>
      </div>
      <div class="ef-list-item-actions">
        <span class="ef-chip">
          <span class="${
            regs.length >= ev.capacity
              ? "ef-chip-dot"
              : "ef-chip-dot ef-chip-dot-muted"
          }"></span>
          <span>${regs.length}/${ev.capacity}</span>
        </span>
        <button class="ef-btn ef-btn-ghost" data-view-registrations="${ev.id}">View Registrations</button>
        <button class="ef-btn ef-btn-ghost" data-edit-id="${ev.id}">Edit</button>
        <button class="ef-btn ef-btn-danger" data-delete-id="${ev.id}">Delete</button>
      </div>
    `;

    const viewRegBtn = item.querySelector("[data-view-registrations]");
    const editBtn = item.querySelector("[data-edit-id]");
    const deleteBtn = item.querySelector("[data-delete-id]");

    if (viewRegBtn) {
      viewRegBtn.addEventListener("click", () => showEventRegistrations(ev.id, ev.title));
    }
    editBtn.addEventListener("click", () => fillEventForm(ev));
    deleteBtn.addEventListener("click", () => deleteEvent(ev.id));

    container.appendChild(item);
  });
}

// Show event registrations in admin panel
async function showEventRegistrations(eventId, eventTitle) {
  console.log('[Eventify] showEventRegistrations called:', eventId, eventTitle);
  
  // Create or get modal
  let modal = document.getElementById('admin-registrations-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'admin-registrations-modal';
    modal.className = 'ef-detail-layer';
    modal.innerHTML = `
      <div class="ef-detail-panel" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
        <button class="ef-detail-close" id="admin-registrations-close">&times;</button>
        <h2 id="admin-registrations-title" style="margin-top: 0; margin-bottom: 1rem;">Event Registrations</h2>
        <div id="admin-registrations-content">
          <div class="ef-empty-state">Loading...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close button
    const closeBtn = modal.querySelector('#admin-registrations-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }
  
  // Update title
  const titleEl = document.getElementById('admin-registrations-title');
  if (titleEl) {
    titleEl.textContent = `Registrations: ${eventTitle}`;
  }
  
  // Show modal
  modal.style.display = 'flex';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  
  const contentEl = document.getElementById('admin-registrations-content');
  if (!contentEl) {
    console.error('[Eventify] Content element not found');
    return;
  }
  
  contentEl.innerHTML = '<div class="ef-empty-state">Loading...</div>';
  
  try {
    // Try API first
    if (useAPI && window.EventifyAPI && window.EventifyAPI.Admin.isLoggedIn()) {
      console.log('[Eventify] Fetching registrations from API for event:', eventId);
      const response = await window.EventifyAPI.Admin.getEventRegistrations(eventId);
      console.log('[Eventify] API response:', response);
      if (response.success && response.data) {
        renderEventRegistrationsList(contentEl, response.data, eventTitle);
        return;
      }
    }
    
    // Fallback to local data
    console.log('[Eventify] Using local registrations data');
    const localRegs = registrations[eventId] || [];
    console.log('[Eventify] Local registrations:', localRegs);
    if (localRegs.length === 0) {
      contentEl.innerHTML = '<div class="ef-empty-state">No registrations yet for this event.</div>';
    } else {
      renderEventRegistrationsList(contentEl, localRegs.map(reg => ({
        _id: reg.id || Math.random().toString(36),
        user: {
          name: reg.fullName || 'Unknown',
          email: reg.email || 'No email',
          phone: reg.phone || 'No phone',
          city: reg.city || 'Unknown'
        },
        participants: reg.participants || [reg],
        registeredAt: reg.registeredAt || new Date().toISOString()
      })), eventTitle);
    }
  } catch (error) {
    console.error('[Eventify] Failed to load registrations:', error);
    contentEl.innerHTML = `<div class="ef-empty-state">Error loading registrations: ${error.message}</div>`;
  }
}

function renderEventRegistrationsList(container, registrationsList, eventTitle) {
  if (!registrationsList || registrationsList.length === 0) {
    container.innerHTML = '<div class="ef-empty-state">No registrations yet for this event.</div>';
    return;
  }
  
  container.innerHTML = `
    <div style="margin-bottom: 1rem; padding: 1rem; background: #f8fafc; border-radius: 0.5rem;">
      <strong>Total Registrations:</strong> ${registrationsList.length}
    </div>
    <div class="ef-list">
    </div>
  `;
  
  const listContainer = container.querySelector('.ef-list');
  if (!listContainer) {
    console.error('[Eventify] List container not found');
    return;
  }
  
  registrationsList.forEach((reg, index) => {
    const user = reg.user || {};
    const participants = reg.participants || (reg.participant ? [reg.participant] : []);
    
    const item = document.createElement('div');
    item.className = 'ef-list-item';
    item.style.marginBottom = '1rem';
    item.style.padding = '1rem';
    item.style.border = '1px solid #e2e8f0';
    item.style.borderRadius = '0.5rem';
    item.style.background = '#ffffff';
    
    item.innerHTML = `
      <div class="ef-list-item-main">
        <span class="ef-list-item-title">${user.name || user.email || 'Unknown User'}</span>
        <span class="ef-list-item-meta">
          ${user.email || 'No email'}${user.phone ? ' · ' + user.phone : ''}${user.city ? ' · ' + user.city : ''}
        </span>
        ${participants && participants.length > 0 ? `
          <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0;">
            <strong style="font-size: 0.875rem; color: #64748b;">Participants (${participants.length}):</strong>
            <ul style="margin: 0.25rem 0 0 0; padding-left: 1.5rem; font-size: 0.875rem; color: #475569;">
              ${participants.map(p => {
                const name = p.fullName || p.name || 'Unknown';
                const birthYear = p.birthdate ? new Date(p.birthdate).getFullYear() : null;
                return `<li>${name}${birthYear ? ' (Born: ' + birthYear + ')' : ''}</li>`;
              }).join('')}
            </ul>
          </div>
        ` : ''}
        <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #94a3b8;">
          Registered: ${formatDate(reg.registeredAt || reg.createdAt || new Date().toISOString())}
        </div>
      </div>
    `;
    
    listContainer.appendChild(item);
  });
}

async function getAllRegisteredUsers() {
  // Try to get users from API first
  if (window.EventifyAPI && window.EventifyAPI.Admin.isLoggedIn()) {
    try {
      const response = await window.EventifyAPI.Admin.getAllUsers();
      if (response.success && response.data) {
        // Convert API users to frontend format
        const apiUsers = response.data.map(user => ({
          id: user._id || user.id,
          name: user.name || user.email,
          email: user.email,
          city: user.city || "Unknown",
          role: "citizen",
          phone: user.phone || '',
          birthdate: user.birthdate || '',
          emailVerified: user.emailVerified || false,
          source: "api",
          createdAt: user.createdAt || user.registeredAt
        }));
        
        // Also get local users for fallback
        const localUsers = getAllRegisteredUsersLocal();
        
        // Merge API and local users, avoiding duplicates by email
        const allUsers = [];
        const emailMap = new Map();
        
        // First add API users (they are the source of truth)
        apiUsers.forEach(user => {
          if (!emailMap.has(user.email.toLowerCase())) {
            emailMap.set(user.email.toLowerCase(), user);
            allUsers.push(user);
          }
        });
        
        // Then add local users that don't exist in API
        localUsers.forEach(user => {
          const emailLower = user.email.toLowerCase();
          if (!emailMap.has(emailLower)) {
            emailMap.set(emailLower, user);
            allUsers.push(user);
          }
        });
        
        return allUsers;
      }
    } catch (error) {
      console.error('[Eventify] Failed to load users from API:', error);
      // Fallback to local users
    }
  }
  
  // Fallback to local users only
  return getAllRegisteredUsersLocal();
}

function getAllRegisteredUsersLocal() {
  // Get managed users
  const managed = Array.isArray(managedUsers) ? [...managedUsers] : [];
  
  // Get auth users from storage (if multiple users exist)
  const authUser = loadFromStorage(STORAGE_KEY_AUTH_USER, null);
  
  // Get unique users from registrations
  const registeredEmails = new Set();
  const usersFromRegistrations = [];
  
  if (registrations && typeof registrations === 'object') {
    Object.values(registrations).forEach((regList) => {
      if (Array.isArray(regList)) {
        regList.forEach((reg) => {
          if (reg.email && !registeredEmails.has(reg.email.toLowerCase())) {
            registeredEmails.add(reg.email.toLowerCase());
            usersFromRegistrations.push({
              id: `reg-${reg.email}`,
              name: reg.fullName || reg.email,
              email: reg.email,
              city: reg.city || "Unknown",
              role: "citizen",
              source: "registration"
            });
          }
        });
      }
    });
  }
  
  // Add auth user if exists and not already in managed users
  if (authUser && authUser.email) {
    const existsInManaged = managed.some(u => u.email && u.email.toLowerCase() === authUser.email.toLowerCase());
    if (!existsInManaged) {
      managed.push({
        id: `auth-${authUser.email}`,
        name: authUser.fullName || authUser.email,
        email: authUser.email,
        city: authUser.country || "Unknown",
        role: "citizen",
        source: "auth"
      });
    }
  }
  
  // Combine all users, avoiding duplicates by email
  const allUsers = [];
  const emailMap = new Map();
  
  // First add managed users
  managed.forEach(user => {
    if (user.email && !emailMap.has(user.email.toLowerCase())) {
      emailMap.set(user.email.toLowerCase(), user);
      allUsers.push(user);
    }
  });
  
  // Then add users from registrations
  usersFromRegistrations.forEach(user => {
    if (user.email && !emailMap.has(user.email.toLowerCase())) {
      emailMap.set(user.email.toLowerCase(), user);
      allUsers.push(user);
    }
  });
  
  return allUsers;
}

async function renderAdminUserList() {
  const container = document.getElementById("admin-user-list");
  const countBadge = document.getElementById("user-count-badge");
  if (!container) return;

  const allUsers = await getAllRegisteredUsers();
  
  // Update user count badge
  if (countBadge) {
    countBadge.textContent = `${allUsers.length} user${allUsers.length !== 1 ? 's' : ''}`;
  }

  if (allUsers.length === 0) {
    container.innerHTML =
      '<div class="ef-empty-state">No users have been added yet.</div>';
    return;
  }

  container.innerHTML = "";
  const sorted = [...allUsers].sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email)
  );

  sorted.forEach((user) => {
    const item = document.createElement("div");
    item.className = "ef-list-item";
    const userName = user.name || user.email || "Unknown";
    const userEmail = user.email || "No email";
    const userCity = user.city || "Unknown";
    const userRole = user.role || "citizen";
    const isManagedUser = user.id && !user.id.startsWith("reg-") && !user.id.startsWith("auth-");
    
    item.innerHTML = `
      <div class="ef-list-item-main">
        <span class="ef-list-item-title">${userName}</span>
        <span class="ef-list-item-meta">${userEmail} · ${userCity}</span>
      </div>
      <div class="ef-list-item-actions">
        <span class="ef-chip">
          <span class="ef-chip-dot"></span>
          <span>${userRole}</span>
        </span>
        <button class="ef-btn ef-btn-ghost" data-edit-user="${user.id}" data-user-email="${userEmail}">Edit</button>
        ${isManagedUser ? `<button class="ef-btn ef-btn-danger" data-delete-user="${user.id}">Delete</button>` : ''}
      </div>
    `;

    const editBtn = item.querySelector("[data-edit-user]");
    if (editBtn) {
      editBtn.addEventListener("click", () => fillUserForm(user));
    }
    
    const deleteBtn = item.querySelector("[data-delete-user]");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm(`Are you sure you want to delete user "${userName}"?`)) {
          deleteManagedUser(user.id);
        }
      });
    }

    container.appendChild(item);
  });
}

function fillUserForm(user) {
  const idField = document.getElementById("managed-user-id");
  const nameField = document.getElementById("managed-user-name");
  const emailField = document.getElementById("managed-user-email");
  const cityField = document.getElementById("managed-user-city");
  const roleField = document.getElementById("managed-user-role");
  
  if (idField) idField.value = user.id || "";
  if (nameField) nameField.value = user.name || "";
  if (emailField) emailField.value = user.email || "";
  if (cityField) cityField.value = user.city || "";
  if (roleField) roleField.value = user.role || "citizen";
  
  // Scroll to form
  const form = document.getElementById("managed-user-form");
  if (form) {
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function resetUserForm() {
  const form = document.getElementById("managed-user-form");
  if (!form) return;
  form.reset();
  document.getElementById("managed-user-id").value = "";
}

async function deleteManagedUser(userId) {
  if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
  
  // Try API deletion if available and user is from API
  if (window.EventifyAPI && window.EventifyAPI.Admin.isLoggedIn()) {
    // Check if userId looks like MongoDB ID (24 hex characters) or if it's an API user
    const isAPIUser = userId.length === 24 || /^[0-9a-fA-F]{24}$/.test(userId);
    
    if (isAPIUser) {
      try {
        await window.EventifyAPI.Admin.deleteUser(userId);
        console.log('[Eventify] User deleted via API');
        // Reload user list from API
        await renderAdminUserList();
        return;
      } catch (error) {
        console.error('[Eventify] API user delete failed:', error);
        alert(error.message || 'Failed to delete user. Please try again.');
        return;
      }
    }
  }
  
  // Fallback: delete from local managed users
  const userIndex = managedUsers.findIndex((u) => u.id === userId);
  if (userIndex >= 0) {
    managedUsers.splice(userIndex, 1);
    saveToStorage(STORAGE_KEY_MANAGED_USERS, managedUsers);
    await renderAdminUserList();
  } else {
    alert('User not found in local storage. If this is an API user, please ensure you are logged in as admin.');
  }
}

// ----- Statistics -----

function renderStatistics() {
  const totalEventsEl = document.getElementById("stat-total-events");
  const totalRegsEl = document.getElementById("stat-total-registrations");
  const avgEl = document.getElementById("stat-average-participants");
  const eventAttendanceContainer = document.getElementById(
    "stat-event-attendance"
  );
  const categoriesContainer = document.getElementById(
    "stat-popular-categories"
  );

  const totalEvents = events.length;
  let totalRegistrations = 0;
  const attendanceByEvent = [];
  const registrationsByCategory = {};

  events.forEach((ev) => {
    const regs = registrations[ev.id] || [];
    totalRegistrations += regs.length;
    attendanceByEvent.push({
      title: ev.title,
      city: ev.city,
      count: regs.length,
      capacity: ev.capacity,
    });
    if (!registrationsByCategory[ev.category]) {
      registrationsByCategory[ev.category] = 0;
    }
    registrationsByCategory[ev.category] += regs.length;
  });

  const average =
    totalEvents === 0 ? 0 : (totalRegistrations / totalEvents).toFixed(1);

  totalEventsEl.textContent = totalEvents;
  totalRegsEl.textContent = totalRegistrations;
  avgEl.textContent = average;

  // Attendees per event
  if (attendanceByEvent.length === 0) {
    if (eventAttendanceContainer) {
      eventAttendanceContainer.innerHTML =
        '<div class="ef-empty-state">No attendance data available yet.</div>';
    }
  } else {
    const sortedEvents = attendanceByEvent.sort(
      (a, b) => b.count - a.count
    );
    if (eventAttendanceContainer) {
      eventAttendanceContainer.innerHTML = "";
      sortedEvents.forEach((ev) => {
        const item = document.createElement("div");
        item.className = "ef-list-item";
        const ratio =
          ev.capacity > 0 ? Math.round((ev.count / ev.capacity) * 100) : 0;
        item.innerHTML = `
          <div class="ef-list-item-main">
            <span class="ef-list-item-title">${ev.title}</span>
            <span class="ef-list-item-meta">${ev.city}</span>
          </div>
          <div class="ef-list-item-actions">
            <span class="ef-text-muted">${ev.count} / ${ev.capacity}</span>
            <span class="ef-badge">${ratio}%</span>
          </div>
        `;
        eventAttendanceContainer.appendChild(item);
      });
    }
  }

  // Popular categories - include all categories even with 0 registrations
  const allCategories = ["Sports", "Culture", "Education", "Environment", "Music & Entertainment"];
  const catEntries = allCategories.map(cat => [cat, registrationsByCategory[cat] || 0]);
  
  if (categoriesContainer) {
    if (catEntries.length === 0) {
      categoriesContainer.innerHTML =
        '<div class="ef-empty-state">No registrations yet for any category.</div>';
    } else {
      const sortedCats = catEntries.sort((a, b) => b[1] - a[1]);
      categoriesContainer.innerHTML = "";
      sortedCats.forEach(([category, count]) => {
        const item = document.createElement("div");
        item.className = "ef-list-item";
        item.innerHTML = `
          <div class="ef-list-item-main">
            <span class="ef-list-item-title">${category}</span>
            <span class="ef-list-item-meta">Total registrations</span>
          </div>
          <div class="ef-list-item-actions">
            <span class="ef-badge">${count}</span>
          </div>
        `;
        categoriesContainer.appendChild(item);
      });
    }
  }
}

// ----- Init -----

function setupFilters() {
  const city = document.getElementById("filter-city");
  const category = document.getElementById("filter-category");
  const date = document.getElementById("filter-date");
  const search = document.getElementById("filter-search");
  const clearBtn = document.getElementById("clear-filters");

  [city, category, date].forEach((el) => {
    el.addEventListener("change", () => {
      renderEventList();
      renderEventCalendar();
    });
  });

  search.addEventListener("input", () => {
    renderEventList();
    renderEventCalendar();
  });

  clearBtn.addEventListener("click", () => {
    city.value = "";
    category.value = "";
    date.value = "";
    search.value = "";
    renderEventList();
    renderEventCalendar();
  });
}

function setupHomeFilters() {
  const city = document.getElementById("home-filter-city");
  const category = document.getElementById("home-filter-category");
  const date = document.getElementById("home-filter-date");
  const search = document.getElementById("home-filter-search");
  const clearBtn = document.getElementById("home-clear-filters");

  [city, category, date].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", () => renderHomeFeaturedList());
  });

  if (search) {
    search.addEventListener("input", () => renderHomeFeaturedList());
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (city) city.value = "";
      if (category) category.value = "";
      if (date) date.value = "";
      if (search) search.value = "";

      const pills = document.querySelectorAll(".ef-home-category-pill");
      pills.forEach((p, index) => {
        p.classList.toggle("active", index === 0);
      });

      renderHomeFeaturedList();
    });
  }
}

function setupCategoryPills() {
  const pills = document.querySelectorAll(".ef-category-pill");
  const categorySelect = document.getElementById("filter-category");
  if (!categorySelect) return;

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const value = pill.dataset.category ?? "";
      categorySelect.value = value;

      pills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");

      renderEventList();
    });
  });
}

function setupHomeCategoryPills() {
  const pills = document.querySelectorAll(".ef-home-category-pill");
  const categorySelect = document.getElementById("home-filter-category");
  if (!categorySelect) return;

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const value = pill.dataset.category ?? "";
      categorySelect.value = value;

      pills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");

      renderHomeFeaturedList();
    });
  });
}

function setupCalendarToolbar() {
  const prev = document.getElementById("calendar-prev");
  const next = document.getElementById("calendar-next");
  const todayBtn = document.getElementById("calendar-today");
  const viewButtons = document.querySelectorAll("[data-calendar-view]");

  if (prev) {
    prev.addEventListener("click", () => {
      calendarViewOffset -= 1;
      renderEventCalendar();
    });
  }

  if (next) {
    next.addEventListener("click", () => {
      calendarViewOffset += 1;
      renderEventCalendar();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener("click", () => {
      calendarViewOffset = 0;
      renderEventCalendar();
    });
  }

  viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.calendarView || "month";
      calendarViewMode = mode;
      calendarViewOffset = 0;
      viewButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderEventCalendar();
    });
  });
}

function setupAdminForm() {
  const form = document.getElementById("event-form");
  const resetBtn = document.getElementById("reset-event-form");
  const imageFileInput = document.getElementById("event-image-file");
  
  if (form) {
    form.addEventListener("submit", handleEventFormSubmit);
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", resetEventForm);
  }
  
  // Image upload handler
  if (imageFileInput) {
    imageFileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const statusEl = document.getElementById("image-upload-status");
      const previewEl = document.getElementById("image-preview");
      const previewImg = document.getElementById("image-preview-img");
      const hiddenInput = document.getElementById("event-image");
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        if (statusEl) statusEl.innerHTML = '<span style="color: #ef4444;">File too large. Max 5MB allowed.</span>';
        return;
      }
      
      // Show preview
      if (previewEl && previewImg) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewEl.style.display = "block";
        };
        reader.readAsDataURL(file);
      }
      
      // Try to upload to server if Admin is logged in
      if (window.EventifyAPI && window.EventifyAPI.Admin.isLoggedIn()) {
        if (statusEl) statusEl.innerHTML = '<span style="color: #3b82f6;">⏳ Uploading...</span>';
        
        try {
          console.log('[Eventify] Starting image upload...');
          console.log('[Eventify] Admin logged in:', window.EventifyAPI.Admin.isLoggedIn());
          console.log('[Eventify] API Base URL:', window.EventifyAPI ? 'Available' : 'Not available');
          
          const response = await window.EventifyAPI.Admin.uploadEventImage(file);
          console.log('[Eventify] Upload response received:', response);
          
          if (response.success && response.data) {
            // Use full URL if it's a relative path
            let imageUrl = response.data.url;
            if (imageUrl.startsWith('/uploads')) {
              // For Vercel, we might need to prepend the API server URL
              const apiBase = window.EventifyAPI ? (window.EventifyAPI.API_BASE_URL || '') : '';
              if (apiBase && !apiBase.includes('localhost')) {
                // Remove /api from end if present
                const baseUrl = apiBase.replace(/\/api\/?$/, '');
                imageUrl = baseUrl + imageUrl;
              }
            }
            
            if (hiddenInput) hiddenInput.value = imageUrl;
            if (statusEl) statusEl.innerHTML = '<span style="color: #22c55e;">✅ Image uploaded successfully!</span>';
            console.log('[Eventify] Image uploaded:', imageUrl);
          } else {
            throw new Error(response.message || 'Upload failed');
          }
        } catch (error) {
          console.error('[Eventify] Image upload failed:', error);
          console.error('[Eventify] Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          
          // Show error but don't block - user can still use local filename
          if (statusEl) {
            let errorMsg = error.message || 'Server error';
            if (errorMsg.includes('Cannot connect')) {
              errorMsg = 'Backend API is not accessible. Please check your API URL configuration.';
            }
            statusEl.innerHTML = '<span style="color: #ef4444;">❌ Upload failed: ' + errorMsg + '<br><small>Using local filename as fallback.</small></span>';
          }
          // Fallback: use local filename
          if (hiddenInput) hiddenInput.value = file.name;
        }
      } else {
        // Admin not logged in - use local filename
        console.warn('[Eventify] Admin not logged in, cannot upload image');
        if (hiddenInput) hiddenInput.value = file.name;
        if (statusEl) statusEl.innerHTML = '<span style="color: #f59e0b;">⚠️ Admin login required for image upload. Using local filename.</span>';
      }
    });
  }
}

function setupManagedUsersForm() {
  const form = document.getElementById("managed-user-form");
  const resetBtn = document.getElementById("managed-user-reset");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idField = document.getElementById("managed-user-id");
    const nameField = document.getElementById("managed-user-name");
    const emailField = document.getElementById("managed-user-email");
    const cityField = document.getElementById("managed-user-city");
    const roleField = document.getElementById("managed-user-role");
    
    const id = idField.value || `user-${Date.now()}`;
    const payload = {
      id,
      name: nameField.value.trim(),
      email: emailField.value.trim(),
      city: cityField.value.trim(),
      role: roleField.value || "citizen",
    };

    if (!payload.name || !payload.email || !payload.city) {
      alert("Please fill all required fields.");
      return;
    }

    // Check if email already exists in another user
    const existingByEmail = managedUsers.find((u) => u.email === payload.email && u.id !== id);
    if (existingByEmail) {
      alert("A user with this email already exists.");
      return;
    }

    // If editing an existing managed user
    const existingIdx = managedUsers.findIndex((u) => u.id === id);
    if (existingIdx >= 0) {
      managedUsers[existingIdx] = payload;
    } else {
      // If it's a new user or converting from registration/auth user
      // Check if we should update existing or create new
      const existingByOldId = managedUsers.find((u) => u.email === payload.email);
      if (existingByOldId) {
        // Update existing user with same email
        const updateIdx = managedUsers.findIndex((u) => u.email === payload.email);
        managedUsers[updateIdx] = payload;
      } else {
        // Create new managed user
        managedUsers.push(payload);
      }
    }

    saveToStorage(STORAGE_KEY_MANAGED_USERS, managedUsers);
    resetUserForm();
    await renderAdminUserList();
    
    // Show success message
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Saved!";
    submitBtn.style.background = "#10b981";
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.style.background = "";
    }, 2000);
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", resetUserForm);
  }
}

function setupAdminNavigation() {
  const links = document.querySelectorAll(".ef-admin-link");
  const sections = document.querySelectorAll(".ef-admin-section");

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const target = link.dataset.adminSection;

      links.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      sections.forEach((sec) => {
        if (sec.id === `admin-section-${target.split("admin-")[1]}`) {
          sec.classList.add("active");
        } else if (sec.id === target) {
          // fallback if ids match directly
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      });
    });
  });
}

function setAdminAuthenticated(value) {
  adminAuthenticated = value;
  saveToStorage(STORAGE_KEY_ADMIN_AUTH, value);
}

function setAuthMode(mode) {
  authMode = mode === "signup" ? "signup" : "signin";

  const tabs = document.querySelectorAll(".ef-auth-tabs [data-auth-mode]");
  const sections = document.querySelectorAll(".ef-auth-mode-section");
  const titleEl = document.getElementById("auth-title");
  const subtitleEl = document.getElementById("auth-subtitle");
  const noteSignin = document.querySelector("[data-auth-note-signin]");
  const noteSignup = document.querySelector("[data-auth-note-signup]");

  tabs.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.authMode === authMode);
  });

  sections.forEach((el) => {
    const sectionMode = el.dataset.authSection;
    el.style.display = sectionMode === authMode ? "block" : "none";
  });

  if (titleEl && subtitleEl) {
    if (authMode === "signin") {
      titleEl.textContent = "Sign in to register for events";
      subtitleEl.textContent =
        "Use your email to receive a one-time verification code and complete your registration.";
    } else {
      titleEl.textContent = "Create your Eventify account";
      subtitleEl.textContent =
        "Save your details once and use the same account to register for community events across TRNC.";
    }
  }

  if (noteSignin && noteSignup) {
    noteSignin.style.display = authMode === "signin" ? "block" : "none";
    noteSignup.style.display = authMode === "signup" ? "block" : "none";
  }

  // reset pending visual state when switching away from signup
  if (authMode === "signin") {
    const codeGroup = document.getElementById("signup-code-group");
    if (codeGroup) codeGroup.style.display = "none";
  }
}

function openAuthLayer(mode) {
  const layer = document.getElementById("auth-layer");
  if (!layer) return;
  setAuthMode(mode || "signin");
  layer.style.display = "flex";
  layer.classList.add("open");
  updateUserLoginUI();
}

function closeAuthLayer() {
  const layer = document.getElementById("auth-layer");
  if (layer) {
    layer.classList.remove("open");
    layer.style.display = "none";
  }
}

function setupAdminAuth() {
  const loginForm = document.getElementById("admin-login-form");
  const logoutBtn = document.getElementById("admin-logout-btn");
  const headerLoginBtn = document.getElementById("nav-admin-login");

  if (loginForm) {
    console.log("Admin login form found, attaching submit handler");
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("Admin login form submitted");
      const emailInput = document.getElementById("admin-email");
      const passwordInput = document.getElementById("admin-password");
      
      if (!emailInput || !passwordInput) {
        console.error("Admin login form inputs not found");
        alert("Error: Form inputs not found. Please refresh the page.");
        return;
      }
      
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      
      console.log("Email:", email, "Password length:", password.length);

      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }

      // Try API login if available, then fallback to demo credentials
      (async () => {
        let apiLoginSuccess = false;
        
        // Try API login first
        if (window.EventifyAPI) {
          try {
            const response = await window.EventifyAPI.Admin.login(email, password);
            if (response.success) {
              console.log("Admin API login successful");
              setAdminAuthenticated(true);
              showView("view-admin-dashboard");
              await loadEventsFromAPI();
              renderAdminEventList();
              renderStatistics();
              await renderAdminUserList();
              apiLoginSuccess = true;
              return;
            }
          } catch (error) {
            console.log("API admin login failed:", error);
            // Continue to fallback demo credentials
          }
        }

        // Fallback to demo credentials (always available, even if API is used)
        if (!apiLoginSuccess && email === "admin@eventify.trnc" && password === "admin123") {
          console.log("Admin credentials valid, logging in with demo credentials...");
          setAdminAuthenticated(true);
          showView("view-admin-dashboard");
          renderAdminEventList();
          renderStatistics();
          await renderAdminUserList();
          console.log("Admin login successful");
        } else if (!apiLoginSuccess) {
          console.log("Invalid credentials");
          alert("Invalid credentials. Please check your email and password.\n\nDemo credentials:\nadmin@eventify.trnc / admin123");
        }
      })();
    });
  } else {
    console.warn("Admin login form not found. This is normal if you're not on the admin page.");
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Clear admin API token
      if (useAPI && window.EventifyAPI) {
        window.EventifyAPI.Admin.logout();
      }
      setAdminAuthenticated(false);
      showView("view-events");
    });
  }

  if (headerLoginBtn) {
    headerLoginBtn.addEventListener("click", () => {
      if (adminAuthenticated) {
        showView("view-admin-dashboard");
      } else {
        showView("view-admin-login");
      }
    });
  }

  // On load, if already authenticated, jump directly to dashboard when user clicks admin nav.
  setAdminAuthenticated(adminAuthenticated);
}

function updateUserLoginUI() {
  const statusEl = document.getElementById("auth-login-status");
  const logoutBtn = document.getElementById("auth-logout-btn");
  const loginBtn = document.getElementById("auth-login-btn");
  const headerUserPill = document.getElementById("header-user-pill");
  const headerLoginBtn = document.getElementById("nav-user-login");
  const headerSignupBtn = document.getElementById("nav-signup");

  if (!statusEl || !logoutBtn || !loginBtn) return;
  
  // Ensure user profile menu is set up if user pill exists
  if (headerUserPill && currentUser && currentUser.email) {
    // Re-setup user profile menu to ensure event listeners are attached
    // This is safe to call multiple times
    const pill = document.getElementById("header-user-pill");
    const menu = document.getElementById("header-user-menu");
    if (pill && menu && !pill.hasAttribute('data-listener-attached')) {
      pill.setAttribute('data-listener-attached', 'true');
      // Event listeners are already attached in setupUserProfileMenu, but ensure they work
    }
  }

  // Update demo verification banner visibility/content
  updateVerificationBanner();

  if (currentUser && currentUser.email) {
    const displayName = currentUser.fullName || currentUser.email;
    statusEl.textContent = `Signed in as ${displayName}`;
    logoutBtn.disabled = false;
    loginBtn.textContent = authMode === "signup" ? "Update account" : "Sign in";

    if (headerLoginBtn) headerLoginBtn.style.display = "none";
    if (headerSignupBtn) headerSignupBtn.style.display = "none";

    if (headerUserPill) {
      const initials =
        (currentUser.fullName || currentUser.email)
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "U";
      
      // Store if listener was attached before changing innerHTML
      const hadListener = headerUserPill.hasAttribute('data-listener-attached');
      
      headerUserPill.innerHTML = `
        <span class="ef-user-pill-avatar">${initials}</span>
        <span class="ef-user-pill-name">${displayName}</span>
      `;
      headerUserPill.style.display = "inline-flex";
      headerUserPill.style.pointerEvents = "auto";
      headerUserPill.style.cursor = "pointer";
      headerUserPill.setAttribute("tabindex", "0");
      headerUserPill.setAttribute("role", "button");
      
      // Re-attach click listener after innerHTML change (innerHTML removes listeners)
      if (hadListener || currentUser) {
        headerUserPill.setAttribute('data-listener-attached', 'true');
        headerUserPill.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isOpen = document.body.classList.toggle("ef-user-menu-open");
          if (isOpen) {
            document.body.classList.remove("ef-notifications-open");
          }
          headerUserPill.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
      }
    }
  } else if (authMode === "signup" && pendingSignup && pendingSignup.email) {
    statusEl.textContent = `Verification code sent to ${pendingSignup.email}. Enter the code to complete sign up.`;
    logoutBtn.disabled = true;
    loginBtn.textContent = "Verify code";
  } else {
    statusEl.textContent =
      authMode === "signup"
        ? "Fill in the form to create your account."
        : "Not signed in. Enter your details to sign in.";
    logoutBtn.disabled = true;
    loginBtn.textContent = authMode === "signup" ? "Create account" : "Sign in";

    if (headerLoginBtn) headerLoginBtn.style.display = "";
    if (headerSignupBtn) headerSignupBtn.style.display = "";

    if (headerUserPill) {
      headerUserPill.innerHTML = "";
      headerUserPill.style.display = "none";
    }

    document.body.classList.remove("ef-user-menu-open");
  }
}

function updateVerificationBanner() {
  const banner = document.getElementById("auth-verification-banner");
  const emailEl = document.getElementById("auth-verification-email");

  if (!banner || !emailEl) return;

  if (
    authMode === "signup" &&
    pendingSignup &&
    pendingSignup.email
  ) {
    emailEl.textContent = pendingSignup.email;
    banner.style.display = "flex";
  } else {
    banner.style.display = "none";
    emailEl.textContent = "";
  }
}

function updateVerificationTimerUI() {
  const timerEl = document.getElementById("signup-code-timer");
  const resendBtn = document.getElementById("signup-code-resend");

  if (!timerEl || !resendBtn) return;

  if (!pendingSignup || !pendingSignup.codeExpiresAt) {
    timerEl.textContent = "";
    resendBtn.disabled = false;
    return;
  }

  const now = Date.now();
  const remainingMs = pendingSignup.codeExpiresAt - now;

  if (remainingMs <= 0) {
    timerEl.textContent = "Code expired. You can request a new one.";
    resendBtn.disabled = false;
    if (verificationTimerId) {
      window.clearInterval(verificationTimerId);
      verificationTimerId = null;
    }
    return;
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  timerEl.textContent = `Code expires in ${minutes}:${seconds}`;
  resendBtn.disabled = true;
}

function startVerificationTimer() {
  if (!pendingSignup) return;

  const TWO_MINUTES_MS = 2 * 60 * 1000;
  pendingSignup.codeExpiresAt = Date.now() + TWO_MINUTES_MS;

  if (verificationTimerId) {
    window.clearInterval(verificationTimerId);
    verificationTimerId = null;
  }

  updateVerificationTimerUI();
  verificationTimerId = window.setInterval(updateVerificationTimerUI, 1000);
}

function setCurrentUser(user) {
  currentUser = user || null;
  saveToStorage(STORAGE_KEY_USER, currentUser);
  updateUserLoginUI();
  // Re-render registrations when user changes
  (async () => {
    await renderMyRegistrations();
    await renderNotifications();
  })();
  
  // Update remembered email if user is set and remember device is enabled
  if (user && user.email) {
    const rememberDevice = loadFromStorage('eventify_remember_device', false);
    if (rememberDevice) {
      saveToStorage('eventify_remembered_email', user.email);
    }
  }
}

function setupUserAuth() {
  const form = document.getElementById("auth-login-form");
  const logoutBtn = document.getElementById("auth-logout-btn");
  
  // Pre-fill email if remember device was used
  const rememberedEmail = loadFromStorage('eventify_remembered_email', null);
  if (rememberedEmail) {
    const emailInput = document.getElementById("signin-identifier");
    if (emailInput) {
      emailInput.value = rememberedEmail;
    }
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const identifier = document.getElementById("signin-identifier");
      const signinPassword = document.getElementById("signin-password");
      const signupFullName = document.getElementById("signup-fullname");
      const signupEmail = document.getElementById("signup-email");
      const signupPassword = document.getElementById("signup-password");
      const signupPasswordConfirm = document.getElementById("signup-password-confirm");
      const signupCountry = document.getElementById("signup-country");
      const marketingCheckbox = document.getElementById("signup-marketing");
      const privacyCheckbox = document.getElementById("signup-privacy");
      const signupCodeInput = document.getElementById("signup-code");
      const signupCodeGroup = document.getElementById("signup-code-group");

      const stored = loadFromStorage(STORAGE_KEY_AUTH_USER, null);

      if (authMode === "signin") {
        const idValue = identifier ? identifier.value.trim() : "";
        const passValue = signinPassword ? signinPassword.value.trim() : "";

        if (!idValue || !passValue) {
          alert("Please enter your email and password.");
          return;
        }

        // Validate email format
        if (!validateEmail(idValue)) {
          alert("Please enter a valid email address (e.g., name@example.com).");
          if (identifier) identifier.focus();
          return;
        }

        // Check remember device checkbox
        const rememberDevice = document.getElementById('remember-device');
        const shouldRemember = rememberDevice ? rememberDevice.checked : false;

        // Try API login first if available
        if (useAPI && window.EventifyAPI) {
          (async () => {
            try {
              const response = await window.EventifyAPI.Auth.login(idValue, passValue);
              if (response.success && response.data) {
                const user = {
                  fullName: response.data.name,
                  email: response.data.email,
                  city: response.data.city
                };
                setCurrentUser(user);
                
                // Save remember device preference
                if (shouldRemember) {
                  saveToStorage('eventify_remember_device', true);
                  saveToStorage('eventify_remembered_email', idValue);
                } else {
                  localStorage.removeItem('eventify_remember_device');
                  localStorage.removeItem('eventify_remembered_email');
                }
                
                closeAuthLayer();
                renderEventList();
                (async () => {
                  await renderMyRegistrations();
                  await renderNotifications();
                })();
              }
            } catch (error) {
              alert(error.message || "Incorrect email or password. Please check your details.");
            }
          })();
          return;
        }

        // Fallback to localStorage
        if (!stored || stored.password !== passValue || stored.email !== idValue) {
          alert("Incorrect email or password. Please check your details.");
          return;
        }

        setCurrentUser(stored);
        
        // Save remember device preference
        if (shouldRemember) {
          saveToStorage('eventify_remember_device', true);
          saveToStorage('eventify_remembered_email', idValue);
        } else {
          localStorage.removeItem('eventify_remember_device');
          localStorage.removeItem('eventify_remembered_email');
        }
        
        closeAuthLayer();
        renderEventList();
        (async () => {
          await renderMyRegistrations();
          await renderNotifications();
        })();
        return;
      }

      // signup
      const fullNameVal = signupFullName ? signupFullName.value.trim() : "";
      const emailVal = signupEmail ? signupEmail.value.trim() : "";
      const passVal = signupPassword ? signupPassword.value.trim() : "";
      const confirmVal = signupPasswordConfirm ? signupPasswordConfirm.value.trim() : "";
      const countryVal = signupCountry ? signupCountry.value : "";
      const marketing = marketingCheckbox ? marketingCheckbox.checked : false;
      const codeVal = signupCodeInput ? signupCodeInput.value.trim() : "";
      const privacyAccepted = privacyCheckbox ? privacyCheckbox.checked : false;

      // second step: verify code
      if (pendingSignup && codeVal) {
        if (!pendingSignup.codeExpiresAt || Date.now() > pendingSignup.codeExpiresAt) {
          alert("Your verification code has expired. Please request a new code.");
          return;
        }

        // Try API verification if available
        if (useAPI && window.EventifyAPI && pendingSignup.useAPI) {
          (async () => {
            try {
              const response = await window.EventifyAPI.Auth.verifyEmail(pendingSignup.email, codeVal);
              if (response.success && response.data) {
                const newUser = {
                  fullName: response.data.name,
                  email: response.data.email,
                  city: response.data.city
                };
                setCurrentUser(newUser);
                pendingSignup = null;
                if (verificationTimerId) {
                  window.clearInterval(verificationTimerId);
                  verificationTimerId = null;
                }
                updateVerificationBanner();
                if (signupCodeGroup) signupCodeGroup.style.display = "none";
                if (signupCodeInput) signupCodeInput.value = "";
                closeAuthLayer();
                renderEventList();
                (async () => {
                  await renderMyRegistrations();
                  await renderNotifications();
                })();
                
                // Update admin user list if admin is viewing it
                if (adminAuthenticated) {
                  await renderAdminUserList();
                }
              }
            } catch (error) {
              alert(error.message || "Verification code is incorrect. Please check the code and try again.");
            }
          })();
          return;
        }

        // Fallback to localStorage verification
        if (codeVal !== pendingSignup.code) {
          alert("Verification code is incorrect. Please check the code and try again.");
          return;
        }

        const newUser = {
          fullName: pendingSignup.fullName,
          email: pendingSignup.email,
          password: pendingSignup.password,
          country: pendingSignup.country,
          marketing: pendingSignup.marketing,
        };

        saveToStorage(STORAGE_KEY_AUTH_USER, newUser);
        setCurrentUser(newUser);
        pendingSignup = null;
        if (verificationTimerId) {
          window.clearInterval(verificationTimerId);
          verificationTimerId = null;
        }
        updateVerificationBanner();
        if (signupCodeGroup) signupCodeGroup.style.display = "none";
        if (signupCodeInput) signupCodeInput.value = "";
        closeAuthLayer();
        renderEventList();
        (async () => {
          await renderMyRegistrations();
          await renderNotifications();
        })();
        return;
      }

      // first step: basic validation + send code
      if (!fullNameVal || !emailVal || !passVal || !confirmVal || !countryVal) {
        alert("Please fill all required fields to create an account.");
        return;
      }

      // Validate email format
      if (!validateEmail(emailVal)) {
        alert("Please enter a valid email address (e.g., name@example.com).");
        if (signupEmail) signupEmail.focus();
        return;
      }

      if (passVal !== confirmVal) {
        alert("Passwords do not match. Please check and try again.");
        return;
      }

      const passRule = /^(?=.*[A-Z])(?=.*\.)/;
      if (passVal.length < 8 || !passRule.test(passVal)) {
        alert("Password must be at least 8 characters and include at least one uppercase letter and a dot (.)");
        return;
      }

      if (stored && stored.email === emailVal) {
        alert("An account with this email already exists.");
        return;
      }

      if (!privacyAccepted) {
        alert("Please accept the Privacy Policy to create an account.");
        return;
      }

      // Try API registration if available
      if (useAPI && window.EventifyAPI) {
        (async () => {
          try {
            const response = await window.EventifyAPI.Auth.register({
              name: fullNameVal,
              email: emailVal,
              phone: '0000000000', // Placeholder - will be updated in profile
              birthdate: '1990-01-01', // Placeholder - will be updated in profile
              city: countryVal,
              password: passVal
            });
            
            if (response.success) {
              pendingSignup = {
                fullName: fullNameVal,
                email: emailVal,
                password: passVal,
                country: countryVal,
                marketing,
                useAPI: true // Flag to use API for verification
              };

              if (signupCodeGroup) signupCodeGroup.style.display = "block";
              if (signupCodeInput) signupCodeInput.value = "";
              alert(`Verification code sent to ${emailVal}. Please check your email.`);
              updateUserLoginUI();
              startVerificationTimer();
            }
          } catch (error) {
            alert(error.message || "Registration failed. Please try again.");
          }
        })();
        return;
      }

      // Fallback to localStorage
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      pendingSignup = {
        fullName: fullNameVal,
        email: emailVal,
        password: passVal,
        country: countryVal,
        marketing,
        code: verificationCode,
      };

      if (signupCodeGroup) signupCodeGroup.style.display = "block";
      if (signupCodeInput) signupCodeInput.value = "";
      alert(`Verification code sent to ${emailVal}. Please check your email.`);
      updateUserLoginUI();
      startVerificationTimer();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Clear API tokens if using API
      if (useAPI && window.EventifyAPI) {
        window.EventifyAPI.Auth.logout();
      }
      setCurrentUser(null);
      // Clear remember device on logout
      localStorage.removeItem('eventify_remember_device');
      localStorage.removeItem('eventify_remembered_email');
      renderEventList();
      (async () => {
        await renderMyRegistrations();
        await renderNotifications();
      })();
      closeAuthLayer();
    });
  }

  // Initialize UI based on existing stored user
  updateUserLoginUI();
}

function setupUserLoginShortcut() {
  const userLoginBtn = document.getElementById("nav-user-login");
  const signupBtn = document.getElementById("nav-signup");

  if (userLoginBtn) {
    userLoginBtn.addEventListener("click", () => {
      openAuthLayer("signin");
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      openAuthLayer("signup");
    });
  }
}

function setupAuthLayer() {
  const layer = document.getElementById("auth-layer");
  if (!layer) return;

  const closeBtn = layer.querySelector("[data-auth-close]");
  const tabButtons = layer.querySelectorAll(".ef-auth-tabs [data-auth-mode]");
  const switchLinks = layer.querySelectorAll("[data-switch-auth]");
  const forgotLink = layer.querySelector("#forgot-password-link");
  const privacyLinks = layer.querySelectorAll("[data-open-privacy]");
  const resendBtn = layer.querySelector("#signup-code-resend");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeAuthLayer());
  }

  layer.addEventListener("click", (e) => {
    // Handle password toggle buttons
    const toggleBtn = e.target.closest(".ef-password-toggle");
    if (toggleBtn) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const targetId = toggleBtn.dataset.target;
      if (!targetId) return;

      const input = document.getElementById(targetId);
      if (!input) {
        console.warn('[Eventify] Password toggle target input not found:', targetId);
        return;
      }

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      
      // Update button icon
      toggleBtn.textContent = isHidden ? "🙈" : "👁";
      
      // Also update aria-label for accessibility
      toggleBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
      return;
    }

    // Handle layer background click (close)
    if (e.target === layer) {
      closeAuthLayer();
    }
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.authMode;
      setAuthMode(mode);
      updateUserLoginUI();
    });
  });

  switchLinks.forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.dataset.switchAuth || "signin";
      setAuthMode(target);
      updateUserLoginUI();
    });
  });

  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("signin-identifier");
      const emailVal = emailInput ? emailInput.value.trim() : "";

      if (!emailVal) {
        alert("Please enter your email address first so we can send reset instructions.");
        return;
      }

      alert(
        `Password reset link sent to ${emailVal}. Please check your email for instructions to reset your password.`
      );
    });
  }

  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if (!pendingSignup || !pendingSignup.email) return;

      // Try API resend if using API
      if (useAPI && window.EventifyAPI && pendingSignup.useAPI) {
        try {
          await window.EventifyAPI.Auth.resendCode(pendingSignup.email);
          alert(`New verification code sent to ${pendingSignup.email}. Please check your email.`);
          startVerificationTimer();
        } catch (error) {
          alert(error.message || "Failed to resend code. Please try again.");
        }
        return;
      }

      // Fallback to local storage (offline mode)
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      pendingSignup.code = newCode;
      alert(`New verification code sent to ${pendingSignup.email}. Please check your email.`);
      updateVerificationBanner();
      startVerificationTimer();
    });
  }

  privacyLinks.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const privacyLayer = document.getElementById("privacy-layer");
      if (!privacyLayer) return;
      privacyLayer.style.display = "flex";
      privacyLayer.classList.add("open");
    });
  });
}

function setupPrivacyLayer() {
  const layer = document.getElementById("privacy-layer");
  if (!layer) return;

  const closeBtn = layer.querySelector("[data-privacy-close]");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      layer.classList.remove("open");
      layer.style.display = "none";
    });
  }

  layer.addEventListener("click", (e) => {
    if (e.target === layer) {
      layer.classList.remove("open");
      layer.style.display = "none";
    }
  });
}

let currentRegistrationStep = 'information';

function showRegistrationStep(step) {
  console.log('[Eventify] showRegistrationStep called with:', step);
  currentRegistrationStep = step;
  const steps = document.querySelectorAll('.ef-registration-step');
  console.log('[Eventify] Found registration steps:', steps.length);
  steps.forEach(s => s.style.display = 'none');
  
  const targetStep = document.querySelector(`[data-step="${step}"]`);
  if (targetStep) {
    targetStep.style.display = 'block';
    console.log('[Eventify] Step shown:', step);
  } else {
    console.error('[Eventify] Step not found:', step);
  }
  
  updateRegistrationProgress(step);
}

function updateRegistrationProgress(step) {
  const layer = document.getElementById("registration-form-layer");
  if (!layer) {
    console.warn('[Eventify] registration-form-layer not found for progress update');
    return;
  }
  
  const progressSteps = layer.querySelectorAll('.ef-progress-step');
  console.log('[Eventify] Updating registration progress, step:', step, 'found steps:', progressSteps.length);
  
  if (progressSteps.length === 0) {
    console.warn('[Eventify] No progress steps found in registration form');
    return;
  }
  
  progressSteps.forEach((stepEl, index) => {
    stepEl.classList.remove('active', 'completed');
    
    const stepNumberEl = stepEl.querySelector('.ef-progress-step-number');
    if (!stepNumberEl) {
      console.warn('[Eventify] Step number element not found');
      return;
    }
    
    const stepNumber = parseInt(stepNumberEl.textContent.trim());
    let currentStepNumber = 2; // Information is step 2
    
    if (step === 'summary') currentStepNumber = 3;
    else if (step === 'completed') currentStepNumber = 4;
    
    console.log('[Eventify] Step number:', stepNumber, 'Current step:', currentStepNumber);
    
    if (stepNumber < currentStepNumber) {
      stepEl.classList.add('completed');
    } else if (stepNumber === currentStepNumber) {
      stepEl.classList.add('active');
    }
  });
}

// Validation helper functions
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Remove all non-digit characters except + for international numbers
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Accept formats:
  // - Turkish format: 05XX XXX XX XX (10 digits starting with 05)
  // - International: +90XXXXXXXXXX (10-15 digits after +)
  // - Without country code: 5XXXXXXXXX (10 digits starting with 5)
  const turkishFormat = /^05\d{9}$/; // 05XX XXX XX XX
  const turkishAltFormat = /^5\d{9}$/; // 5XX XXX XX XX (without leading 0)
  const internationalFormat = /^\+\d{10,15}$/; // +90XXXXXXXXXX
  const digitsOnly = cleaned.replace(/\+/g, '');
  
  if (turkishFormat.test(cleaned) || turkishAltFormat.test(cleaned)) return true;
  if (internationalFormat.test(cleaned) && digitsOnly.length >= 10 && digitsOnly.length <= 15) return true;
  // Also accept 10-15 digits with any formatting
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) return true;
  
  return false;
}

function validateParticipantData() {
  const participantsList = document.getElementById("registration-participants-list");
  const cards = participantsList ? participantsList.querySelectorAll(".ef-participant-card") : [];
  
  if (cards.length === 0) {
    alert("Please enter at least one participant's information.");
    return null;
  }

  const participantsData = [];
  let isValid = true;
  let errorMessage = "";

  cards.forEach((card, index) => {
    const cardIndex = parseInt(card.dataset.participantIndex || "0", 10);
    const nameInput = card.querySelector(`#participant-name-${cardIndex}`);
    const emailInput = card.querySelector(`#participant-email-${cardIndex}`);
    const phoneInput = card.querySelector(`#participant-phone-${cardIndex}`);
    const birthdateInput = card.querySelector(`#participant-birthdate-${cardIndex}`);
    const ticketSelect = card.querySelector(`#participant-ticket-select-${cardIndex}`);

    if (!nameInput || !emailInput || !phoneInput || !birthdateInput || !ticketSelect) {
      isValid = false;
      errorMessage = "Please fill in all required fields for all participants.";
      return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const birthdate = birthdateInput.value;
    const ticketType = ticketSelect.value;

    if (!name || !email || !phone || !birthdate) {
      isValid = false;
      errorMessage = `Please fill in all required fields for participant ${index + 1}.`;
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      isValid = false;
      errorMessage = `Please enter a valid email address for participant ${index + 1} (e.g., name@example.com).`;
      emailInput.focus();
      return;
    }

    // Validate phone format
    if (!validatePhone(phone)) {
      isValid = false;
      errorMessage = `Please enter a valid phone number for participant ${index + 1}.\n\nAccepted formats:\n- Turkish: 05XX XXX XX XX or 5XX XXX XX XX\n- International: +90XXXXXXXXXX\n- 10-15 digits`;
      phoneInput.focus();
      return;
    }

    // Validate birthdate - must not be in the future
    if (birthdate > todayISO()) {
      isValid = false;
      errorMessage = `Please enter a valid birthdate for participant ${index + 1}. The birthdate cannot be in the future.`;
      birthdateInput.focus();
      return;
    }

    participantsData.push({
      fullName: name,
      email: email,
      phone: phone,
      birthdate: birthdate,
      ticketType: ticketType,
    });
  });

  if (!isValid) {
    alert(errorMessage || "Please fill in all required fields correctly.");
    return null;
  }

  return participantsData;
}

function renderRegistrationSummary(eventId, participantsData) {
  const ev = events.find((e) => e.id === eventId);
  const summaryContent = document.getElementById("registration-summary-content");
  if (!summaryContent || !ev) return;

  let html = `<div class="ef-summary-event">
    <h4>${ev.title}</h4>
    <p class="ef-text-muted">${new Date(ev.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p class="ef-text-muted">${ev.location}</p>
  </div>`;

  html += `<div class="ef-summary-participants">
    <h4>Participants (${participantsData.length})</h4>
    <div class="ef-summary-participants-list">`;

  participantsData.forEach((participant, index) => {
    html += `<div class="ef-summary-participant-card">
      <div class="ef-summary-participant-header">
        <strong>Participant ${index + 1}</strong>
        <span class="ef-badge">${participant.ticketType}</span>
      </div>
      <div class="ef-summary-participant-details">
        <p><strong>Name:</strong> ${participant.fullName}</p>
        <p><strong>Email:</strong> ${participant.email}</p>
        <p><strong>Phone:</strong> ${participant.phone}</p>
        <p><strong>Birthdate:</strong> ${new Date(participant.birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>`;
  });

  html += `</div></div>`;

  summaryContent.innerHTML = html;
}

function renderRegistrationCompleted(eventId, participantsData) {
  const ev = events.find((e) => e.id === eventId);
  const completedDetails = document.getElementById("registration-completed-details");
  if (!completedDetails || !ev) return;

  let html = `<div class="ef-completed-event-info">
    <h4>${ev.title}</h4>
    <p class="ef-text-muted">${new Date(ev.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p class="ef-text-muted">${ev.location}</p>
  </div>`;
  
  html += `<div class="ef-completed-participants">
    <p><strong>${participantsData.length} participant(s) registered successfully</strong></p>
  </div>`;

  completedDetails.innerHTML = html;
}

function setupRegistrationForm() {
  try {
    console.log('[Eventify] setupRegistrationForm called');
    const layer = document.getElementById("registration-form-layer");
    if (!layer) {
      console.error('[Eventify] registration-form-layer not found');
      return;
    }
    console.log('[Eventify] registration-form-layer found');

  const closeBtn = layer.querySelector("[data-registration-close]");
  const cancelBtn = layer.querySelector("[data-registration-cancel]");
  const form = document.getElementById("registration-form");
  const addParticipantBtn = document.getElementById("add-participant-btn");
  const nextBtn = document.getElementById("registration-next-btn") || layer.querySelector("[data-registration-next]");
  const backBtn = layer.querySelector("[data-registration-back]");
  const backSummaryBtn = layer.querySelector("[data-registration-back-summary]");
  const confirmBtn = layer.querySelector("[data-registration-confirm]");
  const closeCompletedBtn = layer.querySelector("[data-registration-close-completed]");

  // Prevent form submission completely - AGGRESSIVE
  if (form) {
    console.log('[Eventify] Setting up form submit prevention');
    
    // Remove form's submit capability entirely
    form.setAttribute('novalidate', 'novalidate');
    form.setAttribute('onsubmit', 'return false;');
    
    // Prevent any form submission - multiple layers
    form.onsubmit = function(e) {
      console.error('[Eventify] Form onsubmit triggered - PREVENTING');
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      return false;
    };
    
    // Add multiple event listeners to catch all submit attempts
    ['submit', 'submit'].forEach(eventType => {
      form.addEventListener(eventType, (e) => {
        console.error('[Eventify] Form submit event caught - PREVENTING');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, true); // Use capture phase
    });
    
    // Also prevent on the window level
    window.addEventListener('beforeunload', function(e) {
      // Don't prevent, just log
    });
    
    console.log('[Eventify] Form submit prevention setup complete');
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeRegistrationForm());
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => closeRegistrationForm());
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      closeRegistrationForm();
    });
  }

  if (backSummaryBtn) {
    backSummaryBtn.addEventListener("click", () => {
      showRegistrationStep('information');
    });
  }

  if (closeCompletedBtn) {
    closeCompletedBtn.addEventListener("click", () => {
      closeRegistrationForm();
    });
  }

  if (addParticipantBtn) {
    addParticipantBtn.addEventListener("click", () => {
      const participantsList = document.getElementById("registration-participants-list");
      if (participantsList) {
        const currentCount = participantsList.querySelectorAll(".ef-participant-card").length;
        const newCard = createParticipantCard(currentCount, false);
        participantsList.appendChild(newCard);
        updateParticipantCount();
      }
    });
  }

  // Use event delegation for layer background clicks only
  // Next button handled separately below
  layer.addEventListener("click", (e) => {
    // Handle layer background click (close form)
    if (e.target === layer) {
      closeRegistrationForm();
    }
  });

  // Handle Next button - ONLY go to summary, DO NOT submit registration
  // Use both ID selector and data attribute for maximum compatibility
  const nextBtnById = document.getElementById("registration-next-btn");
  const nextBtnFinal = nextBtnById || nextBtn;
  
  if (nextBtnFinal) {
    console.log('[Eventify] Next button found, adding event listener');
    
    // Remove any existing listeners first
    const newNextBtn = nextBtnFinal.cloneNode(true);
    nextBtnFinal.parentNode.replaceChild(newNextBtn, nextBtnFinal);
    
    // Add fresh event listener
    newNextBtn.addEventListener("click", function(e) {
      console.log('[Eventify] ========================================');
      console.log('[Eventify] Next button clicked - handler fired');
      console.log('[Eventify] IMPORTANT: This should NOT call submitRegistration');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // CRITICAL: Prevent any form submission
      if (form) {
        form.onsubmit = function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();
          console.error('[Eventify] Form submit attempted but prevented!');
          return false;
        };
      }
      
      // IMPORTANT: Only navigate to summary, do NOT submit registration
      const eventId = form ? form.dataset.eventId : null;
      if (!eventId) {
        console.error("[Eventify] Event ID not found");
        return false;
      }

      const participantsData = validateParticipantData();
      if (!participantsData) {
        console.log('[Eventify] Validation failed');
        return false;
      }

      console.log('[Eventify] Showing summary, NOT submitting registration');
      console.log('[Eventify] isSubmittingRegistration flag:', isSubmittingRegistration);
      // Only show summary, do NOT call submitRegistration here
      // submitRegistration is ONLY called in Confirm button handler
      renderRegistrationSummary(eventId, participantsData);
      showRegistrationStep('summary');
      console.log('[Eventify] ========================================');
      return false;
    }, true); // Use capture phase to ensure it runs first
    
    console.log('[Eventify] Next button event listener added successfully');
  } else {
    console.error('[Eventify] Next button not found by ID or data attribute!');
  }

  // Handle Confirm button - ONLY place where submitRegistration is called
  if (confirmBtn) {
    confirmBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const eventId = form ? form.dataset.eventId : null;
      if (!eventId) {
        console.error("Event ID not found");
        return false;
      }

      const participantsData = validateParticipantData();
      if (!participantsData) {
        return false;
      }

      // Show completed step first
      renderRegistrationCompleted(eventId, participantsData);
      showRegistrationStep('completed');
      
      // IMPORTANT: Submit registration ONLY here, not in Next button
      console.log('[Eventify] Confirm button clicked - submitting registration now');
      setTimeout(() => {
        submitRegistration(eventId, participantsData);
      }, 500);
      
      return false;
    });
  }
  
  console.log('[Eventify] setupRegistrationForm completed successfully');
  } catch (error) {
    console.error('[Eventify] Error in setupRegistrationForm:', error);
  }
}

function setupHero() {
  const hero = document.querySelector(".ef-hero");
  if (!hero) return;

  applyHeroSlide(0);
  startHeroTimer();

  const cta = document.querySelector(".ef-hero-cta");
  if (cta) {
    cta.addEventListener("click", () => {
      cta.classList.remove("ef-hero-cta-animate");
      // force reflow for restart animation
      void cta.offsetWidth;
      cta.classList.add("ef-hero-cta-animate");

      // Switch to Events view first, then scroll to the list so it never jumps up.
      showView("view-events");
      window.requestAnimationFrame(() => {
        const list = document.getElementById("event-list");
        if (list) {
          list.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }
}

// Check API availability
async function checkAPIConnection() {
  try {
    const response = await fetch(`${API_SERVER_URL}/api/health`);
    const data = await response.json();
    if (data.status === 'OK') {
      useAPI = true;
      console.log('[Eventify] ✅ Connected to Backend API');
      return true;
    }
  } catch (error) {
    console.warn('[Eventify] ⚠️ Backend API health check failed, but will still try to use API when needed');
    // Don't set useAPI to false immediately - let loadEventsFromAPI try
  }
  // Don't set useAPI = false here - API might still work for specific operations
  return false;
}

// Load events from API
async function loadEventsFromAPI() {
  // Try to load even if useAPI is false - API might be available now
  if (!window.EventifyAPI) {
    console.log('[Eventify] EventifyAPI not available');
    return false;
  }
  
  try {
    const response = await window.EventifyAPI.Events.getAll({ upcoming: true });
    if (response.success && response.data) {
      events = response.data.map(ev => ({
        id: ev._id,
        title: ev.title,
        city: ev.city,
        category: ev.category,
        date: ev.date ? ev.date.split('T')[0] : '',
        time: ev.time,
        location: ev.location,
        capacity: ev.capacity,
        description: ev.description,
        imageUrl: ev.imageUrl || ev.posterUrl || '',
        registeredCount: ev.registeredCount || 0,
        availableSpots: ev.availableSpots || ev.capacity
      }));
      
      // Save to localStorage as backup
      saveToStorage(STORAGE_KEY_EVENTS, events);
      
      console.log(`[Eventify] Loaded ${events.length} events from API`);
      
      // Update useAPI flag if successful
      useAPI = true;
      
      return true;
    }
  } catch (error) {
    console.error('[Eventify] Failed to load events from API:', error);
  }
  return false;
}

// Close all overlay layers
function closeAllLayers() {
  const layers = document.querySelectorAll('.ef-detail-layer, .ef-auth-layer, .ef-privacy-layer');
  layers.forEach(layer => {
    layer.classList.remove('open');
    layer.style.display = 'none';
  });
  document.body.style.overflow = '';
}

// Initialize the application
let appInitialized = false;
async function initApp() {
  if (appInitialized) {
    console.log('[Eventify] App already initialized, skipping...');
    return;
  }
  
  console.log('[Eventify] ========================================');
  console.log('[Eventify] Initializing App - version 20250118.API');
  console.log('[Eventify] ========================================');
  
  // Close any stuck layers on startup
  closeAllLayers();
  
  // Check API connection
  await checkAPIConnection();
  
  // Always try to load events from API (even if useAPI is false, API might be available)
  // This ensures admin-created events are visible
  await loadEventsFromAPI();
  
  // Check if user is logged in via API (always check if token exists, not just if useAPI is true)
  // This ensures users who registered are automatically logged in even if API health check failed
  if (window.EventifyAPI && window.EventifyAPI.Auth.isLoggedIn()) {
    try {
      const response = await window.EventifyAPI.Auth.getMe();
      if (response.success && response.data) {
        currentUser = {
          fullName: response.data.name,
          email: response.data.email,
          city: response.data.city
        };
        setCurrentUser(currentUser);
        // setCurrentUser already calls updateUserLoginUI()
        // If we successfully got user from API, mark useAPI as true
        useAPI = true;
      }
    } catch (error) {
      console.warn('[Eventify] Failed to get user from API:', error);
      // If token is invalid, clear it
      if (window.EventifyAPI) {
        window.EventifyAPI.Auth.logout();
        // Also clear remember device if token is invalid
        localStorage.removeItem('eventify_remember_device');
        localStorage.removeItem('eventify_remembered_email');
      }
    }
  }
  
  setupNavigation();
  setupMobileNav();
  setupUserProfileMenu();
  setupCalendarToolbar();
  setupFilters();
  setupCategoryPills();
  setupHomeFilters();
  setupHomeCategoryPills();
  setupAdminForm();
  setupManagedUsersForm();
  setupAdminNavigation();
  setupAdminAuth();
  setupUserAuth();
  setupUserLoginShortcut();
  setupDetailPanel();
  setupAuthLayer();
  setupPrivacyLayer();
  setupRegistrationForm();
  setupHero();
  renderEventList();
  renderEventCalendar();
  await renderNotifications();
  renderHomeFeaturedList();
  renderAdminEventList();
  await renderAdminUserList();
  renderStatistics();
  renderPlaceEvents();
  await renderMyRegistrations();
  showView(DEFAULT_VIEW);
  
  appInitialized = true;
  console.log('[Eventify] App initialization complete');
  console.log(`[Eventify] Mode: ${useAPI ? 'API Connected' : 'Local Storage'}`);
}

// Make initApp globally accessible
window.initApp = initApp;

// Try to initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM is already loaded, initialize immediately
  initApp();
}


