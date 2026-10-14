/**
 * ============================================================================
 * INPUT & TACTICAL CONTROLLER
 * Manages Pointer (Mouse/Touch), Camera Zoom/Pan, Map Editor placement,
 * Tactical Line-formation drawing, Selection Box, and Keyboard Shortcuts
 * ============================================================================
 */
class InputSystem {
    static getPointerWorldPos(game, clientX, clientY) {
        const rect = game.canvas.getBoundingClientRect();
        const scaleX = rect.width > 0 ? (game.canvas.width / rect.width) : 1;
        const scaleY = rect.height > 0 ? (game.canvas.height / rect.height) : 1;
        const screenX = (clientX - rect.left) * scaleX;
        const screenY = (clientY - rect.top) * scaleY;
        return game.camera
            ? game.camera.screenToWorld(screenX, screenY, game.canvas.width, game.canvas.height)
            : { x: screenX, y: screenY };
    }

    static bindInputEvents(game) {
        game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse Wheel Zoom
        game.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (game.camera) {
                const zoomDelta = -e.deltaY * 0.0012;
                game.camera.setZoom(game.camera.targetZoom + zoomDelta);
            }
        }, { passive: false });

        game.canvas.addEventListener('pointerdown', (e) => {
            // Transform to exact World coordinates via Camera & Resolution Scaler!
            const worldPos = InputSystem.getPointerWorldPos(game, e.clientX, e.clientY);

            // Middle mouse button or mobile pan mode pans camera
            if (e.button === 1 || game.pointerMode === 'pan') {
                game.pointer.isPanning = true;
                game.pointer.lastPanX = e.clientX;
                game.pointer.lastPanY = e.clientY;
                return;
            }

            // Map editor intercept
            if (game.editor && game.editor.active) {
                if (game.editor.handleClick(game, worldPos.x, worldPos.y)) {
                    return;
                }
            }

            // Deployment phase intercept
            if (game.phase === 'deployment' && game.deployment && game.deployment.active) {
                if (e.button === 2) {
                    game.deployment.removeAt(game, worldPos.x, worldPos.y);
                    if (window.MobileHaptics) window.MobileHaptics.trigger('light');
                    return;
                }
                game.pointer.x = worldPos.x;
                game.pointer.y = worldPos.y;
                game.pointer.startX = worldPos.x;
                game.pointer.startY = worldPos.y;
                game.pointer.isDown = true;
                game.pointer.button = e.button;
                game.pointer.action = 'deploy';
                return;
            }

            game.pointer.x = worldPos.x;
            game.pointer.y = worldPos.y;
            game.pointer.startX = worldPos.x;
            game.pointer.startY = worldPos.y;
            game.pointer.isDown = true;
            game.pointer.button = e.button;

            // Active Ability deployment
            if (game.activeAbility) {
                game.deployAbilityAt(game.activeAbility, worldPos.x, worldPos.y);
                if (window.MobileHaptics) window.MobileHaptics.trigger('heavy');
                game.activeAbility = null;
                game.pointer.isDown = false;
                game.updateHUD();
                return;
            }

            // Right click OR Command Mode (default on mobile) triggers line drag
            if (e.button === 2 || game.pointerMode === 'command') {
                game.pointer.action = 'line';
                game.pointer.linePoints = [{ x: worldPos.x, y: worldPos.y }];
            } else {
                game.pointer.action = 'box';
            }
        });

        window.addEventListener('pointermove', (e) => {
            if (game.pointer.isPanning && game.camera) {
                const dx = e.clientX - game.pointer.lastPanX;
                const dy = e.clientY - game.pointer.lastPanY;
                game.pointer.lastPanX = e.clientX;
                game.pointer.lastPanY = e.clientY;
                game.camera.pan(-dx, -dy);
                return;
            }

            const worldPos = InputSystem.getPointerWorldPos(game, e.clientX, e.clientY);
            game.pointer.x = worldPos.x;
            game.pointer.y = worldPos.y;

            if (game.pointer.isDown && game.pointer.action === 'line') {
                const lastPt = game.pointer.linePoints[game.pointer.linePoints.length - 1];
                if (!lastPt || Math.hypot(worldPos.x - lastPt.x, worldPos.y - lastPt.y) > 14) {
                    game.pointer.linePoints.push({ x: worldPos.x, y: worldPos.y });
                }
            }
        });

        window.addEventListener('pointerup', (e) => {
            if (game.pointer.isPanning) {
                game.pointer.isPanning = false;
                return;
            }

            if (!game.pointer.isDown) return;
            const worldPos = InputSystem.getPointerWorldPos(game, e.clientX, e.clientY);
            const dragDist = Math.hypot(worldPos.x - game.pointer.startX, worldPos.y - game.pointer.startY);

            // Deployment phase intercept (exact startX, startY for pinpoint spawn accuracy!)
            if (game.phase === 'deployment' && game.deployment && game.deployment.active) {
                if (game.pointer.action === 'deploy') {
                    if (dragDist < 16) {
                        game.deployment.deploySingle(game, game.pointer.startX, game.pointer.startY);
                    } else {
                        game.deployment.deployLine(game, game.pointer.startX, game.pointer.startY, worldPos.x, worldPos.y);
                    }
                    if (window.MobileHaptics) window.MobileHaptics.trigger('medium');
                }
                game.pointer.isDown = false;
                game.pointer.action = null;
                return;
            }

            // Universal Tap Intercept (dragDist < 18): Works for both mobile taps and mouse clicks!
            if (dragDist < 18) {
                // 1. Focus Fire: If tapped on an enemy, concentrate all battalion fire!
                const clickedEnemy = InputSystem.getEnemyAt(game, worldPos.x, worldPos.y);
                if (clickedEnemy) {
                    game.setPriorityTarget(clickedEnemy);
                    if (window.MobileHaptics) window.MobileHaptics.trigger('heavy');
                    game.pointer.isDown = false;
                    game.pointer.action = null;
                    game.pointer.linePoints = [];
                    game.updateHUD();
                    return;
                }

                // 2. Select Allied Unit or Tank if tapped directly!
                const clickedUnit = game.getAllyAt(worldPos.x, worldPos.y);
                let clickedTank = null;
                if (game.tanks) {
                    clickedTank = game.tanks.find(t => t.team === 'ally' && !t.dead && Math.hypot(t.x - worldPos.x, t.y - worldPos.y) <= t.radius + 10);
                }

                if (clickedUnit) {
                    game.units.forEach(u => {
                        if (u.team === 'ally') u.selected = (u === clickedUnit);
                    });
                    if (game.tanks) game.tanks.forEach(t => t.selected = false);
                    if (window.sound) window.sound.playClick();
                    if (window.MobileHaptics) window.MobileHaptics.trigger('light');
                    game.pointer.isDown = false;
                    game.pointer.action = null;
                    game.pointer.linePoints = [];
                    game.updateHUD();
                    return;
                } else if (clickedTank) {
                    game.units.forEach(u => u.selected = false);
                    clickedTank.selected = true;
                    if (window.sound) window.sound.playClick();
                    if (window.MobileHaptics) window.MobileHaptics.trigger('light');
                    game.pointer.isDown = false;
                    game.pointer.action = null;
                    game.pointer.linePoints = [];
                    game.updateHUD();
                    return;
                }

                // 3. Tapped on empty ground: Move selected units to that position!
                game.issueFormationMove(worldPos.x, worldPos.y);
                if (window.sound) window.sound.playClick();
                if (window.MobileHaptics) window.MobileHaptics.trigger('light');
                game.pointer.isDown = false;
                game.pointer.action = null;
                game.pointer.linePoints = [];
                game.updateHUD();
                return;
            }

            // Drag actions (dragDist >= 18)
            if (game.pointer.action === 'line') {
                game.issueCustomLineFormation(game.pointer.startX, game.pointer.startY, worldPos.x, worldPos.y);
                if (window.sound) window.sound.playClick();
                if (window.MobileHaptics) window.MobileHaptics.trigger('medium');
            } else if (game.pointer.action === 'box') {
                // Box Selection
                const minX = Math.min(game.pointer.startX, worldPos.x);
                const maxX = Math.max(game.pointer.startX, worldPos.x);
                const minY = Math.min(game.pointer.startY, worldPos.y);
                const maxY = Math.max(game.pointer.startY, worldPos.y);

                let anyInside = false;
                game.units.forEach(u => {
                    if (u.team === 'ally' && !u.dead) {
                        if (u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY) {
                            anyInside = true;
                        }
                    }
                });
                if (game.tanks) {
                    game.tanks.forEach(t => {
                        if (t.team === 'ally' && !t.dead) {
                            if (t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY) {
                                anyInside = true;
                            }
                        }
                    });
                }

                if (anyInside) {
                    game.units.forEach(u => {
                        if (u.team === 'ally' && !u.dead) {
                            u.selected = (u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY);
                        }
                    });
                    if (game.tanks) {
                        game.tanks.forEach(t => {
                            if (t.team === 'ally' && !t.dead) {
                                t.selected = (t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY);
                            }
                        });
                    }
                    if (window.sound) window.sound.playClick();
                }
            }

            game.pointer.isDown = false;
            game.pointer.action = null;
            game.pointer.linePoints = [];
            game.updateHUD();
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            game.keys[key] = true;

            // Tactical Pause toggle (Spacebar)
            if (e.code === 'Space' || key === ' ' || key === 'spacebar') {
                e.preventDefault();
                game.togglePause();
                return;
            }

            if (key === '1') game.selectSquad('all');
            if (key === '2') game.selectSquad('alpha');
            if (key === '3') game.selectSquad('bravo');
            if (key === 'h') game.setStance('hold');
            if (key === 'c') game.setStance('charge');
            if (key === 'g' || key === 'ل') game.toggleAbility('frag');
            if (key === 'f' || key === 'ب') game.toggleAbility('smoke');
            if (key === 'e' || key === 'ث') game.triggerHeal();
            if (key === 'm') if (game.editor) game.editor.toggle(game);
            if (key === 'b') if (game.campaign) game.campaign.toggleModal();
            if (key === 'r' && game.camera) game.camera.reset();
            if (key === 'x' || key === 'ء' || key === 'escape') {
                if (game.priorityTarget) {
                    game.clearPriorityTarget();
                    game.showToast('🎯 تم إلغاء تركيز النيران');
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            game.keys[e.key.toLowerCase()] = false;
        });
    }

    static getSelectedAllies(game) {
        const selected = game.units.filter(u => u.team === 'ally' && !u.dead && u.selected);
        if (selected.length > 0) return selected;
        return game.units.filter(u => u.team === 'ally' && !u.dead);
    }

    static getAllyAt(game, x, y) {
        return game.units.find(u => u.team === 'ally' && !u.dead && Math.hypot(u.x - x, u.y - y) <= u.radius + 8);
    }

    static getEnemyAt(game, x, y) {
        // 1. Check enemy heavy tanks (larger hit footprint)
        if (game.tanks) {
            const enemyTank = game.tanks.find(t => t.team === 'enemy' && !t.dead && Math.hypot(t.x - x, t.y - y) <= t.radius + 14);
            if (enemyTank) return enemyTank;
        }

        // 2. Check enemy stationary fortified HMG nests
        if (game.hmgNests) {
            const enemyHmg = game.hmgNests.find(h => h.team === 'enemy' && !h.dead && Math.hypot(h.x - x, h.y - y) <= h.radius + 14);
            if (enemyHmg) return enemyHmg;
        }

        // 3. Check enemy infantry soldiers
        const enemySoldier = game.units.find(u => u.team === 'enemy' && !u.dead && Math.hypot(u.x - x, u.y - y) <= u.radius + 14);
        if (enemySoldier) return enemySoldier;

        return null;
    }

    static handleDirectWASD(game) {
        if (game.phase !== 'combat') return;
        let moveX = 0;
        let moveY = 0;
        if (game.keys['w'] || game.keys['arrowup'] || game.keys['ص']) moveY -= 1;
        if (game.keys['s'] || game.keys['arrowdown'] || game.keys['س']) moveY += 1;
        if (game.keys['a'] || game.keys['arrowleft'] || game.keys['ش']) moveX -= 1;
        if (game.keys['d'] || game.keys['arrowright'] || game.keys['ي']) moveX += 1;

        // Support mobile virtual analog joystick steering
        if (game.joystick && game.joystick.active) {
            moveX += game.joystick.x;
            moveY += game.joystick.y;
        }

        if (moveX !== 0 || moveY !== 0) {
            const len = Math.hypot(moveX, moveY);
            const nx = moveX / len;
            const ny = moveY / len;
            const allies = game.getSelectedAllies();
            allies.forEach(u => {
                u.stance = 'advance';
                u.targetX = u.x + nx * 35;
                u.targetY = u.y + ny * 35;
                u.preferredAngle = Math.atan2(game.pointer.y - u.y, game.pointer.x - u.x);
            });

            // Tanks execute direct steering & movement alongside soldiers!
            if (game.tanks) {
                const anyAlliesSelected = game.units.some(u => u.team === 'ally' && u.selected);
                game.tanks.forEach(t => {
                    if (t.team === 'ally' && !t.dead && (t.selected || !anyAlliesSelected)) {
                        t.stance = 'advance';
                        t.targetX = t.x + nx * 30;
                        t.targetY = t.y + ny * 30;
                    }
                });
            }
        }
    }
}

window.InputSystem = InputSystem;
