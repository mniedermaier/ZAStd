import { SPAWN_POINT, END_POINT } from './constants';

export class Path {
  waypoints: [number, number][];
  totalWaypoints: number;

  constructor(waypoints: [number, number][]) {
    this.waypoints = waypoints;
    this.totalWaypoints = waypoints.length;
  }

  getWaypoint(index: number): [number, number] {
    if (index >= 0 && index < this.totalWaypoints) return this.waypoints[index];
    return this.waypoints[this.totalWaypoints - 1];
  }

  getSpawnPosition(): [number, number] {
    return this.waypoints[0];
  }

  getEndPosition(): [number, number] {
    return this.waypoints[this.totalWaypoints - 1];
  }

  serialize(): number[][] {
    return this.waypoints.map(([x, y]) => [x, y]);
  }
}

export class OccupancyGrid {
  width: number;
  height: number;
  spawn: [number, number];
  end: [number, number];
  /** Intermediate waypoints enemies should visit (in order). Skippable if blocked. */
  checkpoints: [number, number][];
  blocked: Set<string>;
  private _path: Path | null = null;
  private _pathCells: [number, number][] | null = null;
  private _dirty = true;
  private _version = 0;

  constructor(
    width: number,
    height: number,
    spawn?: [number, number],
    end?: [number, number],
    checkpoints?: [number, number][],
  ) {
    this.width = width;
    this.height = height;
    this.spawn = spawn ?? [...SPAWN_POINT];
    this.end = end ?? [...END_POINT];
    this.checkpoints = checkpoints ?? [];
    // Clamp
    this.end = [Math.min(this.end[0], width - 1), Math.min(this.end[1], height - 1)];
    this.spawn = [Math.max(0, this.spawn[0]), Math.max(0, Math.min(this.spawn[1], height - 1))];
    this.blocked = new Set();
  }

  get version(): number {
    return this._version;
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  isBlocked(x: number, y: number): boolean {
    return this.blocked.has(this.key(x, y));
  }

  canPlace(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    if (x === this.spawn[0] && y === this.spawn[1]) return false;
    if (x === this.end[0] && y === this.end[1]) return false;
    // Protect checkpoint cells
    for (const [cx, cy] of this.checkpoints) {
      if (x === cx && y === cy) return false;
    }
    if (this.blocked.has(this.key(x, y))) return false;
    // Temporarily block and check multi-waypoint path
    const k = this.key(x, y);
    this.blocked.add(k);
    const pathExists = this._buildMultiSegmentPath() !== null;
    this.blocked.delete(k);
    return pathExists;
  }

  placeTower(x: number, y: number): boolean {
    if (!this.canPlace(x, y)) return false;
    this.blocked.add(this.key(x, y));
    this._dirty = true;
    this._version++;
    this._recalculate();
    return true;
  }

  removeTower(x: number, y: number): void {
    this.blocked.delete(this.key(x, y));
    this._dirty = true;
    this._version++;
    this._recalculate();
  }

  getPath(): Path {
    if (this._dirty || this._path === null) this._recalculate();
    return this._path!;
  }

  getPathCells(): [number, number][] {
    if (this._dirty || this._pathCells === null) this._recalculate();
    return this._pathCells ?? [];
  }

  private _recalculate(): void {
    const result = this._buildMultiSegmentPath();
    if (result === null) {
      // Fallback: direct spawn to end
      this._pathCells = [this.spawn, this.end];
      this._path = new Path([
        [this.spawn[0] + 0.5, this.spawn[1] + 0.5],
        [this.end[0] + 0.5, this.end[1] + 0.5],
      ]);
    } else {
      this._pathCells = result;
      const waypoints = this._simplify(result);
      this._path = new Path(waypoints);
    }
    this._dirty = false;
  }

  /**
   * Build a multi-segment path: spawn → checkpoint1 → checkpoint2 → ... → end.
   * If a checkpoint is unreachable from the previous point, skip it.
   * Returns concatenated cell path, or null if even spawn→end is impossible.
   */
  private _buildMultiSegmentPath(): [number, number][] | null {
    const stops: [number, number][] = [this.spawn, ...this.checkpoints, this.end];
    const allCells: [number, number][] = [];
    let currentStart = stops[0];

    for (let i = 1; i < stops.length; i++) {
      const segment = this._bfs(currentStart, stops[i]);
      if (segment !== null) {
        // Append segment (skip first cell if not the first segment, to avoid duplication)
        if (allCells.length > 0) {
          allCells.push(...segment.slice(1));
        } else {
          allCells.push(...segment);
        }
        currentStart = stops[i];
      }
      // If segment is null, skip this checkpoint (it's unreachable)
    }

    // Must at least have reached the end
    if (allCells.length === 0) return null;
    const last = allCells[allCells.length - 1];
    if (last[0] !== this.end[0] || last[1] !== this.end[1]) {
      // Couldn't reach end — try direct fallback
      const direct = this._bfs(currentStart, this.end);
      if (direct === null) return null;
      if (allCells.length > 0) {
        allCells.push(...direct.slice(1));
      } else {
        allCells.push(...direct);
      }
    }

    return allCells.length > 0 ? allCells : null;
  }

  private _bfs(start: [number, number], goal: [number, number]): [number, number][] | null {
    const startKey = this.key(start[0], start[1]);
    const goalKey = this.key(goal[0], goal[1]);

    if (startKey === goalKey) return [start];
    if (this.blocked.has(startKey) || this.blocked.has(goalKey)) return null;

    const queue: [number, number][] = [start];
    const cameFrom = new Map<string, string | null>();
    cameFrom.set(startKey, null);
    let head = 0;

    while (head < queue.length) {
      const [cx, cy] = queue[head++];
      const currentKey = this.key(cx, cy);
      if (currentKey === goalKey) {
        // Reconstruct
        const path: [number, number][] = [];
        let k: string | null = goalKey;
        while (k !== null) {
          const [px, py] = k.split(',').map(Number) as [number, number];
          path.push([px, py]);
          k = cameFrom.get(k)!;
        }
        path.reverse();
        return path;
      }

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          const nk = this.key(nx, ny);
          if (!this.blocked.has(nk) && !cameFrom.has(nk)) {
            cameFrom.set(nk, currentKey);
            queue.push([nx, ny]);
          }
        }
      }
    }
    return null;
  }

  private _simplify(cells: [number, number][]): [number, number][] {
    if (cells.length <= 2) {
      return cells.map(([x, y]) => [x + 0.5, y + 0.5] as [number, number]);
    }

    const waypoints: [number, number][] = [[cells[0][0] + 0.5, cells[0][1] + 0.5]];
    for (let i = 1; i < cells.length - 1; i++) {
      const prev = cells[i - 1];
      const curr = cells[i];
      const nxt = cells[i + 1];
      const dx1 = curr[0] - prev[0];
      const dy1 = curr[1] - prev[1];
      const dx2 = nxt[0] - curr[0];
      const dy2 = nxt[1] - curr[1];
      if (dx1 !== dx2 || dy1 !== dy2) {
        waypoints.push([curr[0] + 0.5, curr[1] + 0.5]);
      }
    }
    const last = cells[cells.length - 1];
    waypoints.push([last[0] + 0.5, last[1] + 0.5]);
    return waypoints;
  }

  serialize() {
    return {
      width: this.width,
      height: this.height,
      spawn: [...this.spawn],
      end: [...this.end],
      checkpoints: this.checkpoints.map(([x, y]) => [x, y]),
      blocked: [...this.blocked].map(k => k.split(',').map(Number)),
      pathVersion: this._version,
    };
  }
}

export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function moveTowards(
  currentX: number,
  currentY: number,
  targetX: number,
  targetY: number,
  speed: number,
  deltaTime: number,
): [number, number, boolean] {
  const distance = calculateDistance(currentX, currentY, targetX, targetY);
  const moveDistance = speed * deltaTime;
  if (distance <= moveDistance) return [targetX, targetY, true];
  const ratio = moveDistance / distance;
  return [
    currentX + (targetX - currentX) * ratio,
    currentY + (targetY - currentY) * ratio,
    false,
  ];
}

export function updateEnemyPosition(
  enemyX: number,
  enemyY: number,
  pathIndex: number,
  path: Path,
  speed: number,
  deltaTime: number,
): [number, number, number, boolean] {
  if (pathIndex >= path.totalWaypoints) return [enemyX, enemyY, pathIndex, true];

  const [targetX, targetY] = path.getWaypoint(pathIndex);
  const [newX, newY, reached] = moveTowards(enemyX, enemyY, targetX, targetY, speed, deltaTime);

  if (reached) {
    pathIndex++;
    if (pathIndex >= path.totalWaypoints) return [newX, newY, pathIndex, true];
    const remaining = speed > 0
      ? deltaTime - calculateDistance(enemyX, enemyY, targetX, targetY) / speed
      : 0;
    if (remaining > 0) {
      return updateEnemyPosition(newX, newY, pathIndex, path, speed, remaining);
    }
  }
  return [newX, newY, pathIndex, false];
}

/** Create a flying path through waypoints (straight lines between each). */
export function getFlyingPath(
  spawn: [number, number],
  end: [number, number],
  checkpoints?: [number, number][],
): Path {
  const points: [number, number][] = [
    [spawn[0] + 0.5, spawn[1] + 0.5],
  ];
  if (checkpoints) {
    for (const [cx, cy] of checkpoints) {
      points.push([cx + 0.5, cy + 0.5]);
    }
  }
  points.push([end[0] + 0.5, end[1] + 0.5]);
  return new Path(points);
}
