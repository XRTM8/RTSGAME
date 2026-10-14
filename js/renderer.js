/**
 * ============================================================================
 * HAND-DRAWN SKETCH RENDERING ENGINE & BATTLEFIELD RENDERER
 * Draws lines, circles, infantry, vehicles, decals, and tactical overlays with organic ink imperfections.
 * Fully integrated with BattleCamera (Zoom/Pan/Shake) and ObjectPool.
 * ============================================================================
 */
class SketchArtist {
    static jitter(seed, amp = 1.2) {
        const x = Math.sin(seed * 12.9898) * 43758.5453;
        return ((x - Math.floor(x)) - 0.5) * 2 * amp;
    }

    static drawSketchLine(ctx, x1, y1, x2, y2, seed = 1, wobble = 1.4) {
        const midX = (x1 + x2) * 0.5 + this.jitter(seed, wobble);
        const midY = (y1 + y2) * 0.5 + this.jitter(seed + 7, wobble);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        ctx.stroke();
    }

    static drawDoubleSketchCircle(ctx, x, y, r, fillStyle, strokeStyle, lineWidth = 2, seed = 1) {
        ctx.save();
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = lineWidth * 0.55;
        ctx.beginPath();
        ctx.ellipse(
            x + this.jitter(seed, 0.7),
            y + this.jitter(seed + 3, 0.7),
            r * 1.03,
            r * 0.97,
            0.3,
            0,
            Math.PI * 1.75
        );
        ctx.stroke();
        ctx.restore();
    }

    static drawSoldier(ctx, unit, time) {
        ctx.save();
        ctx.translate(unit.x, unit.y);

        // Selection ring
        if (unit.selected && unit.team === 'ally') {
            ctx.save();
            ctx.strokeStyle = '#1d4ed8';
            ctx.lineWidth = 2.2;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, unit.radius + 7, time * 0.002, time * 0.002 + Math.PI * 2);
            ctx.stroke();

            const chevX = Math.cos(unit.angle) * (unit.radius + 10);
            const chevY = Math.sin(unit.angle) * (unit.radius + 10);
            ctx.fillStyle = '#1d4ed8';
            ctx.beginPath();
            ctx.arc(chevX, chevY, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Soft ink shadow
        ctx.fillStyle = 'rgba(30, 36, 43, 0.14)';
        ctx.beginPath();
        ctx.ellipse(2, 3, unit.radius * 1.15, unit.radius * 0.9, unit.angle, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(unit.angle);

        // Walking sway & crawling effect under suppression
        const isMoving = Math.hypot(unit.vx, unit.vy) > 8;
        const crawlScale = unit.isPinned ? 0.75 : 1.0;
        ctx.scale(crawlScale, crawlScale);

        const walkSway = isMoving ? Math.sin(time * 0.018 + unit.id * 2.1) * 0.14 : Math.sin(time * 0.003 + unit.id) * 0.02;
        ctx.rotate(walkSway);

        const recoilOffset = -unit.recoil * 3.5;
        ctx.translate(recoilOffset, 0);

        const isAlly = unit.team === 'ally';
        const shoulderFill = isAlly ? '#dbeafe' : '#fee2e2';
        const helmetFill = isAlly ? '#2563eb' : '#dc2626';
        const inkStroke = '#1e242b';

        // Arms & hands
        ctx.strokeStyle = inkStroke;
        ctx.fillStyle = shoulderFill;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(1, -11, 11, 4.5, 2.5);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(1, 6.5, 9.5, 4.5, 2.5);
        ctx.fill();
        ctx.stroke();

        // Weapon
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = inkStroke;
        ctx.lineWidth = 1.8;

        if (unit.role === 'sniper') {
            ctx.beginPath();
            ctx.rect(3, -1.5, 21, 3);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(6, -2.6, 7, 1.8);
        } else if (unit.role === 'assault') {
            ctx.beginPath();
            ctx.rect(3, -2, 13.5, 3.8);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.rect(3, -1.8, 17, 3.2);
            ctx.fill();
            ctx.stroke();
        }

        // Muzzle flash
        if (unit.recoil > 0.55) {
            const muzzleX = unit.role === 'sniper' ? 25 : (unit.role === 'assault' ? 18 : 21);
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(muzzleX, 0);
            ctx.lineTo(muzzleX + 7, -4);
            ctx.lineTo(muzzleX + 4, 0);
            ctx.lineTo(muzzleX + 8, 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();

        // Shoulders
        ctx.fillStyle = unit.hitFlash > 0 ? '#ffffff' : shoulderFill;
        ctx.strokeStyle = inkStroke;
        ctx.lineWidth = 2.3;

        ctx.beginPath();
        ctx.moveTo(-4, -12.5);
        ctx.bezierCurveTo(5, -13.5, 6.5, -6, 5.5, 0);
        ctx.bezierCurveTo(6.5, 6, 5, 13.5, -4, 12.5);
        ctx.bezierCurveTo(-8.5, 9, -7.5, -9, -4, -12.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cross-hatch shading
        ctx.strokeStyle = isAlly ? 'rgba(29, 78, 216, 0.35)' : 'rgba(185, 28, 28, 0.35)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-4, -9); ctx.lineTo(-1, -6);
        ctx.moveTo(-5, -4); ctx.lineTo(-2, -1);
        ctx.moveTo(-5, 4);  ctx.lineTo(-2, 7);
        ctx.moveTo(-4, 8);  ctx.lineTo(-1, 10);
        ctx.stroke();

        // Backpack
        ctx.fillStyle = isAlly ? '#93c5fd' : '#fca5a5';
        ctx.strokeStyle = inkStroke;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-8.5, -6.5, 4.2, 13, 2);
        ctx.fill();
        ctx.stroke();

        // Head & Helmet
        const headRadius = 6.6;
        this.drawDoubleSketchCircle(
            ctx,
            0.5,
            0,
            headRadius,
            unit.hitFlash > 0 ? '#fef08a' : helmetFill,
            inkStroke,
            2.2,
            unit.id
        );

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(1.2, 0, headRadius * 0.65, -0.7, 0.7);
        ctx.stroke();

        // Insignia
        if (unit.role === 'sniper') {
            ctx.beginPath();
            ctx.moveTo(-2.5, 0); ctx.lineTo(2.5, 0);
            ctx.moveTo(0, -2.5); ctx.lineTo(0, 2.5);
            ctx.stroke();
        } else if (unit.role === 'assault') {
            ctx.beginPath();
            ctx.moveTo(-2, -2.5);
            ctx.lineTo(1.5, 0);
            ctx.lineTo(-2, 2.5);
            ctx.stroke();
        }

        ctx.restore();

        // Health bar
        if (unit.hp < unit.maxHp) {
            const barW = 24;
            const barH = 4;
            const bx = unit.x - barW / 2;
            const by = unit.y - unit.radius - 12;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.strokeStyle = '#1e242b';
            ctx.lineWidth = 1.2;
            ctx.fillRect(bx, by, barW, barH);
            ctx.strokeRect(bx, by, barW, barH);

            const ratio = Math.max(0, unit.hp / unit.maxHp);
            ctx.fillStyle = unit.team === 'ally' ? '#2563eb' : '#dc2626';
            ctx.fillRect(bx + 1, by + 1, (barW - 2) * ratio, barH - 2);
        }

        // Cover shield
        if (unit.inCover > 0.15) {
            const sx = unit.x + 11;
            const sy = unit.y - 12;
            ctx.save();
            ctx.fillStyle = unit.inCover >= 0.45 ? '#16a34a' : '#d97706';
            ctx.strokeStyle = '#1e242b';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(sx, sy - 4.5);
            ctx.lineTo(sx + 4, sy - 2.5);
            ctx.lineTo(sx + 3, sy + 2.5);
            ctx.lineTo(sx, sy + 5);
            ctx.lineTo(sx - 3, sy + 2.5);
            ctx.lineTo(sx - 4, sy - 2.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Suppression indicator
        if (window.SuppressionSystem) {
            window.SuppressionSystem.drawIndicator(ctx, unit);
        }
    }
}

class BattleRenderer {
    static render(game, time) {
        const ctx = game.ctx;
        ctx.clearRect(0, 0, game.width, game.height);

        // Apply Camera Zoom, Pan, and Screen Shake!
        if (game.camera) {
            game.camera.apply(ctx, game.width, game.height);
        }

        // 1. Tactical Paper Background & Blueprint Grid
        const isNight = !!game.nightMode;
        ctx.fillStyle = isNight ? '#0b0f15' : '#f4efe6';
        ctx.fillRect(-400, -400, game.width + 800, game.height + 800);

        const gridStep = 44;
        ctx.strokeStyle = isNight ? 'rgba(56, 189, 248, 0.08)' : 'rgba(100, 116, 139, 0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < game.width; x += gridStep) {
            ctx.moveTo(x, 0); ctx.lineTo(x, game.height);
        }
        for (let y = 0; y < game.height; y += gridStep) {
            ctx.moveTo(0, y); ctx.lineTo(game.width, y);
        }
        ctx.stroke();

        // 1.5 Night Ops Tactical Vision Cones & Lantern Illumination
        if (isNight) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const drawAura = (x, y, radius, color) => {
                const grad = ctx.createRadialGradient(x, y, 2, x, y, radius);
                grad.addColorStop(0, color);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            };

            // Allied tactical vision lantern glows
            for (const u of game.units) {
                if (!u.dead) {
                    const col = u.team === 'ally' ? 'rgba(56, 189, 248, 0.10)' : 'rgba(239, 68, 68, 0.05)';
                    drawAura(u.x, u.y, u.team === 'ally' ? 95 : 65, col);
                }
            }

            // Tank heavy searchlights
            if (game.tanks) {
                for (const t of game.tanks) {
                    if (!t.dead) {
                        const col = t.team === 'ally' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(239, 68, 68, 0.12)';
                        drawAura(t.x, t.y, 160, col);
                    }
                }
            }
            ctx.restore();
        }

        // 2. Render Decals (Craters & Fallen Helmets)
        for (const d of game.decals) {
            ctx.save();
            ctx.translate(d.x, d.y);
            if (d.type === 'crater') {
                ctx.strokeStyle = 'rgba(30, 36, 43, 0.45)';
                ctx.fillStyle = 'rgba(30, 36, 43, 0.10)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, d.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (d.type === 'fallen') {
                ctx.rotate(d.angle);
                ctx.globalAlpha = 0.45;
                ctx.strokeStyle = d.team === 'ally' ? '#1d4ed8' : '#b91c1c';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
                ctx.moveTo(5, -5);  ctx.lineTo(-5, 5);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 3. Render Ground Obstacles (Trenches, Sandbags, Walls)
        for (const obs of game.obstacles) {
            if (obs.type === 'tree') continue;
            this.drawObstacle(ctx, obs, isNight);
        }

        // 4. Render Active Move Order Lines
        ctx.save();
        ctx.strokeStyle = 'rgba(29, 78, 216, 0.25)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        for (const u of game.units) {
            if (u.team === 'ally' && !u.dead && u.selected) {
                const dist = Math.hypot(u.targetX - u.x, u.targetY - u.y);
                if (dist > 10) {
                    ctx.beginPath();
                    ctx.moveTo(u.x, u.y); ctx.lineTo(u.targetX, u.targetY);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();

        // 5. Render Stationary HMG Nests
        if (game.hmgNests && window.VehicleManager) {
            for (const hmg of game.hmgNests) {
                if (!hmg.dead) window.VehicleManager.drawHMG(ctx, hmg, time);
            }
        }

        // 5.5 Render Dashed Order Trails (Waypoints to Target positions)
        if (game.phase === 'combat') {
            ctx.save();
            ctx.strokeStyle = 'rgba(29, 78, 216, 0.42)';
            ctx.fillStyle = '#1d4ed8';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([4, 4]);

            const renderTrail = (entity) => {
                const dist = Math.hypot(entity.targetX - entity.x, entity.targetY - entity.y);
                if (dist > 14) {
                    ctx.beginPath();
                    ctx.moveTo(entity.x, entity.y);
                    ctx.lineTo(entity.targetX, entity.targetY);
                    ctx.stroke();

                    // Tiny target waypoint dot
                    ctx.beginPath();
                    ctx.arc(entity.targetX, entity.targetY, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            };

            for (const u of game.units) {
                if (u.team === 'ally' && !u.dead) renderTrail(u);
            }
            if (game.tanks) {
                for (const t of game.tanks) {
                    if (t.team === 'ally' && !t.dead) renderTrail(t);
                }
            }
            ctx.restore();
        }

        // 6. Render All Living Infantry Soldiers
        for (const u of game.units) {
            if (!u.dead) {
                SketchArtist.drawSoldier(ctx, u, time);
            }
        }

        // 7. Render Heavy Tanks
        if (game.tanks && window.VehicleManager) {
            for (const tank of game.tanks) {
                if (!tank.dead) window.VehicleManager.drawTank(ctx, tank, time);
            }
        }

        // 8. Render Tree Canopies (Foliage above units)
        for (const obs of game.obstacles) {
            if (obs.type === 'tree') {
                this.drawObstacle(ctx, obs, isNight);
            }
        }

        // 9. Render Bullets (Pooled & Standard) with Luminous Tracers in Night Ops
        ctx.save();
        ctx.lineCap = 'round';
        const renderBullet = (b) => {
            if (isNight) {
                ctx.strokeStyle = b.team === 'ally' ? '#38bdf8' : '#f87171';
                ctx.shadowColor = b.team === 'ally' ? '#0ea5e9' : '#ef4444';
                ctx.shadowBlur = b.isHeavy ? 12 : 7;
            } else {
                ctx.strokeStyle = b.team === 'ally' ? '#1d4ed8' : '#b91c1c';
                ctx.shadowBlur = 0;
            }
            ctx.lineWidth = b.isHeavy ? 3.8 : 2.4;
            ctx.beginPath();
            ctx.moveTo(b.prevX, b.prevY);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        };

        if (game.pools && game.pools.bullets) {
            game.pools.bullets.forEachActive(renderBullet);
        }
        for (const b of game.bullets) {
            renderBullet(b);
        }
        ctx.restore();

        // 10. Render Airborne Grenades & Danger Warning Halo
        for (const g of game.grenades) {
            if (g.type === 'frag') {
                ctx.save();
                ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
                ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
                ctx.lineWidth = 1.8;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.arc(g.targetX, g.targetY, 95 * Math.min(1, g.progress * 1.4), 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#dc2626';
                ctx.font = 'bold 12px Cairo, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚠️', g.targetX, g.targetY - 6);
                ctx.restore();
            }

            const arcHeight = Math.sin(g.progress * Math.PI) * 38;
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(g.x, g.y, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.translate(g.x, g.y - arcHeight);
            ctx.fillStyle = g.type === 'frag' ? '#b91c1c' : '#475569';
            ctx.strokeStyle = '#1e242b';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 11. Render Hand-Drawn Smoke Clouds
        for (const s of game.smokes) {
            const alpha = Math.min(0.78, (s.life / 2.0) * 0.78);
            ctx.save();
            ctx.globalAlpha = alpha;
            SketchArtist.drawDoubleSketchCircle(
                ctx,
                s.x,
                s.y,
                s.r,
                'rgba(226, 232, 240, 0.88)',
                '#475569',
                2,
                Math.floor(s.x)
            );
            ctx.restore();
        }

        // 12. Render Particles & Shockwaves (Pooled & Standard)
        if (game.pools) {
            // Pooled Sparks
            game.pools.sparks.forEachActive(p => {
                ctx.save();
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Pooled Shockwave Rings
            game.pools.rings.forEachActive(r => {
                ctx.save();
                ctx.strokeStyle = r.color;
                ctx.globalAlpha = Math.max(0, r.alpha);
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });

            // Pooled Floating Combat Texts
            game.pools.floatingTexts.forEachActive(t => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
                ctx.font = t.font;
                ctx.fillStyle = t.color;
                ctx.textAlign = 'center';
                ctx.fillText(t.text, t.x, t.y);
                ctx.restore();
            });
        }

        for (const p of game.particles) {
            ctx.save();
            if (p.type === 'ring') {
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 13. Render Interactive Tactical Overlays & Focus Fire Reticle
        this.renderPriorityTarget(ctx, game, time);
        this.renderControlOverlays(ctx, game);

        // Render Pre-Battle Deployment Zone & Ghost Previews
        if (game.deployment && game.phase === 'deployment') {
            game.deployment.renderZone(ctx, game);
        }

        // 14. Render Map Editor overlay (if active)
        if (game.editor && game.editor.active) {
            game.editor.renderOverlay(ctx, game);
        }

        // Restore Camera Context
        if (game.camera) {
            game.camera.restore(ctx);
        }
    }

    static drawObstacle(ctx, obs, isNight = false) {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        if (obs.angle) ctx.rotate(obs.angle);

        if (obs.type === 'trench') {
            ctx.fillStyle = isNight ? '#080d14' : '#dfd6c3';
            ctx.strokeStyle = isNight ? '#38bdf8' : '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h, 8);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = isNight ? 'rgba(56, 189, 248, 0.28)' : 'rgba(30, 36, 43, 0.25)';
            ctx.lineWidth = 1.2;
            for (let x = -obs.w / 2 + 12; x < obs.w / 2 - 8; x += 14) {
                ctx.beginPath();
                ctx.moveTo(x, -obs.h / 2 + 5);
                ctx.lineTo(x, obs.h / 2 - 5);
                ctx.stroke();
            }
        } else if (obs.type === 'sandbag') {
            const bagCount = Math.max(3, Math.floor(obs.w / 22));
            const bagW = obs.w / bagCount;
            ctx.fillStyle = isNight ? '#1e2430' : '#e7d8b9';
            ctx.strokeStyle = isNight ? '#475569' : '#1e242b';
            ctx.lineWidth = 2;
            for (let i = 0; i < bagCount; i++) {
                const bx = -obs.w / 2 + i * bagW;
                ctx.beginPath();
                ctx.roundRect(bx, -obs.h / 2, bagW + 2, obs.h, 6);
                ctx.fill();
                ctx.stroke();
            }
        } else if (obs.type === 'wall') {
            ctx.fillStyle = isNight ? '#1e293b' : '#94a3b8';
            ctx.strokeStyle = isNight ? '#64748b' : '#1e242b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h, 4);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = isNight ? '#475569' : '#1e242b';
            ctx.lineWidth = 1.1;
            for (let x = -obs.w / 2 + 8; x < obs.w / 2; x += 12) {
                ctx.beginPath();
                ctx.moveTo(x, -obs.h / 2);
                ctx.lineTo(x - 8, obs.h / 2);
                ctx.stroke();
            }
        } else if (obs.type === 'tree') {
            SketchArtist.drawDoubleSketchCircle(
                ctx,
                0,
                0,
                obs.r,
                isNight ? 'rgba(6, 78, 59, 0.70)' : 'rgba(187, 247, 208, 0.65)',
                isNight ? '#10b981' : '#166534',
                2.2,
                Math.floor(obs.x)
            );
            ctx.fillStyle = isNight ? '#064e3b' : '#14532d';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    static renderPriorityTarget(ctx, game, time) {
        if (!game.priorityTarget || game.priorityTarget.dead || game.phase === 'deployment') return;

        const target = game.priorityTarget;
        const tx = target.x;
        const ty = target.y;
        const tr = (target.radius || 12) + 6;

        // 1. Render Focus Fire Laser Trails from all designated allied units
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.42)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);

        const selectedAllies = game.getSelectedAllies();
        for (const u of selectedAllies) {
            ctx.beginPath();
            ctx.moveTo(u.x, u.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
        }

        if (game.tanks) {
            for (const t of game.tanks) {
                if (t.team === 'ally' && !t.dead && (t.selected || selectedAllies.length === 0)) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
                    ctx.lineWidth = 2.4;
                    ctx.beginPath();
                    ctx.moveTo(t.x, t.y);
                    ctx.lineTo(tx, ty);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
        ctx.restore();

        // 2. Render Hand-Drawn Rotating Focus Brackets and Crosshair
        ctx.save();
        ctx.translate(tx, ty);
        const rot = (time || 0) * 0.0018;
        ctx.rotate(rot);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.4;
        const size = tr + 9;
        const arm = 9;

        // 4 corner L-brackets
        // Top-left
        ctx.beginPath();
        ctx.moveTo(-size + arm, -size); ctx.lineTo(-size, -size); ctx.lineTo(-size, -size + arm);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(size - arm, -size); ctx.lineTo(size, -size); ctx.lineTo(size, -size + arm);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(-size + arm, size); ctx.lineTo(-size, size); ctx.lineTo(-size, size - arm);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(size - arm, size); ctx.lineTo(size, size); ctx.lineTo(size, size - arm);
        ctx.stroke();

        // Inner pulsing target circle
        const pulse = Math.sin((time || 0) * 0.008) * 3;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(5, tr + pulse), 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(0, -size - 4); ctx.lineTo(0, -size + 3);
        ctx.moveTo(0, size - 3); ctx.lineTo(0, size + 4);
        ctx.moveTo(-size - 4, 0); ctx.lineTo(-size + 3, 0);
        ctx.moveTo(size - 3, 0); ctx.lineTo(size + 4, 0);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 3. Floating Tactical Badge with Arabic Label
        ctx.save();
        ctx.translate(tx, ty - tr - 22);
        const label = '🎯 هدف مركز (FOCUS)';
        ctx.font = 'bold 11px Cairo, Tahoma, sans-serif';
        const textWidth = ctx.measureText(label).width;

        // Badge pill
        ctx.fillStyle = '#b91c1c';
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-textWidth / 2 - 8, -10, textWidth + 16, 20, 10);
        ctx.fill();
        ctx.stroke();

        // Badge text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0);
        ctx.restore();
    }

    static renderControlOverlays(ctx, game) {
        if (game.activeAbility) {
            ctx.save();
            ctx.strokeStyle = game.activeAbility === 'frag' ? '#dc2626' : (game.activeAbility === 'tank' ? '#1d4ed8' : '#475569');
            ctx.fillStyle = game.activeAbility === 'frag' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(71, 85, 105, 0.15)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            const r = game.activeAbility === 'frag' ? 92 : 78;
            ctx.beginPath();
            ctx.arc(game.pointer.x, game.pointer.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        if (!game.pointer.isDown) return;

        if (game.pointer.action === 'box') {
            const x = Math.min(game.pointer.startX, game.pointer.x);
            const y = Math.min(game.pointer.startY, game.pointer.y);
            const w = Math.abs(game.pointer.x - game.pointer.startX);
            const h = Math.abs(game.pointer.y - game.pointer.startY);
            if (w > 6 || h > 6) {
                ctx.save();
                ctx.fillStyle = 'rgba(29, 78, 216, 0.10)';
                ctx.strokeStyle = '#1d4ed8';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.fillRect(x, y, w, h);
                ctx.strokeRect(x, y, w, h);
                ctx.restore();
            }
        } else if (game.pointer.action === 'line') {
            const dragDist = Math.hypot(game.pointer.x - game.pointer.startX, game.pointer.y - game.pointer.startY);
            if (dragDist >= 18) {
                const allies = game.getSelectedAllies();
                const slots = game.computeLineSlots(
                    game.pointer.startX,
                    game.pointer.startY,
                    game.pointer.x,
                    game.pointer.y,
                    allies.length
                );

                ctx.save();
                ctx.strokeStyle = '#1d4ed8';
                ctx.lineWidth = 2.2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(game.pointer.startX, game.pointer.startY);
                ctx.lineTo(game.pointer.x, game.pointer.y);
                ctx.stroke();

                ctx.setLineDash([]);
                for (const s of slots) {
                    ctx.fillStyle = 'rgba(29, 78, 216, 0.28)';
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    const ax = s.x + Math.cos(s.angle) * 20;
                    const ay = s.y + Math.sin(s.angle) * 20;
                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y); ctx.lineTo(ax, ay);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }
    }
}

window.SketchArtist = SketchArtist;
window.BattleRenderer = BattleRenderer;
