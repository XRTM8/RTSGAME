/**
 * ============================================================================
 * 10. GAME BOOTSTRAP & MAIN RAF LOOP
 * Initializes the game instance and manages the delta-time clamped game loop
 * ============================================================================
 */
window.addEventListener('DOMContentLoaded', () => {
    const game = new BattalionGame();
    window.game = game;

    let lastTime = performance.now();

    function gameLoop(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        game.update(dt);
        game.render(now);

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
});
