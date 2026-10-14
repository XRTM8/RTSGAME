/**
 * ============================================================================
 * PRE-BATTLE DEPLOYMENT SYSTEM (مرحلة التجهيز والانتشار التكتيكي)
 * Allows players to inspect the enemy battalion, select unit cards in HUD style,
 * and deploy infantry and tanks inside the tactical Deployment Zone before battle!
 * Includes Battalion Capacity Limits to ensure game balance.
 * ============================================================================
 */
class DeploymentManager {
    constructor() {
        this.active = true;
        this.selectedRole = 'rifle'; // 'rifle' | 'assault' | 'sniper' | 'tank'
        this.maxSlots = 12; // Maximum soldiers/units limit to prevent performance/loop breaking

        this.zone = {
            x: 20,
            y: 0,
            w: 0,
            h: 0
        };

        // Available pool / limits per role
        this.limits = {
            rifle: 8,
            assault: 6,
            sniper: 3,
            tank: 1
        };
    }

    updateZone(game) {
        this.zone.x = 24;
        this.zone.w = game.width - 48;
        this.zone.h = Math.min(220, Math.floor(game.height * 0.30));
        this.zone.y = game.height - this.zone.h - 18; // Cleanly positioned at bottom of canvas above footer
    }

    startDeployment(game) {
        this.active = true;
        game.phase = 'deployment';

        // Clear player units for deployment phase
        game.units = game.units.filter(u => u.team === 'enemy');
        if (game.tanks) {
            game.tanks = game.tanks.filter(t => t.team === 'enemy');
        }

        // Show Deployment Dock and Hide Combat Controls
        const dock = document.getElementById('deploymentDock');
        const combatBar = document.getElementById('combatControlBar');
        if (dock) dock.classList.remove('hidden');
        if (combatBar) combatBar.classList.add('hidden');

        game.resize();
        this.updateZone(game);
        this.updateCardCounts(game);
        game.showToast('🎯 مرحلة الانتشار: اختر نوع الجندي وانقر داخل المنطقة المحددة بالأسفل لتشكيل كتيبتك!');
        if (window.sound) window.sound.playClick();
    }

    isInZone(x, y) {
        return (
            x >= this.zone.x &&
            x <= this.zone.x + this.zone.w &&
            y >= this.zone.y &&
            y <= this.zone.y + this.zone.h
        );
    }

    getCurrentUnitCount(game) {
        const allySoldiers = game.units.filter(u => u.team === 'ally').length;
        const allyTanks = game.tanks ? game.tanks.filter(t => t.team === 'ally').length : 0;
        return allySoldiers + allyTanks;
    }

    getRoleCount(game, role) {
        if (role === 'tank') {
            return game.tanks ? game.tanks.filter(t => t.team === 'ally').length : 0;
        }
        return game.units.filter(u => u.team === 'ally' && u.role === role).length;
    }

    canDeploy(game, role) {
        if (this.getCurrentUnitCount(game) >= this.maxSlots) {
            game.showToast('⚠️ تم الوصول للحد الأقصى لحجم الكتيبة (12 وحدة)!');
            return false;
        }
        if (this.getRoleCount(game, role) >= this.limits[role]) {
            game.showToast(`⚠️ استنفذت الحد المسموح لهذه الفئة (${this.limits[role]})!`);
            return false;
        }
        return true;
    }

    selectRole(role) {
        this.selectedRole = role;
        document.querySelectorAll('.deploy-card-btn').forEach(btn => {
            btn.classList.toggle('active-blue', btn.dataset.role === role);
        });
        if (window.sound) window.sound.playClick();
    }

    deploySingle(game, x, y) {
        if (!this.isInZone(x, y)) {
            game.showToast('⚠️ يجب النشر داخل منطقة التمركز المحددة بالإطار الأزرق بالأسفل!');
            return false;
        }

        if (!this.canDeploy(game, this.selectedRole)) {
            return false;
        }

        const currentCount = this.getCurrentUnitCount(game);
        const newId = currentCount + 1;
        const squad = currentCount % 2 === 0 ? 'alpha' : 'bravo';

        if (this.selectedRole === 'tank') {
            if (window.SketchTank) {
                game.tanks = game.tanks || [];
                game.tanks.push(new SketchTank(800 + newId, 'ally', x, y));
            }
        } else {
            const soldier = new Soldier(newId, 'ally', x, y, this.selectedRole, squad);
            soldier.preferredAngle = -Math.PI / 2; // Facing north toward enemy
            soldier.angle = -Math.PI / 2;
            game.units.push(soldier);
        }

        this.updateCardCounts(game);
        if (window.sound) window.sound.playClick();
        return true;
    }

    deployLine(game, x1, y1, x2, y2) {
        if (!this.isInZone(x1, y1) || !this.isInZone(x2, y2)) {
            // Fallback to single deploy at x1,y1
            return this.deploySingle(game, x1, y1);
        }

        if (this.selectedRole === 'tank') {
            return this.deploySingle(game, (x1 + x2) / 2, (y1 + y2) / 2);
        }

        const dist = Math.hypot(x2 - x1, y2 - y1);
        const desiredCount = Math.max(2, Math.min(5, Math.floor(dist / 32)));
        const availableSlots = this.maxSlots - this.getCurrentUnitCount(game);
        const roleAvailable = this.limits[this.selectedRole] - this.getRoleCount(game, this.selectedRole);
        const spawnCount = Math.min(desiredCount, Math.min(availableSlots, roleAvailable));

        if (spawnCount <= 0) {
            game.showToast('⚠️ لا يمكن نشر مزيد من الجنود (تم بلوغ الحد الأقصى)!');
            return false;
        }

        const dx = x2 - x1;
        const dy = y2 - y1;

        for (let i = 0; i < spawnCount; i++) {
            const t = spawnCount === 1 ? 0.5 : i / (spawnCount - 1);
            const sx = x1 + dx * t;
            const sy = y1 + dy * t;
            const currentCount = this.getCurrentUnitCount(game);
            const soldier = new Soldier(currentCount + 1, 'ally', sx, sy, this.selectedRole, i % 2 === 0 ? 'alpha' : 'bravo');
            soldier.preferredAngle = -Math.PI / 2;
            soldier.angle = -Math.PI / 2;
            game.units.push(soldier);
        }

        this.updateCardCounts(game);
        if (window.sound) window.sound.playClick();
        return true;
    }

    removeAt(game, x, y) {
        // Right click removes and refunds a placed allied soldier or tank
        const allyIdx = game.units.findIndex(u => u.team === 'ally' && Math.hypot(u.x - x, u.y - y) <= u.radius + 8);
        if (allyIdx !== -1) {
            game.units.splice(allyIdx, 1);
            this.updateCardCounts(game);
            if (window.sound) window.sound.playClick();
            game.showToast('تم إلغاء نشر الجندي واستعادة موقعه');
            return true;
        }

        if (game.tanks) {
            const tankIdx = game.tanks.findIndex(t => t.team === 'ally' && Math.hypot(t.x - x, t.y - y) <= t.radius + 10);
            if (tankIdx !== -1) {
                game.tanks.splice(tankIdx, 1);
                this.updateCardCounts(game);
                if (window.sound) window.sound.playClick();
                game.showToast('تم إلغاء نشر المدرعة واستعادة موقعها');
                return true;
            }
        }
        return false;
    }

    autoDeployBalanced(game) {
        // Quick auto-deploy preset: 6 Riflemen, 4 Assault, 2 Snipers, 1 Tank
        game.units = game.units.filter(u => u.team === 'enemy');
        if (game.tanks) game.tanks = game.tanks.filter(t => t.team === 'enemy');

        const preset = [
            { role: 'assault', squad: 'alpha' },
            { role: 'assault', squad: 'alpha' },
            { role: 'rifle',   squad: 'alpha' },
            { role: 'rifle',   squad: 'alpha' },
            { role: 'assault', squad: 'alpha' },
            { role: 'assault', squad: 'alpha' },
            { role: 'rifle',   squad: 'bravo' },
            { role: 'rifle',   squad: 'bravo' },
            { role: 'sniper',  squad: 'bravo' },
            { role: 'sniper',  squad: 'bravo' },
            { role: 'rifle',   squad: 'bravo' }
        ];

        const spacing = Math.min(38, (this.zone.w * 0.75) / preset.length);
        const startX = this.zone.x + (this.zone.w - (preset.length - 1) * spacing) / 2;
        const startY = this.zone.y + this.zone.h * 0.55;

        preset.forEach((cfg, i) => {
            const sx = startX + i * spacing;
            const sy = startY + (i % 2 === 0 ? -12 : 12);
            const s = new Soldier(i + 1, 'ally', sx, sy, cfg.role, cfg.squad);
            s.preferredAngle = -Math.PI / 2;
            s.angle = -Math.PI / 2;
            game.units.push(s);
        });

        // 1 Tank on the flank (Total = 11 soldiers + 1 tank = 12 max units)
        if (window.SketchTank) {
            game.tanks = game.tanks || [];
            game.tanks.push(new SketchTank(901, 'ally', startX - 45, startY));
        }

        this.updateCardCounts(game);
        game.showToast('⚡ تم الانتشار التلقائي المتوازن للكتيبة!');
        if (window.sound) window.sound.playClick();
    }

    commenceBattle(game) {
        const allyCount = this.getCurrentUnitCount(game);
        if (allyCount === 0) {
            game.showToast('⚠️ لا يمكن بدء المعركة دون نشر أي جنود! انشر جندياً واحداً على الأقل أو اختر انتشار تلقائي.');
            return;
        }

        this.active = false;
        game.phase = 'combat';

        // Hide Deployment Dock, Show Combat Bar
        const dock = document.getElementById('deploymentDock');
        const combatBar = document.getElementById('combatControlBar');
        if (dock) dock.classList.add('hidden');
        if (combatBar) combatBar.classList.remove('hidden');

        game.resize();
        game.updateHUD();
        game.showToast('⚔️ بدأت المعركة! أصدر الأوامر، ارسم خطوط النار، واقضِ على العدو!');
        if (window.sound) window.sound.playWhistle();
    }

    bindUI(game) {
        const tooltip = document.getElementById('deployCardTooltip');
        const roleInfo = {
            rifle: {
                title: '🔹 جندي المشاة الأساسي (Rifleman)',
                range: 320, damage: 20, speed: 90,
                desc: 'عماد الكتيبة التكتيكي. متوازن المدى والضرر، فعال جداً خلف السواتر الرملية وحفر الخنادق.'
            },
            assault: {
                title: '🔸 جندي الاقتحام الرشاش (Assault)',
                range: 240, damage: 13, speed: 104,
                desc: 'سرعة تحرك فائقة ومعدل إطلاق نار كثيف. مثالي للالتفاف السريع واقتحام تحصينات العدو.'
            },
            sniper: {
                title: '🟢 قناص النيران الدقيقة (Sniper)',
                range: 430, damage: 38, speed: 76,
                desc: 'مدى قاتل بعيد المدى ونيران قناصة نافذة تطيح بالضباط وعناصر الرشاش من مسافة آمنة.'
            },
            tank: {
                title: '🛡️ مدرعة حبر خفيفة (Sketch Tank)',
                range: 380, damage: 75, speed: 68,
                desc: 'درع فولاذي متين ومدفع متفجر يسحق أكياس الرمل ويدمر التحصينات ويوفر غطاءً متحركاً للمشاة.'
            }
        };

        // Unit Card selection & Hover Tooltips
        document.querySelectorAll('.deploy-card-btn').forEach(btn => {
            const role = btn.dataset.role;

            btn.addEventListener('click', () => {
                this.selectRole(role);
            });

            btn.addEventListener('mouseenter', () => {
                const info = roleInfo[role];
                if (tooltip && info) {
                    const titleEl = document.getElementById('tooltipTitle');
                    const rEl = document.getElementById('statRange');
                    const dEl = document.getElementById('statDamage');
                    const sEl = document.getElementById('statSpeed');
                    const descEl = document.getElementById('tooltipDesc');

                    if (titleEl) titleEl.textContent = info.title;
                    if (rEl) rEl.textContent = info.range;
                    if (dEl) dEl.textContent = info.damage;
                    if (sEl) sEl.textContent = info.speed;
                    if (descEl) descEl.textContent = info.desc;

                    tooltip.classList.remove('hidden');
                }
            });

            btn.addEventListener('mouseleave', () => {
                if (tooltip) tooltip.classList.add('hidden');
            });
        });

        // Auto Deploy button
        const autoDeployBtn = document.getElementById('autoDeployBtn');
        if (autoDeployBtn) {
            autoDeployBtn.addEventListener('click', () => {
                this.autoDeployBalanced(game);
            });
        }

        // Clear Deploy button
        const clearDeployBtn = document.getElementById('clearDeployBtn');
        if (clearDeployBtn) {
            clearDeployBtn.addEventListener('click', () => {
                game.units = game.units.filter(u => u.team === 'enemy');
                if (game.tanks) game.tanks = game.tanks.filter(t => t.team === 'enemy');
                this.updateCardCounts(game);
                if (window.sound) window.sound.playClick();
                game.showToast('تم مسح تشكيل الكتيبة؛ انقر أو اسحب لإعادة النشر');
            });
        }

        // Engage Battle button
        const engageBtn = document.getElementById('engageBattleBtn');
        if (engageBtn) {
            engageBtn.addEventListener('click', () => {
                this.commenceBattle(game);
            });
        }
    }

    updateCardCounts(game) {
        const total = this.getCurrentUnitCount(game);
        const totalEl = document.getElementById('deployTotalCountBadge');
        if (totalEl) totalEl.textContent = `${total} / ${this.maxSlots}`;

        for (const [role, limit] of Object.entries(this.limits)) {
            const count = this.getRoleCount(game, role);
            const countEl = document.getElementById(`deployCount_${role}`);
            if (countEl) countEl.textContent = `${count} / ${limit}`;
        }

        // Update top HUD ally counter
        const allyCountEl = document.getElementById('allyCountText');
        if (allyCountEl) allyCountEl.textContent = `${total} / 12`;
    }

    renderZone(ctx, game) {
        if (!this.active) return;

        ctx.save();

        // 1. Hand-drawn Blueprint Shaded Deployment Zone
        ctx.fillStyle = 'rgba(29, 78, 216, 0.05)';
        ctx.fillRect(this.zone.x, this.zone.y, this.zone.w, this.zone.h);

        // Sketched Dashed Border
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(this.zone.x, this.zone.y, this.zone.w, this.zone.h);

        // Zone Watermark Banner Text
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(29, 78, 216, 0.45)';
        ctx.font = 'bold 13px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⬚ منطقة انتشار الكتيبة التكتيكية (DEPLOYMENT ZONE) • انقر أو اسحب لنشر الجنود', this.zone.x + this.zone.w / 2, this.zone.y + 22);

        // 2. Ghost preview during dragging or mouse cursor
        const p = game.pointer;
        if (p.isDown && p.action === 'deploy') {
            const dragDist = Math.hypot(p.x - p.startX, p.y - p.startY);
            if (dragDist >= 16 && this.selectedRole !== 'tank') {
                // Draw formation deployment line
                ctx.save();
                ctx.strokeStyle = '#1d4ed8';
                ctx.lineWidth = 2.2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(p.startX, p.startY);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();

                // Draw slots along line
                const desiredCount = Math.max(2, Math.min(5, Math.floor(dragDist / 32)));
                const availableSlots = this.maxSlots - this.getCurrentUnitCount(game);
                const roleAvailable = this.limits[this.selectedRole] - this.getRoleCount(game, this.selectedRole);
                const spawnCount = Math.min(desiredCount, Math.min(availableSlots, roleAvailable));

                ctx.setLineDash([]);
                for (let i = 0; i < spawnCount; i++) {
                    const t = spawnCount === 1 ? 0.5 : i / (spawnCount - 1);
                    const sx = p.startX + (p.x - p.startX) * t;
                    const sy = p.startY + (p.y - p.startY) * t;
                    ctx.fillStyle = 'rgba(29, 78, 216, 0.35)';
                    ctx.beginPath();
                    ctx.arc(sx, sy, 11, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
            }
        } else if (this.isInZone(p.x, p.y)) {
            // Draw subtle firing range circle preview around cursor!
            const roleRanges = { rifle: 320, assault: 240, sniper: 430, tank: 380 };
            const r = roleRanges[this.selectedRole] || 320;
            ctx.save();
            ctx.strokeStyle = 'rgba(29, 78, 216, 0.22)';
            ctx.fillStyle = 'rgba(29, 78, 216, 0.03)';
            ctx.lineWidth = 1.4;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = 'rgba(29, 78, 216, 0.35)';
            ctx.strokeStyle = '#1d4ed8';
            ctx.lineWidth = 2;

            if (this.selectedRole === 'tank') {
                ctx.strokeRect(-20, -14, 40, 28);
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.stroke();
                // Turret facing north
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(0, -22);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Direction facing arrow
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(0, -20);
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.restore();
    }
}

window.DeploymentManager = DeploymentManager;
