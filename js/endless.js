/**
 * ============================================================================
 * ENDLESS TRENCH DEFENSE MODE (طور موجات الصمود اللانهائي)
 * Fortify the trenches and defend against relentless, escalating enemy waves!
 * Earn reinforcements and ability refills after surviving each assault wave.
 * ============================================================================
 */
class EndlessManager {
    constructor() {
        this.active = false;
        this.wave = 1;
        this.intermission = false;
        this.intermissionTime = 5.0;
        this.timer = 0;
        this.highestWave = 1;
    }

    start(game) {
        this.active = true;
        this.wave = 1;
        this.intermission = false;
        this.timer = 0;

        game.showToast('🛡️ بدأ طور الصمود اللانهائي: تمركز في الخنادق وصد الموجة 1!');
        this.spawnWave(game, 1);
        if (window.sound) window.sound.playWhistle();
    }

    stop(game) {
        this.active = false;
    }

    update(dt, game) {
        if (!this.active) return;

        if (this.intermission) {
            this.timer -= dt;
            const banner = document.getElementById('battleTimer');
            if (banner) {
                banner.textContent = `استراحة تكتيكية: الموجة التالية خلال ${Math.ceil(this.timer)}ث`;
            }

            if (this.timer <= 0) {
                this.intermission = false;
                this.wave++;
                this.spawnWave(game, this.wave);
            }
            return;
        }

        // Check if wave enemies are defeated
        const livingEnemies = game.units.filter(u => u.team === 'enemy' && !u.dead);
        if (livingEnemies.length === 0 && !game.battleEnded) {
            this.triggerIntermission(game);
        }
    }

    triggerIntermission(game) {
        this.intermission = true;
        this.timer = this.intermissionTime;

        // Reward player with ammo refill and reinforcement soldiers
        game.abilities.frag = Math.min(5, game.abilities.frag + 1);
        game.abilities.smoke = Math.min(4, game.abilities.smoke + 1);
        game.abilities.heal = Math.min(4, game.abilities.heal + 1);

        // Spawn 2 allied reinforcements
        const allyY = game.height * 0.88;
        const count = 2;
        for (let i = 0; i < count; i++) {
            const id = 500 + this.wave * 10 + i;
            const rx = game.width * 0.3 + (i * 80);
            const role = i === 0 ? 'assault' : 'rifle';
            const newSoldier = new Soldier(id, 'ally', rx, allyY, role, 'alpha');
            game.units.push(newSoldier);
        }

        if (game.campaign) {
            game.campaign.addPoints(45 + this.wave * 15);
        }

        game.showToast(`✨ سحقت الموجة ${this.wave}! وصلت تعزيزات وذخائر إضافية!`);
        if (window.sound) window.sound.playWhistle();
        game.updateHUD();
    }

    spawnWave(game, waveNum) {
        const title = document.getElementById('battleTitle');
        const timer = document.getElementById('battleTimer');
        if (title) title.textContent = `🛡️ طور الصمود - الموجة ${waveNum}`;
        if (timer) timer.textContent = `اشتباك دفاعي مستمر ضد حشود الحبر الأحمر`;

        // Scale enemy count and variety
        const enemyCount = Math.min(22, 6 + waveNum * 2);
        const enemyY = game.height * 0.10;
        const spacing = Math.min(36, (game.width * 0.75) / enemyCount);
        const startX = (game.width - (enemyCount - 1) * spacing) / 2;

        for (let i = 0; i < enemyCount; i++) {
            const ex = startX + i * spacing;
            const ey = enemyY + (i % 2 === 0 ? 0 : -20);
            let role = 'rifle';
            if (waveNum >= 2 && i % 3 === 0) role = 'assault';
            if (waveNum >= 3 && i === 1) role = 'sniper';

            const enemy = new Soldier(2000 + waveNum * 100 + i, 'enemy', ex, ey, role, 'alpha');
            // Higher waves have higher HP
            if (waveNum >= 4) {
                enemy.maxHp += (waveNum - 3) * 12;
                enemy.hp = enemy.maxHp;
            }
            game.units.push(enemy);
        }

        // Wave 4+ spawns an enemy tank!
        if (waveNum >= 4 && (!game.tanks || game.tanks.length === 0)) {
            if (window.SketchTank) {
                game.tanks = game.tanks || [];
                game.tanks.push(new SketchTank(999, 'enemy', game.width * 0.5, enemyY - 40));
                game.showToast('⚠️ تحذير: رصد تقدم دبابة معادية ثقيلة!');
            }
        }

        game.updateHUD();
    }
}

window.EndlessManager = EndlessManager;
