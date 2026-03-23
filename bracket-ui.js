// Bracket UI — rendering and interaction

function renderBracket(container, regionKey, picks, results, editable) {
  container.innerHTML = "";

  if (regionKey === "finalfour") {
    renderFinalFour(container, picks, results, editable);
    return;
  }

  const region = REGIONS[regionKey];
  const bracketEl = document.createElement("div");
  bracketEl.className = "bracket-region" + (editable ? "" : " bracket-readonly");

  // Rounds for a region: R64 (8 games), R32 (4), S16 (2), E8 (1)
  const roundConfigs = [
    { round: 0, prefix: "r64", count: 8, label: "Round of 64" },
    { round: 1, prefix: "r32", count: 4, label: "Round of 32" },
    { round: 2, prefix: "s16", count: 2, label: "Sweet 16" },
    { round: 3, prefix: "e8", count: 1, label: "Elite 8" }
  ];

  for (const rc of roundConfigs) {
    const roundEl = document.createElement("div");
    roundEl.className = "bracket-round";

    const label = document.createElement("div");
    label.className = "round-label";
    label.textContent = rc.label;
    roundEl.appendChild(label);

    for (let i = 0; i < rc.count; i++) {
      const gameId = `${regionKey}_${rc.prefix}_${i}`;
      const game = BRACKET_GAMES[gameId];
      const matchup = createMatchupElement(game, gameId, picks, results, editable);

      // Add vertical spacing to align with previous round
      if (rc.round > 0) {
        const spacerHeight = Math.pow(2, rc.round) * 22 - 22;
        matchup.style.marginTop = i === 0 ? `${spacerHeight / 2}px` : `${spacerHeight}px`;
      }

      roundEl.appendChild(matchup);
    }

    bracketEl.appendChild(roundEl);
  }

  container.appendChild(bracketEl);
}

function renderFinalFour(container, picks, results, editable) {
  const ffEl = document.createElement("div");
  ffEl.className = "final-four-bracket" + (editable ? "" : " bracket-readonly");

  // Semi-finals
  const semisEl = document.createElement("div");
  semisEl.className = "ff-semis";

  const ff0 = BRACKET_GAMES["ff_0"];
  const ff1 = BRACKET_GAMES["ff_1"];

  const semi0 = document.createElement("div");
  semi0.className = "ff-game";
  const label0 = document.createElement("div");
  label0.className = "ff-label";
  label0.textContent = "East vs West";
  semi0.appendChild(label0);
  semi0.appendChild(createMatchupElement(ff0, "ff_0", picks, results, editable));

  const semi1 = document.createElement("div");
  semi1.className = "ff-game";
  const label1 = document.createElement("div");
  label1.className = "ff-label";
  label1.textContent = "Midwest vs South";
  semi1.appendChild(label1);
  semi1.appendChild(createMatchupElement(ff1, "ff_1", picks, results, editable));

  semisEl.appendChild(semi0);
  semisEl.appendChild(semi1);
  ffEl.appendChild(semisEl);

  // Championship
  const champGame = BRACKET_GAMES["championship"];
  const champEl = document.createElement("div");
  champEl.className = "ff-championship";
  const champLabel = document.createElement("div");
  champLabel.className = "ff-label";
  champLabel.textContent = "Championship";
  champEl.appendChild(champLabel);
  champEl.appendChild(createMatchupElement(champGame, "championship", picks, results, editable));
  ffEl.appendChild(champEl);

  // Champion display
  if (picks && picks["championship"]) {
    const championEl = document.createElement("div");
    championEl.className = "ff-label";
    championEl.style.marginTop = "0.5rem";
    championEl.style.fontSize = "1rem";
    championEl.style.color = "var(--primary)";
    championEl.textContent = `Champion: ${picks["championship"]}`;
    ffEl.appendChild(championEl);
  }

  container.appendChild(ffEl);
}

function createMatchupElement(game, gameId, picks, results, editable) {
  const matchup = document.createElement("div");
  matchup.className = "matchup";

  const teamA = resolveTeam(game, "A", picks, editable);
  const teamB = resolveTeam(game, "B", picks, editable);

  const picked = picks ? picks[gameId] : null;
  const actualWinner = results ? results[gameId] : null;

  matchup.appendChild(createTeamRow(teamA, gameId, "A", picked, actualWinner, editable, picks, results));
  matchup.appendChild(createTeamRow(teamB, gameId, "B", picked, actualWinner, editable, picks, results));

  return matchup;
}

function resolveTeam(game, slot, picks, editable) {
  // For R64 games, teams are fixed
  if (game.round === 0) {
    return slot === "A" ? game.teamA : game.teamB;
  }

  // For later rounds, teams come from picks (user bracket) or are TBD
  // Find the feeder game
  const feederGames = Object.values(BRACKET_GAMES).filter(
    g => g.nextGame === game.id && g.nextSlot === slot
  );

  if (feederGames.length === 0) return null;
  const feederGame = feederGames[0];

  if (picks && picks[feederGame.id]) {
    // Find the team object
    const teamName = picks[feederGame.id];
    return findTeamByName(teamName);
  }

  return null; // TBD
}

function findTeamByName(name) {
  for (const region of Object.values(REGIONS)) {
    for (const team of region.teams) {
      if (team.name === name) return team;
    }
  }
  return { name, seed: "?" };
}

function createTeamRow(team, gameId, slot, picked, actualWinner, editable, picks, results) {
  const row = document.createElement("div");
  row.className = "matchup-team";

  if (!team) {
    row.classList.add("empty");
    row.innerHTML = `<span class="team-name">TBD</span>`;
    return row;
  }

  const isSelected = picked === team.name;
  const isActualWinner = actualWinner === team.name;
  const isActualLoser = actualWinner && actualWinner !== team.name;

  if (isSelected) row.classList.add("selected");
  if (isSelected && isActualWinner) row.classList.add("correct");
  if (isSelected && isActualLoser) row.classList.add("wrong");
  if (!isSelected && isActualLoser) row.classList.add("eliminated");

  const seedSpan = document.createElement("span");
  seedSpan.className = "team-seed";
  seedSpan.textContent = team.seed;

  const nameSpan = document.createElement("span");
  nameSpan.className = "team-name";
  nameSpan.textContent = team.name;

  const indicator = document.createElement("span");
  indicator.className = "pick-indicator";
  if (isSelected && isActualWinner) indicator.textContent = "\u2713";
  if (isSelected && isActualLoser) indicator.textContent = "\u2717";

  row.appendChild(seedSpan);
  row.appendChild(nameSpan);
  row.appendChild(indicator);

  if (editable) {
    row.addEventListener("click", () => {
      makePick(gameId, team.name, picks, results);
    });
  }

  return row;
}

function makePick(gameId, teamName, picks, results) {
  // Picks are locked — tournament has started
  return;
  if (!window.currentUser) return;

  // If this pick is the same as current, do nothing
  if (picks[gameId] === teamName) return;

  const oldPick = picks[gameId];
  picks[gameId] = teamName;

  // Clear downstream picks that depended on the old pick
  if (oldPick) {
    clearDownstreamPicks(gameId, oldPick, picks);
  }

  // Save to Firebase and re-render
  savePicks(window.currentUser, picks);
  renderCurrentBracket();
  updatePicksCount();
}

function clearDownstreamPicks(gameId, oldTeamName, picks) {
  const game = BRACKET_GAMES[gameId];
  if (!game || !game.nextGame) return;

  const nextGameId = game.nextGame;
  if (picks[nextGameId] === oldTeamName) {
    const clearedName = picks[nextGameId];
    delete picks[nextGameId];
    clearDownstreamPicks(nextGameId, clearedName, picks);
  }
}

function updatePicksCount() {
  const picks = window.currentPicks || {};
  const count = Object.keys(picks).length;
  const el = document.getElementById("picks-count");
  if (el) el.textContent = count;
}

// Admin functions
function renderAdminRegion(container, regionKey, results) {
  container.innerHTML = "";

  if (regionKey === "finalfour") {
    renderAdminFinalFour(container, results);
    return;
  }

  const roundConfigs = [
    { round: 0, prefix: "r64", count: 8, label: "Round of 64" },
    { round: 1, prefix: "r32", count: 4, label: "Round of 32" },
    { round: 2, prefix: "s16", count: 2, label: "Sweet 16" },
    { round: 3, prefix: "e8", count: 1, label: "Elite 8" }
  ];

  for (const rc of roundConfigs) {
    const heading = document.createElement("h3");
    heading.textContent = rc.label;
    heading.style.cssText = "margin: 1rem 0 0.5rem; font-size: 0.95rem;";
    container.appendChild(heading);

    for (let i = 0; i < rc.count; i++) {
      const gameId = `${regionKey}_${rc.prefix}_${i}`;
      const game = BRACKET_GAMES[gameId];
      container.appendChild(createAdminGame(game, gameId, results));
    }
  }
}

function renderAdminFinalFour(container, results) {
  const games = [
    { id: "ff_0", label: "Final Four: East vs West" },
    { id: "ff_1", label: "Final Four: Midwest vs South" },
    { id: "championship", label: "Championship" }
  ];

  for (const g of games) {
    const heading = document.createElement("h3");
    heading.textContent = g.label;
    heading.style.cssText = "margin: 1rem 0 0.5rem; font-size: 0.95rem;";
    container.appendChild(heading);
    container.appendChild(createAdminGame(BRACKET_GAMES[g.id], g.id, results));
  }
}

function createAdminGame(game, gameId, results) {
  const el = document.createElement("div");
  el.className = "admin-game";

  const teamA = resolveAdminTeam(game, "A", results);
  const teamB = resolveAdminTeam(game, "B", results);

  const label = document.createElement("div");
  label.className = "admin-game-label";
  label.textContent = `Game: ${gameId}`;
  el.appendChild(label);

  const teamsDiv = document.createElement("div");
  teamsDiv.className = "admin-teams";

  const currentWinner = results[gameId] || null;

  const btnA = document.createElement("button");
  btnA.className = "admin-team-btn";
  if (!teamA) {
    btnA.textContent = "TBD";
    btnA.disabled = true;
  } else {
    btnA.textContent = `(${teamA.seed}) ${teamA.name}`;
    if (currentWinner === teamA.name) btnA.classList.add("winner");
    btnA.addEventListener("click", () => {
      setResult(gameId, teamA.name, results);
    });
  }

  const btnB = document.createElement("button");
  btnB.className = "admin-team-btn";
  if (!teamB) {
    btnB.textContent = "TBD";
    btnB.disabled = true;
  } else {
    btnB.textContent = `(${teamB.seed}) ${teamB.name}`;
    if (currentWinner === teamB.name) btnB.classList.add("winner");
    btnB.addEventListener("click", () => {
      setResult(gameId, teamB.name, results);
    });
  }

  teamsDiv.appendChild(btnA);
  teamsDiv.appendChild(btnB);
  el.appendChild(teamsDiv);

  return el;
}

function resolveAdminTeam(game, slot, results) {
  if (game.round === 0) {
    return slot === "A" ? game.teamA : game.teamB;
  }

  const feederGames = Object.values(BRACKET_GAMES).filter(
    g => g.nextGame === game.id && g.nextSlot === slot
  );

  if (feederGames.length === 0) return null;
  const feederGame = feederGames[0];

  if (results[feederGame.id]) {
    return findTeamByName(results[feederGame.id]);
  }

  return null;
}

function setResult(gameId, teamName, results) {
  const oldResult = results[gameId];
  results[gameId] = teamName;

  // Clear downstream results if changed
  if (oldResult && oldResult !== teamName) {
    clearDownstreamResults(gameId, oldResult, results);
  }

  saveResults(results);
  renderCurrentAdmin();
}

function clearDownstreamResults(gameId, oldTeamName, results) {
  const game = BRACKET_GAMES[gameId];
  if (!game || !game.nextGame) return;

  const nextGameId = game.nextGame;
  if (results[nextGameId] === oldTeamName) {
    const cleared = results[nextGameId];
    delete results[nextGameId];
    clearDownstreamResults(nextGameId, cleared, results);
  }
}
