/**
 * ============================================================================
 * HEAVY WEAPONS & VEHICLES (الأسلحة الثقيلة ومدرعات الحبر)
 * - Sketch Tank (دبابة الحبر الخفيفة): Heavy armor, crushing treads, revolving turret & explosive cannon
 * - Stationary HMG Nest (عش الرشاش الثقيل): Rapid suppression burst fire
 * ============================================================================
 */
class SketchTank {
    constructor(id, team, x, y) {
        this.id = id;
        this.type = 'tank';
        this.team = team;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = team === 'ally' ? -Math.PI / 2 : Math.PI / 2;
        this.turretAngle = this.angle;
        this.radius = 24;
        this.maxHp = 360;
        this.hp = this.maxHp;
        this.speed = 68;
        this.stance = 'advance'; // 'advance' | 'hold' | 'charge' | 'retreat'
        this.range = 380;
        this.fireDelay = 2.4;
        this.cooldown = 1.0;
        this.recoil = 0;
        this.hitFlash = 0;
        this.dead = false;
        this.selected = false;
    }

    update(dt, game) {
        if (this.dead || game.phase === 'deployment') return;

        if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 3);
        if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
        if (this.cooldown > 0) this.cooldown -= dt;

        // Target picking: target designated priority target, opposing tanks, HMG nests, or infantry clusters
        let bestTarget = null;
        let bestDist = Infinity;

        // 1. Focus Fire priority override for allied tanks
        if (this.team === 'ally' && game.priorityTarget && !game.priorityTarget.dead) {
            const d = Math.hypot(game.priorityTarget.x - this.x, game.priorityTarget.y - this.y);
            if (d < this.range * 1.35) {
                bestTarget = game.priorityTarget;
            }
        }

        // 2. Opposing tanks with highest autonomous threat priority
        if (!bestTarget && game.tanks) {
            for (const ot of game.tanks) {
                if (ot.team === this.team || ot.dead || ot === this) continue;
                const d = Math.hypot(ot.x - this.x, ot.y - this.y);
                if (d < this.range + 50 && d < bestDist) {
                    bestDist = d;
                    bestTarget = ot;
                }
            }
        }

        // 3. Stationary fortified HMG nests
        if (!bestTarget && game.hmgNests) {
            for (const h of game.hmgNests) {
                if (h.team === this.team || h.dead) continue;
                const d = Math.hypot(h.x - this.x, h.y - this.y);
                if (d < this.range && d < bestDist) {
                    bestDist = d;
                    bestTarget = h;
                }
            }
        }

        // 4. Opposing infantry
        if (!bestTarget) {
            for (const u of game.units) {
                if (u.team === this.team || u.dead) continue;
                const d = Math.hypot(u.x - this.x, u.y - this.y);
                if (d < this.range && d < bestDist) {
                    bestDist = d;
                    bestTarget = u;
                }
            }
        }

        // Stance speed adjustment
        let moveSpeed = this.speed;
        if (this.stance === 'hold') moveSpeed = 0;
        if (this.stance === 'charge') moveSpeed = this.speed * 1.35;
        if (this.stance === 'retreat') moveSpeed = this.speed * 0.85;

        // Enemy AI movement: slowly advance
        if (this.team === 'enemy' && Math.random() < dt * 0.8) {
            if (bestTarget) {
                this.targetX = this.x + (bestTarget.x - this.x) * 0.4;
                this.targetY = this.y + (bestTarget.y - this.y) * 0.4;
            }
        }

        // Movement towards targetX, targetY
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 8 && moveSpeed > 0) {
            const desiredHullAngle = Math.atan2(dy, dx);
            let diff = desiredHullAngle - this.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.angle += diff * Math.min(1, dt * 3.5);

            const step = Math.min(dist, moveSpeed * dt);
            this.vx = Math.cos(this.angle) * step;
            this.vy = Math.sin(this.angle) * step;
            this.x += this.vx;
            this.y += this.vy;

            // Tanks crush and obliterate sandbags!
            for (let i = game.obstacles.length - 1; i >= 0; i--) {
                const obs = game.obstacles[i];
                if (obs.type === 'sandbag') {
                    if (Math.hypot(obs.x - this.x, obs.y - this.y) < this.radius + 15) {
                        game.obstacles.splice(i, 1);
                        if (game.pools && game.pools.sparks) {
                            for (let s = 0; s < 8; s++) {
                                const sp = game.pools.sparks.obtain();
                                sp.x = obs.x; sp.y = obs.y;
                                sp.color = '#d97706';
                                sp.vx = (Math.random() - 0.5) * 80;
                                sp.vy = (Math.random() - 0.5) * 80;
                                sp.life = 0.4; sp.maxLife = 0.4;
                            }
                        }
                    }
                }
            }
        }

        // Aim Turret at target
        if (bestTarget) {
            const aimAngle = Math.atan2(bestTarget.y - this.y, bestTarget.x - this.x);
            let turretDiff = aimAngle - this.turretAngle;
            while (turretDiff > Math.PI) turretDiff -= Math.PI * 2;
            while (turretDiff < -Math.PI) turretDiff += Math.PI * 2;
            this.turretAngle += turretDiff * Math.min(1, dt * 4.0);

            // Fire cannon if aligned
            if (this.cooldown <= 0 && Math.abs(turretDiff) < 0.35) {
                this.fireCannon(bestTarget, game);
            }
        }
    }

    fireCannon(target, game) {
        this.cooldown = this.fireDelay;
        this.recoil = 1.0;

        const muzzleDist = 28;
        const bx = this.x + Math.cos(this.turretAngle) * muzzleDist;
        const by = this.y + Math.sin(this.turretAngle) * muzzleDist;

        // Spawn heavy bullet
        if (game.pools && game.pools.bullets) {
            const b = game.pools.bullets.obtain();
            b.team = this.team;
            b.x = bx; b.y = by;
            b.prevX = bx; b.prevY = by;
            b.vx = Math.cos(this.turretAngle) * 520;
            b.vy = Math.sin(this.turretAngle) * 520;
            b.damage = 65;
            b.life = this.range / 520;
            b.isHeavy = true;
        }

        if (window.sound) window.sound.playShot('tank');
        if (game.camera) game.camera.triggerShake(7);
    }
}

class HMGNest {
    constructor(id, team, x, y, angle) {
        this.id = id;
        this.type = 'hmg';
        this.team = team;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.radius = 16;
        this.maxHp = 180;
        this.hp = this.maxHp;
        this.range = 420;
        this.burstCooldown = 1.2;
        this.burstCounter = 0;
        this.burstShotsRemaining = 0;
        this.shotDelay = 0.08;
        this.shotTimer = 0;
        this.dead = false;
        this.selected = false;
    }

    update(dt, game) {
        if (this.dead || game.phase === 'deployment') return;

        if (this.burstCounter > 0) this.burstCounter -= dt;

        // Find targets within firing arc (+/- 60 degrees of nest angle)
        let bestTarget = null;
        let bestDist = Infinity;

        for (const u of game.units) {
            if (u.team === this.team || u.dead) continue;
            const d = Math.hypot(u.x - this.x, u.y - this.y);
            if (d < this.range && d < bestDist) {
                const targetAngle = Math.atan2(u.y - this.y, u.x - this.x);
                let diff = targetAngle - this.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                if (Math.abs(diff) < 1.1) {
                    bestDist = d;
                    bestTarget = u;
                }
            }
        }

        if (bestTarget && this.burstCounter <= 0 && this.burstShotsRemaining <= 0) {
            this.burstShotsRemaining = 4; // 4-round suppression burst
            this.burstCounter = this.burstCooldown;
        }

        if (this.burstShotsRemaining > 0) {
            this.shotTimer -= dt;
            if (this.shotTimer <= 0) {
                this.shotTimer = this.shotDelay;
                this.burstShotsRemaining--;

                if (bestTarget) {
                    const aimAngle = Math.atan2(bestTarget.y - this.y, bestTarget.x - this.x) + (Math.random() - 0.5) * 0.15;
                    const bx = this.x + Math.cos(aimAngle) * 20;
                    const by = this.y + Math.sin(aimAngle) * 20;

                    if (game.pools && game.pools.bullets) {
                        const b = game.pools.bullets.obtain();
                        b.team = this.team;
                        b.x = bx; b.y = by;
                        b.prevX = bx; b.prevY = by;
                        b.vx = Math.cos(aimAngle) * 620;
                        b.vy = Math.sin(aimAngle) * 620;
                        b.damage = 22;
                        b.life = this.range / 620;
                        b.isHeavy = true;
                    }

                    if (window.sound) window.sound.playShot('hmg');
                    if (game.camera) game.camera.triggerShake(2.5);
                }
            }
        }
    }
}

/**
 * Manager handling vehicles and emplacements
 */
class VehicleManager {
    static drawTank(ctx, tank, time) {
        ctx.save();
        ctx.translate(tank.x, tank.y);

        // Selection ring
        if (tank.selected && tank.team === 'ally') {
            ctx.save();
            ctx.strokeStyle = '#1d4ed8';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, tank.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Hull shadow
        ctx.fillStyle = 'rgba(30, 36, 43, 0.22)';
        ctx.beginPath();
        ctx.roundRect(-22, -16, 44, 32, 6);
        ctx.fill();

        // Rotate Hull
        ctx.save();
        ctx.rotate(tank.angle);

        // Treads
        ctx.fillStyle = '#1e242b';
        ctx.fillRect(-22, -18, 44, 7);
        ctx.fillRect(-22, 11, 44, 7);

        // Tank Body
        ctx.fillStyle = tank.hitFlash > 0 ? '#ffffff' : (tank.team === 'ally' ? '#93c5fd' : '#fca5a5');
        ctx.strokeStyle = '#1e242b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-18, -12, 36, 24, 4);
        ctx.fill();
        ctx.stroke();

        ctx.restore(); // Restore hull rotation

        // Turret & Long Cannon (rotates independently)
        ctx.save();
        ctx.rotate(tank.turretAngle);

        const recoilOffset = -tank.recoil * 5;
        ctx.translate(recoilOffset, 0);

        // Cannon barrel
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#1e242b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(4, -3, 24, 6);
        ctx.fill();
        ctx.stroke();

        // Turret Dome
        ctx.fillStyle = tank.team === 'ally' ? '#1d4ed8' : '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Health bar
        if (tank.hp < tank.maxHp) {
            const barW = 34;
            const barH = 5;
            const bx = tank.x - barW / 2;
            const by = tank.y - tank.radius - 14;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(bx, by, barW, barH);
            ctx.strokeStyle = '#1e242b';
            ctx.strokeRect(bx, by, barW, barH);
            ctx.fillStyle = tank.team === 'ally' ? '#1d4ed8' : '#dc2626';
            ctx.fillRect(bx + 1, by + 1, (barW - 2) * (tank.hp / tank.maxHp), barH - 2);
        }

        ctx.restore();
    }

    static drawHMG(ctx, hmg, time) {
        ctx.save();
        ctx.translate(hmg.x, hmg.y);

        // Sandbag arc around HMG
        ctx.save();
        ctx.rotate(hmg.angle);
        ctx.fillStyle = '#e7d8b9';
        ctx.strokeStyle = '#1e242b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 15, -0.9, 0.9);
        ctx.stroke();

        // Tripod legs
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-10, -8);
        ctx.moveTo(0, 0); ctx.lineTo(-10, 8);
        ctx.moveTo(0, 0); ctx.lineTo(12, 0);
        ctx.stroke();

        // Gun body & ammo box
        ctx.fillStyle = '#1e242b';
        ctx.fillRect(-2, -3.5, 18, 7);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(2, 4, 7, 6);
        ctx.strokeRect(2, 4, 7, 6);

        ctx.restore();

        // Health bar
        if (hmg.hp < hmg.maxHp) {
            const barW = 24;
            const barH = 4;
            const bx = hmg.x - barW / 2;
            const by = hmg.y - hmg.radius - 10;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(bx, by, barW, barH);
            ctx.fillStyle = hmg.team === 'ally' ? '#1d4ed8' : '#dc2626';
            ctx.fillRect(bx + 1, by + 1, (barW - 2) * (hmg.hp / hmg.maxHp), barH - 2);
        }

        ctx.restore();
    }
}

window.SketchTank = SketchTank;
window.HMGNest = HMGNest;
window.VehicleManager = VehicleManager;
