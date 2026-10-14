/**
 * ============================================================================
 * 2. BATTLEFIELD SCENARIOS & TERRAIN GENERATOR
 * Definitions for tactical battle scenarios, trenches, sandbags, walls, and trees
 * ============================================================================
 */
const SCENARIOS = [
    {
        name: 'معركة الخنادق الوسطى',
        subtitle: 'سيطر على الخنادق وأكياس الرمل في وسط الورقة',
        buildObstacles: (w, h) => [
            // Central trenches (units can walk inside and gain high cover)
            { type: 'trench', x: w * 0.36, y: h * 0.47, w: w * 0.26, h: 46, angle: -0.05 },
            { type: 'trench', x: w * 0.18, y: h * 0.62, w: w * 0.16, h: 40, angle: 0.12 },
            { type: 'trench', x: w * 0.66, y: h * 0.34, w: w * 0.16, h: 40, angle: 0.12 },
            // Sandbag lines (provide directional cover, block movement slightly)
            { type: 'sandbag', x: w * 0.28, y: h * 0.36, w: 95, h: 20, angle: 0.25 },
            { type: 'sandbag', x: w * 0.68, y: h * 0.62, w: 95, h: 20, angle: 0.25 },
            // Solid stone walls (block bullets & movement)
            { type: 'wall', x: w * 0.50, y: h * 0.25, w: 90, h: 24, angle: 0 },
            { type: 'wall', x: w * 0.50, y: h * 0.75, w: 90, h: 24, angle: 0 },
            // Sketch trees
            { type: 'tree', x: w * 0.16, y: h * 0.28, r: 28 },
            { type: 'tree', x: w * 0.83, y: h * 0.72, r: 30 },
            { type: 'tree', x: w * 0.80, y: h * 0.22, r: 24 },
            { type: 'tree', x: w * 0.20, y: h * 0.78, r: 25 }
        ]
    },
    {
        name: 'ممر القلعة المرسومة',
        subtitle: 'حرب شوارع وسواتر صخرية تتطلب الالتفاف والمناورة',
        buildObstacles: (w, h) => [
            { type: 'wall', x: w * 0.35, y: h * 0.38, w: 28, h: 130, angle: 0 },
            { type: 'wall', x: w * 0.65, y: h * 0.62, w: 28, h: 130, angle: 0 },
            { type: 'wall', x: w * 0.50, y: h * 0.50, w: 110, h: 28, angle: 0 },
            { type: 'sandbag', x: w * 0.35, y: h * 0.68, w: 100, h: 22, angle: -0.2 },
            { type: 'sandbag', x: w * 0.65, y: h * 0.32, w: 100, h: 22, angle: -0.2 },
            { type: 'trench', x: w * 0.20, y: h * 0.50, w: 110, h: 44, angle: 1.57 },
            { type: 'trench', x: w * 0.80, y: h * 0.50, w: 110, h: 44, angle: 1.57 },
            { type: 'tree', x: w * 0.48, y: h * 0.20, r: 28 },
            { type: 'tree', x: w * 0.52, y: h * 0.80, r: 28 }
        ]
    },
    {
        name: 'خط الدفاع الأخير',
        subtitle: 'العدو متحصن خلف خطوط دفاعية متتالية - استخدم الدخان والقنابل',
        buildObstacles: (w, h) => [
            { type: 'trench', x: w * 0.50, y: h * 0.34, w: w * 0.45, h: 44, angle: 0 },
            { type: 'sandbag', x: w * 0.25, y: h * 0.54, w: 110, h: 22, angle: 0.1 },
            { type: 'sandbag', x: w * 0.50, y: h * 0.56, w: 115, h: 22, angle: 0 },
            { type: 'sandbag', x: w * 0.75, y: h * 0.54, w: 110, h: 22, angle: -0.1 },
            { type: 'wall', x: w * 0.33, y: h * 0.22, w: 95, h: 24, angle: 0.15 },
            { type: 'wall', x: w * 0.67, y: h * 0.22, w: 95, h: -0.15 },
            { type: 'tree', x: w * 0.15, y: h * 0.42, r: 26 },
            { type: 'tree', x: w * 0.85, y: h * 0.42, r: 26 },
            { type: 'tree', x: w * 0.50, y: h * 0.76, r: 30 }
        ]
    }
];

window.SCENARIOS = SCENARIOS;
