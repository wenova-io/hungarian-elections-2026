// ── Chart rendering functions ──
const tooltip = d3.select("#tooltip");
const COLORS = { tisza: "#1a5c9e", fidesz: "#f97316", miHazank: "#7c3aed", accent: "#f0c040", textDim: "#8892a8", text: "#e8ecf4", bg: "#0f1525", grid: "rgba(255,255,255,0.05)" };

function showTooltip(html, event) {
  tooltip.html(html).style("opacity", 1)
    .style("left", (event.pageX + 12) + "px")
    .style("top", (event.pageY - 10) + "px");
}
function hideTooltip() { tooltip.style("opacity", 0); }

// ═══════════════════════════════════════════
// 1. Parliament Semicircle
//    European-style: left→right political spectrum
//    Left: Tisza (centrist) | Centre-right: Fidesz-KDNP | Far-right: Mi Hazánk
//    Seats fill from inner row outward, each row is a semicircular arc
// ═══════════════════════════════════════════

// Political order: left-to-right on the spectrum
const POLITICAL_ORDER = ["Tisza", "Fidesz-KDNP", "Mi Hazánk"];

function computeParliamentLayout(total, numRows) {
  // Wikipedia-style: inner rows fewer seats, outer rows more — proportional to arc length.
  const rMin = 0.3;
  const rMax = 0.92;
  const radii = [];
  for (let i = 0; i < numRows; i++) {
    radii.push(rMin + (rMax - rMin) * i / (numRows - 1));
  }
  const totalArc = radii.reduce((s, r) => s + r, 0);
  const seatsPerRow = [];
  let allocated = 0;
  for (let i = 0; i < numRows; i++) {
    const raw = (radii[i] / totalArc) * total;
    const n = (i === numRows - 1) ? total - allocated : Math.round(raw);
    seatsPerRow.push(n);
    allocated += n;
  }
  return { radii, seatsPerRow };
}

// Shared function: render a parliament semicircle into a <g> element
// seats: { "Tisza": 138, "Fidesz-KDNP": 55, ... }
// g: d3 <g> selection, already translated to the centre-bottom of the arc
// h: available height for the arc area
// numRows: how many concentric rows
// animDelay: ms per seat for staggered animation
function renderParliamentArc(g, seats, h, numRows, animDelay) {
  const total = Object.values(seats).reduce((a, b) => a + b, 0);
  const { radii, seatsPerRow } = computeParliamentLayout(total, numRows);

  const partyList = POLITICAL_ORDER.filter(p => (seats[p] || 0) > 0);

  // Step 1: Build all seat positions with a fractional left→right coordinate
  const allSeats = [];
  seatsPerRow.forEach((n, rowIdx) => {
    const r = radii[rowIdx] * h;
    const dotR = Math.max(2.5, Math.min(5.5, (r * Math.PI) / (n * 2.8)));
    for (let i = 0; i < n; i++) {
      const frac = (i + 0.5) / n;  // 0 = leftmost, 1 = rightmost
      const angle = Math.PI * (1 - frac);
      allSeats.push({
        row: rowIdx, col: i, r, dotR,
        angle, frac,
        x: r * Math.cos(angle),
        y: -r * Math.sin(angle)
      });
    }
  });

  // Step 2: Sort all seats by fractional position (left→right globally)
  allSeats.sort((a, b) => a.frac - b.frac || a.row - b.row);

  // Step 3: Assign parties sequentially — all Tisza first, then Fidesz, then Mi Hazánk
  let seatIdx = 0;
  for (const party of partyList) {
    const count = seats[party] || 0;
    for (let i = 0; i < count; i++) {
      allSeats[seatIdx].party = party;
      seatIdx++;
    }
  }

  // Step 4: Re-sort by row and column for rendering order (inner→outer, left→right)
  allSeats.sort((a, b) => a.row - b.row || a.col - b.col);

  // Step 5: Render
  allSeats.forEach((seat, idx) => {
    const color = DATA.partyColors[seat.party] || "#6b7280";
    const party = seat.party;

    g.append("circle")
      .attr("cx", seat.x).attr("cy", seat.y).attr("r", 0)
      .attr("fill", color).attr("opacity", 0.92)
      .attr("stroke", "rgba(0,0,0,0.3)").attr("stroke-width", 0.5)
      .on("mouseover", function(event) {
        d3.select(this).attr("opacity", 1).attr("stroke", "#fff").attr("stroke-width", 1.5);
        showTooltip(`<strong>${party}</strong>`, event);
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.92).attr("stroke", "rgba(0,0,0,0.3)").attr("stroke-width", 0.5);
        hideTooltip();
      })
      .transition().duration(350).delay(idx * animDelay)
      .attr("r", seat.dotR);
  });
}

function drawParliament(mode) {
  const container = d3.select("#parliament-chart");
  container.selectAll("*").remove();

  const seats = mode === 'actual' ? DATA.parliament.actual :
                mode === 'pr' ? DATA.parliament.proportional : DATA.parliament.mmp;

  // Update buttons
  document.getElementById('btn-actual').className = mode === 'actual'
    ? 'px-4 py-1.5 rounded-full text-sm font-medium bg-tisza/20 text-tisza border border-tisza/30'
    : 'px-4 py-1.5 rounded-full text-sm font-medium bg-bgCard2 text-textDim border border-white/10';
  document.getElementById('btn-pr').className = mode !== 'actual'
    ? 'px-4 py-1.5 rounded-full text-sm font-medium bg-tisza/20 text-tisza border border-tisza/30'
    : 'px-4 py-1.5 rounded-full text-sm font-medium bg-bgCard2 text-textDim border border-white/10';

  const w = Math.min(container.node().clientWidth, 620);
  const h = w * 0.52;
  const svg = container.append("svg").attr("width", w).attr("height", h + 55);
  const cx = w / 2;
  const cy = h - 5;
  const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  const total = Object.values(seats).reduce((a, b) => a + b, 0);
  const numRows = 10;

  // Render the arc
  renderParliamentArc(g, seats, h, numRows, 2);

  // Party labels below the semicircle
  const partyList = POLITICAL_ORDER.filter(p => (seats[p] || 0) > 0);
  const labelY = 18;
  const labelSpacing = w * 0.28;
  partyList.forEach((party, i) => {
    const lx = (i - (partyList.length - 1) / 2) * labelSpacing;
    const count = seats[party] || 0;
    const color = DATA.partyColors[party] || "#6b7280";

    g.append("circle").attr("cx", lx - 38).attr("cy", labelY + 8).attr("r", 5).attr("fill", color);
    g.append("text").attr("x", lx).attr("y", labelY + 13)
      .attr("text-anchor", "middle").attr("fill", COLORS.text)
      .attr("font-size", "20px").attr("font-weight", "bold").attr("font-family", "IBM Plex Mono")
      .text(count);
    g.append("text").attr("x", lx).attr("y", labelY + 30)
      .attr("text-anchor", "middle").attr("fill", COLORS.textDim).attr("font-size", "11px")
      .text(party);
    g.append("text").attr("x", lx).attr("y", labelY + 43)
      .attr("text-anchor", "middle").attr("fill", COLORS.textDim)
      .attr("font-size", "10px").attr("font-family", "IBM Plex Mono")
      .text(`${(count / total * 100).toFixed(1)}%`);
  });

  // Left/Right spectrum labels
  const outerR = computeParliamentLayout(total, numRows).radii[numRows - 1] * h;
  g.append("text").attr("x", -outerR - 5).attr("y", 5)
    .attr("text-anchor", "end").attr("fill", COLORS.textDim).attr("font-size", "9px").attr("opacity", 0.5)
    .text("← left");
  g.append("text").attr("x", outerR + 5).attr("y", 5)
    .attr("text-anchor", "start").attr("fill", COLORS.textDim).attr("font-size", "9px").attr("opacity", 0.5)
    .text("right →");

  // Supermajority indicator
  const hasSM = (seats["Tisza"] || 0) >= 133;
  const smLabel = mode === 'actual' ? "⅔ supermajority: 133" : "⅔ threshold: 133";
  g.append("text").attr("x", 0).attr("y", labelY + 58)
    .attr("text-anchor", "middle").attr("fill", hasSM ? "#22c55e" : "#ef4444")
    .attr("font-size", "11px").attr("font-family", "IBM Plex Mono")
    .text(smLabel + (hasSM ? " ✓" : " ✗"));
}

// ═══════════════════════════════════════════
// 2. Gallagher Index Timeline
// ═══════════════════════════════════════════
function drawGallagher() {
  const container = d3.select("#gallagher-chart");
  const w = container.node().clientWidth;
  const h = 350;
  const m = { top: 20, right: 30, bottom: 40, left: 50 };

  const svg = container.append("svg").attr("width", w).attr("height", h);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const x = d3.scaleLinear().domain([1988, 2028]).range([0, iw]);
  const y = d3.scaleLinear().domain([0, 20]).range([ih, 0]);

  // Grid
  g.selectAll(".grid-y").data(y.ticks(5)).enter()
    .append("line").attr("x1", 0).attr("x2", iw)
    .attr("y1", d => y(d)).attr("y2", d => y(d))
    .attr("stroke", COLORS.grid);

  // Fidesz era shading
  g.append("rect").attr("x", x(2010)).attr("y", 0)
    .attr("width", x(2022) - x(2010)).attr("height", ih)
    .attr("fill", COLORS.fidesz).attr("opacity", 0.07);
  g.append("text").attr("x", x(2016)).attr("y", 12)
    .attr("text-anchor", "middle").attr("fill", COLORS.fidesz).attr("opacity", 0.5)
    .attr("font-size", "10px").text("Fidesz era");

  // Average line
  g.append("line").attr("x1", x(2010)).attr("x2", x(2022))
    .attr("y1", y(DATA.fideszEraAvg)).attr("y2", y(DATA.fideszEraAvg))
    .attr("stroke", COLORS.fidesz).attr("stroke-dasharray", "4,4").attr("opacity", 0.6);
  g.append("text").attr("x", x(2022) + 5).attr("y", y(DATA.fideszEraAvg) + 4)
    .attr("fill", COLORS.fidesz).attr("font-size", "10px").attr("opacity", 0.7)
    .text(`avg ${DATA.fideszEraAvg}`);

  // Line
  const line = d3.line().x(d => x(d.year)).y(d => y(d.lsq)).curve(d3.curveMonotoneX);
  g.append("path").datum(DATA.gallagher)
    .attr("fill", "none").attr("stroke", COLORS.text).attr("stroke-width", 2)
    .attr("d", line);

  // Dots
  g.selectAll(".dot").data(DATA.gallagher).enter()
    .append("circle")
    .attr("cx", d => x(d.year)).attr("cy", d => y(d.lsq))
    .attr("r", d => d.year === 2026 ? 7 : 5)
    .attr("fill", d => DATA.partyColors[d.winner] || COLORS.textDim)
    .attr("stroke", d => d.year === 2026 ? COLORS.accent : "none")
    .attr("stroke-width", d => d.year === 2026 ? 2 : 0)
    .on("mouseover", (event, d) => showTooltip(
      `<strong>${d.year}</strong> — ${d.winner}<br>` +
      `Gallagher: <strong>${d.lsq}</strong><br>` +
      `Votes: ${d.vote_pct}% → Seats: ${d.seat_pct}%<br>` +
      `Distortion: +${d.distortion.toFixed(1)}pp`, event))
    .on("mouseout", hideTooltip);

  // Axes
  g.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickValues(DATA.gallagher.map(d => d.year)).tickFormat(d3.format("d")))
    .selectAll("text").attr("fill", COLORS.textDim).attr("font-size", "11px");
  g.append("g")
    .call(d3.axisLeft(y).ticks(5))
    .selectAll("text").attr("fill", COLORS.textDim).attr("font-size", "11px");
  g.selectAll(".domain, .tick line").attr("stroke", COLORS.grid);

  g.append("text").attr("x", -ih/2).attr("y", -35).attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle").attr("fill", COLORS.textDim).attr("font-size", "11px")
    .text("LSq Index");
}

// ═══════════════════════════════════════════
// 3. Rural/Urban Bar Chart
// ═══════════════════════════════════════════
function drawRuralUrban() {
  const container = d3.select("#rural-chart");
  const w = container.node().clientWidth;
  const h = 280;
  const m = { top: 20, right: 30, bottom: 30, left: 120 };

  const svg = container.append("svg").attr("width", w).attr("height", h);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const data = DATA.ruralUrban;
  const y = d3.scaleBand().domain(data.map(d => d.type)).range([0, ih]).padding(0.3);
  const x = d3.scaleLinear().domain([0, 55]).range([0, iw]);

  // Tisza bars
  g.selectAll(".bar-tisza").data(data).enter()
    .append("rect")
    .attr("y", d => y(d.type)).attr("x", 0)
    .attr("height", y.bandwidth()).attr("width", 0)
    .attr("fill", COLORS.tisza).attr("rx", 4)
    .transition().duration(800)
    .attr("width", d => x(d.tisza));

  // Fidesz bars
  g.selectAll(".bar-fidesz").data(data).enter()
    .append("rect")
    .attr("y", d => y(d.type)).attr("x", d => x(d.tisza) + 2)
    .attr("height", y.bandwidth()).attr("width", 0)
    .attr("fill", COLORS.fidesz).attr("rx", 4)
    .transition().duration(800).delay(400)
    .attr("width", d => x(d.fidesz));

  // Labels
  g.selectAll(".label-tisza").data(data).enter()
    .append("text")
    .attr("y", d => y(d.type) + y.bandwidth() / 2 + 5)
    .attr("x", d => x(d.tisza) / 2)
    .attr("text-anchor", "middle").attr("fill", "#fff").attr("font-size", "13px").attr("font-weight", "600")
    .attr("font-family", "IBM Plex Mono")
    .text(d => d.tisza);

  g.selectAll(".label-fidesz").data(data.filter(d => d.fidesz > 0)).enter()
    .append("text")
    .attr("y", d => y(d.type) + y.bandwidth() / 2 + 5)
    .attr("x", d => x(d.tisza) + 2 + x(d.fidesz) / 2)
    .attr("text-anchor", "middle").attr("fill", "#fff").attr("font-size", "13px").attr("font-weight", "600")
    .attr("font-family", "IBM Plex Mono")
    .text(d => d.fidesz);

  // Win rate
  g.selectAll(".win-rate").data(data).enter()
    .append("text")
    .attr("y", d => y(d.type) + y.bandwidth() / 2 + 5)
    .attr("x", d => x(d.total) + 10)
    .attr("fill", COLORS.textDim).attr("font-size", "11px").attr("font-family", "IBM Plex Mono")
    .text(d => `${Math.round(d.tisza / d.total * 100)}%`);

  // Y axis
  g.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text").attr("fill", COLORS.text).attr("font-size", "13px");
  g.selectAll(".domain, .tick line").attr("stroke", "none");

  // Legend
  const legend = [
    { label: "Tisza wins", color: COLORS.tisza },
    { label: "Fidesz-KDNP wins", color: COLORS.fidesz }
  ];
  legend.forEach((item, i) => {
    const lx = iw - 140;
    const ly = 4 + i * 20;
    g.append("rect").attr("x", lx).attr("y", ly).attr("width", 14).attr("height", 14)
      .attr("rx", 3).attr("fill", item.color);
    g.append("text").attr("x", lx + 20).attr("y", ly + 11)
      .attr("fill", COLORS.text).attr("font-size", "12px").text(item.label);
  });
}

// ═══════════════════════════════════════════
// 4. Turnout History
// ═══════════════════════════════════════════
function drawTurnoutHistory() {
  const container = d3.select("#turnout-history-chart");
  const w = container.node().clientWidth;
  const h = 280;
  const m = { top: 20, right: 20, bottom: 40, left: 45 };

  const svg = container.append("svg").attr("width", w).attr("height", h);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const data = DATA.turnoutHistory;
  const x = d3.scaleBand().domain(data.map(d => d.year)).range([0, iw]).padding(0.2);
  const y = d3.scaleLinear().domain([50, 85]).range([ih, 0]);

  // Bars
  g.selectAll(".bar").data(data).enter()
    .append("rect")
    .attr("x", d => x(d.year)).attr("y", ih)
    .attr("width", x.bandwidth()).attr("height", 0)
    .attr("fill", d => d.year === 2026 ? COLORS.accent : COLORS.tisza)
    .attr("opacity", d => d.year === 2026 ? 1 : 0.6)
    .attr("rx", 3)
    .on("mouseover", (event, d) => showTooltip(`<strong>${d.year}</strong><br>Turnout: ${d.pct}%`, event))
    .on("mouseout", hideTooltip)
    .transition().duration(600).delay((d, i) => i * 60)
    .attr("y", d => y(d.pct)).attr("height", d => ih - y(d.pct));

  // Value labels
  g.selectAll(".val").data(data).enter()
    .append("text")
    .attr("x", d => x(d.year) + x.bandwidth() / 2)
    .attr("y", d => y(d.pct) - 5)
    .attr("text-anchor", "middle").attr("fill", d => d.year === 2026 ? COLORS.accent : COLORS.textDim)
    .attr("font-size", "10px").attr("font-family", "IBM Plex Mono")
    .text(d => d.pct.toFixed(1));

  // Axes
  g.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")))
    .selectAll("text").attr("fill", COLORS.textDim).attr("font-size", "10px");
  g.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d => d + "%"))
    .selectAll("text").attr("fill", COLORS.textDim).attr("font-size", "10px");
  g.selectAll(".domain, .tick line").attr("stroke", COLORS.grid);
}

// ═══════════════════════════════════════════
// 5. Turnout Intraday Comparison
// ═══════════════════════════════════════════
function drawIntradayTurnout() {
  const container = d3.select("#turnout-intraday-chart");
  const w = container.node().clientWidth;
  const h = 280;
  const m = { top: 20, right: 20, bottom: 40, left: 45 };

  const svg = container.append("svg").attr("width", w).attr("height", h);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const times = ["07:00","09:00","11:00","13:00","15:00","17:00","18:30","19:00"];
  const x = d3.scalePoint().domain(times).range([0, iw]);
  const y = d3.scaleLinear().domain([0, 85]).range([ih, 0]);

  // Grid
  y.ticks(4).forEach(t => {
    g.append("line").attr("x1", 0).attr("x2", iw)
      .attr("y1", y(t)).attr("y2", y(t)).attr("stroke", COLORS.grid);
  });

  // 2026 line
  const line2026 = d3.line().x(d => x(d.time)).y(d => y(d.pct)).curve(d3.curveMonotoneX);
  g.append("path").datum(DATA.intraday2026)
    .attr("fill", "none").attr("stroke", COLORS.accent).attr("stroke-width", 2.5).attr("d", line2026);
  g.selectAll(".dot26").data(DATA.intraday2026).enter()
    .append("circle").attr("cx", d => x(d.time)).attr("cy", d => y(d.pct))
    .attr("r", 4).attr("fill", COLORS.accent)
    .on("mouseover", (event, d) => showTooltip(`2026 @ ${d.time}: <strong>${d.pct}%</strong>`, event))
    .on("mouseout", hideTooltip);

  // 2022 line
  const line2022 = d3.line().x(d => x(d.time)).y(d => y(d.pct)).curve(d3.curveMonotoneX);
  g.append("path").datum(DATA.intraday2022)
    .attr("fill", "none").attr("stroke", COLORS.fidesz).attr("stroke-width", 2).attr("stroke-dasharray", "5,5").attr("d", line2022);
  g.selectAll(".dot22").data(DATA.intraday2022).enter()
    .append("circle").attr("cx", d => x(d.time)).attr("cy", d => y(d.pct))
    .attr("r", 4).attr("fill", COLORS.fidesz)
    .on("mouseover", (event, d) => showTooltip(`2022 @ ${d.time}: <strong>${d.pct}%</strong>`, event))
    .on("mouseout", hideTooltip);

  // Legend
  g.append("line").attr("x1", iw - 100).attr("x2", iw - 80).attr("y1", 5).attr("y2", 5).attr("stroke", COLORS.accent).attr("stroke-width", 2);
  g.append("text").attr("x", iw - 75).attr("y", 9).attr("fill", COLORS.accent).attr("font-size", "11px").text("2026");
  g.append("line").attr("x1", iw - 100).attr("x2", iw - 80).attr("y1", 22).attr("y2", 22).attr("stroke", COLORS.fidesz).attr("stroke-width", 2).attr("stroke-dasharray", "5,5");
  g.append("text").attr("x", iw - 75).attr("y", 26).attr("fill", COLORS.fidesz).attr("font-size", "11px").text("2022");

  // Axes
  g.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x))
    .selectAll("text").attr("fill", COLORS.textDim).attr("font-size", "10px");
  g.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d => d + "%"))
    .selectAll("text").attr("fill", COLORS.textDim).attr("font-size", "10px");
  g.selectAll(".domain, .tick line").attr("stroke", COLORS.grid);
}

// ═══════════════════════════════════════════
// 6. Seat/Vote Disparity (Bonus seats chart)
// ═══════════════════════════════════════════
function drawDisparity() {
  const container = d3.select("#disparity-chart");
  const w = container.node().clientWidth;
  const h = 320;
  const m = { top: 30, right: 30, bottom: 40, left: 50 };

  const svg = container.append("svg").attr("width", w).attr("height", h);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const data = DATA.gerrymandering;
  const x = d3.scaleBand().domain(data.map(d => d.year)).range([0, iw]).padding(0.3);
  const y = d3.scaleLinear().domain([0, 65]).range([ih, 0]);

  // Grid
  y.ticks(4).forEach(t => {
    g.append("line").attr("x1", 0).attr("x2", iw)
      .attr("y1", y(t)).attr("y2", y(t)).attr("stroke", COLORS.grid);
  });

  // Bars
  g.selectAll(".bar").data(data).enter()
    .append("rect")
    .attr("x", d => x(d.year)).attr("y", ih).attr("width", x.bandwidth()).attr("height", 0)
    .attr("fill", d => d.party.includes("Fidesz") ? COLORS.fidesz : COLORS.tisza)
    .attr("rx", 4)
    .on("mouseover", (event, d) => showTooltip(
      `<strong>${d.year}</strong> — ${d.party}<br>` +
      `Votes: ${d.vote_pct}% → Seats: ${d.seat_pct}%<br>` +
      `Bonus seats: <strong>+${d.bonus}</strong><br>` +
      `Efficiency ratio: ${d.ratio}x`, event))
    .on("mouseout", hideTooltip)
    .transition().duration(600).delay((d, i) => i * 100)
    .attr("y", d => y(d.bonus)).attr("height", d => ih - y(d.bonus));

  // Labels
  g.selectAll(".label").data(data).enter()
    .append("text")
    .attr("x", d => x(d.year) + x.bandwidth() / 2)
    .attr("y", d => y(d.bonus) - 8)
    .attr("text-anchor", "middle")
    .attr("fill", d => d.party.includes("Fidesz") ? COLORS.fidesz : COLORS.tisza)
    .attr("font-size", "14px").attr("font-weight", "bold").attr("font-family", "IBM Plex Mono")
    .text(d => `+${d.bonus}`);

  // Party labels
  g.selectAll(".party-label").data(data).enter()
    .append("text")
    .attr("x", d => x(d.year) + x.bandwidth() / 2)
    .attr("y", d => y(d.bonus) - 24)
    .attr("text-anchor", "middle").attr("fill", COLORS.textDim).attr("font-size", "10px")
    .text(d => d.party.includes("Fidesz") ? "Fidesz" : "Tisza");

  // Axes
  g.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")))
    .selectAll("text").attr("fill", COLORS.textDim).attr("font-size", "12px");
  g.append("g").call(d3.axisLeft(y).ticks(4))
    .selectAll("text").attr("fill", COLORS.textDim).attr("font-size", "11px");
  g.selectAll(".domain, .tick line").attr("stroke", COLORS.grid);

  g.append("text").attr("x", -ih/2).attr("y", -35).attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle").attr("fill", COLORS.textDim).attr("font-size", "11px")
    .text("Bonus seats vs proportional");
}

// ═══════════════════════════════════════════
// 7. Reform Simulation (reuses parliament layout)
// ═══════════════════════════════════════════
function showReform(mode) {
  const container = d3.select("#reform-chart");
  container.selectAll("*").remove();

  const seats = mode === 'actual' ? DATA.parliament.actual :
                mode === 'pr' ? DATA.parliament.proportional : DATA.parliament.mmp;

  const labels = { actual: "Current System (Actual)", pr: "Pure Proportional (PR)", mmp: "German MMP" };

  // Update buttons
  ['actual', 'pr', 'mmp'].forEach(m => {
    const btn = document.getElementById(`reform-${m}`);
    btn.className = m === mode
      ? 'px-4 py-2 rounded-full text-sm font-medium bg-tisza/20 text-tisza border border-tisza/30'
      : 'px-4 py-2 rounded-full text-sm font-medium bg-bgCard2 text-textDim border border-white/10';
  });

  const w = Math.min(container.node().clientWidth, 520);
  const h = w * 0.5;
  const svg = container.append("svg").attr("width", w).attr("height", h + 30);
  const cx = w / 2;
  const cy = h - 5;
  const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  // Title
  g.append("text").attr("x", 0).attr("y", -h + 15)
    .attr("text-anchor", "middle").attr("fill", COLORS.text).attr("font-size", "14px").attr("font-weight", "600")
    .text(labels[mode]);

  // Reuse the same shared arc renderer
  renderParliamentArc(g, seats, h, 10, 1.5);

  // Table
  const partyList = POLITICAL_ORDER.filter(p => (seats[p] || 0) > 0);
  const tableDiv = document.getElementById("reform-table");
  const hasSM = (seats["Tisza"] || 0) >= DATA.supermajority;
  tableDiv.innerHTML = `
    <table class="w-full text-sm">
      <thead><tr class="text-textDim border-b border-white/10">
        <th class="text-left py-2">Party</th><th class="text-right">Seats</th><th class="text-right">%</th><th class="text-right">Supermajority?</th>
      </tr></thead>
      <tbody>
        ${partyList.map(p => {
          const s = seats[p] || 0;
          return `<tr class="border-b border-white/5">
            <td class="py-2 flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block" style="background:${DATA.partyColors[p]||'#6b7280'}"></span>${p}</td>
            <td class="text-right font-mono font-bold">${s}</td>
            <td class="text-right font-mono text-textDim">${(s/DATA.totalSeats*100).toFixed(1)}%</td>
            <td class="text-right">${p === 'Tisza' ? (hasSM ? '<span class="text-green-400">✓ Yes</span>' : '<span class="text-red-400">✗ No</span>') : '—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <p class="text-textDim text-xs mt-3">⅔ supermajority threshold: ${DATA.supermajority} of ${DATA.totalSeats} seats</p>
  `;
}

// ═══════════════════════════════════════════
// 8. Election Timeline
// ═══════════════════════════════════════════
function drawTimeline() {
  const container = d3.select("#timeline-chart");
  const w = container.node().clientWidth;
  const h = 200;
  const m = { top: 30, right: 20, bottom: 20, left: 20 };

  const svg = container.append("svg").attr("width", w).attr("height", h);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  const iw = w - m.left - m.right;

  const data = DATA.timeline;
  const x = d3.scalePoint().domain(data.map(d => d.year)).range([20, iw - 20]);

  // Line
  g.append("line").attr("x1", x(1990)).attr("x2", x(2026))
    .attr("y1", 60).attr("y2", 60).attr("stroke", COLORS.grid).attr("stroke-width", 2);

  // Nodes
  data.forEach((d, i) => {
    const cx = x(d.year);
    const color = DATA.partyColors[d.winner] || COLORS.textDim;

    g.append("circle").attr("cx", cx).attr("cy", 60)
      .attr("r", d.year === 2026 ? 10 : 7)
      .attr("fill", color)
      .attr("stroke", d.year === 2026 ? COLORS.accent : "none")
      .attr("stroke-width", 2)
      .on("mouseover", (event) => showTooltip(
        `<strong>${d.year}</strong><br>Winner: ${d.winner}<br>${d.event}<br>${d.seats} seats, ${d.system}`, event))
      .on("mouseout", hideTooltip);

    g.append("text").attr("x", cx).attr("y", 90)
      .attr("text-anchor", "middle").attr("fill", COLORS.text)
      .attr("font-size", "12px").attr("font-weight", d.year === 2026 ? "bold" : "normal")
      .text(d.year);

    g.append("text").attr("x", cx).attr("y", 105)
      .attr("text-anchor", "middle").attr("fill", color)
      .attr("font-size", "9px").text(d.winner);

    // Event label (alternating above/below)
    if (i % 2 === 0) {
      g.append("text").attr("x", cx).attr("y", 40)
        .attr("text-anchor", "middle").attr("fill", COLORS.textDim)
        .attr("font-size", "9px").text(d.event);
    } else {
      g.append("text").attr("x", cx).attr("y", 130)
        .attr("text-anchor", "middle").attr("fill", COLORS.textDim)
        .attr("font-size", "9px").text(d.event);
    }
  });
}

// ═══════════════════════════════════════════
// Initialize all charts
// ═══════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  drawParliament('actual');
  drawGallagher();
  drawRuralUrban();
  drawTurnoutHistory();
  drawIntradayTurnout();
  drawDisparity();
  showReform('actual');
  drawTimeline();

  // Scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('section-visible', entry.isIntersecting);
      entry.target.classList.toggle('section-hidden', !entry.isIntersecting);
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('section').forEach(s => { s.classList.add('section-hidden'); observer.observe(s); });

  // Active nav
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) current = s.id; });
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === '#' + current);
    });
  });
});
