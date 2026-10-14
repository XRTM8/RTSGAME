/**
 * ============================================================================
 * MAIN TACTICAL COMMAND MENU & SETTINGS (القائمة التكتيكية الرئيسية والإعدادات)
 * HUD-matching hand-drawn sketch menu with Battle Modes, In-Depth Settings,
 * Tactical Field Manual, and Exit Battle management.
 * ============================================================================
 */
class MenuManager {
    constructor() {
        this.active = false;
        this.currentTab = 'modes'; // 'modes' | 'settings' | 'guide'

        this.settings = {
            soundEnabled: true,
            musicEnabled: false,
            screenShake: 'normal', // 'normal' | 'light' | 'off'
            difficulty: 'normal',  // 'recruit' | 'normal' | 'veteran'
            combatText: true,
            nightMode: false,
            hapticsEnabled: true,
            joystickEnabled: true
        };

        this.loadSettings();
    }

    init(game) {
        this.game = game;
        this.bindEvents(game);
        this.applySettings(game);

        // Greet the player with the Main Tactical Menu on startup
        if (!sessionStorage.getItem('inkBattalion_session_started')) {
            this.open(game);
        }
    }

    toggleNightMode(game) {
        this.settings.nightMode = !this.settings.nightMode;
        this.saveSettings();
        this.applyNightMode(game);
        if (game) {
            game.showToast(this.settings.nightMode ? '🌙 تم تفعيل طور العمليات الليلية - رؤية تكتيكية مريحة' : '☀️ تم تفعيل طور النهار المشمس');
        }
        if (window.sound) window.sound.playClick();
    }

    applyNightMode(game) {
        const isNight = !!this.settings.nightMode;
        document.body.classList.toggle('night-theme', isNight);
        document.documentElement.classList.toggle('night-theme', isNight);
        if (game) game.nightMode = isNight;

        const headerBtn = document.getElementById('themeToggleBtn');
        const headerText = document.getElementById('themeToggleText');
        if (headerBtn) {
            if (headerText) headerText.textContent = isNight ? 'نهاري' : 'ليلي';
            headerBtn.innerHTML = isNight ? '<span>☀️</span> <span>نهاري</span>' : '<span>🌙</span> <span>ليلي</span>';
            headerBtn.classList.toggle('active-blue', isNight);
        }

        const settingBtn = document.getElementById('toggleNightSettingBtn');
        if (settingBtn) {
            settingBtn.innerHTML = isNight ? '<span>🌙 النمط الحالي: ليلي تكتيكي (داكن)</span>' : '<span>☀️ النمط الحالي: نهاري مشمس</span>';
            settingBtn.classList.toggle('active-blue', isNight);
        }
    }

    toggle(game) {
        this.active = !this.active;
        const modal = document.getElementById('mainMenuModal');
        if (modal) {
            modal.classList.toggle('hidden', !this.active);
            if (this.active) {
                this.updateUI();
            }
        }
        if (window.sound) window.sound.playClick();
    }

    open(game) {
        this.active = true;
        const modal = document.getElementById('mainMenuModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.updateUI();
        }
        if (window.sound) window.sound.playClick();
    }

    close(game) {
        this.active = false;
        const modal = document.getElementById('mainMenuModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        if (window.sound) window.sound.playClick();
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        document.querySelectorAll('.menu-tab-btn').forEach(btn => {
            btn.classList.toggle('active-blue', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.menu-tab-content').forEach(content => {
            content.classList.toggle('hidden', content.dataset.tab !== tabName);
        });

        if (window.sound) window.sound.playClick();
    }

    setDifficulty(diff, game) {
        this.settings.difficulty = diff;
        this.saveSettings();

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.toggle('active-blue', btn.dataset.diff === diff);
        });

        // Apply difficulty scaling to enemy battalion
        if (game) {
            for (const u of game.units) {
                if (u.team === 'enemy') {
                    if (diff === 'recruit') {
                        u.damage = Math.max(8, Math.round(u.damage * 0.75));
                        u.fireDelay *= 1.25;
                    } else if (diff === 'veteran') {
                        u.damage = Math.round(u.damage * 1.3);
                        u.fireDelay *= 0.82;
                    }
                }
            }
            const label = diff === 'recruit' ? '🟢 تدريب مجندين (سهل)' : (diff === 'veteran' ? '🔴 واقعي شرس (صعب)' : '🔵 تكتيكي متوازن (متوسط)');
            game.showToast(`تم تعيين مستوى الصعوبة: ${label}`);
        }
        if (window.sound) window.sound.playClick();
    }

    setScreenShake(mode, game) {
        this.settings.screenShake = mode;
        this.saveSettings();

        document.querySelectorAll('.shake-btn').forEach(btn => {
            btn.classList.toggle('active-blue', btn.dataset.shake === mode);
        });

        if (window.sound) window.sound.playClick();
    }

    applySettings(game) {
        if (!game) return;

        // Apply sound
        if (window.sound) {
            window.sound.enabled = this.settings.soundEnabled;
            if (this.settings.musicEnabled && !window.sound.drumInterval) {
                window.sound.musicEnabled = true;
                window.sound.startWarDrums();
            } else if (!this.settings.musicEnabled && window.sound.drumInterval) {
                window.sound.musicEnabled = false;
                window.sound.stopWarDrums();
            }
        }

        // Apply night mode
        this.applyNightMode(game);

        this.updateUI();
    }

    bindEvents(game) {
        // ESC key toggles Main Menu
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggle(game);
            }
        });

        // Header Menu Button
        const headerMenuBtn = document.getElementById('headerMenuBtn');
        if (headerMenuBtn) {
            headerMenuBtn.addEventListener('click', () => this.toggle(game));
        }

        // Quick Day/Night Toggle in In-Game Header
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => this.toggleNightMode(game));
        }

        // Close Menu Buttons
        const closeMenuBtn = document.getElementById('closeMenuBtn');
        const resumeBattleBtn = document.getElementById('resumeBattleBtn');
        const markSessionStarted = () => {
            try { sessionStorage.setItem('inkBattalion_session_started', 'true'); } catch(e) {}
        };
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => {
            markSessionStarted();
            this.close(game);
        });
        if (resumeBattleBtn) resumeBattleBtn.addEventListener('click', () => {
            markSessionStarted();
            this.close(game);
        });

        // Tab Switching
        document.querySelectorAll('.menu-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Modes Launchers inside Menu
        const launchSkirmishBtn = document.getElementById('launchSkirmishBtn');
        const launchNightOpsBtn = document.getElementById('launchNightOpsBtn');
        const launchCampaignBtn = document.getElementById('launchCampaignBtn');
        const launchEndlessBtn = document.getElementById('launchEndlessBtn');
        const launchEditorBtn = document.getElementById('launchEditorBtn');

        if (launchSkirmishBtn) {
            launchSkirmishBtn.addEventListener('click', () => {
                markSessionStarted();
                this.close(game);
                game.loadScenario(game.scenarioIndex);
            });
        }

        if (launchNightOpsBtn) {
            launchNightOpsBtn.addEventListener('click', () => {
                markSessionStarted();
                this.settings.nightMode = true;
                this.saveSettings();
                this.applyNightMode(game);
                this.close(game);
                game.loadScenario(game.scenarioIndex);
                game.showToast('🌙 انطلقت العمليات الليلية! انشر كتيبتك في الميدان الداكن');
                if (window.sound) window.sound.playWhistle();
            });
        }

        if (launchCampaignBtn) {
            launchCampaignBtn.addEventListener('click', () => {
                markSessionStarted();
                this.close(game);
                if (game.campaign) game.campaign.toggleModal();
            });
        }

        if (launchEndlessBtn) {
            launchEndlessBtn.addEventListener('click', () => {
                markSessionStarted();
                this.close(game);
                if (game.endless) game.endless.start(game);
            });
        }

        if (launchEditorBtn) {
            launchEditorBtn.addEventListener('click', () => {
                markSessionStarted();
                this.close(game);
                if (game.editor) game.editor.toggle(game);
            });
        }

        // Settings Buttons inside Menu
        const toggleNightSettingBtn = document.getElementById('toggleNightSettingBtn');
        if (toggleNightSettingBtn) {
            toggleNightSettingBtn.addEventListener('click', () => {
                this.toggleNightMode(game);
            });
        }

        // Settings Buttons inside Menu
        const toggleSoundSettingBtn = document.getElementById('toggleSoundSettingBtn');
        const toggleMusicSettingBtn = document.getElementById('toggleMusicSettingBtn');

        if (toggleSoundSettingBtn) {
            toggleSoundSettingBtn.addEventListener('click', () => {
                this.settings.soundEnabled = !this.settings.soundEnabled;
                this.saveSettings();
                this.applySettings(game);
                if (window.sound) window.sound.playClick();
            });
        }

        if (toggleMusicSettingBtn) {
            toggleMusicSettingBtn.addEventListener('click', () => {
                this.settings.musicEnabled = !this.settings.musicEnabled;
                this.saveSettings();
                this.applySettings(game);
                if (window.sound) window.sound.playClick();
            });
        }

        // Difficulty Buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setDifficulty(btn.dataset.diff, game));
        });

        // Screen Shake Buttons
        document.querySelectorAll('.shake-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setScreenShake(btn.dataset.shake, game));
        });

        // Mobile Haptics Toggle Button
        const toggleHapticsSettingBtn = document.getElementById('toggleHapticsSettingBtn');
        if (toggleHapticsSettingBtn) {
            toggleHapticsSettingBtn.addEventListener('click', () => {
                this.settings.hapticsEnabled = !this.settings.hapticsEnabled;
                this.saveSettings();
                this.updateUI();
                if (window.MobileHaptics && this.settings.hapticsEnabled) {
                    window.MobileHaptics.trigger('heavy');
                }
                if (window.sound) window.sound.playClick();
                if (game) game.showToast(this.settings.hapticsEnabled ? '📳 تم تفعيل الاهتزاز التفاعلي للهواتف' : 'تم إيقاف الاهتزاز التفاعلي');
            });
        }

        // Mobile Joystick Toggle Button in Menu
        const toggleJoystickSettingBtn = document.getElementById('toggleJoystickSettingBtn');
        if (toggleJoystickSettingBtn) {
            toggleJoystickSettingBtn.addEventListener('click', () => {
                this.settings.joystickEnabled = !this.settings.joystickEnabled;
                this.saveSettings();
                this.updateUI();
                if (window.virtualJoystick) {
                    if (this.settings.joystickEnabled) window.virtualJoystick.show();
                    else window.virtualJoystick.hide();
                }
                if (window.sound) window.sound.playClick();
                if (window.MobileHaptics) window.MobileHaptics.trigger('light');
                if (game) game.showToast(this.settings.joystickEnabled ? '🕹️ تم إظهار عصا التحكم اللمسية' : 'تم إخفاء عصا التحكم اللمسية');
            });
        }

        // Menu Fullscreen Button
        const menuFullscreenBtn = document.getElementById('menuFullscreenBtn');
        if (menuFullscreenBtn) {
            menuFullscreenBtn.addEventListener('click', () => {
                const headerFullscreenBtn = document.getElementById('headerFullscreenBtn');
                if (headerFullscreenBtn) headerFullscreenBtn.click();
            });
        }

        // Exit / Quit Button
        const quitBattleBtn = document.getElementById('quitBattleBtn');
        if (quitBattleBtn) {
            quitBattleBtn.addEventListener('click', () => this.confirmExit(game));
        }
    }

    confirmExit(game) {
        const confirmed = confirm('هل تود حقاً إنهاء المعركة الحالية والعودة للميدان الرئيسي؟');
        if (confirmed) {
            this.close(game);
            if (game.endless && game.endless.active) game.endless.stop(game);
            if (game.editor && game.editor.active) game.editor.toggle(game);
            game.loadScenario(0);
            game.showToast('🚪 تم إنهاء المعركة والعودة إلى خط البداية.');
            if (window.sound) window.sound.playWhistle();
        }
    }

    updateUI() {
        // Update sound setting button text
        const sBtn = document.getElementById('toggleSoundSettingBtn');
        if (sBtn) {
            sBtn.textContent = this.settings.soundEnabled ? '🔊 الأصوات: مفعلة' : '🔇 الأصوات: معطلة';
            sBtn.classList.toggle('active-blue', this.settings.soundEnabled);
        }

        // Update music setting button text
        const mBtn = document.getElementById('toggleMusicSettingBtn');
        if (mBtn) {
            mBtn.textContent = this.settings.musicEnabled ? '🥁 طبول الحرب: مفعلة' : '🥁 طبول الحرب: معطلة';
            mBtn.classList.toggle('active-blue', this.settings.musicEnabled);
        }

        // Update active difficulty button
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.toggle('active-blue', btn.dataset.diff === this.settings.difficulty);
        });

        // Update active screen shake button
        document.querySelectorAll('.shake-btn').forEach(btn => {
            btn.classList.toggle('active-blue', btn.dataset.shake === this.settings.screenShake);
        });

        // Update mobile haptics button
        const hBtn = document.getElementById('toggleHapticsSettingBtn');
        if (hBtn) {
            hBtn.textContent = this.settings.hapticsEnabled ? '📳 الاهتزاز اللمسي: مفعل' : '📴 الاهتزاز اللمسي: معطل';
            hBtn.classList.toggle('active-blue', this.settings.hapticsEnabled);
        }

        // Update mobile joystick setting button
        const jBtn = document.getElementById('toggleJoystickSettingBtn');
        if (jBtn) {
            jBtn.textContent = this.settings.joystickEnabled ? '🕹️ عصا التحكم: مفعلة' : '🕹️ عصا التحكم: مخفية';
            jBtn.classList.toggle('active-blue', this.settings.joystickEnabled);
        }

        // Update campaign points badge inside menu
        const menuPoints = document.getElementById('menuInkPointsBadge');
        if (menuPoints && this.game && this.game.campaign) {
            menuPoints.textContent = `${this.game.campaign.inkPoints} نقطة حبر`;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('inkBattalion_settings', JSON.stringify(this.settings));
        } catch (e) {}
    }

    loadSettings() {
        try {
            const data = localStorage.getItem('inkBattalion_settings');
            if (data) {
                this.settings = Object.assign(this.settings, JSON.parse(data));
            }
        } catch (e) {}
    }
}

window.MenuManager = MenuManager;
