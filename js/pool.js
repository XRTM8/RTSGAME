/**
 * ============================================================================
 * OBJECT POOL SYSTEM (مسبح تدوير الكائنات)
 * Zero-allocation memory recycling for high-frequency game entities:
 * Bullets, Spark particles, Shockwaves, and Floating Combat Texts.
 * Prevents Garbage Collection (GC) stutter and maintains silky 60/120 FPS!
 * ============================================================================
 */
class ObjectPool {
    constructor(factory, resetFn, initialSize = 60, maxSize = 500) {
        this.factory = factory;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
        this.free = [];
        this.active = [];

        for (let i = 0; i < initialSize; i++) {
            const obj = this.factory();
            obj._poolActive = false;
            this.free.push(obj);
        }
    }

    obtain() {
        let obj = this.free.pop();
        if (!obj) {
            obj = this.factory();
        }
        obj._poolActive = true;
        this.active.push(obj);
        return obj;
    }

    recycle(obj) {
        if (!obj || !obj._poolActive) return;
        obj._poolActive = false;

        const idx = this.active.indexOf(obj);
        if (idx !== -1) {
            // Fast O(1) swap-and-pop removal
            const last = this.active.pop();
            if (idx < this.active.length) {
                this.active[idx] = last;
            }
        }

        if (this.resetFn) {
            this.resetFn(obj);
        }

        if (this.free.length < this.maxSize) {
            this.free.push(obj);
        }
    }

    recycleAll() {
        while (this.active.length > 0) {
            const obj = this.active.pop();
            obj._poolActive = false;
            if (this.resetFn) this.resetFn(obj);
            if (this.free.length < this.maxSize) {
                this.free.push(obj);
            }
        }
    }

    forEachActive(callback) {
        // Iterate backwards so items can be safely recycled during iteration
        for (let i = this.active.length - 1; i >= 0; i--) {
            callback(this.active[i], i);
        }
    }
}

/**
 * Global Game Pools Collection
 */
class GamePools {
    constructor() {
        // 1. Bullet Pool
        this.bullets = new ObjectPool(
            () => ({
                team: 'ally',
                x: 0, y: 0,
                prevX: 0, prevY: 0,
                vx: 0, vy: 0,
                damage: 20,
                life: 1.0,
                isHeavy: false
            }),
            (b) => {
                b.x = 0; b.y = 0;
                b.prevX = 0; b.prevY = 0;
                b.vx = 0; b.vy = 0;
                b.damage = 20;
                b.life = 0;
                b.isHeavy = false;
            },
            80, 400
        );

        // 2. Spark Particle Pool
        this.sparks = new ObjectPool(
            () => ({
                type: 'spark',
                x: 0, y: 0,
                vx: 0, vy: 0,
                life: 0.3,
                maxLife: 0.3,
                color: '#1d4ed8',
                size: 2
            }),
            (p) => {
                p.x = 0; p.y = 0;
                p.vx = 0; p.vy = 0;
                p.life = 0;
                p.size = 2;
            },
            120, 600
        );

        // 3. Expanding Shockwave Ring Pool
        this.rings = new ObjectPool(
            () => ({
                type: 'ring',
                x: 0, y: 0,
                r: 4,
                maxR: 30,
                alpha: 1.0,
                color: '#1d4ed8'
            }),
            (r) => {
                r.x = 0; r.y = 0;
                r.r = 4;
                r.alpha = 0;
            },
            30, 100
        );

        // 4. Floating Combat Text Pool ("-20", "+45 HP", "PINNED!", "SUPPRESSED")
        this.floatingTexts = new ObjectPool(
            () => ({
                text: '',
                x: 0, y: 0,
                vy: -35,
                life: 0.9,
                maxLife: 0.9,
                color: '#dc2626',
                font: 'bold 12px Cairo, sans-serif'
            }),
            (t) => {
                t.text = '';
                t.life = 0;
            },
            25, 100
        );
    }

    clearAll() {
        this.bullets.recycleAll();
        this.sparks.recycleAll();
        this.rings.recycleAll();
        this.floatingTexts.recycleAll();
    }
}

window.ObjectPool = ObjectPool;
window.GamePools = GamePools;
