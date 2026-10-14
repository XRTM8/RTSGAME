/**
 * ============================================================================
 * CAMPAIGN PROGRESSION & BATTALION UPGRADES (طور الحملة والترقيات)
 * Earn Ink Points from victories, unlock war sectors, and upgrade your
 * battalion's weapons, armor, medics, and ordnance stockpiles!
 * ============================================================================
 */
class CampaignManager {
    constructor() {
        this.inkPoints = 120; // Starting ink points
        this.currentSector = 1;
        this.totalVictories = 0;

        this.upgrades = {
            reinforcedHelmets: { name: 'خوذ فولاذية معززة', level: 0, max: 3, cost: 75, desc: 'زيادة صحة جميع الجنود بنسبة +15% لكل مستوى' },
            marksmanRifles: { name: 'بنادق معدلة الدقة', level: 0, max: 3, cost: 85, desc: 'رفع قوة الضرر ودقة التصويب بنسبة +12%' },
            fieldMedicKit: { name: 'حقائب إسعاف إضافية', level: 0, max: 2, cost: 95, desc: 'إضافة شحنة إسعاف إضافية ورفع كفاءة التضميد' },
            ordnanceSupply: { name: 'مخزون قنابل يدوي', level: 0, max: 2, cost: 110, desc: 'إضافة قنبلة يدوية إضافية وتوسيع نطاق الانفجار' },
            smokeGenerators: { name: 'قنابل دخان كثيفة', level: 0, max: 2, cost: 70, desc: 'إضافة شحنة ستار دخاني إضافية لكل معركة' }
        };

        this.load();
    }

    addPoints(amount) {
        this.inkPoints += amount;
        this.save();
        this.updateUI();
    }

    purchase(key, game) {
        const up = this.upgrades[key];
        if (!up) return;

        if (up.level >= up.max) {
            game.showToast('تمت ترقية هذه الميزة للحد الأقصى!');
            return;
        }

        if (this.inkPoints < up.cost) {
            game.showToast('نقاط الحبر غير كافية لهذه الترقية!');
            return;
        }

        this.inkPoints -= up.cost;
        up.level++;
        up.cost = Math.floor(up.cost * 1.45);
        this.save();
        this.updateUI();

        if (game) {
            game.showToast(`🎖️ تم شراء: ${up.name} (المستوى ${up.level})!`);
            // Apply immediately to current living allies
            this.applyToBattalion(game);
        }
        if (window.sound) window.sound.playClick();
    }

    applyToBattalion(game) {
        const hpBonus = 1.0 + (this.upgrades.reinforcedHelmets.level * 0.15);
        const dmgBonus = 1.0 + (this.upgrades.marksmanRifles.level * 0.12);

        for (const u of game.units) {
            if (u.team === 'ally') {
                u.maxHp = Math.round(u.maxHp * hpBonus);
                u.hp = Math.min(u.maxHp, Math.round(u.hp * hpBonus));
                u.damage = Math.round(u.damage * dmgBonus);
            }
        }
    }

    getInitialAbilities() {
        return {
            frag: 3 + this.upgrades.ordnanceSupply.level,
            smoke: 2 + this.upgrades.smokeGenerators.level,
            heal: 2 + this.upgrades.fieldMedicKit.level
        };
    }

    onBattleVictory(game) {
        this.totalVictories++;
        const reward = 85 + Math.round(game.shotsHit * 1.5);
        this.addPoints(reward);
        this.save();
        game.showToast(`🎖️ انتصار عظيم! كسبت +${reward} نقطة حبر لترقية كتيبتك!`);
    }

    toggleModal() {
        const modal = document.getElementById('campaignModal');
        if (modal) {
            modal.classList.toggle('hidden');
            this.updateUI();
        }
        if (window.sound) window.sound.playClick();
    }

    updateUI() {
        const pointsEl = document.getElementById('campaignInkPointsText');
        if (pointsEl) pointsEl.textContent = this.inkPoints;

        for (const [k, up] of Object.entries(this.upgrades)) {
            const lvlEl = document.getElementById(`upLvl_${k}`);
            const costEl = document.getElementById(`upCost_${k}`);
            if (lvlEl) lvlEl.textContent = `${up.level} / ${up.max}`;
            if (costEl) costEl.textContent = up.level >= up.max ? 'مكتمل' : `${up.cost} حبر`;
        }
    }

    save() {
        try {
            localStorage.setItem('inkBattalion_campaign', JSON.stringify({
                inkPoints: this.inkPoints,
                currentSector: this.currentSector,
                totalVictories: this.totalVictories,
                upgrades: this.upgrades
            }));
        } catch (e) {}
    }

    load() {
        try {
            const data = localStorage.getItem('inkBattalion_campaign');
            if (data) {
                const parsed = JSON.parse(data);
                this.inkPoints = parsed.inkPoints || 120;
                this.currentSector = parsed.currentSector || 1;
                this.totalVictories = parsed.totalVictories || 0;
                if (parsed.upgrades) {
                    for (const [k, v] of Object.entries(parsed.upgrades)) {
                        if (this.upgrades[k]) {
                            this.upgrades[k].level = v.level || 0;
                            this.upgrades[k].cost = v.cost || this.upgrades[k].cost;
                        }
                    }
                }
            }
        } catch (e) {}
    }
}

window.CampaignManager = CampaignManager;
