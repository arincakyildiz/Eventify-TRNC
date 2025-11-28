// Eventify TRNC - Frontend Only Prototype
// Simple in-memory data + localStorage to simulate backend behavior

const STORAGE_KEY_EVENTS = "eventify_events";
const STORAGE_KEY_REGISTRATIONS = "eventify_registrations";
const STORAGE_KEY_ADMIN_AUTH = "eventify_admin_auth";
const STORAGE_KEY_USER = "eventify_current_user";
const STORAGE_KEY_AUTH_USER = "eventify_auth_user";
const STORAGE_KEY_MANAGED_USERS = "eventify_admin_users";
const STORAGE_KEY_SCHEMA = "eventify_schema_version";

const APP_SCHEMA_VERSION = 7;

const IMAGE_BASE_PATH = (() => {
  const attr = document.body?.dataset?.imagesBase || "assets/images/";
  return attr.endsWith("/") ? attr : `${attr}/`;
})();

function resolveImageSrc(value) {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) return value;
  if (value.includes("/")) return value;
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

// ----- View Switching (Public + Admin) -----

function showView(viewId) {
  const views = document.querySelectorAll(".ef-view");
  views.forEach((view) => {
    if (view.id === viewId) {
      view.classList.add("active");
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
}

function setupNavigation() {
  const navButtons = document.querySelectorAll(".ef-nav-link");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.view;

      showView(targetId);

      if (targetId === "view-registrations") {
        renderMyRegistrations();
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

  if (!pill || !menu) return;

  pill.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = document.body.classList.toggle("ef-user-menu-open");
    if (isOpen) {
      document.body.classList.remove("ef-notifications-open");
    }
    pill.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  document.addEventListener("click", () => {
    if (document.body.classList.contains("ef-user-menu-open")) {
      document.body.classList.remove("ef-user-menu-open");
      pill.setAttribute("aria-expanded", "false");
    }

    if (document.body.classList.contains("ef-notifications-open")) {
      document.body.classList.remove("ef-notifications-open");
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
      renderMyRegistrations();
      renderNotifications();
    }

    document.body.classList.remove("ef-user-menu-open");
    pill.setAttribute("aria-expanded", "false");
  });

  if (headerNotifBtn) {
    headerNotifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = document.body.classList.toggle("ef-notifications-open");
      if (isOpen) {
        document.body.classList.remove("ef-user-menu-open");
        pill.setAttribute("aria-expanded", "false");
      }
    });
  }

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
  const regs = registrations[ev.id] || [];
  if (!currentUser || !currentUser.email) return false;
  return regs.some((r) => r.userId === currentUser.email);
}

function renderMyRegistrations() {
  const container = document.getElementById("my-registrations-list");
  if (!container) return;

  if (!currentUser || !currentUser.email) {
    container.innerHTML =
      '<div class="ef-empty-state">Please sign in with your email address to see your registrations.</div>';
    return;
  }

  const registeredEvents = events.filter((ev) => isUserRegistered(ev));

  if (registeredEvents.length === 0) {
    container.innerHTML =
      '<div class="ef-empty-state">You are not registered for any events yet in this demo.</div>';
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
      cancelBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to cancel your registration for this event?")) {
          toggleRegistration(ev.id);
          renderMyRegistrations();
        }
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

  layer.classList.add("open");
}

function closeEventDetail() {
  const layer = document.getElementById("event-detail-layer");
  if (layer) {
    layer.classList.remove("open");
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
    registerBtn.addEventListener("click", () => {
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
    btn.addEventListener("click", () => {
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
    removeBtn.addEventListener("click", () => {
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
  
  if (layer) layer.classList.add("open");
}

function closeRegistrationForm() {
  const layer = document.getElementById("registration-form-layer");
  if (layer) layer.classList.remove("open");
  const form = document.getElementById("registration-form");
  if (form) form.reset();
  registrationParticipants = [];
  // Reset to information step
  showRegistrationStep('information');
}

function submitRegistration(eventId, participantsData) {
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

  // Don't close form here - it's already showing completed step
  // The form will be closed when user clicks "Close" button

  renderEventList();
  renderEventCalendar();
  renderNotifications();
  renderStatistics();
  renderAdminEventList();
  renderMyRegistrations();
  renderHomeFeaturedList();
}

function toggleRegistration(eventId) {
  if (!currentUser || !currentUser.email) {
    alert("Please sign in or create an account before registering for an event.");
    openAuthLayer();
    return;
  }

  const list = registrations[eventId] || [];
  const existingIndex = list.findIndex((r) => r.userId === currentUser.email);

  if (existingIndex >= 0) {
    // Cancel registration
    if (confirm("Are you sure you want to cancel your registration for this event?")) {
      list.splice(existingIndex, 1);
      registrations[eventId] = list;
      saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);

      renderEventList();
      renderEventCalendar();
      renderNotifications();
      renderStatistics();
      renderAdminEventList();
      renderMyRegistrations();
      renderHomeFeaturedList();
    }
  } else {
    // Open registration form
    openRegistrationForm(eventId);
  }
}

function renderNotifications() {
  const container = document.getElementById("upcoming-notifications");
  const headerMenu = document.getElementById("header-notifications-menu");
  const today = new Date(todayISO());

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

    // Also show a compact version in the header menu for the first few items
    if (headerMenu && index < 3) {
      const item = document.createElement("div");
      item.className = "ef-notification-menu-item";
      item.innerHTML = `
        <div class="ef-notification-menu-item-title">${ev.title}</div>
        <div class="ef-notification-menu-item-meta">${statusText}</div>
      `;
      headerMenu.appendChild(item);
    }
  });
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
          <span>This venue doesn't have any demo events right now.</span>
        </div>
      `;
      card.appendChild(emptyOverlay);
      card.classList.add("ef-place-card--no-events");
      highlight.innerHTML = `
        <div class="ef-place-highlight-title">No demo events yet</div>
        <div class="ef-place-highlight-body">
          <span>We will announce upcoming programs for this venue soon.</span>
        </div>
      `;
      target.innerHTML =
        '<div class="ef-place-events-item ef-place-events-meta">No demo events linked to this venue yet.</div>';
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

function handleEventFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("event-id").value || generateId();
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

  const existingIndex = events.findIndex((ev) => ev.id === id);
  const eventPayload = {
    id,
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

  if (existingIndex >= 0) {
    events[existingIndex] = eventPayload;
  } else {
    events.push(eventPayload);
    registrations[id] = [];
  }

  saveToStorage(STORAGE_KEY_EVENTS, events);
  saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);

  resetEventForm();
  renderEventList();
  renderEventCalendar();
  renderAdminEventList();
  renderStatistics();
  renderPlaceEvents();
}

function deleteEvent(id) {
  if (!confirm("Are you sure you want to delete this event?")) return;
  const index = events.findIndex((ev) => ev.id === id);
  if (index >= 0) {
    events.splice(index, 1);
  }
  delete registrations[id];

  saveToStorage(STORAGE_KEY_EVENTS, events);
  saveToStorage(STORAGE_KEY_REGISTRATIONS, registrations);

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
        <button class="ef-btn ef-btn-ghost" data-edit-id="${ev.id}">Edit</button>
        <button class="ef-btn ef-btn-danger" data-delete-id="${ev.id}">Delete</button>
      </div>
    `;

    const editBtn = item.querySelector("[data-edit-id]");
    const deleteBtn = item.querySelector("[data-delete-id]");

    editBtn.addEventListener("click", () => fillEventForm(ev));
    deleteBtn.addEventListener("click", () => deleteEvent(ev.id));

    container.appendChild(item);
  });
}

function getAllRegisteredUsers() {
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
          if (reg.email && !registeredEmails.has(reg.email)) {
            registeredEmails.add(reg.email);
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
    const existsInManaged = managed.some(u => u.email === authUser.email);
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
    if (!emailMap.has(user.email)) {
      emailMap.set(user.email, user);
      allUsers.push(user);
    }
  });
  
  // Then add users from registrations
  usersFromRegistrations.forEach(user => {
    if (!emailMap.has(user.email)) {
      emailMap.set(user.email, user);
      allUsers.push(user);
    }
  });
  
  return allUsers;
}

function renderAdminUserList() {
  const container = document.getElementById("admin-user-list");
  const countBadge = document.getElementById("user-count-badge");
  if (!container) return;

  const allUsers = getAllRegisteredUsers();
  
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

function deleteManagedUser(userId) {
  if (!confirm("Delete this user?")) return;
  managedUsers = managedUsers.filter((u) => u.id !== userId);
  saveToStorage(STORAGE_KEY_MANAGED_USERS, managedUsers);
  renderAdminUserList();
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
  form.addEventListener("submit", handleEventFormSubmit);
  resetBtn.addEventListener("click", resetEventForm);
}

function setupManagedUsersForm() {
  const form = document.getElementById("managed-user-form");
  const resetBtn = document.getElementById("managed-user-reset");
  if (!form) return;

  form.addEventListener("submit", (e) => {
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
    renderAdminUserList();
    
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
  layer.classList.add("open");
  updateUserLoginUI();
}

function closeAuthLayer() {
  const layer = document.getElementById("auth-layer");
  if (layer) {
    layer.classList.remove("open");
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

      if (email === "admin@eventify.trnc" && password === "admin123") {
        console.log("Admin credentials valid, logging in...");
        setAdminAuthenticated(true);
        showView("view-admin-dashboard");
        renderAdminEventList();
        renderStatistics();
        renderAdminUserList();
        console.log("Admin login successful");
      } else {
        console.log("Invalid credentials");
        alert("Invalid demo credentials. Please use admin@eventify.trnc / admin123");
      }
    });
  } else {
    console.warn("Admin login form not found. This is normal if you're not on the admin page.");
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
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
      headerUserPill.innerHTML = `
        <span class="ef-user-pill-avatar">${initials}</span>
        <span class="ef-user-pill-name">${displayName}</span>
      `;
      headerUserPill.style.display = "inline-flex";
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

function setCurrentUser(user) {
  currentUser = user || null;
  saveToStorage(STORAGE_KEY_USER, currentUser);
  updateUserLoginUI();
}

function setupUserAuth() {
  const form = document.getElementById("auth-login-form");
  const logoutBtn = document.getElementById("auth-logout-btn");

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

        if (!stored || stored.password !== passValue || stored.email !== idValue) {
          alert("Incorrect email or password. Please check your details.");
          return;
        }

        setCurrentUser(stored);
        closeAuthLayer();
        renderEventList();
        renderMyRegistrations();
        renderNotifications();
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
        if (signupCodeGroup) signupCodeGroup.style.display = "none";
        if (signupCodeInput) signupCodeInput.value = "";
        closeAuthLayer();
        renderEventList();
        renderMyRegistrations();
        renderNotifications();
        return;
      }

      // first step: basic validation + send code
      if (!fullNameVal || !emailVal || !passVal || !confirmVal || !countryVal) {
        alert("Please fill all required fields to create an account.");
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
      alert(`Verification code sent to ${emailVal} (demo code: ${verificationCode})`);
      updateUserLoginUI();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      setCurrentUser(null);
      renderEventList();
      renderMyRegistrations();
      renderNotifications();
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
  const passwordToggles = layer.querySelectorAll(".ef-password-toggle");
  const forgotLink = layer.querySelector("#forgot-password-link");
  const privacyLinks = layer.querySelectorAll("[data-open-privacy]");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeAuthLayer());
  }

  layer.addEventListener("click", (e) => {
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
        `Password reset link sent to ${emailVal}.\n\nDemo note: In a real system, you would receive an email with a link to choose a new password. For this prototype, please sign in with the password you created or create a new account with a different email.`
      );
    });
  }

  privacyLinks.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const privacyLayer = document.getElementById("privacy-layer");
      if (!privacyLayer) return;
      privacyLayer.classList.add("open");
    });
  });

  passwordToggles.forEach((btn) => {
    const targetId = btn.dataset.target;
    const input = targetId ? document.getElementById(targetId) : null;
    if (!input) return;

    btn.addEventListener("click", () => {
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
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
    });
  }

  layer.addEventListener("click", (e) => {
    if (e.target === layer) {
      layer.classList.remove("open");
    }
  });
}

let currentRegistrationStep = 'information';

function showRegistrationStep(step) {
  currentRegistrationStep = step;
  const steps = document.querySelectorAll('.ef-registration-step');
  steps.forEach(s => s.style.display = 'none');
  
  const targetStep = document.querySelector(`[data-step="${step}"]`);
  if (targetStep) {
    targetStep.style.display = 'block';
  }
  
  updateRegistrationProgress(step);
}

function updateRegistrationProgress(step) {
  const progressSteps = document.querySelectorAll('.ef-progress-step');
  progressSteps.forEach((stepEl, index) => {
    stepEl.classList.remove('active', 'completed');
    
    const stepNumber = parseInt(stepEl.querySelector('.ef-progress-step-number').textContent);
    let currentStepNumber = 2; // Information is step 2
    
    if (step === 'summary') currentStepNumber = 3;
    else if (step === 'completed') currentStepNumber = 4;
    
    if (stepNumber < currentStepNumber) {
      stepEl.classList.add('completed');
    } else if (stepNumber === currentStepNumber) {
      stepEl.classList.add('active');
    }
  });
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

  cards.forEach((card) => {
    const cardIndex = parseInt(card.dataset.participantIndex || "0", 10);
    const nameInput = card.querySelector(`#participant-name-${cardIndex}`);
    const emailInput = card.querySelector(`#participant-email-${cardIndex}`);
    const phoneInput = card.querySelector(`#participant-phone-${cardIndex}`);
    const birthdateInput = card.querySelector(`#participant-birthdate-${cardIndex}`);
    const ticketSelect = card.querySelector(`#participant-ticket-select-${cardIndex}`);

    if (!nameInput || !emailInput || !phoneInput || !birthdateInput || !ticketSelect) {
      isValid = false;
      return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const birthdate = birthdateInput.value;
    const ticketType = ticketSelect.value;

    if (!name || !email || !phone || !birthdate) {
      isValid = false;
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
    alert("Please fill in all required fields.");
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
        <p><strong>Birthdate:</strong> ${new Date(participant.birthdate).toLocaleDateString()}</p>
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
  const layer = document.getElementById("registration-form-layer");
  if (!layer) return;

  const closeBtn = layer.querySelector("[data-registration-close]");
  const cancelBtn = layer.querySelector("[data-registration-cancel]");
  const form = document.getElementById("registration-form");
  const addParticipantBtn = document.getElementById("add-participant-btn");
  const nextBtn = layer.querySelector("[data-registration-next]");
  const backBtn = layer.querySelector("[data-registration-back]");
  const backSummaryBtn = layer.querySelector("[data-registration-back-summary]");
  const confirmBtn = layer.querySelector("[data-registration-confirm]");
  const closeCompletedBtn = layer.querySelector("[data-registration-close-completed]");

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

  layer.addEventListener("click", (e) => {
    if (e.target === layer) {
      closeRegistrationForm();
    }
  });

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

  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const eventId = form.dataset.eventId;
      if (!eventId) return;

      const participantsData = validateParticipantData();
      if (!participantsData) return;

      renderRegistrationSummary(eventId, participantsData);
      showRegistrationStep('summary');
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const eventId = form.dataset.eventId;
      if (!eventId) return;

      const participantsData = validateParticipantData();
      if (!participantsData) return;

      renderRegistrationCompleted(eventId, participantsData);
      showRegistrationStep('completed');
      
      // Submit registration after showing completed step
      setTimeout(() => {
        submitRegistration(eventId, participantsData);
      }, 500);
    });
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

document.addEventListener("DOMContentLoaded", () => {
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
  renderNotifications();
  renderHomeFeaturedList();
  renderAdminEventList();
  renderAdminUserList();
  renderStatistics();
  renderPlaceEvents();
  showView(DEFAULT_VIEW);
});


