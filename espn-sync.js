// ESPN Live Results Sync
// Fetches NCAA tournament results from ESPN's public API and maps them to bracket game IDs

const TOURNAMENT_START = "20260317";

// Map ESPN team names to bracket team names where they differ
const ESPN_TEAM_MAP = {
  "Hawai'i": "Hawaii",
  "Hawaii": "Hawaii",
  "Long Island University": "LIU",
  "LIU": "LIU",
  "Miami (OH)": "Miami OH",
  "Miami (FL)": "Miami FL",
  "Miami": "Miami FL",
  "California Baptist": "Cal Baptist",
  "Cal Baptist": "Cal Baptist",
  "Queens (NC)": "Queens",
  "Queens University": "Queens",
  "Saint Mary's (CA)": "Saint Mary's",
  "Pennsylvania": "Penn",
  "Prairie View": "Prairie View A&M",
  "Prairie View A&M": "Prairie View A&M",
  "North Dakota St": "North Dakota State",
  "North Dakota State": "North Dakota State",
  "Tennessee St": "Tennessee State",
  "Tennessee State": "Tennessee State",
  "Wright St": "Wright State",
  "Wright State": "Wright State",
  "Utah St": "Utah State",
  "Utah State": "Utah State",
  "Kennesaw St": "Kennesaw State",
  "Kennesaw State": "Kennesaw State",
  "Northern Iowa": "Northern Iowa",
  "UNI": "Northern Iowa",
  "South Florida": "South Florida",
  "USF": "South Florida",
  "North Carolina": "North Carolina",
  "UNC": "North Carolina",
  "Texas A&M": "Texas A&M",
  "McNeese State": "McNeese",
  "McNeese": "McNeese",
  "Saint Louis": "Saint Louis",
  "St. John's": "St. John's",
  "St John's": "St. John's",
  "High Point": "High Point",
};

// Build set of all bracket team names for validation
const ALL_BRACKET_TEAMS = new Set();
for (const region of Object.values(REGIONS)) {
  for (const team of region.teams) {
    ALL_BRACKET_TEAMS.add(team.name);
  }
}

function resolveESPNTeamName(espnName) {
  if (!espnName) return null;

  // Direct map hit
  if (ESPN_TEAM_MAP[espnName]) return ESPN_TEAM_MAP[espnName];

  // Exact match in bracket
  if (ALL_BRACKET_TEAMS.has(espnName)) return espnName;

  // Try stripping parenthetical suffixes: "Queens (NC)" -> "Queens"
  const stripped = espnName.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (ALL_BRACKET_TEAMS.has(stripped)) return stripped;

  // Try common abbreviation patterns
  const withState = stripped + " State";
  if (ALL_BRACKET_TEAMS.has(withState)) return withState;

  console.warn(`ESPN Sync: Could not map team "${espnName}" to bracket`);
  return null;
}

// Parse ESPN note/headline to extract region and round
function parseESPNNote(notes) {
  if (!notes || notes.length === 0) return null;

  const headline = (notes[0].headline || "").toLowerCase();

  let region = null;
  if (headline.includes("midwest")) region = "midwest";
  else if (headline.includes("east")) region = "east";
  else if (headline.includes("west")) region = "west";
  else if (headline.includes("south")) region = "south";

  let roundPrefix = null;
  if (headline.includes("1st round") || headline.includes("first round")) roundPrefix = "r64";
  else if (headline.includes("2nd round") || headline.includes("second round")) roundPrefix = "r32";
  else if (headline.includes("sweet 16") || headline.includes("sweet sixteen")) roundPrefix = "s16";
  else if (headline.includes("elite 8") || headline.includes("elite eight")) roundPrefix = "e8";
  else if (headline.includes("national championship") || headline.includes("championship game")) {
    region = "finalfour";
    roundPrefix = "championship";
  } else if (headline.includes("final four") || headline.includes("national semifinal")) {
    region = "finalfour";
    roundPrefix = "ff";
  }

  if (!roundPrefix) return null;
  return { region, roundPrefix };
}

// Find the bracket gameId matching two teams in a given region/round
function matchESPNGameToBracket(teamA, teamB, region, roundPrefix, results) {
  if (!teamA || !teamB) return null;

  // Special handling for Final Four and Championship
  if (roundPrefix === "ff") {
    for (const gid of ["ff_0", "ff_1"]) {
      const game = BRACKET_GAMES[gid];
      const slotA = resolveTeamFromResults(game, "A", results);
      const slotB = resolveTeamFromResults(game, "B", results);
      if (slotA && slotB && teamsMatch(slotA, slotB, teamA, teamB)) return gid;
    }
    return null;
  }

  if (roundPrefix === "championship") {
    const game = BRACKET_GAMES["championship"];
    const slotA = resolveTeamFromResults(game, "A", results);
    const slotB = resolveTeamFromResults(game, "B", results);
    if (slotA && slotB && teamsMatch(slotA, slotB, teamA, teamB)) return "championship";
    return null;
  }

  if (!region) return null;

  // Find all games in this region/round
  const candidates = Object.values(BRACKET_GAMES).filter(
    g => g.region === region && g.id.includes(`_${roundPrefix}_`)
  );

  for (const game of candidates) {
    let slotA, slotB;

    if (game.round === 0) {
      // R64: teams are static
      slotA = game.teamA ? game.teamA.name : null;
      slotB = game.teamB ? game.teamB.name : null;
    } else {
      // Later rounds: resolve from results
      slotA = resolveTeamFromResults(game, "A", results);
      slotB = resolveTeamFromResults(game, "B", results);
    }

    if (slotA && slotB && teamsMatch(slotA, slotB, teamA, teamB)) {
      return game.id;
    }
  }

  return null;
}

function resolveTeamFromResults(game, slot, results) {
  if (game.round === 0) {
    return slot === "A" ? (game.teamA ? game.teamA.name : null) : (game.teamB ? game.teamB.name : null);
  }

  const feederGames = Object.values(BRACKET_GAMES).filter(
    g => g.nextGame === game.id && g.nextSlot === slot
  );
  if (feederGames.length === 0) return null;
  return results[feederGames[0].id] || null;
}

function teamsMatch(slotA, slotB, teamA, teamB) {
  return (slotA === teamA && slotB === teamB) || (slotA === teamB && slotB === teamA);
}

// Get date strings from tournament start to today
function getTournamentDates() {
  const dates = [];
  const start = new Date(
    parseInt(TOURNAMENT_START.slice(0, 4)),
    parseInt(TOURNAMENT_START.slice(4, 6)) - 1,
    parseInt(TOURNAMENT_START.slice(6, 8))
  );
  const today = new Date();
  today.setHours(23, 59, 59); // include all of today

  const d = new Date(start);
  while (d <= today) {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    dates.push(`${yr}${mo}${dy}`);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// Round ordering for processing games in correct sequence
const ROUND_ORDER = { r64: 0, r32: 1, s16: 2, e8: 3, ff: 4, championship: 5 };

// Main sync function
async function syncESPNResults() {
  const results = loadResults();
  const dates = getTournamentDates();
  let synced = 0;
  let skipped = 0;
  const errors = [];

  // Collect all completed games first, then process in round order
  const completedGames = [];

  for (const date of dates) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${date}&groups=100&limit=100`;
      const resp = await fetch(url);
      if (!resp.ok) {
        errors.push(`HTTP ${resp.status} for date ${date}`);
        continue;
      }
      const data = await resp.json();

      for (const event of (data.events || [])) {
        const status = event.status;
        if (!status || !status.type || !status.type.completed) continue;

        const competitors = event.competitions?.[0]?.competitors;
        if (!competitors || competitors.length !== 2) continue;

        const winner = competitors.find(c => c.winner);
        if (!winner) continue;

        const espnTeamA = competitors[0].team?.location || competitors[0].team?.displayName;
        const espnTeamB = competitors[1].team?.location || competitors[1].team?.displayName;
        const winnerName = winner.team?.location || winner.team?.displayName;

        const bracketTeamA = resolveESPNTeamName(espnTeamA);
        const bracketTeamB = resolveESPNTeamName(espnTeamB);
        const bracketWinner = resolveESPNTeamName(winnerName);

        if (!bracketTeamA || !bracketTeamB || !bracketWinner) {
          // Likely a First Four / play-in game not in our bracket — skip quietly
          continue;
        }

        const parsed = parseESPNNote(event.competitions?.[0]?.notes);
        if (!parsed) {
          // Try to infer from event name/season type
          continue;
        }

        completedGames.push({
          teamA: bracketTeamA,
          teamB: bracketTeamB,
          winner: bracketWinner,
          region: parsed.region,
          roundPrefix: parsed.roundPrefix,
          roundOrder: ROUND_ORDER[parsed.roundPrefix] ?? 99
        });
      }
    } catch (e) {
      errors.push(`Fetch error for ${date}: ${e.message}`);
    }
  }

  // Sort by round order so earlier rounds are processed first
  completedGames.sort((a, b) => a.roundOrder - b.roundOrder);

  for (const game of completedGames) {
    const gameId = matchESPNGameToBracket(game.teamA, game.teamB, game.region, game.roundPrefix, results);

    if (!gameId) {
      skipped++;
      continue;
    }

    if (results[gameId] && results[gameId] === game.winner) {
      skipped++;
      continue;
    }

    results[gameId] = game.winner;
    synced++;
  }

  if (synced > 0) {
    saveResults(results);
    currentResults = results;
    refreshViews();
  }

  const status = {
    synced,
    skipped,
    errors,
    timestamp: new Date().toLocaleTimeString()
  };

  updateSyncStatusUI(status);
  return status;
}

function updateSyncStatusUI(status) {
  const el = document.getElementById("sync-status");
  if (!el) return;

  if (status.errors.length > 0) {
    el.textContent = `${status.timestamp}: ${status.synced} updated, ${status.errors.length} errors`;
    el.className = "sync-status sync-warn";
  } else {
    el.textContent = `${status.timestamp}: ${status.synced} updated, ${status.skipped} unchanged`;
    el.className = "sync-status sync-ok";
  }
}

// Auto-sync
let syncIntervalId = null;

function startAutoSync(intervalMs = 180000) {
  stopAutoSync();
  syncESPNResults();
  syncIntervalId = setInterval(syncESPNResults, intervalMs);
}

function stopAutoSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}
