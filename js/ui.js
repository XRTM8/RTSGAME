/**
 * ============================================================================
 * UI & HUD MANAGEMENT SYSTEM
 * Controls buttons, HUD metrics, toasts, sound/music toggles, Map Editor dock,
 * Campaign Headquarters upgrade shop modal, and Endless Mode UI
 * ============================================================================
 */
class UIManager {
    static bindUIEvents(game) {
        // Pointer Mode Switcher
        const modeSelectBtn = document.getElementById('modeSelectBtn');
        const modeCommandBtn = document.getElementById('modeCommandBtn');

        if (modeSelectBtn) {
            modeSelectBtn.addEventListener('click', () => {
                game.pointerMode = 'select';
                modeSelectBtn.classList.add('active-blue');
                if (modeCommandBtn) modeCommandBtn.classList.remove('active-blue');
                this.showToast('وضع التحديد: اسحب بالزر الأيسر لتحديد الجنود، أو اسحب بالزر الأيمن لرسم خط انتشار');
                if (window.sound) window.sound.playClick();
            });
        }

        if (modeCommandBtn) {
            modeCommandBtn.addEventListener('click', () => {
                game.pointerMode = 'command';
                modeCommandBtn.classList.add('active-blue');
                if (modeSelectBtn) modeSelectBtn.classList.remove('active-blue');
                this.showToast('وضع رسم الخط التكتيكي: اسحب مباشرة على الخريطة لرسم خط توزع الجنود واتجاههم!');
                if (window.sound) window.sound.playClick();
            });
        }

        // Squad Selection Buttons
        document.querySelectorAll('.squad-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                game.selectSquad(btn.dataset.squad);
                if (window.sound) window.sound.playClick();
            });
        });

        // Formation Buttons
        document.querySelectorAll('.formation-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                game.formation = btn.dataset.formation;
                document.querySelectorAll('.formation-btn').forEach(b => b.classList.remove('active-blue'));
                btn.classList.add('active-blue');

                const allies = game.getSelectedAllies();
                if (allies.length > 0) {
                    const cx = allies.reduce((s, u) => s + u.targetX, 0) / allies.length;
                    const cy = allies.reduce((s, u) => s + u.targetY, 0) / allies.length;
                    game.issueFormationMove(cx, cy);
                }
                if (window.sound) window.sound.playClick();
            });
        });

        // Stances
        const holdBtn = document.getElementById('stanceHoldBtn');
        const chargeBtn = document.getElementById('stanceChargeBtn');
        const retreatBtn = document.getElementById('stanceRetreatBtn');
        if (holdBtn) holdBtn.addEventListener('click', () => game.setStance('hold'));
        if (chargeBtn) chargeBtn.addEventListener('click', () => game.setStance('charge'));
        if (retreatBtn) retreatBtn.addEventListener('click', () => game.setStance('retreat'));

        // Abilities
        const fragBtn = document.getElementById('abilityFragBtn');
        const smokeBtn = document.getElementById('abilitySmokeBtn');
        const healBtn = document.getElementById('abilityHealBtn');
        if (fragBtn) fragBtn.addEventListener('click', () => game.toggleAbility('frag'));
        if (smokeBtn) smokeBtn.addEventListener('click', () => game.toggleAbility('smoke'));
        if (healBtn) healBtn.addEventListener('click', () => game.triggerHeal());

        // Header Navigation & Modes
        const restartBtn = document.getElementById('restartBtn');
        const prevMapBtn = document.getElementById('prevMapBtn');
        const nextMapBtn = document.getElementById('nextMapBtn');
        if (restartBtn) restartBtn.addEventListener('click', () => {
            if (window.sound) window.sound.playClick();
            game.loadScenario(game.scenarioIndex);
        });
        if (prevMapBtn) prevMapBtn.addEventListener('click', () => {
            if (window.sound) window.sound.playClick();
            game.loadScenario(game.scenarioIndex - 1);
        });
        if (nextMapBtn) nextMapBtn.addEventListener('click', () => {
            if (window.sound) window.sound.playClick();
            game.loadScenario(game.scenarioIndex + 1);
        });

        // Tactical Pause Button
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                game.togglePause();
            });
        }

        // Battle Speed Toggles (0.5x, 1x, 2x)
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const spd = parseFloat(btn.dataset.speed);
                game.setGameSpeed(spd);
            });
        });

        // Map Editor Toggle
        const mapEditorBtn = document.getElementById('mapEditorBtn');
        if (mapEditorBtn) {
            mapEditorBtn.addEventListener('click', () => {
                if (game.editor) game.editor.toggle(game);
            });
        }

        // Map Editor Tools
        document.querySelectorAll('.editor-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (game.editor) game.editor.setTool(btn.dataset.tool);
            });
        });

        const clearMapBtn = document.getElementById('clearMapBtn');
        const playCustomBattleBtn = document.getElementById('playCustomBattleBtn');
        if (clearMapBtn) clearMapBtn.addEventListener('click', () => {
            if (game.editor) game.editor.clearMap(game);
        });
        if (playCustomBattleBtn) playCustomBattleBtn.addEventListener('click', () => {
            if (game.editor) game.editor.playCustomBattle(game);
        });

        // Campaign Headquarters Modal
        const campaignModalBtn = document.getElementById('campaignModalBtn');
        const closeCampaignBtn = document.getElementById('closeCampaignBtn');
        if (campaignModalBtn) {
            campaignModalBtn.addEventListener('click', () => {
                if (game.campaign) game.campaign.toggleModal();
            });
        }
        if (closeCampaignBtn) {
            closeCampaignBtn.addEventListener('click', () => {
                if (game.campaign) game.campaign.toggleModal();
            });
        }

        // Campaign Upgrade Buttons
        document.querySelectorAll('.buy-upgrade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (game.campaign) game.campaign.purchase(btn.dataset.upgrade, game);
            });
        });

        // Endless Defense Mode Toggle
        const endlessModeBtn = document.getElementById('endlessModeBtn');
        if (endlessModeBtn) {
            endlessModeBtn.addEventListener('click', () => {
                if (game.endless) {
                    if (game.endless.active) {
                        game.endless.stop(game);
                        game.loadScenario(game.scenarioIndex);
                    } else {
                        game.endless.start(game);
                    }
                }
            });
        }

        // Sound & Procedural War Music Toggles
        const soundBtn = document.getElementById('soundToggleBtn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                if (window.sound) {
                    window.sound.enabled = !window.sound.enabled;
                    soundBtn.textContent = window.sound.enabled ? '🔊' : '🔇';
                }
            });
        }

        const musicBtn = document.getElementById('musicToggleBtn');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                if (window.sound) {
                    const active = window.sound.toggleWarDrums();
                    musicBtn.classList.toggle('active-blue', active);
                    musicBtn.textContent = active ? '🥁 طبول الحرب: شغالة' : '🥁 طبول الحرب: مغلقة';
                    game.showToast(active ? '🥁 تم تفعيل طبول الحرب الإجرائية الحية!' : 'تم إيقاف طبول الحرب');
                }
            });
        }

        // Night / Day Mode Toggle
        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                game.toggleNightMode();
            });
        }

        // Modals (Help & Victory)
        const helpModal = document.getElementById('helpModal');
        const helpBtn = document.getElementById('helpModalBtn');
        const closeHelpBtn = document.getElementById('closeHelpBtn');
        const gotItHelpBtn = document.getElementById('gotItHelpBtn');

        if (helpBtn && helpModal) helpBtn.addEventListener('click', () => {
            if (window.sound) window.sound.playClick();
            helpModal.classList.remove('hidden');
        });
        if (closeHelpBtn && helpModal) closeHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
        if (gotItHelpBtn && helpModal) gotItHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));

        const modalRestartBtn = document.getElementById('modalRestartBtn');
        const modalNextBattleBtn = document.getElementById('modalNextBattleBtn');
        if (modalRestartBtn) modalRestartBtn.addEventListener('click', () => {
            if (window.sound) window.sound.playClick();
            game.loadScenario(game.scenarioIndex);
        });
        if (modalNextBattleBtn) modalNextBattleBtn.addEventListener('click', () => {
            if (window.sound) window.sound.playClick();
            game.loadScenario(game.scenarioIndex + 1);
        });

        // Pre-Battle Deployment UI
        if (game.deployment) {
            game.deployment.bindUI(game);
        }
    }

    static showToast(msg) {
        const toast = document.getElementById('tacticalToast');
        if (toast) {
            toast.textContent = msg;
            toast.style.opacity = '1';
        }
    }

    static updateHUD(game) {
        const alliesAlive = game.units.filter(u => u.team === 'ally' && !u.dead);
        const enemiesAlive = game.units.filter(u => u.team === 'enemy' && !u.dead);
        const selectedAlive = alliesAlive.filter(u => u.selected);

        const allyCountEl = document.getElementById('allyCountText');
        const enemyCountEl = document.getElementById('enemyCountText');
        const selectedCountEl = document.getElementById('selectedCountText');

        if (allyCountEl) allyCountEl.textContent = `${alliesAlive.length} / 12`;
        if (enemyCountEl) enemyCountEl.textContent = `${enemiesAlive.length} / 12`;
        if (selectedCountEl) selectedCountEl.textContent = selectedAlive.length;

        const fragEl = document.getElementById('fragCountBadge');
        const smokeEl = document.getElementById('smokeCountBadge');
        const healEl = document.getElementById('healCountBadge');

        if (fragEl) fragEl.textContent = game.abilities.frag;
        if (smokeEl) smokeEl.textContent = game.abilities.smoke;
        if (healEl) healEl.textContent = game.abilities.heal;

        const fragBtn = document.getElementById('abilityFragBtn');
        const smokeBtn = document.getElementById('abilitySmokeBtn');
        if (fragBtn) fragBtn.classList.toggle('active-blue', game.activeAbility === 'frag');
        if (smokeBtn) smokeBtn.classList.toggle('active-blue', game.activeAbility === 'smoke');

        // Ink points badge
        const pointsBadge = document.getElementById('headerInkPointsBadge');
        if (pointsBadge && game.campaign) {
            pointsBadge.textContent = `${game.campaign.inkPoints} حبر`;
        }
    }

    static checkBattleOutcome(game) {
        if (game.phase === 'deployment') return;

        // Endless mode handles its own outcome/intermissions
        if (game.endless && game.endless.active) return;

        const alliesAlive = game.units.filter(u => u.team === 'ally' && !u.dead).length;
        const enemiesAlive = game.units.filter(u => u.team === 'enemy' && !u.dead).length;

        if (alliesAlive === 0 || enemiesAlive === 0) {
            game.battleEnded = true;
            const won = alliesAlive > 0;

            if (won && game.campaign) {
                game.campaign.onBattleVictory(game);
            }

            const modal = document.getElementById('endGameModal');
            const badge = document.getElementById('endGameBadge');
            const title = document.getElementById('endGameTitle');
            const desc = document.getElementById('endGameDesc');

            if (badge) {
                badge.textContent = won ? 'انتصار تكتيكي ساحق' : 'سقطت الكتيبة';
                badge.className = `inline-block px-3 py-1 mb-2 text-xs font-black text-white rounded-md border-2 border-slate-900 ${won ? 'bg-blue-700' : 'bg-red-700'}`;
            }
            if (title) title.textContent = won ? 'حسمت كتيبتك المعركة!' : 'تفوقت الكتيبة المعادية!';
            if (desc) {
                desc.textContent = won
                    ? 'أحسنت قيادة الفصائل وتوزيع خطوط النار والتغطية بأقل الخسائر.'
                    : 'استخدم الخنادق، الدخان، ورسم خطوط الالتفاف بالزر الأيمن للتغلب على دفاعاتهم.';
            }

            const survivorsEl = document.getElementById('statSurvivors');
            const accuracyEl = document.getElementById('statAccuracy');
            const timeEl = document.getElementById('statTime');

            if (survivorsEl) survivorsEl.textContent = `${alliesAlive} / 12`;
            const acc = game.shotsFired > 0 ? Math.round((game.shotsHit / game.shotsFired) * 100) : 0;
            if (accuracyEl) accuracyEl.textContent = `${acc}%`;
            if (timeEl) timeEl.textContent = `${Math.round(game.elapsedTime)}ث`;

            if (modal) modal.classList.remove('hidden');
        }
    }
}

window.UIManager = UIManager;
