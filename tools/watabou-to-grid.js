// Converts a Watabou Village Generator JSON export into a Taga Komando tile grid.
//
// Usage: open https://watabou.github.io/village-generator/, paste this whole
// file into the browser console, then call `watabouToGrid(json)` with the
// parsed export (right-click the map → Export as → JSON). It returns
// run-length encoded rows for a `grid` map feature (see src/data/luzonMaps.ts).
//
// Watabou's maps are free to use (https://watabou.itch.io/village-generator).
// Only the exported map data is used here, never the generator's code.

/* eslint-disable */
function watabouToGrid(json, opts = {}) {
  const W = opts.width ?? 112;
  const H = opts.height ?? 80;
  const UNITS_PER_TILE = opts.unitsPerTile ?? 3.6;
  const cx = opts.centerX ?? 0;
  const cy = opts.centerY ?? 0;
  // Tile codes (one character each), matching GRID_LEGEND in src/data/luzonMaps.ts.
  const OPEN = '.', ROAD = '=', PADDY = ',', HEDGE = 'h', JUNGLE = 'j', WATER = '~', BUILDING = '#', WALL = 'w';

  const byId = {};
  for (const f of json.features) byId[f.id] = f;
  const toWorld = (tx, ty) => [cx + (tx + 0.5 - W / 2) * UNITS_PER_TILE, cy + (ty + 0.5 - H / 2) * UNITS_PER_TILE];
  const grid = Array.from({ length: H }, () => new Array(W).fill(OPEN));

  const inRing = (x, y, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const inPolygon = (x, y, poly) => inRing(x, y, poly[0]) && !poly.slice(1).some((hole) => inRing(x, y, hole));
  const polygons = (f) => (!f ? [] : f.type === 'Polygon' ? [f.coordinates] : f.type === 'MultiPolygon' ? f.coordinates : []);
  const segDist = (px, py, [ax, ay], [bx, by]) => {
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  // Fraction of a tile covered by any polygon in the list (4×4 samples).
  const coverage = (tx, ty, polys) => {
    let hit = 0;
    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        const x = cx + (tx + (sx + 0.5) / 4 - W / 2) * UNITS_PER_TILE;
        const y = cy + (ty + (sy + 0.5) / 4 - H / 2) * UNITS_PER_TILE;
        if (polys.some((p) => inPolygon(x, y, p))) hit++;
      }
    }
    return hit / 16;
  };

  const fields = polygons(byId.fields);
  const water = polygons(byId.water);
  const buildings = polygons(byId.buildings);
  const walls = polygons(byId.walls);
  const trees = byId.trees?.coordinates ?? [];
  const roads = (byId.roads?.geometries ?? []).filter((g) => g.type === 'LineString');

  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const [x, y] = toWorld(tx, ty);
      let t = OPEN;
      if (fields.some((p) => inPolygon(x, y, p))) t = PADDY;
      // Woods: Watabou stores a forest as spaced-out tree points. Two trees within
      // 7.5 units make jungle; a single tree close by is a hedge-like bit of cover.
      let near = 0;
      let close = 0;
      for (const [px, py] of trees) {
        const d = Math.hypot(px - x, py - y);
        if (d < 7.5) near++;
        if (d < 4.5) close++;
      }
      if (near >= 2) t = JUNGLE;
      else if (close >= 1 && t === OPEN) t = HEDGE;
      if (water.some((p) => inPolygon(x, y, p))) t = WATER;
      // Roads (and the bridges where they cross water) are at least a tile wide so tanks can use them.
      for (const r of roads) {
        const half = Math.max((r.width ?? 4) / 2, UNITS_PER_TILE * 0.62);
        const c = r.coordinates;
        for (let i = 1; i < c.length; i++) {
          if (segDist(x, y, c[i - 1], c[i]) <= half) {
            t = ROAD;
            break;
          }
        }
        if (t === ROAD) break;
      }
      if (walls.length && coverage(tx, ty, walls) >= 0.4) t = WALL;
      if (coverage(tx, ty, buildings) >= 0.35) t = BUILDING;
      grid[ty][tx] = t;
    }
  }

  // Run-length encode each row: "12.3=#" style, digits before a code repeat it.
  return grid.map((row) => {
    let out = '';
    for (let i = 0; i < row.length; ) {
      let n = 1;
      while (i + n < row.length && row[i + n] === row[i]) n++;
      out += (n > 1 ? n : '') + row[i];
      i += n;
    }
    return out;
  });
}
