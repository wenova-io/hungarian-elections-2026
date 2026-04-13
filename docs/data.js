// Embedded analysis data for the web app
const DATA = {
  // Gallagher Index Timeline
  gallagher: [
    { year: 1990, lsq: 13.04, winner: "MDF", vote_pct: 24.73, seat_pct: 42.49, distortion: 17.76 },
    { year: 1994, lsq: 15.24, winner: "MSZP", vote_pct: 32.99, seat_pct: 54.15, distortion: 21.16 },
    { year: 1998, lsq: 6.61, winner: "Fidesz", vote_pct: 29.48, seat_pct: 38.34, distortion: 8.86 },
    { year: 2002, lsq: 7.4, winner: "Fidesz-MDF", vote_pct: 41.07, seat_pct: 48.70, distortion: 7.63 },
    { year: 2006, lsq: 4.06, winner: "MSZP", vote_pct: 43.21, seat_pct: 48.17, distortion: 4.96 },
    { year: 2010, lsq: 11.93, winner: "Fidesz-KDNP", vote_pct: 52.73, seat_pct: 68.13, distortion: 15.40 },
    { year: 2014, lsq: 17.42, winner: "Fidesz-KDNP", vote_pct: 44.87, seat_pct: 66.83, distortion: 21.96 },
    { year: 2018, lsq: 13.60, winner: "Fidesz-KDNP", vote_pct: 49.27, seat_pct: 66.83, distortion: 17.56 },
    { year: 2022, lsq: 10.97, winner: "Fidesz-KDNP", vote_pct: 54.13, seat_pct: 67.84, distortion: 13.71 },
    { year: 2026, lsq: 13.36, winner: "Tisza", vote_pct: 53.65, seat_pct: 69.35, distortion: 15.70 }
  ],
  fideszEraAvg: 13.49,

  // Parliament seats
  parliament: {
    actual: { Tisza: 138, "Fidesz-KDNP": 55, "Mi Hazánk": 6 },
    proportional: { Tisza: 110, "Fidesz-KDNP": 77, "Mi Hazánk": 12 },
    mmp: { Tisza: 110, "Fidesz-KDNP": 77, "Mi Hazánk": 12 }
  },
  supermajority: 133,
  totalSeats: 199,

  // Rural/Urban breakdown
  ruralUrban: [
    { type: "Budapest", total: 16, tisza: 16, fidesz: 0, color: "#1a5c9e" },
    { type: "Pest agglom.", total: 14, tisza: 13, fidesz: 1, color: "#2a6cae" },
    { type: "Cities", total: 25, tisza: 24, fidesz: 1, color: "#3b82d4" },
    { type: "Rural", total: 51, tisza: 40, fidesz: 11, color: "#6ba4e0" }
  ],

  // Turnout history
  turnoutHistory: [
    { year: 1990, pct: 65.11 },
    { year: 1994, pct: 68.92 },
    { year: 1998, pct: 56.21 },
    { year: 2002, pct: 70.47 },
    { year: 2006, pct: 67.83 },
    { year: 2010, pct: 64.35 },
    { year: 2014, pct: 61.73 },
    { year: 2018, pct: 69.73 },
    { year: 2022, pct: 69.59 },
    { year: 2026, pct: 79.51 }
  ],

  // Intraday turnout
  intraday2026: [
    { time: "07:00", pct: 3.46 },
    { time: "09:00", pct: 16.89 },
    { time: "11:00", pct: 37.98 },
    { time: "13:00", pct: 52.10 },
    { time: "15:00", pct: 64.20 },
    { time: "17:00", pct: 74.23 },
    { time: "18:30", pct: 77.80 },
    { time: "19:00", pct: 79.51 }
  ],
  intraday2022: [
    { time: "11:00", pct: 25.77 },
    { time: "15:00", pct: 49.30 },
    { time: "19:00", pct: 69.59 }
  ],

  // Gerrymandering effectiveness (bonus seats)
  gerrymandering: [
    { year: 2010, party: "Fidesz-KDNP", vote_pct: 52.73, seat_pct: 68.13, bonus: 59, ratio: 1.29 },
    { year: 2014, party: "Fidesz-KDNP", vote_pct: 44.87, seat_pct: 66.83, bonus: 44, ratio: 1.49 },
    { year: 2018, party: "Fidesz-KDNP", vote_pct: 49.27, seat_pct: 66.83, bonus: 35, ratio: 1.36 },
    { year: 2022, party: "Fidesz-KDNP", vote_pct: 54.13, seat_pct: 67.84, bonus: 28, ratio: 1.25 },
    { year: 2026, party: "Tisza", vote_pct: 53.65, seat_pct: 69.35, bonus: 31, ratio: 1.29 }
  ],

  // Election timeline
  timeline: [
    { year: 1990, winner: "MDF", event: "First free election", seats: 386, system: "Two-round" },
    { year: 1994, winner: "MSZP", event: "Socialist landslide", seats: 386, system: "Two-round" },
    { year: 1998, winner: "Fidesz", event: "First Orbán government", seats: 386, system: "Two-round" },
    { year: 2002, winner: "MSZP", event: "Orbán loses", seats: 386, system: "Two-round" },
    { year: 2006, winner: "MSZP", event: "First incumbent re-election", seats: 386, system: "Two-round" },
    { year: 2010, winner: "Fidesz-KDNP", event: "Orbán supermajority I", seats: 386, system: "Two-round" },
    { year: 2014, winner: "Fidesz-KDNP", event: "New system, supermajority II", seats: 199, system: "Single-round mixed" },
    { year: 2018, winner: "Fidesz-KDNP", event: "Supermajority III", seats: 199, system: "Single-round mixed" },
    { year: 2022, winner: "Fidesz-KDNP", event: "United opposition fails", seats: 199, system: "Single-round mixed" },
    { year: 2026, winner: "Tisza", event: "Orbán ousted, Tisza supermajority", seats: 199, system: "Single-round mixed" }
  ],

  // Party colors
  partyColors: {
    "Tisza": "#1a5c9e",
    "Fidesz-KDNP": "#f97316",
    "Fidesz": "#f97316",
    "Fidesz-MDF": "#f97316",
    "Mi Hazánk": "#7c3aed",
    "MSZP": "#e11d48",
    "MDF": "#92400e",
    "SZDSZ": "#0891b2"
  }
};
