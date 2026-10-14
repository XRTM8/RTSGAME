/**
 * ============================================================================
 * SUPPRESSION & MORALE SYSTEM (نظام القمع النيراني)
 * Simulates intense bullet fire & shell-shock. Pinned soldiers duck, crawl,
 * lose firing accuracy, and must rely on smoke cover or flanking maneuvers!
 * ============================================================================
 */
class SuppressionSystem {
    static checkBulletProximity(bullet, unit, game) {
        if (bullet.team === unit.team || unit.dead) return;

        // Check if bullet passes close to unit
        const dist = Math.hypot(bullet.x - unit.x, bullet.y - unit.y);
        const nearMissRadius = bullet.isHeavy ? 46 : 28;

        if (dist <= nearMissRadius) {
            // Sandbag & trench cover protects morale
            const coverDefense = unit.inCover > 0 ? (1 - unit.inCover * 0.7) : 1.0;
            const suppressionAmount = (bullet.isHeavy ? 28 : 12) * coverDefense;
            this.addSuppression(unit, suppressionAmount, game);
        }
    }

    static checkExplosionProximity(ex, ey, unit, radius, game) {
        if (unit.dead) return;
        const dist = Math.hypot(ex - unit.x, ey - unit.y);
        if (dist <= radius) {
            const ratio = 1 - (dist / radius);
            const coverDefense = unit.inCover > 0 ? (1 - unit.inCover * 0.5) : 1.0;
            const suppressionAmount = ratio * 65 * coverDefense;
            this.addSuppression(unit, suppressionAmount, game);
        }
    }

    static addSuppression(unit, amount, game) {
        const wasPinned = unit.suppression >= 60;
        unit.suppression = Math.min(100, (unit.suppression || 0) + amount);

        if (!wasPinned && unit.suppression >= 60) {
            // Spawn floating text warning
            if (game && game.pools && game.pools.floatingTexts) {
                const text = game.pools.floatingTexts.obtain();
                text.text = unit.team === 'ally' ? '⚠️ تحت القمع النيراني!' : 'قمع!';
                text.x = unit.x;
                text.y = unit.y - 18;
                text.color = unit.team === 'ally' ? '#ea580c' : '#dc2626';
                text.life = 0.85;
                text.maxLife = 0.85;
                text.vy = -30;
            }
            if (unit.team === 'ally' && window.sound) {
                window.sound.playSuppressionSting();
            }
        }
    }

    static update(unit, dt, game) {
        if (unit.dead) return;
        if (!unit.suppression) unit.suppression = 0;

        // In smoke, morale recovers twice as fast
        const inSmoke = game.isLineThroughSmoke(unit.x, unit.y, unit.x + 1, unit.y + 1);
        const recoveryRate = inSmoke ? 32 : (unit.inCover > 0.3 ? 22 : 14);

        if (unit.suppression > 0) {
            unit.suppression = Math.max(0, unit.suppression - dt * recoveryRate);
        }

        unit.isPinned = unit.suppression >= 60;
        unit.isSuppressed = unit.suppression >= 25;
    }

    static getSpeedMultiplier(unit) {
        if (!unit.suppression || unit.suppression < 25) return 1.0;
        // Pinned down soldiers crawl (slowed down by up to 65%)
        const factor = (unit.suppression - 25) / 75; // 0 to 1
        return 1.0 - factor * 0.65;
    }

    static getAccuracyPenalty(unit) {
        if (!unit.suppression || unit.suppression < 20) return 0;
        // Accuracy spread increases drastically under fire
        return (unit.suppression / 100) * 0.28;
    }

    static drawIndicator(ctx, unit) {
        if (!unit.suppression || unit.suppression < 25 || unit.dead) return;

        ctx.save();
        const barW = 22;
        const barH = 3;
        const bx = unit.x - barW / 2;
        const by = unit.y + unit.radius + 5;

        // Mini yellow/red suppression meter below unit
        ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
        ctx.fillRect(bx, by, barW, barH);

        const ratio = unit.suppression / 100;
        ctx.fillStyle = unit.suppression >= 60 ? '#dc2626' : '#f59e0b';
        ctx.fillRect(bx, by, barW * ratio, barH);

        if (unit.isPinned) {
            ctx.fillStyle = '#dc2626';
            ctx.font = 'bold 9px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('منبطح', unit.x, by + 11);
        }
        ctx.restore();
    }
}

window.SuppressionSystem = SuppressionSystem;
