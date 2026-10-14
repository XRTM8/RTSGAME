/**
 * ============================================================================
 * MOBILE CONTROLLER & PROFESSIONAL TOUCH SYSTEM (نظام دعم الهواتف واللمس الاحترافي)
 * Complete Mobile Optimization Suite:
 * - Multi-touch Gesture Engine (Smooth 2-finger Pinch-to-Zoom & 2-finger Pan)
 * - Single-touch Tactical Modes (Line Drawing, Box Selection, Free Pan)
 * - Virtual Analog Touch Joystick for Direct WASD/Squad/Tank Steering
 * - Haptic Tactile Feedback Engine (Vibration API)
 * - Floating Mobile Tactical Controls (Zoom In/Out, Recenter, Fullscreen, Joystick toggle)
 * - Landscape Mode Recommendation Guide & Safe-Area Adaptation
 * ============================================================================
 */

class MobileHaptics {
    static isSupported() {
        return typeof navigator !== 'undefined' && 'vibrate' in navigator;
    }

    static trigger(type = 'light') {
        if (!this.isSupported()) return;
        
        // Respect player preference from Settings if present
        if (window.game && window.game.menu && window.game.menu.settings) {
            if (window.game.menu.settings.hapticsEnabled === false) return;
        }

        try {
            switch (type) {
                case 'light':
                    navigator.vibrate(12);
                    break;
                case 'medium':
                    navigator.vibrate(25);
                    break;
                case 'heavy':
                    navigator.vibrate(45);
                    break;
                case 'explosion':
                    navigator.vibrate([35, 25, 55]);
                    break;
                case 'victory':
                    navigator.vibrate([30, 40, 40, 40, 90]);
                    break;
                case 'defeat':
                    navigator.vibrate([80, 50, 80]);
                    break;
                default:
                    navigator.vibrate(15);
            }
        } catch (e) {
            // Silently ignore if blocked by browser policy
        }
    }
}

class VirtualJoystick {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('virtualJoystickContainer');
        this.base = document.getElementById('joystickBase');
        this.thumb = document.getElementById('joystickThumb');
        
        this.active = false;
        this.pointerId = null;
        this.baseRect = null;
        this.centerX = 0;
        this.centerY = 0;
        this.maxRadius = 38; // Max thumb travel distance
        this.deadzone = 7;   // Minimum deadzone
        
        this.vector = { x: 0, y: 0 };
        this.visible = false;

        this.init();
    }

    init() {
        if (!this.container || !this.base || !this.thumb) return;

        // Auto-show on mobile touch devices
        if (MobileSystem.isMobileDevice()) {
            this.show();
        }

        const onStart = (e) => {
            if (this.active) return;
            this.active = true;
            this.pointerId = e.pointerId;
            if (this.base.setPointerCapture) {
                try { this.base.setPointerCapture(e.pointerId); } catch (err) {}
            }

            this.baseRect = this.base.getBoundingClientRect();
            this.centerX = this.baseRect.left + this.baseRect.width / 2;
            this.centerY = this.baseRect.top + this.baseRect.height / 2;

            this.updatePosition(e.clientX, e.clientY);
            MobileHaptics.trigger('light');
            e.preventDefault();
            e.stopPropagation();
        };

        const onMove = (e) => {
            if (!this.active || e.pointerId !== this.pointerId) return;
            this.updatePosition(e.clientX, e.clientY);
            e.preventDefault();
            e.stopPropagation();
        };

        const onEnd = (e) => {
            if (!this.active || (this.pointerId !== null && e.pointerId !== this.pointerId)) return;
            this.active = false;
            this.pointerId = null;
            this.reset();
            e.preventDefault();
            e.stopPropagation();
        };

        this.base.addEventListener('pointerdown', onStart);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
    }

    updatePosition(clientX, clientY) {
        const dx = clientX - this.centerX;
        const dy = clientY - this.centerY;
        const dist = Math.hypot(dx, dy);

        if (dist < this.deadzone) {
            this.vector.x = 0;
            this.vector.y = 0;
            this.thumb.style.transform = `translate(0px, 0px)`;
            if (this.game) this.game.joystick = { x: 0, y: 0, active: false };
            return;
        }

        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, this.maxRadius);
        const thumbX = Math.cos(angle) * clampedDist;
        const thumbY = Math.sin(angle) * clampedDist;

        this.thumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

        const intensity = (clampedDist - this.deadzone) / (this.maxRadius - this.deadzone);
        this.vector.x = Math.cos(angle) * intensity;
        this.vector.y = Math.sin(angle) * intensity;

        if (this.game) {
            this.game.joystick = {
                x: this.vector.x,
                y: this.vector.y,
                active: true
            };
        }
    }

    reset() {
        this.vector.x = 0;
        this.vector.y = 0;
        if (this.thumb) {
            this.thumb.style.transform = `translate(0px, 0px)`;
        }
        if (this.game) {
            this.game.joystick = { x: 0, y: 0, active: false };
        }
    }

    toggle() {
        this.visible = !this.visible;
        if (this.container) {
            this.container.classList.toggle('hidden', !this.visible);
        }
        MobileHaptics.trigger('light');
        if (this.game) {
            this.game.showToast(this.visible ? '🕹️ تم تفعيل عصا التحكم اللمسية المباشرة' : 'تم إخفاء عصا التحكم اللمسية');
        }
        return this.visible;
    }

    show() {
        this.visible = true;
        if (this.container) this.container.classList.remove('hidden');
    }

    hide() {
        this.visible = false;
        if (this.container) this.container.classList.add('hidden');
        this.reset();
    }
}

class MobileSystem {
    static isMobileDevice() {
        return (
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
        );
    }

    static init(game) {
        this.game = game;
        this.game.joystick = { x: 0, y: 0, active: false };

        // Enhance pointer default on mobile devices to 'command' (Line Formation)
        if (this.isMobileDevice()) {
            this.game.pointerMode = 'command';
            document.body.classList.add('is-mobile-device');
        }

        // Initialize Virtual Joystick
        this.joystick = new VirtualJoystick(game);
        window.virtualJoystick = this.joystick;

        // Initialize Floating Quick Controls
        this.bindFloatingControls(game);

        // Initialize Mobile Header & Sync
        this.bindMobileHeader(game);

        // Initialize Landscape Recommendation Guide
        this.initOrientationGuide(game);

        // Bind Multi-touch gestures onto game canvas
        this.bindTouchGestures(game);
    }

    static bindFloatingControls(game) {
        // Zoom In Button
        const zoomInBtn = document.getElementById('mobileZoomInBtn');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                if (game.camera) {
                    game.camera.zoomIn(0.25);
                    MobileHaptics.trigger('light');
                    game.showToast(`🔍 تكبير الميدان: ${(game.camera.targetZoom * 100).toFixed(0)}%`);
                }
            });
        }

        // Zoom Out Button
        const zoomOutBtn = document.getElementById('mobileZoomOutBtn');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                if (game.camera) {
                    game.camera.zoomOut(0.25);
                    MobileHaptics.trigger('light');
                    game.showToast(`🔍 تصغير الميدان: ${(game.camera.targetZoom * 100).toFixed(0)}%`);
                }
            });
        }

        // Recenter Camera Button
        const recenterBtn = document.getElementById('mobileRecenterBtn');
        if (recenterBtn) {
            recenterBtn.addEventListener('click', () => {
                if (game.camera) {
                    game.camera.reset();
                    MobileHaptics.trigger('medium');
                    game.showToast('🎯 تم إعادة تمركز الكاميرا التكتيكية');
                }
            });
        }

        // Fullscreen Toggle Button
        const fullscreenBtn = document.getElementById('mobileFullscreenBtn');
        const headerFullscreenBtn = document.getElementById('headerFullscreenBtn');
        const toggleFullscreen = () => {
            MobileHaptics.trigger('medium');
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                const docEl = document.documentElement;
                if (docEl.requestFullscreen) {
                    docEl.requestFullscreen().catch(() => {});
                } else if (docEl.webkitRequestFullscreen) {
                    docEl.webkitRequestFullscreen();
                }
                game.showToast('⛶ تم تفعيل وضع ملء الشاشة');
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                game.showToast('تم الخروج من ملء الشاشة');
            }
        };

        if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
        if (headerFullscreenBtn) headerFullscreenBtn.addEventListener('click', toggleFullscreen);

        // Joystick Toggle Button
        const joystickToggleBtn = document.getElementById('mobileJoystickToggleBtn');
        if (joystickToggleBtn) {
            joystickToggleBtn.addEventListener('click', () => {
                if (this.joystick) {
                    const active = this.joystick.toggle();
                    joystickToggleBtn.classList.toggle('active-blue', active);
                }
            });
        }

        // Quick Mode Switcher Pills on Mobile
        document.querySelectorAll('.mobile-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mobileMode;
                game.pointerMode = mode;
                document.querySelectorAll('.mobile-mode-btn').forEach(b => b.classList.remove('active-blue'));
                btn.classList.add('active-blue');
                MobileHaptics.trigger('light');

                const modeSelectBtn = document.getElementById('modeSelectBtn');
                const modeCommandBtn = document.getElementById('modeCommandBtn');
                if (mode === 'command') {
                    if (modeCommandBtn) modeCommandBtn.classList.add('active-blue');
                    if (modeSelectBtn) modeSelectBtn.classList.remove('active-blue');
                    game.showToast('✏️ نمط اللمس: اسحب لرسم خط انتشار مباشر للكتيبة!');
                } else if (mode === 'select') {
                    if (modeSelectBtn) modeSelectBtn.classList.add('active-blue');
                    if (modeCommandBtn) modeCommandBtn.classList.remove('active-blue');
                    game.showToast('⬚ نمط اللمس: اسحب لتحديد مربع للجنود والمدرعات');
                } else if (mode === 'pan') {
                    game.showToast('✋ نمط اللمس: اسحب بإصبع واحد لتحريك الكاميرا والميدان بحرية');
                }
            });
        });
    }

    static bindMobileHeader(game) {
        // Mobile Header Menu Button
        const mobileMenuBtn = document.getElementById('mobileHeaderMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                MobileHaptics.trigger('light');
                if (game.menu) game.menu.toggle(game);
            });
        }

        // Mobile Header Pause Button
        const mobilePauseBtn = document.getElementById('mobileHeaderPauseBtn');
        if (mobilePauseBtn) {
            mobilePauseBtn.addEventListener('click', () => {
                MobileHaptics.trigger('medium');
                game.togglePause();
            });
        }

        // Mobile Campaign Badge Shortcut
        const mobileInkBtn = document.getElementById('mobileInkPointsBadge');
        if (mobileInkBtn) {
            mobileInkBtn.addEventListener('click', () => {
                MobileHaptics.trigger('light');
                if (game.campaign) game.campaign.toggleModal();
            });
        }
    }

    static initOrientationGuide(game) {
        const guideEl = document.getElementById('mobileOrientationGuide');
        const dismissBtn = document.getElementById('dismissOrientationGuideBtn');

        const checkOrientation = () => {
            if (!guideEl) return;
            const isPortrait = window.innerHeight > window.innerWidth;
            const isDismissed = sessionStorage.getItem('inkBattalion_orientation_dismissed') === 'true';

            if (this.isMobileDevice() && isPortrait && !isDismissed) {
                guideEl.classList.remove('hidden');
            } else {
                guideEl.classList.add('hidden');
            }
        };

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                sessionStorage.setItem('inkBattalion_orientation_dismissed', 'true');
                if (guideEl) guideEl.classList.add('hidden');
                MobileHaptics.trigger('light');
            });
        }

        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                game.resize();
                checkOrientation();
            }, 250);
        });

        checkOrientation();
    }

    /**
     * Binds advanced Multi-Touch Gestures (Pinch to Zoom, 2-Finger Pan, Long-Press Focus Fire)
     */
    static bindTouchGestures(game) {
        const canvas = game.canvas;
        if (!canvas) return;

        const activeTouches = new Map();
        let isPinching = false;
        let initialPinchDist = 0;
        let initialPinchZoom = 1;
        let lastMidpoint = { x: 0, y: 0 };
        let longPressTimer = null;
        let longPressTriggered = false;

        const cancelLongPress = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        canvas.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'touch') return;

            activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
            cancelLongPress();
            longPressTriggered = false;

            // Two-finger gesture started!
            if (activeTouches.size === 2) {
                isPinching = true;
                // Cancel any pending single-finger action
                game.pointer.isDown = false;
                game.pointer.action = null;
                game.pointer.linePoints = [];

                const points = Array.from(activeTouches.values());
                const p1 = points[0];
                const p2 = points[1];

                initialPinchDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                initialPinchZoom = game.camera ? game.camera.targetZoom : 1.0;
                lastMidpoint = {
                    x: (p1.x + p2.x) / 2,
                    y: (p1.y + p2.y) / 2
                };
                return;
            }

            // Single-finger touch: start long-press detection
            if (activeTouches.size === 1) {
                const worldPos = InputSystem.getPointerWorldPos(game, e.clientX, e.clientY);
                longPressTimer = setTimeout(() => {
                    if (activeTouches.size === 1 && !isPinching) {
                        // Check if long-pressed on an enemy for instant Focus Fire!
                        const enemy = InputSystem.getEnemyAt(game, worldPos.x, worldPos.y);
                        if (enemy) {
                            longPressTriggered = true;
                            game.setPriorityTarget(enemy);
                            MobileHaptics.trigger('heavy');
                            game.pointer.isDown = false;
                            game.pointer.action = null;
                            game.pointer.linePoints = [];
                            return;
                        }

                        // Check if long-pressed on an allied soldier: select its whole squad!
                        const ally = InputSystem.getAllyAt(game, worldPos.x, worldPos.y);
                        if (ally) {
                            longPressTriggered = true;
                            game.selectSquad(ally.squad);
                            MobileHaptics.trigger('medium');
                            game.showToast(`🎖️ تم تحديد فصيلة (${ally.squad === 'alpha' ? 'اقتحام أ' : 'إسناد ب'}) بالكامل!`);
                            game.pointer.isDown = false;
                            game.pointer.action = null;
                            game.pointer.linePoints = [];
                            return;
                        }
                    }
                }, 380);
            }
        }, { passive: false });

        window.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'touch') return;
            if (!activeTouches.has(e.pointerId)) return;

            const prev = activeTouches.get(e.pointerId);
            const distMoved = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
            if (distMoved > 10) {
                cancelLongPress();
            }

            activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

            // Handle active Two-finger Pinch & Pan
            if (isPinching && activeTouches.size >= 2 && game.camera) {
                const points = Array.from(activeTouches.values());
                const p1 = points[0];
                const p2 = points[1];

                const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (initialPinchDist > 8) {
                    const ratio = currentDist / initialPinchDist;
                    game.camera.setZoom(initialPinchZoom * ratio);
                }

                const currentMid = {
                    x: (p1.x + p2.x) / 2,
                    y: (p1.y + p2.y) / 2
                };
                const dx = currentMid.x - lastMidpoint.x;
                const dy = currentMid.y - lastMidpoint.y;
                game.camera.pan(-dx, -dy);
                lastMidpoint = currentMid;
            }
        }, { passive: false });

        const onTouchEnd = (e) => {
            if (e.pointerType !== 'touch') return;
            cancelLongPress();
            activeTouches.delete(e.pointerId);

            if (isPinching) {
                if (activeTouches.size < 2) {
                    isPinching = false;
                }
                // Prevent single finger touchup order immediately after pinch
                game.pointer.isDown = false;
                game.pointer.action = null;
                game.pointer.linePoints = [];
                return;
            }

            if (longPressTriggered) {
                longPressTriggered = false;
                game.pointer.isDown = false;
                game.pointer.action = null;
                game.pointer.linePoints = [];
            }
        };

        window.addEventListener('pointerup', onTouchEnd);
        window.addEventListener('pointercancel', onTouchEnd);
    }
}

window.MobileHaptics = MobileHaptics;
window.VirtualJoystick = VirtualJoystick;
window.MobileSystem = MobileSystem;
