/**
 * ============================================================================
 * BATTALION GAME CORE ENGINE
 * Orchestrates all subsystems: ObjectPool, BattleCamera, Vehicles,
 * Tactical Map Editor, Campaign Progression, Endless Mode, Updates & Rendering
 * ============================================================================
 */
class BattalionGame {
    constructor() {
        this.canvas = document.getElementById('battleCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Subsystem Initializations
        this.pools = new GamePools();
        this.camera = new BattleCamera();
        this.editor = new MapEditor();
        this.campaign = new CampaignManager();
        this.endless = new EndlessManager();
        this.deployment = new DeploymentManager();
        this.phase = 'deployment'; // 'deployment' | 'combat'

        this.scenarioIndex = 0;
        this.units = [];
        this.bullets = [];
        this.particles = [];
        this.decals = [];
        this.obstacles = [];
        this.smokes = [];
        this.grenades = [];
        this.tanks = [];
        this.hmgNests = [];
        this.priorityTarget = null; // Focus Fire target (infantry, tank, or HMG)

        // Tactical Control State
        this.pointerMode = 'select'; // 'select' | 'command'
        this.formation = 'line';     // 'line' | 'wedge' | 'loose' | 'arc'
        this.activeAbility = null;   // null | 'frag' | 'smoke'

        // Ability charges (enhanced by campaign upgrades)
        this.abilities = this.campaign.getInitialAbilities();

        // Mouse / Touch Interaction State
        this.pointer = {
            x: 0, y: 0,
            startX: 0, startY: 0,
            isDown: false,
            button: 0,
            action: null,
            linePoints: [],
            isPanning: false,
            lastPanX: 0,
            lastPanY: 0
        };

        this.keys = {};
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.elapsedTime = 0;
        this.battleEnded = false;
        this.isPaused = false;
        this.gameSpeed = 1.0;
        this.nightMode = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        if (window.ResizeObserver && this.canvas && this.canvas.parentElement) {
            this.resizeObserver = new ResizeObserver(() => this.resize());
            this.resizeObserver.observe(this.canvas.parentElement);
        }
        this.bindInputEvents();
        this.bindUIEvents();
        if (window.MenuManager) {
            this.menu = new MenuManager();
            this.menu.init(this);
        }
        this.loadScenario(this.scenarioIndex);
    }

    togglePause() {
        if (this.phase === 'deployment' || this.battleEnded) return;
        this.isPaused = !this.isPaused;
        const banner = document.getElementById('tacticalPauseBanner');
        if (banner) banner.classList.toggle('hidden', !this.isPaused);
        const btn = document.getElementById('pauseBtn');
        if (btn) {
            btn.innerHTML = this.isPaused ? '<span>▶</span> <span>استئناف</span>' : '<span>⏸️</span> <span>إيقاف (Space)</span>';
            btn.classList.toggle('active-blue', this.isPaused);
        }
        this.showToast(this.isPaused ? '⏸️ إيقاف تكتيكي مؤقت: يمكنك دراسة الميدان وتغيير التشكيل وإصدار الأوامر' : '▶ تم استئناف المعركة');
        if (window.sound) window.sound.playClick();
    }

    setGameSpeed(speed) {
        this.gameSpeed = speed;
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active-blue', parseFloat(btn.dataset.speed) === speed);
        });
        this.showToast(`سرعة المعركة: ${speed}x`);
        if (window.sound) window.sound.playClick();
    }

    toggleNightMode(force) {
        if (this.menu) {
            this.menu.toggleNightMode(this);
            return;
        }
        this.nightMode = typeof force === 'boolean' ? force : !this.nightMode;
        document.body.classList.toggle('night-theme', this.nightMode);
        document.documentElement.classList.toggle('night-theme', this.nightMode);
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.innerHTML = this.nightMode ? '<span>☀️</span> <span>نهاري</span>' : '<span>🌙</span> <span>ليلي</span>';
            btn.classList.toggle('active-blue', this.nightMode);
        }
        this.showToast(this.nightMode ? '🌙 تم تفعيل طور العمليات الليلية - رؤية تكتيكية مريحة' : '☀️ تم تفعيل طور النهار');
        if (window.sound) window.sound.playClick();
    }

    triggerShake(amount = 8) {
        if (!this.camera) return;
        if (this.menu && this.menu.settings) {
            if (this.menu.settings.screenShake === 'off') return;
            if (this.menu.settings.screenShake === 'light') amount *= 0.5;
        }
        this.camera.triggerShake(amount);
    }

    resize() {
        if (!this.canvas || !this.canvas.parentElement) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const newW = Math.max(320, Math.floor(rect.width));
        const newH = Math.max(320, Math.floor(rect.height));
        if (this.width !== newW || this.height !== newH || this.canvas.width !== newW || this.canvas.height !== newH) {
            this.width = newW;
            this.height = newH;
            this.canvas.width = newW;
            this.canvas.height = newH;
            if (this.deployment && this.deployment.active) {
                this.deployment.updateZone(this);
            }
        }
    }

    loadScenario(index) {
        if (this.endless) this.endless.active = false;
        this.scenarioIndex = (index + SCENARIOS.length) % SCENARIOS.length;
        const scen = SCENARIOS[this.scenarioIndex];

        const titleEl = document.getElementById('battleTitle');
        const timerEl = document.getElementById('battleTimer');
        const modalEl = document.getElementById('endGameModal');

        if (titleEl) titleEl.textContent = scen.name;
        if (timerEl) timerEl.textContent = scen.subtitle;
        if (modalEl) modalEl.classList.add('hidden');

        this.pools.clearAll();
        if (this.camera) this.camera.reset();

        this.units = [];
        this.bullets = [];
        this.particles = [];
        this.decals = [];
        this.smokes = [];
        this.grenades = [];
        this.tanks = [];
        this.hmgNests = [];
        this.obstacles = scen.buildObstacles(this.width, this.height);

        this.abilities = this.campaign ? this.campaign.getInitialAbilities() : { frag: 3, smoke: 2, heal: 2 };
        this.activeAbility = null;
        this.priorityTarget = null;
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.elapsedTime = 0;
        this.battleEnded = false;

        // Spawn Enemy Battalion Entrenched
        const enemyStartY = this.height * 0.14;
        const enemyRoles = [
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
            { role: 'rifle',   squad: 'bravo' },
            { role: 'rifle',   squad: 'bravo' }
        ];

        const spacing = Math.min(38, (this.width * 0.65) / enemyRoles.length);
        const startX = (this.width - (enemyRoles.length - 1) * spacing) / 2;

        enemyRoles.forEach((cfg, i) => {
            const ex = startX + i * spacing;
            const ey = enemyStartY + (i % 2 === 0 ? 0 : -16);
            this.units.push(new Soldier(100 + i, 'enemy', ex, ey, cfg.role, cfg.squad));
        });

        // Spawn Heavy Vehicles & Emplacements
        if (window.SketchTank) {
            // Enemy light tank deployed on right flank
            this.tanks.push(new SketchTank(502, 'enemy', startX + (enemyRoles.length * spacing) + 15, enemyStartY - 25));
        }

        if (window.HMGNest) {
            // Stationary fortified machine gun nest defending center-right
            this.hmgNests.push(new HMGNest(601, 'enemy', this.width * 0.72, this.height * 0.38, Math.PI / 2));
        }

        // Initialize Pre-Battle Deployment Phase for Allied Forces
        if (this.deployment) {
            this.deployment.startDeployment(this);
        }

        this.updateHUD();
    }

    loadCustomBattle(customObstacles) {
        if (this.endless) this.endless.active = false;
        this.pools.clearAll();
        if (this.camera) this.camera.reset();

        this.units = [];
        this.bullets = [];
        this.particles = [];
        this.decals = [];
        this.smokes = [];
        this.grenades = [];
        this.tanks = [];
        this.hmgNests = [];
        this.priorityTarget = null;
        this.obstacles = JSON.parse(JSON.stringify(customObstacles));

        const titleEl = document.getElementById('battleTitle');
        const timerEl = document.getElementById('battleTimer');
        if (titleEl) titleEl.textContent = 'خريطة مخصصة (الميدان الحي)';
        if (timerEl) timerEl.textContent = 'معركة تكتيكية حرة من تصميم القائد';

        const enemyStartY = this.height * 0.14;
        const count = 10;
        const spacing = Math.min(40, (this.width * 0.7) / count);
        const startX = (this.width - (count - 1) * spacing) / 2;

        for (let i = 0; i < count; i++) {
            const role = i % 3 === 0 ? 'assault' : (i === 1 ? 'sniper' : 'rifle');
            this.units.push(new Soldier(200 + i, 'enemy', startX + i * spacing, enemyStartY, role, 'alpha'));
        }

        if (window.SketchTank) {
            this.tanks.push(new SketchTank(702, 'enemy', startX + count * spacing + 10, enemyStartY - 20));
        }

        if (this.deployment) {
            this.deployment.startDeployment(this);
        }

        this.updateHUD();
    }

    // --- Subsystem Delegations ---
    bindInputEvents() {
        InputSystem.bindInputEvents(this);
    }

    getSelectedAllies() {
        return InputSystem.getSelectedAllies(this);
    }

    getAllyAt(x, y) {
        return InputSystem.getAllyAt(this, x, y);
    }

    getEnemyAt(x, y) {
        return InputSystem.getEnemyAt(this, x, y);
    }

    setPriorityTarget(target) {
        if (!target || target.dead) return;
        this.priorityTarget = target;

        const allies = this.getSelectedAllies();
        const allyTanks = this.tanks ? this.tanks.filter(t => t.team === 'ally' && !t.dead) : [];
        const hasSelectedAllies = this.units.some(u => u.team === 'ally' && u.selected);

        // Direct all selected infantry towards target and advance if out of range
        allies.forEach(u => {
            const angleToTarget = Math.atan2(target.y - u.y, target.x - u.x);
            u.preferredAngle = angleToTarget;
            const dist = Math.hypot(target.x - u.x, target.y - u.y);
            if (dist > u.range * 0.92 && u.stance !== 'hold') {
                u.targetX = Math.max(20, Math.min(this.width - 20, target.x - Math.cos(angleToTarget) * (u.range * 0.72)));
                u.targetY = Math.max(20, Math.min(this.height - 20, target.y - Math.sin(angleToTarget) * (u.range * 0.72)));
            }
        });

        // Command allied tanks towards target
        allyTanks.forEach(t => {
            if (t.selected || !hasSelectedAllies) {
                t.turretAngle = Math.atan2(target.y - t.y, target.x - t.x);
                const dist = Math.hypot(target.x - t.x, target.y - t.y);
                if (dist > t.range * 0.85 && t.stance !== 'hold') {
                    t.targetX = Math.max(30, Math.min(this.width - 30, target.x - Math.cos(t.turretAngle) * (t.range * 0.65)));
                    t.targetY = Math.max(30, Math.min(this.height - 30, target.y - Math.sin(t.turretAngle) * (t.range * 0.65)));
                }
            }
        });

        // Spawn target acquisition shockwave
        if (this.pools && this.pools.rings) {
            const r = this.pools.rings.obtain();
            r.x = target.x; r.y = target.y;
            r.r = 6; r.maxR = 36;
            r.alpha = 1.0; r.color = '#ef4444';
        }

        if (window.sound) window.sound.playClick();
        const targetLabel = target.type === 'tank' ? 'دبابة حبر معادية' : (target.type === 'hmg' ? 'عش رشاش ثقيل' : (target.role === 'sniper' ? 'قناص معادٍ' : (target.role === 'assault' ? 'مهاجم معادٍ' : 'جندي مشاة معادٍ')));
        this.showToast(`🎯 تم توجيه كافة نيران الكتيبة نحو: ${targetLabel}!`);
    }

    clearPriorityTarget() {
        this.priorityTarget = null;
    }

    computeLineSlots(x1, y1, x2, y2, count) {
        return TacticsSystem.computeLineSlots(this, x1, y1, x2, y2, count);
    }

    issueCustomLineFormation(x1, y1, x2, y2) {
        TacticsSystem.issueCustomLineFormation(this, x1, y1, x2, y2);
    }

    issueFormationMove(cx, cy, overrideStance = 'advance') {
        TacticsSystem.issueFormationMove(this, cx, cy, overrideStance);
    }

    spawnOrderMarker(x, y) {
        TacticsSystem.spawnOrderMarker(this, x, y);
    }

    selectSquad(squadName) {
        TacticsSystem.selectSquad(this, squadName);
    }

    setStance(stance) {
        TacticsSystem.setStance(this, stance);
    }

    toggleAbility(type) {
        TacticsSystem.toggleAbility(this, type);
    }

    deployAbilityAt(type, targetX, targetY) {
        TacticsSystem.deployAbilityAt(this, type, targetX, targetY);
    }

    triggerHeal() {
        TacticsSystem.triggerHeal(this);
    }

    bindUIEvents() {
        UIManager.bindUIEvents(this);
    }

    showToast(msg) {
        UIManager.showToast(msg);
    }

    updateHUD() {
        UIManager.updateHUD(this);
    }

    checkBattleOutcome() {
        UIManager.checkBattleOutcome(this);
    }

    evaluateUnitCover(unit) {
        return CombatSystem.evaluateUnitCover(this, unit);
    }

    findTacticalCoverSpot(unit, enemy) {
        return CombatSystem.findTacticalCoverSpot(this, unit, enemy);
    }

    resolveObstacleCollisions(unit) {
        CombatSystem.resolveObstacleCollisions(this, unit);
    }

    isLineBlockedByWall(x1, y1, x2, y2) {
        return CombatSystem.isLineBlockedByWall(this, x1, y1, x2, y2);
    }

    isLineThroughSmoke(x1, y1, x2, y2) {
        return CombatSystem.isLineThroughSmoke(this, x1, y1, x2, y2);
    }

    findBestTarget(unit) {
        return CombatSystem.findBestTarget(this, unit);
    }

    spawnBullet(shooter, x, y, angle) {
        CombatSystem.spawnBullet(this, shooter, x, y, angle);
    }

    spawnImpactSparks(x, y, color, count = 5) {
        CombatSystem.spawnImpactSparks(this, x, y, color, count);
    }

    render(time) {
        BattleRenderer.render(this, time);
    }

    drawObstacle(ctx, obs) {
        BattleRenderer.drawObstacle(ctx, obs);
    }

    renderControlOverlays(ctx) {
        BattleRenderer.renderControlOverlays(ctx, this);
    }

    // --- Master Simulation Loop ---
    update(dt) {
        if (this.battleEnded) return;

        // Camera Shake & Zoom update (keeps running even during pause for responsive controls)
        if (this.camera) this.camera.update(dt);

        if (this.isPaused) return;

        const effectiveDt = dt * this.gameSpeed;
        this.elapsedTime += effectiveDt;

        // Endless Wave Manager update
        if (this.endless && this.endless.active) {
            this.endless.update(effectiveDt, this);
        }

        // Direct WASD / Arrow Movement
        InputSystem.handleDirectWASD(this);

        // Clear priority target if eliminated
        if (this.priorityTarget && this.priorityTarget.dead) {
            this.clearPriorityTarget();
        }

        // Update Vehicles & Stationary Weapons
        if (this.tanks) {
            for (const t of this.tanks) t.update(effectiveDt, this);
        }
        if (this.hmgNests) {
            for (const h of this.hmgNests) h.update(effectiveDt, this);
        }

        // Update Infantry Soldiers
        for (const u of this.units) {
            u.update(effectiveDt, this);
        }

        // Update Bullets via ObjectPool & CombatSystem
        CombatSystem.updateBullets(this, effectiveDt);

        // Update Thrown Grenades & Explosions
        for (let i = this.grenades.length - 1; i >= 0; i--) {
            const g = this.grenades[i];
            g.progress += effectiveDt / g.duration;
            g.x = g.startX + (g.targetX - g.startX) * g.progress;
            g.y = g.startY + (g.targetY - g.startY) * g.progress;

            if (g.progress >= 1) {
                if (g.type === 'frag') {
                    if (window.sound) window.sound.playExplosion(1.2);
                    this.triggerShake(11);

                    this.decals.push({ type: 'crater', x: g.targetX, y: g.targetY, r: 28 });

                    // Pooled Ring Shockwave
                    if (this.pools && this.pools.rings) {
                        const r = this.pools.rings.obtain();
                        r.x = g.targetX; r.y = g.targetY;
                        r.r = 6; r.maxR = 92; r.alpha = 1.0; r.color = '#dc2626';
                    }

                    this.spawnImpactSparks(g.targetX, g.targetY, '#1e242b', 18);

                    // Blast Damage & Explosion Suppression
                    for (const u of this.units) {
                        if (u.dead) continue;
                        const d = Math.hypot(u.x - g.targetX, u.y - g.targetY);
                        if (d <= 95) {
                            const dmg = (1 - d / 95) * 98 * (1 - u.inCover * 0.5);
                            u.hp -= dmg;
                            u.hitFlash = 1.0;
                            if (u.hp <= 0) {
                                u.dead = true;
                                this.decals.push({ type: 'fallen', x: u.x, y: u.y, angle: u.angle, team: u.team });
                            }
                        }
                        if (window.SuppressionSystem) {
                            window.SuppressionSystem.checkExplosionProximity(g.targetX, g.targetY, u, 130, this);
                        }
                    }

                    // Damage tanks in blast radius
                    if (this.tanks) {
                        for (const t of this.tanks) {
                            if (t.dead) continue;
                            const td = Math.hypot(t.x - g.targetX, t.y - g.targetY);
                            if (td <= 85) {
                                t.hp -= (1 - td / 85) * 75;
                                t.hitFlash = 1.0;
                            }
                        }
                    }

                    this.updateHUD();
                    this.checkBattleOutcome();
                } else if (g.type === 'smoke') {
                    this.smokes.push({
                        x: g.targetX,
                        y: g.targetY,
                        r: 82,
                        life: 12.0,
                        maxLife: 12.0
                    });
                }
                this.grenades.splice(i, 1);
            }
        }

        // Update Smoke Clouds
        for (let i = this.smokes.length - 1; i >= 0; i--) {
            this.smokes[i].life -= dt;
            if (this.smokes[i].life <= 0) this.smokes.splice(i, 1);
        }

        // Update Pooled Entities
        if (this.pools) {
            // Update pooled sparks
            this.pools.sparks.forEachActive((p) => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                if (p.life <= 0) this.pools.sparks.recycle(p);
            });

            // Update pooled rings
            this.pools.rings.forEachActive((r) => {
                r.r += (r.maxR - r.r) * dt * 8;
                r.alpha -= dt * 2.2;
                if (r.alpha <= 0) this.pools.rings.recycle(r);
            });

            // Update pooled floating texts
            this.pools.floatingTexts.forEachActive((t) => {
                t.y += t.vy * dt;
                t.life -= dt;
                if (t.life <= 0) this.pools.floatingTexts.recycle(t);
            });
        }
    }
}

window.BattalionGame = BattalionGame;
