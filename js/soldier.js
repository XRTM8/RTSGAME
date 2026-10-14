/**
 * ============================================================================
 * INFANTRY SOLDIER ENTITY & AI
 * Handles movement, pathfinding, cover calculation, aiming, firing,
 * and integration with the Suppression & Morale system and Campaign Upgrades
 * ============================================================================
 */
class Soldier {
    constructor(id, team, x, y, role = 'rifle', squad = 'alpha') {
        this.id = id;
        this.team = team; // 'ally' | 'enemy'
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 12;
        this.role = role; // 'rifle' | 'assault' | 'sniper'
        this.squad = squad; // 'alpha' | 'bravo'

        this.targetX = x;
        this.targetY = y;
        this.preferredAngle = team === 'ally' ? -Math.PI / 2 : Math.PI / 2;
        this.angle = this.preferredAngle;

        // Role stats
        if (role === 'sniper') {
            this.maxHp = 85;
            this.speed = 76;
            this.range = 430;
            this.fireDelay = 1.45;
            this.damage = 38;
            this.accuracy = 0.88;
            this.bulletSpeed = 680;
        } else if (role === 'assault') {
            this.maxHp = 115;
            this.speed = 104;
            this.range = 240;
            this.fireDelay = 0.34;
            this.damage = 13;
            this.accuracy = 0.66;
            this.bulletSpeed = 490;
        } else {
            // Standard rifleman
            this.maxHp = 100;
            this.speed = 90;
            this.range = 320;
            this.fireDelay = 0.68;
            this.damage = 20;
            this.accuracy = 0.76;
            this.bulletSpeed = 550;
        }

        // Apply campaign upgrades if allied
        if (team === 'ally' && window.game && window.game.campaign) {
            const hpBonus = 1.0 + (window.game.campaign.upgrades.reinforcedHelmets.level * 0.15);
            const dmgBonus = 1.0 + (window.game.campaign.upgrades.marksmanRifles.level * 0.12);
            this.maxHp = Math.round(this.maxHp * hpBonus);
            this.damage = Math.round(this.damage * dmgBonus);
        }

        this.hp = this.maxHp;
        this.selected = team === 'ally';
        this.stance = 'advance'; // 'advance' | 'hold' | 'charge' | 'retreat'
        this.cooldown = Math.random() * 0.5;
        this.recoil = 0;
        this.hitFlash = 0;
        this.inCover = 0;
        this.suppression = 0;
        this.isPinned = false;
        this.isSuppressed = false;
        this.dead = false;
    }

    update(dt, game) {
        if (this.dead || game.phase === 'deployment') return;

        if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 4.5);
        if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
        if (this.cooldown > 0) this.cooldown -= dt;

        // Suppression & Morale Recovery
        if (window.SuppressionSystem) {
            window.SuppressionSystem.update(this, dt, game);
        }

        // Evaluate terrain cover
        this.inCover = game.evaluateUnitCover(this);

        // Distance to target destination
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let dist = Math.hypot(dx, dy);

        // Autonomous Tactical Cover Seeking for Allied Soldiers:
        // If out in the open (low cover) and near current waypoint or holding, duck behind nearby trench/sandbag
        if (this.team === 'ally' && this.inCover < 0.35 && (this.stance === 'hold' || dist <= 24)) {
            for (const obs of game.obstacles) {
                if (obs.type === 'trench' || obs.type === 'sandbag') {
                    const od = Math.hypot(obs.x - this.x, obs.y - this.y);
                    if (od < (obs.w * 0.5 + 40)) {
                        const coverTargetY = obs.type === 'sandbag' ? (this.y > obs.y ? obs.y + 16 : obs.y - 16) : obs.y;
                        const coverTargetX = Math.max(obs.x - obs.w * 0.38, Math.min(obs.x + obs.w * 0.38, this.x));
                        if (Math.hypot(coverTargetX - this.x, coverTargetY - this.y) > 4) {
                            this.targetX = coverTargetX;
                            this.targetY = coverTargetY;
                            dx = this.targetX - this.x;
                            dy = this.targetY - this.y;
                            dist = Math.hypot(dx, dy);
                        }
                        break;
                    }
                }
            }
        }

        // Find nearest valid enemy
        const targetEnemy = game.findBestTarget(this);

        // AI behavior for enemy team
        if (this.team === 'enemy') {
            this.updateEnemyAI(dt, game, targetEnemy);
        } else if (this.stance === 'charge' && targetEnemy) {
            const distToEnemy = Math.hypot(targetEnemy.x - this.x, targetEnemy.y - this.y);
            if (distToEnemy > this.range * 0.55) {
                this.targetX = targetEnemy.x;
                this.targetY = targetEnemy.y;
                dx = this.targetX - this.x;
                dy = this.targetY - this.y;
                dist = Math.hypot(dx, dy);
            }
        }

        let moveSpeed = this.speed;
        if (this.stance === 'hold') moveSpeed *= 0.0;
        if (this.stance === 'charge') moveSpeed *= 1.25;
        if (this.inCover >= 0.45) moveSpeed *= 0.82;

        // Apply Suppression Crawl speed reduction!
        if (window.SuppressionSystem) {
            moveSpeed *= window.SuppressionSystem.getSpeedMultiplier(this);
        }

        if (dist > 4) {
            const actualSpeed = dist > 18 && this.stance === 'hold' ? this.speed : moveSpeed;
            const step = Math.min(dist, actualSpeed * dt);
            this.vx = (dx / dist) * (step / dt);
            this.vy = (dy / dist) * (step / dt);
        } else {
            this.vx *= 0.6;
            this.vy *= 0.6;
        }

        // Soft separation between soldiers (anti-clumping)
        for (const other of game.units) {
            if (other === this || other.dead) continue;
            const ox = this.x - other.x;
            const oy = this.y - other.y;
            const od = Math.hypot(ox, oy);
            const minDist = this.radius + other.radius + 3;
            if (od > 0.001 && od < minDist) {
                const push = ((minDist - od) / minDist) * 160;
                this.vx += (ox / od) * push;
                this.vy += (oy / od) * push;
            }
        }

        // Anti-crush separation from tanks
        if (game.tanks) {
            for (const tank of game.tanks) {
                if (tank.dead) continue;
                const tx = this.x - tank.x;
                const ty = this.y - tank.y;
                const td = Math.hypot(tx, ty);
                const tankMinDist = this.radius + tank.radius + 6;
                if (td > 0.001 && td < tankMinDist) {
                    const push = ((tankMinDist - td) / tankMinDist) * 220;
                    this.vx += (tx / td) * push;
                    this.vy += (ty / td) * push;
                }
            }
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Resolve collisions with solid obstacles and canvas bounds
        game.resolveObstacleCollisions(this);

        // Smooth angular rotation
        let desiredAngle = this.preferredAngle;

        if (targetEnemy) {
            const distEnemy = Math.hypot(targetEnemy.x - this.x, targetEnemy.y - this.y);
            if (distEnemy <= this.range * 1.15) {
                desiredAngle = Math.atan2(targetEnemy.y - this.y, targetEnemy.x - this.x);
            } else if (dist > 10 && this.stance !== 'retreat') {
                desiredAngle = Math.atan2(dy, dx);
            }
        } else if (dist > 10 && this.stance !== 'retreat') {
            desiredAngle = Math.atan2(dy, dx);
        }

        let angleDiff = desiredAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.angle += angleDiff * Math.min(1, dt * 10);

        // Friendly Fire Clearance check: ensure no ally is blocking the line of fire
        let allyBlocksLineOfFire = false;
        const cosAngle = Math.cos(this.angle);
        const sinAngle = Math.sin(this.angle);

        for (const ally of game.units) {
            if (ally === this || ally.team !== this.team || ally.dead) continue;
            const ax = ally.x - this.x;
            const ay = ally.y - this.y;
            const forwardDist = ax * cosAngle + ay * sinAngle;
            const lateralDist = Math.abs(-ax * sinAngle + ay * cosAngle);

            if (forwardDist > 0 && forwardDist < 46 && lateralDist < (this.radius + ally.radius - 2)) {
                allyBlocksLineOfFire = true;
                // Autonomous micro-sidestep perpendicular to fire direction to clear line of fire!
                const sideSign = (-ax * sinAngle + ay * cosAngle) >= 0 ? -1 : 1;
                this.vx += -sinAngle * sideSign * 45;
                this.vy += cosAngle * sideSign * 45;
                break;
            }
        }

        // Firing logic
        if (targetEnemy && this.cooldown <= 0 && !allyBlocksLineOfFire) {
            const distEnemy = Math.hypot(targetEnemy.x - this.x, targetEnemy.y - this.y);
            if (distEnemy <= this.range && Math.abs(angleDiff) < 0.45) {
                if (!game.isLineBlockedByWall(this.x, this.y, targetEnemy.x, targetEnemy.y)) {
                    this.fireAt(targetEnemy, game);
                }
            }
        }
    }

    updateEnemyAI(dt, game, targetEnemy) {
        if (!targetEnemy) return;
        const dist = Math.hypot(targetEnemy.x - this.x, targetEnemy.y - this.y);

        if (Math.random() < dt * 1.4) {
            const bestCoverSpot = game.findTacticalCoverSpot(this, targetEnemy);
            if (bestCoverSpot && dist < this.range * 1.25) {
                this.targetX = bestCoverSpot.x;
                this.targetY = bestCoverSpot.y;
            } else if (dist > this.range * 0.85) {
                const flankAngle = Math.atan2(targetEnemy.y - this.y, targetEnemy.x - this.x) + ((this.id % 2 === 0 ? 1 : -1) * 0.25);
                this.targetX = this.x + Math.cos(flankAngle) * 95;
                this.targetY = this.y + Math.sin(flankAngle) * 95;
            }
            this.preferredAngle = Math.atan2(targetEnemy.y - this.y, targetEnemy.x - this.x);
        }
    }

    fireAt(target, game) {
        this.cooldown = this.fireDelay * (0.9 + Math.random() * 0.25);
        this.recoil = 1.0;

        let acc = this.accuracy;
        if (this.stance === 'hold') acc += 0.12;
        if (Math.hypot(this.vx, this.vy) > 25) acc -= 0.18;
        if (game.isLineThroughSmoke(this.x, this.y, target.x, target.y)) acc -= 0.38;

        // Apply Suppression accuracy debuff!
        if (window.SuppressionSystem) {
            acc -= window.SuppressionSystem.getAccuracyPenalty(this);
        }

        const maxSpread = (1 - Math.max(0.12, Math.min(0.96, acc))) * 0.38;
        const spread = (Math.random() - 0.5) * 2 * maxSpread;
        const shotAngle = Math.atan2(target.y - this.y, target.x - this.x) + spread;

        const muzzleDist = this.radius + 8;
        const bx = this.x + Math.cos(this.angle) * muzzleDist;
        const by = this.y + Math.sin(this.angle) * muzzleDist;

        game.spawnBullet(this, bx, by, shotAngle);
        if (window.sound) {
            window.sound.playShot(this.role);
        }
    }
}

window.Soldier = Soldier;
