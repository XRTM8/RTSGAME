/**
 * ============================================================================
 * IN-GAME TACTICAL MAP EDITOR (محرر الخرائط الميداني المدمج)
 * Allows players to design custom battlefields: place trenches, sandbags,
 * stone walls, sketch trees, and launch custom battles instantly!
 * ============================================================================
 */
class MapEditor {
    constructor() {
        this.active = false;
        this.selectedTool = 'trench'; // 'trench' | 'sandbag' | 'wall' | 'tree' | 'eraser'
        this.customObstacles = [];
    }

    toggle(game) {
        this.active = !this.active;
        const panel = document.getElementById('mapEditorDock');
        if (panel) {
            panel.classList.toggle('hidden', !this.active);
        }

        if (this.active) {
            game.showToast('🛠️ تم تفعيل محرر الخرائط: اختر أداة وانقر على الميدان للبناء أو الحذف');
            // Copy existing obstacles into editor buffer
            this.customObstacles = JSON.parse(JSON.stringify(game.obstacles));
        } else {
            game.showToast('تم إغلاق محرر الخرائط');
        }
        if (window.sound) window.sound.playClick();
    }

    setTool(tool) {
        this.selectedTool = tool;
        document.querySelectorAll('.editor-tool-btn').forEach(btn => {
            btn.classList.toggle('active-blue', btn.dataset.tool === tool);
        });
        if (window.sound) window.sound.playClick();
    }

    handleClick(game, worldX, worldY) {
        if (!this.active) return false;

        if (this.selectedTool === 'eraser') {
            // Remove obstacle near click
            const removeIdx = game.obstacles.findIndex(obs => {
                const d = Math.hypot(obs.x - worldX, obs.y - worldY);
                return d < (obs.r || Math.max(obs.w, obs.h) * 0.6);
            });
            if (removeIdx !== -1) {
                game.obstacles.splice(removeIdx, 1);
                if (window.sound) window.sound.playClick();
                return true;
            }
        } else if (this.selectedTool === 'trench') {
            game.obstacles.push({
                type: 'trench',
                x: worldX,
                y: worldY,
                w: 140,
                h: 44,
                angle: 0
            });
            if (window.sound) window.sound.playClick();
            return true;
        } else if (this.selectedTool === 'sandbag') {
            game.obstacles.push({
                type: 'sandbag',
                x: worldX,
                y: worldY,
                w: 100,
                h: 22,
                angle: 0
            });
            if (window.sound) window.sound.playClick();
            return true;
        } else if (this.selectedTool === 'wall') {
            game.obstacles.push({
                type: 'wall',
                x: worldX,
                y: worldY,
                w: 100,
                h: 26,
                angle: 0
            });
            if (window.sound) window.sound.playClick();
            return true;
        } else if (this.selectedTool === 'tree') {
            game.obstacles.push({
                type: 'tree',
                x: worldX,
                y: worldY,
                r: 28
            });
            if (window.sound) window.sound.playClick();
            return true;
        }

        return false;
    }

    clearMap(game) {
        game.obstacles = [];
        game.showToast('تم مسح جميع عوائق الخريطة');
        if (window.sound) window.sound.playClick();
    }

    playCustomBattle(game) {
        this.toggle(game);
        // Reset and spawn full battalions on current custom layout
        game.loadCustomBattle(game.obstacles);
        game.showToast('⚔️ بدأت المعركة على خريطتك المخصصة!');
        if (window.sound) window.sound.playWhistle();
    }

    renderOverlay(ctx, game) {
        if (!this.active) return;

        // Blueprint dashed grid overlay
        ctx.save();
        ctx.strokeStyle = 'rgba(29, 78, 216, 0.22)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);

        const step = 40;
        for (let x = 0; x < game.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x, game.height);
            ctx.stroke();
        }
        for (let y = 0; y < game.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y); ctx.lineTo(game.width, y);
            ctx.stroke();
        }

        // Preview ghost of selected obstacle under pointer
        const p = game.pointer;
        ctx.fillStyle = 'rgba(29, 78, 216, 0.25)';
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 2;

        if (this.selectedTool === 'trench') {
            ctx.strokeRect(p.x - 70, p.y - 22, 140, 44);
        } else if (this.selectedTool === 'sandbag') {
            ctx.strokeRect(p.x - 50, p.y - 11, 100, 22);
        } else if (this.selectedTool === 'wall') {
            ctx.strokeRect(p.x - 50, p.y - 13, 100, 26);
        } else if (this.selectedTool === 'tree') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.selectedTool === 'eraser') {
            ctx.strokeStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.moveTo(p.x - 10, p.y - 10); ctx.lineTo(p.x + 10, p.y + 10);
            ctx.moveTo(p.x + 10, p.y - 10); ctx.lineTo(p.x - 10, p.y + 10);
            ctx.stroke();
        }

        ctx.restore();
    }
}

window.MapEditor = MapEditor;
