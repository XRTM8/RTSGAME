/**
 * ============================================================================
 * TACTICAL FORMATIONS & ABILITIES SYSTEM
 * Handles squads, line-drawing formations (Line, Wedge, Loose, Arc), stances,
 * and tactical abilities (Frag Grenades, Smoke Screen, Field Medic, and Tanks)
 * ============================================================================
 */
class TacticsSystem {
    static computeLineSlots(game, x1, y1, x2, y2, count) {
        const slots = [];
        const dx = x2 - x1;
        const dy = y2 - y1;

        const enemies = game.units.filter(u => u.team === 'enemy' && !u.dead);
        let enemyCenterX = game.width / 2;
        let enemyCenterY = 0;
        if (enemies.length > 0) {
            enemyCenterX = enemies.reduce((s, u) => s + u.x, 0) / enemies.length;
            enemyCenterY = enemies.reduce((s, u) => s + u.y, 0) / enemies.length;
        }

        const lineAngle = Math.atan2(dy, dx);
        let normalAngle = lineAngle - Math.PI / 2;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const toEnemyAngle = Math.atan2(enemyCenterY - midY, enemyCenterX - midX);

        let diff = toEnemyAngle - normalAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > Math.PI / 2) {
            normalAngle += Math.PI;
        }

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0.5 : i / (count - 1);
            slots.push({
                x: x1 + dx * t,
                y: y1 + dy * t,
                angle: normalAngle
            });
        }
        return slots;
    }

    static issueCustomLineFormation(game, x1, y1, x2, y2) {
        const allies = game.getSelectedAllies();
        if (allies.length === 0) return;

        const slots = this.computeLineSlots(game, x1, y1, x2, y2, allies.length);
        allies.forEach((u, i) => {
            u.stance = 'advance';
            u.targetX = slots[i].x;
            u.targetY = slots[i].y;
            u.preferredAngle = slots[i].angle;
        });

        // Intelligently command allied tanks alongside infantry
        if (game.tanks) {
            const allyTanks = game.tanks.filter(t => t.team === 'ally' && !t.dead);
            const hasExplicitTankSelection = allyTanks.some(t => t.selected);
            allyTanks.forEach((t, ti) => {
                if (t.selected || !hasExplicitTankSelection) {
                    t.stance = 'advance';
                    // Tank takes support position along the line
                    const lineMidX = (x1 + x2) / 2;
                    const lineMidY = (y1 + y2) / 2;
                    const flankOffset = ti % 2 === 0 ? -45 : 45;
                    t.targetX = Math.max(30, Math.min(game.width - 30, lineMidX + flankOffset));
                    t.targetY = Math.max(30, Math.min(game.height - 30, lineMidY + 18));
                }
            });
        }

        this.spawnOrderMarker(game, (x1 + x2) / 2, (y1 + y2) / 2);
    }

    static issueFormationMove(game, cx, cy, overrideStance = 'advance') {
        const allies = game.getSelectedAllies();
        const allyTanks = game.tanks ? game.tanks.filter(t => t.team === 'ally' && !t.dead) : [];
        if (allies.length === 0 && allyTanks.length === 0) return;

        const count = allies.length;
        if (count > 0) {
            const avgX = allies.reduce((s, u) => s + u.x, 0) / count;
            const avgY = allies.reduce((s, u) => s + u.y, 0) / count;

            let forwardAngle = Math.atan2(cy - avgY, cx - avgX);
            if (Math.hypot(cx - avgX, cy - avgY) < 20) {
                forwardAngle = -Math.PI / 2;
            }

            const rightAngle = forwardAngle + Math.PI / 2;

            // Sort allies tactically by role:
            // Wedge: Assault/Tanks spearhead, Riflemen on wings, Snipers in overwatch rear
            // Line: Snipers stepped back in second rank for clear line of sight
            let sortedAllies = [...allies];
            if (game.formation === 'wedge') {
                const roleWeight = { assault: 0, rifle: 1, sniper: 2 };
                sortedAllies.sort((a, b) => (roleWeight[a.role] || 1) - (roleWeight[b.role] || 1));
            } else if (game.formation === 'line') {
                const roleWeight = { assault: 0, rifle: 1, sniper: 2 };
                sortedAllies.sort((a, b) => (roleWeight[a.role] || 1) - (roleWeight[b.role] || 1));
            }

            sortedAllies.forEach((u, i) => {
                u.stance = overrideStance;
                const centeredIndex = i - (count - 1) / 2;
                let offsetX = 0;
                let offsetY = 0;
                let unitFacing = forwardAngle;

                if (game.formation === 'line') {
                    const spacing = 32;
                    // Snipers take tactical staggered step back to provide overwatch
                    const isRearRank = u.role === 'sniper';
                    const rearOffset = isRearRank ? -18 : 0;
                    offsetX = Math.cos(rightAngle) * (centeredIndex * spacing) + Math.cos(forwardAngle) * rearOffset;
                    offsetY = Math.sin(rightAngle) * (centeredIndex * spacing) + Math.sin(forwardAngle) * rearOffset;
                } else if (game.formation === 'wedge') {
                    // Spearhead wedge: apex forward, wings back
                    const spacing = 28;
                    const depth = Math.abs(centeredIndex) * 26;
                    // Snipers sit in the protected rear pocket
                    const extraRear = u.role === 'sniper' ? 16 : 0;
                    offsetX = Math.cos(rightAngle) * (centeredIndex * spacing) - Math.cos(forwardAngle) * (depth + extraRear);
                    offsetY = Math.sin(rightAngle) * (centeredIndex * spacing) - Math.sin(forwardAngle) * (depth + extraRear);
                } else if (game.formation === 'loose') {
                    // Anti-blast staggered skirmish checkerboard
                    const cols = 3;
                    const row = Math.floor(i / cols);
                    const col = (i % cols) - 1.0;
                    const staggerX = (row % 2 === 1) ? 22 : 0;
                    const spacingX = 48;
                    const spacingY = 38;
                    const lateral = col * spacingX + staggerX;
                    const longitudinal = -row * spacingY;
                    offsetX = Math.cos(rightAngle) * lateral + Math.cos(forwardAngle) * longitudinal;
                    offsetY = Math.sin(rightAngle) * lateral + Math.sin(forwardAngle) * longitudinal;
                } else if (game.formation === 'arc') {
                    // Inward-curving enveloping crescent with converging crossfire
                    const arcSpan = Math.PI * 0.65;
                    const t = count === 1 ? 0 : (centeredIndex / count);
                    const a = forwardAngle + t * arcSpan;
                    const r = 85;
                    offsetX = Math.cos(a) * r - Math.cos(forwardAngle) * r;
                    offsetY = Math.sin(a) * r - Math.sin(forwardAngle) * r;

                    // Converging crossfire: units face inwards towards the kill zone!
                    const slotX = cx + offsetX;
                    const slotY = cy + offsetY;
                    const convergenceLeadX = cx + Math.cos(forwardAngle) * 45;
                    const convergenceLeadY = cy + Math.sin(forwardAngle) * 45;
                    unitFacing = Math.atan2(convergenceLeadY - slotY, convergenceLeadX - slotX);
                }

                u.targetX = Math.max(24, Math.min(game.width - 24, cx + offsetX));
                u.targetY = Math.max(24, Math.min(game.height - 24, cy + offsetY));
                u.preferredAngle = unitFacing;
            });
        }

        // Command allied tanks
        if (allyTanks.length > 0) {
            const hasExplicitTankSelection = allyTanks.some(t => t.selected);
            allyTanks.forEach((t, ti) => {
                if (t.selected || !hasExplicitTankSelection || count === 0) {
                    t.stance = overrideStance;
                    // In wedge formation, first tank takes the vanguard tip
                    let tankOffsetX = ti % 2 === 0 ? -48 : 48;
                    let tankOffsetY = count > 0 ? 24 : 0;
                    if (game.formation === 'wedge' && ti === 0) {
                        tankOffsetX = 0;
                        tankOffsetY = -24; // Front point of the wedge
                    }
                    t.targetX = Math.max(30, Math.min(game.width - 30, cx + tankOffsetX));
                    t.targetY = Math.max(30, Math.min(game.height - 30, cy + tankOffsetY));
                }
            });
        }

        this.spawnOrderMarker(game, cx, cy);
    }

    static spawnOrderMarker(game, x, y) {
        if (game.pools && game.pools.rings) {
            const r = game.pools.rings.obtain();
            r.x = x; r.y = y;
            r.r = 4; r.maxR = 26;
            r.alpha = 0.9;
            r.color = '#1d4ed8';
        } else {
            game.particles.push({
                type: 'ring',
                x, y,
                r: 4, maxR: 26,
                alpha: 0.9,
                color: '#1d4ed8'
            });
        }
    }

    static selectSquad(game, squadName) {
        game.units.forEach(u => {
            if (u.team === 'ally' && !u.dead) {
                u.selected = (squadName === 'all' || u.squad === squadName);
            }
        });
        if (game.tanks) {
            game.tanks.forEach(t => {
                if (t.team === 'ally' && !t.dead) {
                    t.selected = (squadName === 'all' || squadName === 'bravo');
                }
            });
        }
        document.querySelectorAll('.squad-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.squad === squadName);
        });
        game.updateHUD();
    }

    static setStance(game, stance) {
        const allies = game.getSelectedAllies();
        const allyTanks = game.tanks ? game.tanks.filter(t => t.team === 'ally' && !t.dead) : [];

        if (stance === 'hold') {
            allies.forEach(u => {
                u.stance = 'hold';
                u.targetX = u.x;
                u.targetY = u.y;
            });
            allyTanks.forEach(t => {
                if (t.selected || allies.length === 0) {
                    t.stance = 'hold';
                    t.targetX = t.x;
                    t.targetY = t.y;
                }
            });
            game.showToast('🛡️ أمر ثبات: القوات متمركزة في مواقعها بدقة تصويب عالية');
            if (window.sound) window.sound.playClick();
        } else if (stance === 'charge') {
            allies.forEach(u => {
                u.stance = 'charge';
            });
            allyTanks.forEach(t => {
                if (t.selected || allies.length === 0) {
                    t.stance = 'charge';
                }
            });
            game.showToast('⚔️ أمر اقتحام! القوات تتقدم بسرعة قصوى نحو العدو');
            if (window.sound) window.sound.playWhistle();
        } else if (stance === 'retreat') {
            const allEntities = [...allies, ...allyTanks];
            if (allEntities.length > 0) {
                const cx = allEntities.reduce((s, u) => s + u.x, 0) / allEntities.length;
                const cy = Math.min(game.height - 45, (allEntities.reduce((s, u) => s + u.y, 0) / allEntities.length) + 115);
                this.issueFormationMove(game, cx, cy, 'retreat');
                allies.forEach(u => u.preferredAngle = -Math.PI / 2);
                game.showToast('↩ تراجع تكتيكي مع استمرار التغطية النارية');
                if (window.sound) window.sound.playClick();
            }
        }
    }

    static toggleAbility(game, type) {
        if (game.abilities[type] <= 0) {
            game.showToast('نفدت ذخيرة هذه القدرة التكتيكية!');
            return;
        }
        if (game.activeAbility === type) {
            game.activeAbility = null;
            game.showToast('تم إلغاء التوجيه');
        } else {
            game.activeAbility = type;
            const label = type === 'frag' ? '💣 انقر على تجمع للعدو لإلقاء القنبلة اليدوية!' : '💨 انقر على الميدان لإطلاق سحابة دخان للتغطية!';
            game.showToast(label);
        }
        if (window.sound) window.sound.playClick();
        game.updateHUD();
    }

    static deployAbilityAt(game, type, targetX, targetY) {
        const allies = game.getSelectedAllies();
        if (allies.length === 0 || game.abilities[type] <= 0) return;

        let thrower = allies[0];
        let bestD = Infinity;
        allies.forEach(u => {
            const d = Math.hypot(u.x - targetX, u.y - targetY);
            if (d < bestD) { bestD = d; thrower = u; }
        });

        game.abilities[type]--;
        game.grenades.push({
            type,
            startX: thrower.x,
            startY: thrower.y,
            x: thrower.x,
            y: thrower.y,
            targetX,
            targetY,
            progress: 0,
            duration: Math.max(0.45, Math.min(0.95, bestD / 420))
        });
        if (window.sound) window.sound.playWhistle();
    }

    static triggerHeal(game) {
        if (game.abilities.heal <= 0) {
            game.showToast('نفدت حقائب الإسعاف الميداني!');
            return;
        }
        const allies = game.getSelectedAllies();
        let healedAny = false;
        allies.forEach(u => {
            if (u.hp < u.maxHp) {
                u.hp = Math.min(u.maxHp, u.hp + 45);
                healedAny = true;

                // Floating text
                if (game.pools && game.pools.floatingTexts) {
                    const t = game.pools.floatingTexts.obtain();
                    t.text = '+45 HP';
                    t.x = u.x; t.y = u.y - 15;
                    t.color = '#16a34a';
                    t.life = 0.9; t.maxLife = 0.9;
                }

                if (game.pools && game.pools.sparks) {
                    for (let i = 0; i < 5; i++) {
                        const sp = game.pools.sparks.obtain();
                        sp.x = u.x + (Math.random() - 0.5) * 18;
                        sp.y = u.y + (Math.random() - 0.5) * 18;
                        sp.vx = (Math.random() - 0.5) * 20;
                        sp.vy = -20 - Math.random() * 25;
                        sp.life = 0.6; sp.maxLife = 0.6;
                        sp.color = '#16a34a';
                    }
                }
            }
        });

        if (healedAny) {
            game.abilities.heal--;
            game.showToast('➕ تم إسعاف الجنود المحددين ورفع جاهزيتهم!');
            if (window.sound) window.sound.playClick();
            game.updateHUD();
        } else {
            game.showToast('جميع الجنود المحددين بصحة كاملة!');
        }
    }
}

window.TacticsSystem = TacticsSystem;
