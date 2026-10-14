/**
 * ============================================================================
 * COMBAT & PHYSICS SYSTEM
 * Handles line-of-sight raycasting, cover calculations, collision resolution,
 * targeting AI, ObjectPool projectile management, and suppression calculations
 * ============================================================================
 */
class CombatSystem {
    static evaluateUnitCover(game, unit) {
        let bestCover = 0;
        for (const obs of game.obstacles) {
            if (obs.type === 'trench') {
                const dx = unit.x - obs.x;
                const dy = unit.y - obs.y;
                const cos = Math.cos(-obs.angle);
                const sin = Math.sin(-obs.angle);
                const lx = dx * cos - dy * sin;
                const ly = dx * sin + dy * cos;
                if (Math.abs(lx) <= obs.w / 2 && Math.abs(ly) <= obs.h / 2) {
                    bestCover = Math.max(bestCover, 0.5);
                }
            } else if (obs.type === 'sandbag') {
                const dx = unit.x - obs.x;
                const dy = unit.y - obs.y;
                const cos = Math.cos(-obs.angle);
                const sin = Math.sin(-obs.angle);
                const lx = dx * cos - dy * sin;
                const ly = dx * sin + dy * cos;
                if (Math.abs(lx) <= obs.w / 2 + 16 && Math.abs(ly) <= obs.h / 2 + 24) {
                    bestCover = Math.max(bestCover, 0.38);
                }
            } else if (obs.type === 'tree') {
                if (Math.hypot(unit.x - obs.x, unit.y - obs.y) <= obs.r + 12) {
                    bestCover = Math.max(bestCover, 0.25);
                }
            }
        }
        return bestCover;
    }

    static findTacticalCoverSpot(game, unit, enemy) {
        let bestSpot = null;
        let bestScore = Infinity;
        for (const obs of game.obstacles) {
            if (obs.type === 'trench' || obs.type === 'sandbag') {
                const spotX = obs.x + (Math.random() - 0.5) * (obs.w * 0.6);
                const spotY = obs.y + (obs.type === 'sandbag' ? -18 : 0);
                const d = Math.hypot(spotX - unit.x, spotY - unit.y);
                if (d < 160 && d < bestScore) {
                    bestScore = d;
                    bestSpot = { x: spotX, y: spotY };
                }
            }
        }
        return bestSpot;
    }

    static resolveObstacleCollisions(game, unit) {
        const pad = unit.radius + 6;
        unit.x = Math.max(pad, Math.min(game.width - pad, unit.x));
        unit.y = Math.max(pad, Math.min(game.height - pad, unit.y));

        for (const obs of game.obstacles) {
            if (obs.type === 'wall' || obs.type === 'sandbag') {
                const dx = unit.x - obs.x;
                const dy = unit.y - obs.y;
                const cos = Math.cos(-obs.angle);
                const sin = Math.sin(-obs.angle);
                const lx = dx * cos - dy * sin;
                const ly = dx * sin + dy * cos;

                const halfW = obs.w / 2;
                const halfH = obs.h / 2;
                const closestX = Math.max(-halfW, Math.min(halfW, lx));
                const closestY = Math.max(-halfH, Math.min(halfH, ly));
                const distX = lx - closestX;
                const distY = ly - closestY;
                const dist = Math.hypot(distX, distY);

                if (dist < unit.radius && dist > 0.0001) {
                    const overlap = unit.radius - dist;
                    const nx = distX / dist;
                    const ny = distY / dist;
                    const worldNx = nx * Math.cos(obs.angle) - ny * Math.sin(obs.angle);
                    const worldNy = nx * Math.sin(obs.angle) + ny * Math.cos(obs.angle);
                    unit.x += worldNx * overlap;
                    unit.y += worldNy * overlap;

                    // Obstacle Surface Velocity Sliding: project velocity to remove normal collision bounce
                    const normalDot = unit.vx * worldNx + unit.vy * worldNy;
                    if (normalDot < 0) {
                        unit.vx -= normalDot * worldNx;
                        unit.vy -= normalDot * worldNy;
                    }
                }
            } else if (obs.type === 'tree') {
                const dx = unit.x - obs.x;
                const dy = unit.y - obs.y;
                const d = Math.hypot(dx, dy);
                const trunkR = 8;
                if (d < unit.radius + trunkR && d > 0.001) {
                    const overlap = (unit.radius + trunkR) - d;
                    const nx = dx / d;
                    const ny = dy / d;
                    unit.x += nx * overlap;
                    unit.y += ny * overlap;

                    const normalDot = unit.vx * nx + unit.vy * ny;
                    if (normalDot < 0) {
                        unit.vx -= normalDot * nx;
                        unit.vy -= normalDot * ny;
                    }
                }
            }
        }
    }

    static isLineBlockedByWall(game, x1, y1, x2, y2) {
        const steps = 10;
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            for (const obs of game.obstacles) {
                if (obs.type === 'wall') {
                    const dx = px - obs.x;
                    const dy = py - obs.y;
                    const cos = Math.cos(-obs.angle);
                    const sin = Math.sin(-obs.angle);
                    const lx = dx * cos - dy * sin;
                    const ly = dx * sin + dy * cos;
                    if (Math.abs(lx) <= obs.w / 2 && Math.abs(ly) <= obs.h / 2) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    static isLineThroughSmoke(game, x1, y1, x2, y2) {
        for (const s of game.smokes) {
            const A = x2 - x1;
            const B = y2 - y1;
            const lenSq = A * A + B * B;
            let t = lenSq > 0 ? ((s.x - x1) * A + (s.y - y1) * B) / lenSq : 0;
            t = Math.max(0, Math.min(1, t));
            const nearX = x1 + t * A;
            const nearY = y1 + t * B;
            if (Math.hypot(s.x - nearX, s.y - nearY) <= s.r) {
                return true;
            }
        }
        return false;
    }

    static findBestTarget(game, unit) {
        if (!unit) return null;

        // Priority Target override for allied forces
        if (unit.team === 'ally' && game.priorityTarget && !game.priorityTarget.dead) {
            const pt = game.priorityTarget;
            const dist = Math.hypot(pt.x - unit.x, pt.y - unit.y);
            const wallBlocked = this.isLineBlockedByWall(game, unit.x, unit.y, pt.x, pt.y);
            // If in realistic engagement range and not completely blocked by wall
            if (!wallBlocked || dist <= unit.range * 1.35) {
                return pt;
            }
        }

        let best = null;
        let bestScore = Infinity;

        // Build list of all valid hostile candidates (infantry, tanks, and HMG nests)
        const candidates = [];
        for (const other of game.units) {
            if (other.team !== unit.team && !other.dead) candidates.push(other);
        }
        if (game.tanks) {
            for (const t of game.tanks) {
                if (t.team !== unit.team && !t.dead) candidates.push(t);
            }
        }
        if (game.hmgNests) {
            for (const h of game.hmgNests) {
                if (h.team !== unit.team && !h.dead) candidates.push(h);
            }
        }

        for (const other of candidates) {
            const d = Math.hypot(other.x - unit.x, other.y - unit.y);
            const wallPenalty = this.isLineBlockedByWall(game, unit.x, unit.y, other.x, other.y) ? 280 : 0;
            let priorityBonus = 0;
            if (other === game.priorityTarget) priorityBonus = 500;
            if (other.role === 'sniper') priorityBonus += 45;
            if (other.type === 'hmg') priorityBonus += 35;

            const score = d + wallPenalty - priorityBonus;
            if (score < bestScore) {
                bestScore = score;
                best = other;
            }
        }
        return best;
    }

    static spawnBullet(game, shooter, x, y, angle) {
        if (shooter.team === 'ally') game.shotsFired++;

        if (game.pools && game.pools.bullets) {
            const b = game.pools.bullets.obtain();
            b.team = shooter.team;
            b.x = x;
            b.y = y;
            b.prevX = x;
            b.prevY = y;
            b.vx = Math.cos(angle) * shooter.bulletSpeed;
            b.vy = Math.sin(angle) * shooter.bulletSpeed;
            b.damage = shooter.damage;
            b.life = shooter.range / shooter.bulletSpeed + 0.15;
            b.isHeavy = false;
        } else {
            game.bullets.push({
                team: shooter.team,
                x, y,
                prevX: x, prevY: y,
                vx: Math.cos(angle) * shooter.bulletSpeed,
                vy: Math.sin(angle) * shooter.bulletSpeed,
                damage: shooter.damage,
                life: shooter.range / shooter.bulletSpeed + 0.15,
                isHeavy: false
            });
        }
    }

    static spawnImpactSparks(game, x, y, color, count = 5) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 25 + Math.random() * 80;

            if (game.pools && game.pools.sparks) {
                const p = game.pools.sparks.obtain();
                p.x = x;
                p.y = y;
                p.vx = Math.cos(a) * sp;
                p.vy = Math.sin(a) * sp;
                p.life = 0.25 + Math.random() * 0.2;
                p.maxLife = 0.45;
                p.color = color;
                p.size = 2 + Math.random() * 2.2;
            } else {
                game.particles.push({
                    type: 'spark',
                    x, y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp,
                    life: 0.25 + Math.random() * 0.2,
                    maxLife: 0.45,
                    color,
                    size: 2 + Math.random() * 2.2
                });
            }
        }
    }

    /**
     * Updates all active bullets (both in ObjectPool and legacy array)
     */
    static updateBullets(game, dt) {
        if (game.phase === 'deployment') return;
        const checkBullet = (b, onRecycle) => {
            b.prevX = b.x;
            b.prevY = b.y;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;

            // Check suppression proximity against all soldiers
            if (window.SuppressionSystem) {
                for (const u of game.units) {
                    window.SuppressionSystem.checkBulletProximity(b, u, game);
                }
            }

            let hit = false;

            // Check collision with obstacles
            for (const obs of game.obstacles) {
                if (obs.type === 'wall' || obs.type === 'sandbag') {
                    const dx = b.x - obs.x;
                    const dy = b.y - obs.y;
                    const cos = Math.cos(-obs.angle);
                    const sin = Math.sin(-obs.angle);
                    const lx = dx * cos - dy * sin;
                    const ly = dx * sin + dy * cos;
                    if (Math.abs(lx) <= obs.w / 2 && Math.abs(ly) <= obs.h / 2) {
                        if (obs.type === 'wall' || Math.random() < 0.45) {
                            hit = true;
                            this.spawnImpactSparks(game, b.x, b.y, '#64748b', 4);
                            break;
                        }
                    }
                }
            }

            // Check collision with opposing units
            if (!hit) {
                for (const u of game.units) {
                    if (u.team === b.team || u.dead) continue;
                    if (Math.hypot(b.x - u.x, b.y - u.y) <= u.radius + 2) {
                        const damageMult = 1 - u.inCover;
                        u.hp -= b.damage * damageMult;
                        u.hitFlash = 1.0;
                        hit = true;
                        if (b.team === 'ally') game.shotsHit++;

                        const inkColor = u.team === 'ally' ? '#1d4ed8' : '#b91c1c';
                        this.spawnImpactSparks(game, b.x, b.y, inkColor, 6);

                        if (u.hp <= 0) {
                            u.dead = true;
                            game.decals.push({
                                type: 'fallen',
                                x: u.x, y: u.y,
                                angle: u.angle,
                                team: u.team
                            });
                            game.updateHUD();
                            game.checkBattleOutcome();
                        }
                        break;
                    }
                }
            }

            // Check collision with tanks
            if (!hit && game.tanks) {
                for (const t of game.tanks) {
                    if (t.team === b.team || t.dead) continue;
                    if (Math.hypot(b.x - t.x, b.y - t.y) <= t.radius) {
                        hit = true;
                        t.hp -= b.isHeavy ? b.damage : b.damage * 0.35; // Tanks resist small arms
                        t.hitFlash = 1.0;
                        this.spawnImpactSparks(game, b.x, b.y, '#f59e0b', 5);
                        if (t.hp <= 0) {
                            t.dead = true;
                            game.decals.push({ type: 'crater', x: t.x, y: t.y, r: 35 });
                            if (window.sound) window.sound.playExplosion(1.4);
                            if (game.camera) game.camera.triggerShake(12);
                        }
                        break;
                    }
                }
            }

            // Check collision with stationary fortified HMG nests
            if (!hit && game.hmgNests) {
                for (const h of game.hmgNests) {
                    if (h.team === b.team || h.dead) continue;
                    if (Math.hypot(b.x - h.x, b.y - h.y) <= h.radius + 4) {
                        hit = true;
                        h.hp -= b.isHeavy ? b.damage : b.damage * 0.65;
                        this.spawnImpactSparks(game, b.x, b.y, '#94a3b8', 4);
                        if (h.hp <= 0) {
                            h.dead = true;
                            game.decals.push({ type: 'crater', x: h.x, y: h.y, r: 24 });
                            if (window.sound) window.sound.playExplosion(1.0);
                            if (game.camera) game.camera.triggerShake(7);
                        }
                        break;
                    }
                }
            }

            if (hit || b.life <= 0 || b.x < 0 || b.x > game.width || b.y < 0 || b.y > game.height) {
                onRecycle();
            }
        };

        // Update pooled bullets
        if (game.pools && game.pools.bullets) {
            game.pools.bullets.forEachActive((b) => {
                checkBullet(b, () => game.pools.bullets.recycle(b));
            });
        }

        // Update legacy bullets
        for (let i = game.bullets.length - 1; i >= 0; i--) {
            checkBullet(game.bullets[i], () => game.bullets.splice(i, 1));
        }
    }
}

window.CombatSystem = CombatSystem;
