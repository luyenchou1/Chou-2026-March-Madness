// Main App — routing, auth, Firebase integration

let db = null;
let firebaseReady = false;
let currentUser = null;
let currentPicks = {};
let allPicks = {};
let currentResults = {};
let currentRegion = "east";
let viewRegion = "east";
let adminRegion = "east";
let viewingMember = null;

// Theme
function initTheme() {
  const saved = localStorage.getItem("mm-theme");
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  if (current === "dark") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("mm-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("mm-theme", "dark");
  }
}

// Firebase
function initFirebase() {
  try {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
      console.warn("Firebase not configured — using localStorage fallback");
      return;
    }
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    firebaseReady = true;
    listenForChanges();
  } catch (e) {
    console.warn("Firebase init failed:", e);
  }
}

function listenForChanges() {
  if (!db) return;

  // Listen for all picks
  db.ref("picks").on("value", (snapshot) => {
    allPicks = snapshot.val() || {};
    if (currentUser && allPicks[currentUser]) {
      currentPicks = allPicks[currentUser];
    }
    refreshViews();
  });

  // Listen for results
  db.ref("results").on("value", (snapshot) => {
    currentResults = snapshot.val() || {};
    refreshViews();
  });
}

function savePicks(userName, picks) {
  if (firebaseReady && db) {
    db.ref(`picks/${userName}`).set(picks);
  } else {
    localStorage.setItem(`mm-picks-${userName}`, JSON.stringify(picks));
    allPicks[userName] = picks;
  }
}

function loadPicks(userName) {
  if (firebaseReady) {
    return allPicks[userName] || {};
  }
  const stored = localStorage.getItem(`mm-picks-${userName}`);
  return stored ? JSON.parse(stored) : {};
}

function saveResults(results) {
  if (firebaseReady && db) {
    db.ref("results").set(results);
  } else {
    localStorage.setItem("mm-results", JSON.stringify(results));
  }
}

function loadResults() {
  if (firebaseReady) {
    return currentResults;
  }
  const stored = localStorage.getItem("mm-results");
  return stored ? JSON.parse(stored) : {};
}

function loadAllPicks() {
  if (firebaseReady) return allPicks;
  const all = {};
  for (const name of FAMILY_MEMBERS) {
    const stored = localStorage.getItem(`mm-picks-${name}`);
    if (stored) all[name] = JSON.parse(stored);
  }
  return all;
}

// Auth
function login(name) {
  currentUser = name;
  window.currentUser = name;
  localStorage.setItem("mm-user", name);

  currentPicks = loadPicks(name);
  window.currentPicks = currentPicks;
  currentResults = loadResults();

  document.getElementById("user-name").textContent = name;
  document.getElementById("login-screen").classList.remove("active");
  document.getElementById("main-screen").classList.add("active");

  // Show admin link only for Da
  document.getElementById("admin-link").style.display =
    name === "Da" ? "block" : "none";

  // Show firebase warning if not configured
  if (!firebaseReady) {
    showFirebaseWarning();
  }

  navigateTo("bracket");
}

function logout() {
  currentUser = null;
  window.currentUser = null;
  currentPicks = {};
  localStorage.removeItem("mm-user");

  document.getElementById("main-screen").classList.remove("active");
  document.getElementById("login-screen").classList.add("active");
}

function showFirebaseWarning() {
  const existing = document.querySelector(".firebase-warning");
  if (existing) return;

  const warning = document.createElement("div");
  warning.className = "firebase-warning";
  warning.innerHTML = `
    <strong>Local mode:</strong> Firebase is not configured yet. Picks are saved to this device only.
    To enable family sync, set up Firebase in <code>firebase-config.js</code>.
  `;
  document.querySelector("main").prepend(warning);
}

// Navigation
function navigateTo(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

  const viewEl = document.getElementById(`${view}-view`);
  const linkEl = document.querySelector(`.nav-link[data-view="${view}"]`);

  if (viewEl) viewEl.classList.add("active");
  if (linkEl) linkEl.classList.add("active");

  if (view === "bracket") renderCurrentBracket();
  if (view === "leaderboard") renderCurrentLeaderboard();
  if (view === "view") renderViewBracket();
  if (view === "admin") renderCurrentAdmin();
}

function refreshViews() {
  const activeView = document.querySelector(".view.active");
  if (!activeView) return;
  const viewId = activeView.id.replace("-view", "");
  if (viewId === "bracket") renderCurrentBracket();
  if (viewId === "leaderboard") renderCurrentLeaderboard();
  if (viewId === "view") renderViewBracket();
  if (viewId === "admin") renderCurrentAdmin();
}

// Render helpers
function renderCurrentBracket() {
  const container = document.getElementById("bracket-container");
  currentPicks = loadPicks(currentUser);
  window.currentPicks = currentPicks;
  currentResults = loadResults();
  renderBracket(container, currentRegion, currentPicks, currentResults, true);
  updatePicksCount();
}

function renderCurrentLeaderboard() {
  const container = document.getElementById("leaderboard-container");
  const all = loadAllPicks();
  const results = loadResults();
  renderLeaderboard(container, all, results);
}

function renderViewBracket() {
  const container = document.getElementById("view-bracket-container");
  if (!viewingMember) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">Select a family member to view their bracket.</p>';
    return;
  }
  const memberPicks = loadPicks(viewingMember);
  const results = loadResults();
  renderBracket(container, viewRegion, memberPicks, results, false);
}

function renderCurrentAdmin() {
  const container = document.getElementById("admin-container");
  currentResults = loadResults();
  renderAdminRegion(container, adminRegion, currentResults);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initFirebase();

  // Family login buttons
  document.querySelectorAll(".family-btn").forEach(btn => {
    btn.addEventListener("click", () => login(btn.dataset.name));
  });

  // Logout
  document.getElementById("logout-btn").addEventListener("click", logout);

  // Theme toggle
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  // Navigation
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(link.dataset.view);
      window.location.hash = link.dataset.view;
    });
  });

  // Region tabs (bracket view)
  document.querySelector(".bracket-header .region-tabs").addEventListener("click", (e) => {
    if (!e.target.classList.contains("region-tab")) return;
    document.querySelectorAll(".bracket-header .region-tab").forEach(t => t.classList.remove("active"));
    e.target.classList.add("active");
    currentRegion = e.target.dataset.region;
    renderCurrentBracket();
  });

  // Region tabs (view brackets)
  document.getElementById("view-region-tabs").addEventListener("click", (e) => {
    if (!e.target.classList.contains("region-tab")) return;
    document.querySelectorAll("#view-region-tabs .region-tab").forEach(t => t.classList.remove("active"));
    e.target.classList.add("active");
    viewRegion = e.target.dataset.region;
    renderViewBracket();
  });

  // Region tabs (admin)
  document.getElementById("admin-region-tabs").addEventListener("click", (e) => {
    if (!e.target.classList.contains("region-tab")) return;
    document.querySelectorAll("#admin-region-tabs .region-tab").forEach(t => t.classList.remove("active"));
    e.target.classList.add("active");
    adminRegion = e.target.dataset.region;
    renderCurrentAdmin();
  });

  // View member buttons
  document.querySelectorAll(".view-member-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-member-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      viewingMember = btn.dataset.name;
      renderViewBracket();
    });
  });

  // Hash routing
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.slice(1);
    if (["bracket", "leaderboard", "view", "admin"].includes(hash)) {
      navigateTo(hash);
    }
  });

  // Auto-login if remembered
  const savedUser = localStorage.getItem("mm-user");
  if (savedUser && FAMILY_MEMBERS.includes(savedUser)) {
    login(savedUser);
  }

  // Handle initial hash
  const hash = window.location.hash.slice(1);
  if (hash && currentUser) {
    navigateTo(hash);
  }
});
