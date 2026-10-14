/**
 * ============================================================================
 * TACTICAL CAMERA & SCREEN SHAKE SYSTEM
 * Smooth zoom with mouse wheel, panning, coordinate transforms,
 * and cinematic organic screen shake on explosive impacts
 * ============================================================================
 */
class BattleCamera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;

        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.minZoom = 0.55;
        this.maxZoom = 1.85;

        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
    }

    triggerShake(amount = 9) {
        this.shakeIntensity = Math.min(24, this.shakeIntensity + amount);
    }

    setZoom(newZoom) {
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    }

    zoomIn(delta = 0.2) {
        this.setZoom(this.targetZoom + delta);
    }

    zoomOut(delta = 0.2) {
        this.setZoom(this.targetZoom - delta);
    }

    pan(dx, dy) {
        this.targetX += dx / this.zoom;
        this.targetY += dy / this.zoom;
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
    }

    update(dt) {
        // Smooth camera panning lerp
        this.x += (this.targetX - this.x) * Math.min(1, dt * 10);
        this.y += (this.targetY - this.y) * Math.min(1, dt * 10);

        // Smooth zoom lerp
        this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 8);

        // Screen shake decay and high-frequency perturbation
        if (this.shakeIntensity > 0.05) {
            this.shakeX = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.shakeY = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 26);
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeIntensity = 0;
        }
    }

    apply(ctx, width, height) {
        ctx.save();
        const cx = width / 2;
        const cy = height / 2;

        ctx.translate(cx + this.shakeX, cy + this.shakeY);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-cx - this.x, -cy - this.y);
    }

    restore(ctx) {
        ctx.restore();
    }

    /**
     * Converts raw pointer client screen coordinates to in-world game coordinates
     */
    screenToWorld(screenX, screenY, width, height) {
        const cx = width / 2;
        const cy = height / 2;
        const relX = screenX - (cx + this.shakeX);
        const relY = screenY - (cy + this.shakeY);
        return {
            x: (relX / this.zoom) + cx + this.x,
            y: (relY / this.zoom) + cy + this.y
        };
    }

    /**
     * Converts in-world game coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY, width, height) {
        const cx = width / 2;
        const cy = height / 2;
        return {
            x: ((worldX - cx - this.x) * this.zoom) + cx + this.shakeX,
            y: ((worldY - cy - this.y) * this.zoom) + cy + this.shakeY
        };
    }
}

window.BattleCamera = BattleCamera;
