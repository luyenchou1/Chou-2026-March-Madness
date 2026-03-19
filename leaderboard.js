// Leaderboard — scoring and standings

function calculateScore(picks, results) {
  let total = 0;
  const roundScores = [0, 0, 0, 0, 0, 0];
  const roundCorrect = [0, 0, 0, 0, 0, 0];

  for (const [gameId, winner] of Object.entries(results)) {
    if (!winner) continue;
    const game = BRACKET_GAMES[gameId];
    if (!game) continue;

    if (picks[gameId] === winner) {
      const pts = ROUNDS[game.round].points;
      total += pts;
      roundScores[game.round] += pts;
      roundCorrect[game.round]++;
    }
  }

  return { total, roundScores, roundCorrect };
}

function calculateMaxPossible(picks, results) {
  // Calculate maximum possible score: current score + points for all undecided games
  // where the user's pick is still alive
  let maxScore = 0;

  for (const [gameId, game] of Object.entries(BRACKET_GAMES)) {
    const pick = picks[gameId];
    if (!pick) continue;

    const result = results[gameId];
    if (result) {
      // Game decided — add points if correct
      if (result === pick) {
        maxScore += ROUNDS[game.round].points;
      }
    } else {
      // Game not decided — check if pick is still alive (not eliminated in earlier round)
      if (isTeamStillAlive(pick, results)) {
        maxScore += ROUNDS[game.round].points;
      }
    }
  }

  return maxScore;
}

function isTeamStillAlive(teamName, results) {
  // A team is eliminated if they lost any game in the results
  for (const [gameId, winner] of Object.entries(results)) {
    if (!winner) continue;
    const game = BRACKET_GAMES[gameId];
    if (!game) continue;

    // Check if this team was in this game and lost
    const teamA = game.round === 0 ? game.teamA : null;
    const teamB = game.round === 0 ? game.teamB : null;

    // For R64, check directly
    if (game.round === 0) {
      if ((teamA && teamA.name === teamName) || (teamB && teamB.name === teamName)) {
        if (winner !== teamName) return false;
      }
    } else {
      // For later rounds, if this team won an earlier game leading to this one
      // and the result shows a different winner, team is eliminated
      const feederA = Object.values(BRACKET_GAMES).find(
        g => g.nextGame === gameId && g.nextSlot === "A"
      );
      const feederB = Object.values(BRACKET_GAMES).find(
        g => g.nextGame === gameId && g.nextSlot === "B"
      );

      const slotA = feederA && results[feederA.id];
      const slotB = feederB && results[feederB.id];

      if ((slotA === teamName || slotB === teamName) && winner !== teamName) {
        return false;
      }
    }
  }

  return true;
}

function renderLeaderboard(container, allPicks, results) {
  container.innerHTML = "";

  const standings = FAMILY_MEMBERS.map(name => {
    const picks = allPicks[name] || {};
    const score = calculateScore(picks, results);
    const maxPossible = calculateMaxPossible(picks, results);
    const totalPicks = Object.keys(picks).length;
    return { name, ...score, maxPossible, totalPicks };
  });

  // Sort by total score descending, then max possible
  standings.sort((a, b) => b.total - a.total || b.maxPossible - a.maxPossible);

  standings.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = `leaderboard-card rank-${index + 1}`;

    const rankDiv = document.createElement("div");
    rankDiv.className = "leaderboard-rank";
    rankDiv.textContent = index + 1;

    const infoDiv = document.createElement("div");
    infoDiv.className = "leaderboard-info";

    const nameDiv = document.createElement("div");
    nameDiv.className = "leaderboard-name";
    nameDiv.textContent = player.name;

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "leaderboard-details";
    detailsDiv.textContent = `${player.totalPicks}/63 picks | Max possible: ${player.maxPossible} pts`;

    const breakdownDiv = document.createElement("div");
    breakdownDiv.className = "round-breakdown";
    ROUNDS.forEach((round, ri) => {
      if (player.roundCorrect[ri] > 0 || player.roundScores[ri] > 0) {
        const chip = document.createElement("span");
        chip.className = "round-chip has-points";
        chip.textContent = `${round.shortName}: ${player.roundScores[ri]}`;
        breakdownDiv.appendChild(chip);
      }
    });

    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(detailsDiv);
    if (breakdownDiv.children.length > 0) {
      infoDiv.appendChild(breakdownDiv);
    }

    const scoreDiv = document.createElement("div");
    scoreDiv.style.textAlign = "right";
    const scoreNum = document.createElement("div");
    scoreNum.className = "leaderboard-score";
    scoreNum.textContent = player.total;
    const scoreLabel = document.createElement("div");
    scoreLabel.className = "leaderboard-score-label";
    scoreLabel.textContent = "points";
    scoreDiv.appendChild(scoreNum);
    scoreDiv.appendChild(scoreLabel);

    card.appendChild(rankDiv);
    card.appendChild(infoDiv);
    card.appendChild(scoreDiv);
    container.appendChild(card);
  });

  // If no results yet
  if (Object.keys(results).length === 0) {
    const note = document.createElement("p");
    note.style.cssText = "text-align: center; color: var(--text-light); margin-top: 1rem; font-size: 0.9rem;";
    note.textContent = "No game results yet. Scores will update as games are played!";
    container.appendChild(note);
  }
}
