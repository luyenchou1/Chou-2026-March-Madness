// 2026 NCAA Men's March Madness Tournament Data
// First Four results already resolved

const REGIONS = {
  east: {
    name: "East",
    location: "Newark / Washington D.C.",
    teams: [
      { seed: 1, name: "Duke" },
      { seed: 16, name: "Siena" },
      { seed: 8, name: "Ohio State" },
      { seed: 9, name: "TCU" },
      { seed: 5, name: "St. John's" },
      { seed: 12, name: "Northern Iowa" },
      { seed: 4, name: "Kansas" },
      { seed: 13, name: "Cal Baptist" },
      { seed: 6, name: "Louisville" },
      { seed: 11, name: "South Florida" },
      { seed: 3, name: "Michigan State" },
      { seed: 14, name: "North Dakota State" },
      { seed: 7, name: "UCLA" },
      { seed: 10, name: "UCF" },
      { seed: 2, name: "UConn" },
      { seed: 15, name: "Furman" }
    ]
  },
  west: {
    name: "West",
    location: "Denver / San Antonio",
    teams: [
      { seed: 1, name: "Arizona" },
      { seed: 16, name: "LIU" },
      { seed: 8, name: "Villanova" },
      { seed: 9, name: "Utah State" },
      { seed: 5, name: "Wisconsin" },
      { seed: 12, name: "High Point" },
      { seed: 4, name: "Arkansas" },
      { seed: 13, name: "Hawaii" },
      { seed: 6, name: "BYU" },
      { seed: 11, name: "Texas" },
      { seed: 3, name: "Gonzaga" },
      { seed: 14, name: "Kennesaw State" },
      { seed: 7, name: "Miami FL" },
      { seed: 10, name: "Missouri" },
      { seed: 2, name: "Purdue" },
      { seed: 15, name: "Queens" }
    ]
  },
  midwest: {
    name: "Midwest",
    location: "Minneapolis / Detroit",
    teams: [
      { seed: 1, name: "Michigan" },
      { seed: 16, name: "Howard" },
      { seed: 8, name: "Georgia" },
      { seed: 9, name: "Saint Louis" },
      { seed: 5, name: "Texas Tech" },
      { seed: 12, name: "Akron" },
      { seed: 4, name: "Alabama" },
      { seed: 13, name: "Hofstra" },
      { seed: 6, name: "Tennessee" },
      { seed: 11, name: "Miami OH" },
      { seed: 3, name: "Virginia" },
      { seed: 14, name: "Wright State" },
      { seed: 7, name: "Kentucky" },
      { seed: 10, name: "Santa Clara" },
      { seed: 2, name: "Iowa State" },
      { seed: 15, name: "Tennessee State" }
    ]
  },
  south: {
    name: "South",
    location: "Memphis / San Francisco",
    teams: [
      { seed: 1, name: "Florida" },
      { seed: 16, name: "Prairie View A&M" },
      { seed: 8, name: "Clemson" },
      { seed: 9, name: "Iowa" },
      { seed: 5, name: "Vanderbilt" },
      { seed: 12, name: "McNeese" },
      { seed: 4, name: "Nebraska" },
      { seed: 13, name: "Troy" },
      { seed: 6, name: "North Carolina" },
      { seed: 11, name: "VCU" },
      { seed: 3, name: "Illinois" },
      { seed: 14, name: "Penn" },
      { seed: 7, name: "Saint Mary's" },
      { seed: 10, name: "Texas A&M" },
      { seed: 2, name: "Houston" },
      { seed: 15, name: "Idaho" }
    ]
  }
};

// Round names and point values
const ROUNDS = [
  { name: "Round of 64", shortName: "R64", points: 1, games: 32 },
  { name: "Round of 32", shortName: "R32", points: 2, games: 16 },
  { name: "Sweet 16", shortName: "S16", points: 4, games: 8 },
  { name: "Elite 8", shortName: "E8", points: 8, games: 4 },
  { name: "Final Four", shortName: "FF", points: 16, games: 2 },
  { name: "Championship", shortName: "CHAMP", points: 32, games: 1 }
];

const FAMILY_MEMBERS = ["Alaina", "Beili", "Mama", "Da"];

// Game IDs follow the pattern: region_round_gamenum
// Round of 64 games per region: 8 games (teams paired top to bottom)
// Teams in each region are ordered as matchup pairs:
//   [0] vs [1], [2] vs [3], [4] vs [5], [6] vs [7],
//   [8] vs [9], [10] vs [11], [12] vs [13], [14] vs [15]

function buildBracketStructure() {
  const games = {};

  // Round of 64 — 8 games per region, 32 total
  for (const regionKey of Object.keys(REGIONS)) {
    const region = REGIONS[regionKey];
    for (let i = 0; i < 8; i++) {
      const gameId = `${regionKey}_r64_${i}`;
      games[gameId] = {
        id: gameId,
        region: regionKey,
        round: 0,
        gameInRound: i,
        teamA: region.teams[i * 2],
        teamB: region.teams[i * 2 + 1],
        nextGame: `${regionKey}_r32_${Math.floor(i / 2)}`,
        nextSlot: i % 2 === 0 ? "A" : "B"
      };
    }

    // Round of 32 — 4 games per region
    for (let i = 0; i < 4; i++) {
      const gameId = `${regionKey}_r32_${i}`;
      games[gameId] = {
        id: gameId,
        region: regionKey,
        round: 1,
        gameInRound: i,
        teamA: null,
        teamB: null,
        nextGame: `${regionKey}_s16_${Math.floor(i / 2)}`,
        nextSlot: i % 2 === 0 ? "A" : "B"
      };
    }

    // Sweet 16 — 2 games per region
    for (let i = 0; i < 2; i++) {
      const gameId = `${regionKey}_s16_${i}`;
      games[gameId] = {
        id: gameId,
        region: regionKey,
        round: 2,
        gameInRound: i,
        teamA: null,
        teamB: null,
        nextGame: `${regionKey}_e8_0`,
        nextSlot: i === 0 ? "A" : "B"
      };
    }

    // Elite 8 — 1 game per region
    games[`${regionKey}_e8_0`] = {
      id: `${regionKey}_e8_0`,
      region: regionKey,
      round: 3,
      gameInRound: 0,
      teamA: null,
      teamB: null,
      nextGame: null, // set below for Final Four
      nextSlot: null
    };
  }

  // Final Four: East vs West, Midwest vs South
  games["east_e8_0"].nextGame = "ff_0";
  games["east_e8_0"].nextSlot = "A";
  games["west_e8_0"].nextGame = "ff_0";
  games["west_e8_0"].nextSlot = "B";
  games["midwest_e8_0"].nextGame = "ff_1";
  games["midwest_e8_0"].nextSlot = "A";
  games["south_e8_0"].nextGame = "ff_1";
  games["south_e8_0"].nextSlot = "B";

  games["ff_0"] = {
    id: "ff_0",
    region: "finalfour",
    round: 4,
    gameInRound: 0,
    teamA: null,
    teamB: null,
    nextGame: "championship",
    nextSlot: "A",
    label: "East vs West"
  };

  games["ff_1"] = {
    id: "ff_1",
    region: "finalfour",
    round: 4,
    gameInRound: 1,
    teamA: null,
    teamB: null,
    nextGame: "championship",
    nextSlot: "B",
    label: "Midwest vs South"
  };

  games["championship"] = {
    id: "championship",
    region: "finalfour",
    round: 5,
    gameInRound: 0,
    teamA: null,
    teamB: null,
    nextGame: null,
    nextSlot: null,
    label: "Championship"
  };

  return games;
}

const BRACKET_GAMES = buildBracketStructure();

// Get all game IDs for a specific round
function getGamesByRound(round) {
  return Object.values(BRACKET_GAMES).filter(g => g.round === round);
}

// Get all game IDs for a specific region
function getGamesByRegion(regionKey) {
  return Object.values(BRACKET_GAMES).filter(g => g.region === regionKey);
}
