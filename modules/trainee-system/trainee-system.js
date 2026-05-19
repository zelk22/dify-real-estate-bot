/* =========================================================
   TraineeSystem — מודול Vanilla JS מבודד
   שימוש: TraineeSystem.init('mount-id');
   דרוש: Firebase SDK (app-compat + database-compat) בדף האב
   ========================================================= */
const TraineeSystem = {
    container: null,
    trainees: [],
    instructors: [],
    currentId: null,
    selectedLessons: [],
    isSigned: false,
    canvas: null,
    ctx: null,
    drawing: false,
    db: null,
    traineesRef: null,
    instructorsRef: null,

    init(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        this.container = container;

        if (!container.querySelector('#trainee-module')) {
            if (options.html) {
                container.innerHTML = options.html;
            } else if (!options.skipHtml) {
                container.innerHTML = this.getHTML();
            }
        }

        if (this._booted) return;
        this._booted = true;

        this.initFirebase();
        this.bindEvents();
        this.buildRoadmap();
        this.buildCourseTicks();
        this.$('main-view').classList.add('active-view');
        this.$('trainee-list').innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 0; color:#a0aec0;">
                <div style="width:44px;height:44px;border:4px solid #e2e8f0;border-top-color:#3498db;
                            border-radius:50%;animation:trainee-spin 0.8s linear infinite;margin:0 auto 16px;">
                </div>
                <div style="font-size:1em;">מתחבר למסד הנתונים...</div>
            </div>`;
        this.loadData();
    },

    $(id) {
        return this.container.querySelector('#' + id);
    },

    getHTML() {
        return `
<div id="trainee-module" class="trainee-module">
<style>
    .trainee-module {
        --rail-dark: #1a2a3a;
        --rail-blue: #3498db;
        --bg: #f4f7f9;
        --danger: #e74c3c;
        --warning: #f39c12;
        --success: #27ae60;
        --neutral: #95a5a6;
        font-family: 'Segoe UI', system-ui, sans-serif;
        background: var(--bg);
        margin: 0;
        padding: 15px;
        color: #333;
        direction: rtl;
    }
    .trainee-module * { box-sizing: border-box; }
    .trainee-module .container { max-width: 1100px; margin: auto; }

    .trainee-module .view { display: none; background: white; padding: 35px; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); margin-top: 10px; border-top: 6px solid var(--rail-blue); }
    .trainee-module .active-view { display: block; animation: trainee-fadeIn 0.3s ease; }
    @keyframes trainee-fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes trainee-spin { to { transform: rotate(360deg); } }

    .trainee-module header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 12px; }
    .trainee-module .header-title { margin: 0; font-size: 2em; color: var(--rail-dark); }

    .trainee-module .btn { padding: 12px 25px; border-radius: 10px; cursor: pointer; font-weight: bold; border: none; transition: 0.2s; }
    .trainee-module .btn:hover { filter: brightness(1.08); }
    .trainee-module .btn-blue  { background: var(--rail-blue); color: white; }
    .trainee-module .btn-dark  { background: var(--rail-dark); color: white; }
    .trainee-module .btn-ghost { background: #fff; border: 1px solid #ddd; color: #4a5568; }
    .trainee-module .btn-success { background: var(--success); color: white; width: 100%; font-size: 1.25em; margin-top: 30px; }

    .trainee-module .panel { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 15px; padding: 20px; margin-bottom: 25px; }
    .trainee-module .panel h4 { margin: 0 0 14px 0; color: var(--rail-dark); }
    .trainee-module .panel-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .trainee-module .panel-row input { flex: 1; min-width: 180px; padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 1em; }

    .trainee-module #trainee-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .trainee-module .trainee-card { background: white; border-radius: 16px; box-shadow: 0 5px 20px rgba(0,0,0,0.07); border-right: 8px solid var(--rail-blue); overflow: hidden; transition: 0.25s; cursor: pointer; }
    .trainee-module .trainee-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.12); }
    .trainee-module .card-top { background: linear-gradient(135deg, #1a2a3a, #2c4a6e); padding: 20px; }
    .trainee-module .card-name { color: white; font-size: 1.2em; font-weight: 700; margin: 0 0 3px 0; }
    .trainee-module .card-sub  { color: #a0b4c8; font-size: 0.82em; }
    .trainee-module .card-bar  { height: 5px; background: rgba(255,255,255,0.15); border-radius: 3px; margin-top: 12px; }
    .trainee-module .card-bar-fill { height: 100%; background: var(--rail-blue); border-radius: 3px; }
    .trainee-module .card-bottom { padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
    .trainee-module .card-count { font-size: 0.88em; color: #718096; font-weight: 600; }
    .trainee-module .card-acts  { display: flex; gap: 6px; }
    .trainee-module .cab { background: none; border: 1px solid #e2e8f0; border-radius: 7px; padding: 5px 10px; cursor: pointer; font-size: 0.8em; color: #4a5568; transition: 0.2s; }
    .trainee-module .cab:hover { background: #f7fafc; }
    .trainee-module .cab.del:hover { background: #fff5f5; border-color: var(--danger); color: var(--danger); }

    .trainee-module .ins-tags { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
    .trainee-module .ins-tag { background: white; border: 1px solid #ddd; border-radius: 20px; padding: 5px 12px; font-size: 0.88em; display: inline-flex; align-items: center; gap: 6px; }
    .trainee-module .ins-tag button { background: none; border: none; color: var(--danger); cursor: pointer; font-weight: bold; }

    .trainee-module .roadmap-wrapper { position: relative; padding: 54px 0 0 0; margin: 40px 0 30px 0; overflow: visible; }
    .trainee-module .roadmap-container { width: 100%; height: 36px; background: #e9ecef; border-radius: 6px; position: relative; display: flex; border: 1px solid #ccc; overflow: hidden; }
    .trainee-module .roadmap-segment { height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.85em; position: relative; overflow: hidden; }
    .trainee-module .roadmap-segment span { position: relative; z-index: 2; text-shadow: 0 1px 3px rgba(0,0,0,0.3); pointer-events: none; }
    .trainee-module .seg-tick { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(0,0,0,0.15); z-index: 1; pointer-events: none; }
    .trainee-module .flag-anchor { position: absolute; bottom: 36px; width: 0; overflow: visible; display: flex; flex-direction: column; align-items: center; z-index: 5; pointer-events: none; }
    .trainee-module .flag-top  { font-size: 22px; line-height: 1; white-space: nowrap; }
    .trainee-module .flag-pole { width: 2px; height: 36px; background: #444; }
    .trainee-module .flag-pole-end { width: 3px; height: 40px; background: #111; }
    .trainee-module .train-marker { position: absolute; bottom: 36px; margin-bottom: 2px; width: 0; overflow: visible; white-space: nowrap; text-align: center; line-height: 1; transition: right 1.5s cubic-bezier(0.22, 1, 0.36, 1); z-index: 10; font-size: 30px; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.2)); }

    .trainee-module .insight-box { background: #fff; border: 1px solid #e0e6ed; border-right: 5px solid var(--rail-blue); padding: 18px 20px; border-radius: 12px; margin-bottom: 28px; display: flex; align-items: flex-start; gap: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); }
    .trainee-module .insight-icon { font-size: 22px; }
    .trainee-module .insight-content b { color: var(--rail-dark); font-size: 1.05em; display: block; margin-bottom: 4px; }
    .trainee-module .insight-content span { color: #555; font-size: 0.95em; line-height: 1.5; }

    .trainee-module .section-title { font-size: 1.15em; font-weight: bold; margin: 28px 0 14px 0; color: var(--rail-dark); border-right: 5px solid var(--rail-blue); padding-right: 14px; }
    .trainee-module .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    .trainee-module .stat-card { padding: 18px 8px; border-radius: 14px; text-align: center; color: white; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .trainee-module .stat-label { font-size: 0.74em; opacity: 0.95; margin-bottom: 6px; line-height: 1.3; }
    .trainee-module .stat-val   { font-size: 1.8em; }

    .trainee-module .log-header { background: #f8f9fa; width: 100%; padding: 16px 20px; border-radius: 12px; border: 1px solid #e0e0e0; margin-top: 28px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: bold; transition: 0.2s; }
    .trainee-module .log-header:hover { background: #edf2f7; }
    .trainee-module .log-body { display: none; overflow-x: auto; padding-top: 14px; }
    .trainee-module .log-body.open { display: block; }
    .trainee-module table { width: 100%; border-collapse: collapse; min-width: 750px; }
    .trainee-module th { background: #f1f3f5; padding: 13px; color: #555; font-size: 0.84em; border-bottom: 2px solid #dee2e6; text-align: center; }
    .trainee-module td { padding: 13px; border-bottom: 1px solid #eee; text-align: center; font-size: 0.9em; }
    .trainee-module .score-badge { background: #edf2f7; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.88em; margin: 0 2px; border: 1px solid #cbd5e0; }

    .trainee-module .form-section { background: #2c3e50; color: white; padding: 30px; border-radius: 20px; margin-top: 40px; }
    .trainee-module .form-section h3 { margin: 0 0 24px 0; color: #f1c40f; font-size: 1.4em; border-bottom: 1px solid #3d5166; padding-bottom: 14px; }
    .trainee-module .form-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 22px; }
    .trainee-module .fg label { display: block; margin-bottom: 8px; font-size: 0.88em; color: #b0c4d4; font-weight: 700; }
    .trainee-module .fg input, .trainee-module .fg select {
        width: 100%; padding: 11px 14px; border-radius: 8px;
        border: 2px solid #4a6278;
        background: #f8fafc; color: #1a2a3a;
        font-size: 0.95em; font-family: inherit;
        transition: border-color 0.2s;
    }
    .trainee-module .fg input:focus, .trainee-module .fg select:focus { outline: none; border-color: var(--rail-blue); background: white; }
    .trainee-module .fg select option { background: white; color: #1a2a3a; }

    .trainee-module .chips-label { font-size: 0.88em; color: #b0c4d4; font-weight: 700; display: block; margin-bottom: 10px; }
    .trainee-module #lesson-chips { display: flex; flex-wrap: wrap; gap: 7px; }

    .trainee-module .chip { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 0.85em; font-weight: 700; transition: 0.15s; flex-shrink: 0; }
    .trainee-module .chip-locked    { background: #3d5166; color: #8cb4cc; cursor: default; border: 1px solid rgba(255,255,255,0.1); }
    .trainee-module .chip-selected  { background: var(--success); color: white; cursor: pointer; border: 2px solid #1e8449; box-shadow: 0 2px 8px rgba(39,174,96,0.45); }
    .trainee-module .chip-available { background: #dff0fa; color: #1a3a5c; border: 2px solid #3498db; cursor: pointer; }
    .trainee-module .chip-disabled  { background: #1e2c3a; color: #445f72; opacity: 0.6; cursor: default; border: 1px solid rgba(255,255,255,0.05); }

    .trainee-module .skill-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 20px; }
    .trainee-module .skill-box { background: rgba(255,255,255,0.1); padding: 14px 8px 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.2); text-align: center; }
    .trainee-module .skill-box label { display: block; color: #f1c40f; font-size: 0.78em; margin-bottom: 10px; font-weight: bold; line-height: 1.4; min-height: 2.4em; display: flex; align-items: center; justify-content: center; }
    .trainee-module .skill-stepper { display: flex; align-items: center; justify-content: center; gap: 5px; }
    .trainee-module .skill-stepper button { width: 30px; height: 30px; border-radius: 50%; border: none; background: rgba(255,255,255,0.18); color: white; font-size: 1.3em; line-height: 1; font-weight: bold; cursor: pointer; transition: 0.15s; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 0; }
    .trainee-module .skill-stepper button:hover { background: rgba(255,255,255,0.35); transform: scale(1.1); }
    .trainee-module .skill-stepper input { width: 50px; padding: 8px 2px; text-align: center; font-size: 1.4em; font-weight: bold; border-radius: 8px; border: 2px solid #5a8099; background: #f0f4f8; color: #1a2a3a; -moz-appearance: textfield; }
    .trainee-module .skill-stepper input::-webkit-outer-spin-button,
    .trainee-module .skill-stepper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .trainee-module .skill-stepper input:focus { outline: none; border-color: var(--rail-blue); background: white; }

    .trainee-module #sig-canvas { border: 2px dashed #cbd5e0; background: #fff; cursor: crosshair; touch-action: none; width: 100%; height: 140px; border-radius: 12px; display: block; }
    .trainee-module .sig-wrap { background: white; padding: 22px; border-radius: 14px; margin-top: 28px; text-align: center; }
    .trainee-module .sig-wrap label { color: var(--rail-dark); font-weight: bold; display: block; margin-bottom: 12px; }
    .trainee-module .sig-clear { background: none; border: none; color: var(--danger); cursor: pointer; font-size: 0.92em; margin-top: 10px; font-weight: bold; }

    .trainee-module .detail-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 10px; }

    .trainee-module .chinuch-wrapper { margin: 12px 0 28px 0; }
    .trainee-module .chinuch-label { font-size: 0.85em; font-weight: 700; color: #718096; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .trainee-module .chinuch-label span { color: #a0aec0; font-weight: 400; }
    .trainee-module .chinuch-bar-outer { width: 100%; height: 22px; background: #e9ecef; border-radius: 4px; overflow: hidden; position: relative; border: 1px solid #ccc; }
    .trainee-module .chinuch-bar-fill { height: 100%; background: linear-gradient(to left, #8e44ad, #9b59b6); border-radius: 4px 0 0 4px; transition: width 1s ease; position: relative; overflow: hidden; }
    .trainee-module .chinuch-bar-fill::after {
        content: '';
        position: absolute; inset: 0;
        background-image: repeating-linear-gradient(
            to left,
            rgba(255,255,255,0) 0%, rgba(255,255,255,0) calc(100%/50 - 1px),
            rgba(255,255,255,0.25) calc(100%/50 - 1px), rgba(255,255,255,0.25) calc(100%/50)
        );
    }
    .trainee-module .chinuch-bar-ticks { position: absolute; inset: 0; display: flex; pointer-events: none; }
    .trainee-module .chinuch-tick { flex: 1; border-left: 1px solid rgba(0,0,0,0.1); }

    .trainee-module .alerts-title { font-size: 1.15em; font-weight: bold; margin: 28px 0 12px 0; color: var(--rail-dark); border-right: 5px solid var(--rail-blue); padding-right: 14px; }

    @media (max-width: 660px) {
        .trainee-module .view { padding: 18px; }
        .trainee-module .header-title { font-size: 1.5em; }
        .trainee-module #trainee-list { grid-template-columns: 1fr; }
        .trainee-module .form-grid-3 { grid-template-columns: 1fr; }
        .trainee-module .stats-row { grid-template-columns: repeat(3, 1fr); }
        .trainee-module .skill-grid { grid-template-columns: repeat(3, 1fr); }
    }
</style>

<div class="container">

    <div id="main-view" class="view">
        <header>
            <h1 class="header-title">ניהול הכשרת נהגים</h1>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn btn-ghost" data-action="toggle-panel" data-panel="ins-panel">⚙️ מדריכים</button>
                <button class="btn btn-blue"  data-action="toggle-panel" data-panel="add-panel">+ חניך חדש</button>
            </div>
        </header>

        <div id="add-panel" style="display:none" class="panel">
            <h4>➕ הוספת חניך חדש</h4>
            <div class="panel-row">
                <input type="text" id="new-trainee-name" placeholder="שם מלא של החניך...">
                <button class="btn btn-blue"  data-action="confirm-add-trainee">הוסף</button>
                <button class="btn btn-ghost" data-action="toggle-panel" data-panel="add-panel">ביטול</button>
            </div>
        </div>

        <div id="ins-panel" style="display:none" class="panel">
            <h4>👨‍🏫 ניהול מדריכים / חונכים</h4>
            <div class="panel-row">
                <input type="text" id="new-ins-name" placeholder="שם המדריך / חונך...">
                <button class="btn btn-dark" data-action="add-instructor">הוסף</button>
            </div>
            <div id="ins-tags" class="ins-tags"></div>
        </div>

        <div id="trainee-list"></div>
        <p id="empty-msg" style="display:none; text-align:center; color:#a0aec0; margin-top:40px; font-size:1.05em;">
            אין חניכים עדיין — לחץ על "+ חניך חדש"
        </p>
    </div>

    <div id="detail-view" class="view">
        <div class="detail-top">
            <button class="btn btn-ghost" data-action="show-main">← חזרה לרשימה</button>
            <button class="btn btn-dark"  data-action="print">🖨️ הדפס / PDF</button>
        </div>

        <div id="pdf-content">
            <h1 id="det-name" style="margin:0 0 4px; font-size:2.5em; color:var(--rail-dark); font-weight:800;"></h1>
            <p id="det-sub" style="color:#a0aec0; margin:0 0 8px; font-size:0.93em;"></p>

            <div style="margin: 36px 0 10px 0;">
                <div style="font-size:0.85em; font-weight:700; color:#718096; margin-bottom:8px; display:flex; justify-content:space-between;">
                    <span>📍 התקדמות קורס</span>
                    <span id="course-count" style="color:#a0aec0; font-weight:400;">שיעור 0 / 50</span>
                </div>

                <div style="position:relative; padding-top:40px; overflow:visible;">
                    <div style="position:absolute; bottom:32px; right:20%; width:0; overflow:visible; pointer-events:none; z-index:10;">
                        <div style="position:absolute; bottom:0; left:-1px; width:2px; height:8px; background:#e74c3c;"></div>
                        <div style="position:absolute; bottom:8px; left:-6px; font-size:18px; line-height:1;">🚩</div>
                    </div>
                    <div style="position:absolute; bottom:32px; right:60%; width:0; overflow:visible; pointer-events:none; z-index:10;">
                        <div style="position:absolute; bottom:0; left:-1px; width:2px; height:8px; background:#e74c3c;"></div>
                        <div style="position:absolute; bottom:8px; left:-6px; font-size:18px; line-height:1;">🚩</div>
                    </div>
                    <div style="position:absolute; bottom:32px; right:100%; width:0; overflow:visible; pointer-events:none; z-index:10;">
                        <div style="position:absolute; bottom:0; left:-1px; width:2px; height:8px; background:#e74c3c;"></div>
                        <div style="position:absolute; bottom:8px; left:-6px; font-size:18px; line-height:1;">🏁</div>
                    </div>

                    <div id="train-marker"
                         style="position:absolute; bottom:32px; right:0%;
                                transform:translateX(50%);
                                font-size:26px; line-height:1; z-index:20;
                                transition:right 1.4s cubic-bezier(0.22,1,0.36,1);
                                filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                                pointer-events:none;">
                        🚂
                    </div>

                    <div id="course-bar-outer"
                         style="width:100%; height:32px; border-radius:6px;
                                overflow:hidden; position:relative; border:1px solid #ccc;">
                        <div style="position:absolute;top:0;bottom:0;right:0;width:20%;
                                    background:#3498db;display:flex;align-items:center;
                                    justify-content:center;color:white;font-size:0.8em;font-weight:700;
                                    text-shadow:0 1px 2px rgba(0,0,0,0.3);">טכני</div>
                        <div style="position:absolute;top:0;bottom:0;right:20%;width:40%;
                                    background:#d4a017;display:flex;align-items:center;
                                    justify-content:center;color:#1a2a3a;font-size:0.8em;font-weight:700;">תפעולי</div>
                        <div style="position:absolute;top:0;bottom:0;right:60%;width:40%;
                                    background:#27ae60;display:flex;align-items:center;
                                    justify-content:center;color:white;font-size:0.8em;font-weight:700;
                                    text-shadow:0 1px 2px rgba(0,0,0,0.3);">מסחרי</div>
                        <div id="course-ticks" style="position:absolute;inset:0;pointer-events:none;"></div>
                    </div>
                </div>
            </div>

            <div id="chinuch-section" class="chinuch-wrapper" style="display:none;">
                <div class="chinuch-label">
                    חניכה מעשית
                    <span id="chinuch-count">0 / 50 שיעורים</span>
                </div>
                <div class="chinuch-bar-outer">
                    <div id="chinuch-bar-fill" class="chinuch-bar-fill" style="width:0%"></div>
                    <div class="chinuch-bar-ticks" id="chinuch-ticks"></div>
                </div>
            </div>

            <div class="alerts-title">תובנות והמלצות</div>
            <div id="alerts-container"></div>

            <div class="section-title">סטטוס כשירות</div>
            <div class="stats-row" id="stats-row"></div>

            <div class="log-header" data-action="toggle-log">
                <span>📋 יומן שיעורים מלא</span>
                <span>לחץ להצגה/הסתרה ▼</span>
            </div>
            <div id="log-body" class="log-body">
                <table>
                    <thead>
                        <tr><th>תאריך</th><th>משימה</th><th>שיעורים</th><th>מדריך</th><th>ר/ק/ס/נ/מ</th><th>הערות</th><th></th></tr>
                    </thead>
                    <tbody id="history-tbody"></tbody>
                </table>
            </div>
        </div>

        <div class="form-section">
            <h3>✍️ דיווח משוב יומי חדש</h3>
            <div class="form-grid-3">
                <div class="fg"><label>תאריך</label><input type="date" id="in-date"></div>
                <div class="fg">
                    <label>סוג משימה</label>
                    <select id="in-mission">
                        <option value="קורס">קורס</option>
                        <option value="חניכה">חניכה</option>
                        <option value="שעות נוספות">שעות נוספות / כשירות</option>
                    </select>
                </div>
                <div class="fg"><label>מדריך / חונך</label><select id="in-ins"></select></div>
            </div>

            <span class="chips-label">סמן שיעורים שבוצעו (שמור על רצף):</span>
            <div id="lesson-chips"></div>
            <div class="fg" id="extra-wrap" style="display:none; margin-top:12px;">
                <input type="text" id="in-extra" placeholder="פרט נושא השיעור / הכשירות...">
            </div>

            <div class="skill-grid">
                <div class="skill-box"><label>מערכות רכבת</label><div class="skill-stepper"><button type="button" data-skill="s1" data-delta="-1">−</button><input type="number" id="s1" min="1" max="10" placeholder="—"><button type="button" data-skill="s1" data-delta="1">+</button></div></div>
                <div class="skill-box" id="s2-box"><label id="s2-label">מבנה דיפו</label><div class="skill-stepper"><button type="button" data-skill="s2" data-delta="-1">−</button><input type="number" id="s2" min="1" max="10" placeholder="—"><button type="button" data-skill="s2" data-delta="1">+</button></div></div>
                <div class="skill-box"><label>תפעול סטיק</label><div class="skill-stepper"><button type="button" data-skill="s3" data-delta="-1">−</button><input type="number" id="s3" min="1" max="10" placeholder="—"><button type="button" data-skill="s3" data-delta="1">+</button></div></div>
                <div class="skill-box"><label>נהלים</label><div class="skill-stepper"><button type="button" data-skill="s4" data-delta="-1">−</button><input type="number" id="s4" min="1" max="10" placeholder="—"><button type="button" data-skill="s4" data-delta="1">+</button></div></div>
                <div class="skill-box"><label>משמעת</label><div class="skill-stepper"><button type="button" data-skill="s5" data-delta="-1">−</button><input type="number" id="s5" min="1" max="10" placeholder="—"><button type="button" data-skill="s5" data-delta="1">+</button></div></div>
            </div>
            <div id="s2-hint" style="font-size:0.78em;color:#b0c4d4;margin-top:8px;text-align:center;"></div>

            <div class="fg" style="margin-top:20px;">
                <textarea id="in-notes" rows="3"
                    placeholder="הערות מקצועיות, דגשים לשיפור או נקודות לשימור..."
                    style="width:100%; padding:14px; border-radius:10px; border:2px solid #4a6278; background:#f8fafc; color:#1a2a3a; font-family:inherit; font-size:0.95em; resize:vertical;"></textarea>
            </div>

            <div class="sig-wrap">
                <label>חתימת המדריך / חונך לאישור:</label>
                <canvas id="sig-canvas"></canvas>
                <button class="sig-clear" data-action="clear-sig">✖ נקה חתימה</button>
            </div>

            <button class="btn btn-success" data-action="save-lesson">💾 שמור משוב במערכת</button>
        </div>
    </div>
</div>
</div>`;
    },

    initFirebase() {
        const firebaseConfig = {
            apiKey:            "AIzaSyCnv_TtezNA_vC2VaCKgW9uENlkXlPcOxs",
            authDomain:        "dynamic-feedback-system.firebaseapp.com",
            databaseURL:       "https://dynamic-feedback-system-default-rtdb.europe-west1.firebasedatabase.app",
            projectId:         "dynamic-feedback-system",
            storageBucket:     "dynamic-feedback-system.firebasestorage.app",
            messagingSenderId: "608824054092",
            appId:             "1:608824054092:web:dedb20d936f223aa00ffe9"
        };
        const appName = 'traineeSystem';
        try {
            this._fbApp = firebase.app(appName);
        } catch (e) {
            this._fbApp = firebase.initializeApp(firebaseConfig, appName);
        }
        this.db             = this._fbApp.database();
        this.traineesRef    = this.db.ref('trainees_v20');
        this.instructorsRef = this.db.ref('instructors_v20');
    },

    bindEvents() {
        const c = this.container;

        c.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el || !c.contains(el)) return;
            const action = el.dataset.action;
            if (action === 'toggle-panel')  this.togglePanel(el.dataset.panel);
            if (action === 'confirm-add-trainee') this.confirmAddTrainee();
            if (action === 'add-instructor') this.addInstructor();
            if (action === 'show-main')    this.showMainView();
            if (action === 'print')        window.print();
            if (action === 'toggle-log')   this.$('log-body').classList.toggle('open');
            if (action === 'clear-sig')    this.clearSig();
            if (action === 'save-lesson')  this.saveLesson();
        });

        c.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-skill]');
            if (!btn || !c.contains(btn)) return;
            this.stepSkill(btn.dataset.skill, parseInt(btn.dataset.delta, 10));
        });

        c.addEventListener('click', (e) => {
            const card = e.target.closest('.trainee-card');
            if (!card || e.target.closest('.cab')) return;
            const id = parseInt(card.dataset.id, 10);
            if (id) this.openTrainee(id);
        });

        c.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-edit-name]');
            if (editBtn) {
                e.stopPropagation();
                this.editName(parseInt(editBtn.dataset.editName, 10), editBtn.dataset.name, e);
            }
            const delBtn = e.target.closest('[data-delete-trainee]');
            if (delBtn) {
                e.stopPropagation();
                this.deleteTrainee(parseInt(delBtn.dataset.deleteTrainee, 10), delBtn.dataset.name, e);
            }
            const delLesson = e.target.closest('[data-delete-lesson]');
            if (delLesson) {
                this.deleteLesson(parseInt(delLesson.dataset.deleteLesson, 10));
            }
            const removeIns = e.target.closest('[data-remove-ins]');
            if (removeIns) {
                this.removeInstructor(removeIns.dataset.removeIns);
            }
        });

        const newTraineeInp = this.$('new-trainee-name');
        if (newTraineeInp) {
            newTraineeInp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.confirmAddTrainee();
            });
        }
        const newInsInp = this.$('new-ins-name');
        if (newInsInp) {
            newInsInp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.addInstructor();
            });
        }

        const missionSel = this.$('in-mission');
        if (missionSel) {
            missionSel.addEventListener('change', () => this.updateChips());
        }
    },

    loadData() {
        Promise.all([
            this.traineesRef.once('value'),
            this.instructorsRef.once('value')
        ]).then(([tSnap, iSnap]) => {
            this.trainees    = tSnap.val()  ? Object.values(tSnap.val())  : [];
            this.instructors = iSnap.val()  ? Object.values(iSnap.val())  : [];
            this.renderList();
            this.renderInsTags();
            this.traineesRef.on('value', snap => {
                this.trainees = snap.val() ? Object.values(snap.val()) : [];
                this.renderList();
                if (this.currentId) this.renderDetail();
            });
            this.instructorsRef.on('value', snap => {
                this.instructors = snap.val() ? Object.values(snap.val()) : [];
                this.renderInsTags();
                this.updateInsDropdown();
            });
        }).catch(err => {
            this.$('trainee-list').innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px 0;">
                    <div style="font-size:1.1em; color:#e74c3c; margin-bottom:12px;">❌ שגיאת חיבור</div>
                    <div style="font-size:0.85em; color:#a0aec0; margin-bottom:16px;">${err.message}</div>
                    <button data-action="retry-load"
                        style="padding:10px 24px;background:#3498db;color:white;border:none;
                               border-radius:8px;cursor:pointer;font-size:1em;font-weight:700;">
                        נסה שוב
                    </button>
                </div>`;
            this.container.querySelector('[data-action="retry-load"]')
                ?.addEventListener('click', () => this.loadData());
        });
    },

    persist() {
        const tData = {};
        this.trainees.forEach(t => { tData[t.id] = t; });
        this.traineesRef.set(tData);

        const iData = {};
        this.instructors.forEach((name, i) => { iData[i] = name; });
        this.instructorsRef.set(iData);
    },

    updateS2Label() {
        const t = this.trainees.find(x => x.id === this.currentId);
        if (!t) return;
        let maxCourse = 0;
        (t.lessons || []).forEach(l => {
            if (l.mission === 'קורס')
                (l.lessonNums || []).forEach(n => { if (n > maxCourse) maxCourse = n; });
        });
        if (this.$('in-mission')?.value === 'קורס' && this.selectedLessons.length)
            maxCourse = Math.max(maxCourse, Math.max(...this.selectedLessons));

        const isTech = maxCourse < 11;
        const lbl    = this.$('s2-label');
        const hint   = this.$('s2-hint');
        const box    = this.$('s2-box');
        if (!lbl) return;

        if (isTech) {
            lbl.textContent = 'מבנה דיפו';
            if (hint) hint.textContent = 'פרמטר זה ישתנה ל"מבנה קו" החל משיעור 11';
            if (box)  box.style.border = '';
        } else {
            lbl.textContent = 'מבנה קו';
            if (hint) hint.textContent = '';
            if (box)  box.style.border = '';
        }
    },

    buildRoadmap() {
        [
            { id: 'seg-tech', n: 10 },
            { id: 'seg-ops',  n: 20 },
            { id: 'seg-comm', n: 20 },
        ].forEach(({ id, n }) => {
            const seg = this.$(id);
            if (!seg) return;
            for (let i = 1; i < n; i++) {
                const tick = document.createElement('div');
                tick.className = 'seg-tick';
                tick.style.right = `${(i / n) * 100}%`;
                seg.appendChild(tick);
            }
        });

        const ticks = this.$('chinuch-ticks');
        if (ticks) {
            for (let i = 0; i < 50; i++) {
                const t = document.createElement('div');
                t.className = 'chinuch-tick';
                ticks.appendChild(t);
            }
        }
    },

    buildCourseTicks() {
        const container = this.$('course-ticks');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 1; i < 50; i++) {
            const tick = document.createElement('div');
            tick.style.cssText = `position:absolute;top:0;bottom:0;width:1px;background:rgba(0,0,0,0.12);right:${(i / 50) * 100}%;`;
            container.appendChild(tick);
        }
    },

    setTrain(lesson) {
        const pct = (Math.min(lesson, 50) / 50) * 100;
        const train = this.$('train-marker');
        if (train) train.style.right = pct + '%';
        const counter = this.$('course-count');
        if (counter) counter.innerText = `שיעור ${lesson} / 50`;
    },

    togglePanel(id) {
        const el     = this.$(id);
        const isOpen = el.style.display === 'block';
        ['add-panel', 'ins-panel'].forEach(p => { this.$(p).style.display = 'none'; });
        if (!isOpen) {
            el.style.display = 'block';
            const inp = el.querySelector('input');
            if (inp) setTimeout(() => inp.focus(), 50);
        }
    },

    confirmAddTrainee() {
        const inp  = this.$('new-trainee-name');
        const name = inp.value.trim();
        if (!name) { inp.focus(); return; }
        this.trainees.push({ id: Date.now(), name, lessons: [] });
        this.persist();
        inp.value = '';
        this.$('add-panel').style.display = 'none';
        this.renderList();
    },

    deleteTrainee(id, name, e) {
        e.stopPropagation();
        this.showConfirm(`למחוק את <b>${name}</b> ואת כל נתוני ההכשרה שלו לצמיתות?`, () => {
            this.trainees = this.trainees.filter(t => t.id !== id);
            this.persist();
            this.renderList();
        });
    },

    editName(id, curName, e) {
        e.stopPropagation();
        const el = e.target.closest('.trainee-card').querySelector('.card-name');
        el.contentEditable = true;
        el.style.cssText = 'background:rgba(255,255,255,0.18);border-radius:4px;padding:2px 6px;outline:none;';
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        el.onblur = () => {
            const newName = el.innerText.trim();
            el.contentEditable = false;
            el.style.cssText = '';
            if (newName && newName !== curName) {
                const t = this.trainees.find(x => x.id === id);
                if (t) { t.name = newName; this.persist(); }
            } else { el.innerText = curName; }
        };
        el.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); } };
    },

    renderList() {
        const l   = this.$('trainee-list');
        const emp = this.$('empty-msg');
        l.innerHTML = '';
        if (!this.trainees.length) { emp.style.display = 'block'; return; }
        emp.style.display = 'none';
        this.trainees.forEach(t => {
            const doneLessons = new Set();
            (t.lessons || []).forEach(ls => {
                if (ls.mission === 'קורס')
                    (ls.lessonNums || []).forEach(n => doneLessons.add(n));
            });
            const maxL  = doneLessons.size;
            const pct   = Math.min((maxL / 50) * 100, 100).toFixed(0);
            const phase = maxL < 10 ? 'שלב טכני' : maxL < 30 ? 'שלב תפעולי' : 'שלב מסחרי';
            const safeName = t.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            l.innerHTML += `
            <div class="trainee-card" data-id="${t.id}">
                <div class="card-top">
                    <div class="card-name">${t.name}</div>
                    <div class="card-sub">${phase} • שיעור ${maxL}/50</div>
                    <div class="card-bar"><div class="card-bar-fill" style="width:${pct}%"></div></div>
                </div>
                <div class="card-bottom">
                    <span class="card-count">${(t.lessons || []).length} דיווחים</span>
                    <div class="card-acts">
                        <button class="cab" data-edit-name="${t.id}" data-name="${safeName}" title="עריכת שם">✏️</button>
                        <button class="cab del" data-delete-trainee="${t.id}" data-name="${safeName}" title="מחיקה">🗑️</button>
                    </div>
                </div>
            </div>`;
        });
    },

    addInstructor() {
        const inp = this.$('new-ins-name');
        const n   = inp.value.trim();
        if (!n) return;
        if (this.instructors.includes(n)) { alert('מדריך זה כבר קיים.'); return; }
        this.instructors.push(n);
        inp.value = '';
        this.persist();
        this.renderInsTags();
        this.updateInsDropdown();
    },

    showConfirm(msg, onYes) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);
            z-index:9999;display:flex;align-items:center;justify-content:center;`;
        overlay.innerHTML = `
            <div style="background:white;border-radius:16px;padding:28px 32px;
                        max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);
                        text-align:center;direction:rtl;">
                <div style="font-size:2em;margin-bottom:12px;">⚠️</div>
                <p style="margin:0 0 20px;color:#1a2a3a;font-size:1em;line-height:1.5;">${msg}</p>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button id="confirm-yes"
                        style="background:#e74c3c;color:white;border:none;padding:10px 24px;
                               border-radius:8px;font-weight:700;cursor:pointer;font-size:1em;">
                        כן, מחק
                    </button>
                    <button id="confirm-no"
                        style="background:#f0f4f8;color:#4a5568;border:1.5px solid #e2e8f0;
                               padding:10px 24px;border-radius:8px;font-weight:700;
                               cursor:pointer;font-size:1em;">
                        ביטול
                    </button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#confirm-yes').onclick = () => { document.body.removeChild(overlay); if (onYes) onYes(); };
        overlay.querySelector('#confirm-no').onclick  = () => { document.body.removeChild(overlay); };
        overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
    },

    showToast(msg) {
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
            background:#1a2a3a;color:white;padding:14px 28px;border-radius:12px;
            font-size:1em;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.3);
            animation:trainee-fadeIn 0.2s ease;`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; setTimeout(() => document.body.removeChild(t), 400); }, 2500);
    },

    removeInstructor(name) {
        this.showConfirm(`למחוק את <b>${name}</b> מרשימת המדריכים?`, () => {
            this.instructors = this.instructors.filter(i => i !== name);
            this.persist();
            this.renderInsTags();
            this.updateInsDropdown();
        });
    },

    renderInsTags() {
        const c = this.$('ins-tags');
        if (!c) return;
        c.innerHTML = !this.instructors.length
            ? '<p style="color:#a0aec0;font-size:0.85em;margin:8px 0 0">אין מדריכים עדיין.</p>'
            : this.instructors.map(n => `
                <span style="display:inline-flex;align-items:center;gap:8px;background:white;
                    border:1.5px solid #e2e8f0;border-radius:20px;padding:6px 10px 6px 14px;
                    margin:3px;font-size:0.9em;">
                    ${n}
                    <button
                        data-remove-ins="${n.replace(/"/g, '&quot;')}"
                        title="הסר מדריך"
                        style="background:#fee2e2;border:none;color:#e74c3c;cursor:pointer;
                               border-radius:50%;width:22px;height:22px;font-size:13px;
                               display:flex;align-items:center;justify-content:center;
                               font-weight:bold;flex-shrink:0;">✕</button>
                </span>`).join('');
    },

    updateInsDropdown() {
        const sel = this.$('in-ins');
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = `<option value="" disabled selected>-- בחר מרשימה --</option>`
            + this.instructors.map(i => `<option value="${i}"${i === cur ? ' selected' : ''}>${i}</option>`).join('');
    },

    openTrainee(id) {
        this.currentId = id;
        this.$('main-view').classList.remove('active-view');
        this.$('detail-view').classList.add('active-view');
        this.$('log-body').classList.remove('open');
        this.updateInsDropdown();
        setTimeout(() => this.initCanvas(), 200);
        this.resetForm();
        this.renderDetail();
    },

    showMainView() {
        this.currentId = null;
        this.$('detail-view').classList.remove('active-view');
        this.$('main-view').classList.add('active-view');
        this.renderList();
    },

    renderDetail() {
        const t = this.trainees.find(x => x.id === this.currentId);
        if (!t) return;

        let maxL = 0;
        const chinuchDone = new Set();
        let sums = [0, 0, 0, 0, 0];

        (t.lessons || []).forEach(l => {
            if (l.mission === 'קורס') {
                (l.lessonNums || []).forEach(n => { if (n > maxL) maxL = n; });
            } else if (l.mission === 'חניכה') {
                (l.lessonNums || []).forEach(n => chinuchDone.add(n));
            }
            [1, 2, 3, 4, 5].forEach((n, i) => sums[i] += (l['s' + n] || 0));
        });

        const len    = (t.lessons || []).length;
        const isTech = maxL < 11;

        this.$('det-name').innerText = t.name;
        this.$('det-sub').innerText  = `${len} דיווחים • קורס: שיעור ${maxL}/50 • חניכה: ${chinuchDone.size}/50`;
        this.setTrain(maxL);
        this.updateS2Label();

        const chinuchSection = this.$('chinuch-section');
        if (chinuchDone.size > 0) {
            chinuchSection.style.display = 'block';
            const pct = Math.min((chinuchDone.size / 50) * 100, 100);
            this.$('chinuch-bar-fill').style.width = pct + '%';
            this.$('chinuch-count').innerText = `${chinuchDone.size} / 50 שיעורים`;
        } else {
            chinuchSection.style.display = 'none';
        }

        const s2label = isTech ? 'מבנה דיפו' : 'מבנה קו';
        const labels  = ['מערכות רכבת', s2label, 'תפעול סטיק', 'נהלים', 'משמעת'];
        const avgs    = sums.map(s => len ? (s / (len * 10)) * 100 : 0);
        this.$('stats-row').innerHTML = labels.map((lbl, i) => {
            const a = avgs[i];
            const c = !len ? 'var(--neutral)' : a < 65 ? 'var(--danger)' : a < 82 ? 'var(--warning)' : 'var(--success)';
            const newTag = (!isTech && i === 1 && maxL === 11)
                ? `<div style="font-size:0.65em;opacity:0.85;margin-top:2px;">חדש</div>` : '';
            return `<div class="stat-card" style="background:${c}">
                        <div class="stat-label">${lbl}</div>
                        <div class="stat-val">${a.toFixed(0)}%</div>
                        ${newTag}
                    </div>`;
        }).join('');

        this.renderAlerts(t, len, maxL, avgs);

        const tbody = this.$('history-tbody');
        tbody.innerHTML = '';
        const lessons = t.lessons || [];
        [...lessons].reverse().forEach((l, revIdx) => {
            const realIdx = lessons.length - 1 - revIdx;
            tbody.innerHTML += `<tr>
                <td>${l.date}</td><td>${l.mission}</td>
                <td>${l.mission === 'שעות נוספות' ? l.extraDesc : (l.lessonNums || []).join(',')}</td>
                <td>${l.ins}</td>
                <td>${[1, 2, 3, 4, 5].map(n => `<span class="score-badge">${l['s' + n]}</span>`).join('')}</td>
                <td style="text-align:right;color:#555;">${l.notes || ''}</td>
                <td><button data-delete-lesson="${realIdx}" style="background:none;border:1px solid #e74c3c;color:#e74c3c;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.78em;" title="מחק שיעור">🗑️</button></td>
            </tr>`;
        });
    },

    updateChips() {
        const mission   = this.$('in-mission').value;
        const chips     = this.$('lesson-chips');
        const extraWrap = this.$('extra-wrap');
        chips.innerHTML = '';
        if (mission === 'שעות נוספות') {
            chips.style.display = 'none';
            extraWrap.style.display = 'block';
            return;
        }
        chips.style.display = 'flex';
        extraWrap.style.display = 'none';

        const t      = this.trainees.find(x => x.id === this.currentId);
        const isFree = mission === 'חניכה';

        const locked = new Set();
        (t.lessons || []).forEach(l => {
            if (l.mission === mission) (l.lessonNums || []).forEach(n => locked.add(n));
        });

        let next = 1;
        if (!isFree) { while (locked.has(next)) next++; }

        for (let i = 1; i <= 50; i++) {
            const isLocked = locked.has(i);
            const chip     = document.createElement('div');
            chip.className = 'chip';
            chip.innerText = i;

            let cls;
            if (this.selectedLessons.includes(i)) {
                cls = 'chip-selected';
            } else if (isLocked) {
                cls = 'chip-locked';
            } else if (isFree) {
                cls = 'chip-available';
            } else {
                cls = (i === next || this.selectedLessons.includes(i - 1)) ? 'chip-available' : 'chip-disabled';
            }

            chip.classList.add(cls);

            if (cls === 'chip-available' || cls === 'chip-selected') {
                chip.onclick = () => {
                    if (this.selectedLessons.includes(i)) {
                        if (isFree) this.selectedLessons = this.selectedLessons.filter(n => n !== i);
                        else        this.selectedLessons = this.selectedLessons.filter(n => n < i);
                    } else {
                        this.selectedLessons.push(i);
                    }
                    this.updateChips();
                };
            }
            chips.appendChild(chip);
        }
        this.updateS2Label();
    },

    saveLesson() {
        const errors  = [];
        const mission = this.$('in-mission').value;
        const ins     = this.$('in-ins').value;
        const scores  = [1, 2, 3, 4, 5].map(i => parseInt(this.$('s' + i).value));

        const t2 = this.trainees.find(x => x.id === this.currentId);
        let maxCourse2 = 0;
        (t2?.lessons || []).forEach(l => {
            if (l.mission === 'קורס') (l.lessonNums || []).forEach(n => { if (n > maxCourse2) maxCourse2 = n; });
        });
        if (mission === 'קורס' && this.selectedLessons.length)
            maxCourse2 = Math.max(maxCourse2, Math.max(...this.selectedLessons));
        const s2name = maxCourse2 < 11 ? 'מבנה דיפו' : 'מבנה קו';

        if (!ins) errors.push('• חובה לבחור מדריך / חונך מהרשימה');
        if (mission !== 'שעות נוספות' && !this.selectedLessons.length) errors.push('• חובה לסמן לפחות שיעור אחד');
        if (mission === 'שעות נוספות' && !this.$('in-extra').value.trim()) errors.push('• חובה לפרט את נושא השעות הנוספות');
        scores.forEach((s, i) => {
            if (isNaN(s) || s < 1 || s > 10) errors.push(`• ציון "${['מערכות רכבת', s2name, 'תפעול סטיק', 'נהלים', 'משמעת'][i]}" חסר או לא תקין (1-10)`);
        });
        if (!this.isSigned) errors.push('• חובה לחתום על הטופס לאישור');

        if (errors.length > 0) {
            this.showConfirm('⚠️ נא להשלים את השדות הבאים:<br><br>' + errors.join('<br>'), null);
            setTimeout(() => {
                const btn   = document.getElementById('confirm-yes');
                const noBtn = document.getElementById('confirm-no');
                if (btn)   { btn.textContent = 'הבנתי'; btn.style.background = '#3498db'; }
                if (noBtn) noBtn.style.display = 'none';
            }, 10);
            return;
        }

        const t = this.trainees.find(x => x.id === this.currentId);
        if (!t.lessons) t.lessons = [];
        t.lessons.push({
            date:       this.$('in-date').value,
            mission,
            lessonNums: [...this.selectedLessons],
            extraDesc:  this.$('in-extra').value,
            ins,
            s1: scores[0], s2: scores[1], s3: scores[2], s4: scores[3], s5: scores[4],
            notes: this.$('in-notes').value
        });
        this.persist();
        this.resetForm();
        this.renderDetail();
        this.showToast('✅ המשוב נשמר בהצלחה!');
    },

    deleteLesson(idx) {
        const t = this.trainees.find(x => x.id === this.currentId);
        if (!t) return;
        const l    = t.lessons[idx];
        const desc = l.mission === 'שעות נוספות'
            ? l.extraDesc
            : `שיעורים ${(l.lessonNums || []).join(',')}`;
        this.showConfirm(`למחוק את הדיווח מתאריך <b>${l.date}</b>?<br><small>${l.mission} — ${desc}</small><br><br>⚠️ פעולה זו אינה הפיכה.`, () => {
            t.lessons.splice(idx, 1);
            this.persist();
            this.renderDetail();
        });
    },

    resetForm() {
        this.$('in-date').valueAsDate = new Date();
        this.$('in-notes').value      = '';
        this.$('in-extra').value      = '';
        this.selectedLessons = [];
        [1, 2, 3, 4, 5].forEach(i => { this.$('s' + i).value = ''; });
        this.clearSig();
        this.updateChips();
    },

    initCanvas() {
        this.canvas = this.$('sig-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width  = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight || 140;
        this.ctx.strokeStyle = '#1a2a3a';
        this.ctx.lineWidth = 2.5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        if (this.canvas.dataset.bound) return;
        this.canvas.dataset.bound = '1';

        const getPos = (e) => {
            const r = this.canvas.getBoundingClientRect();
            const s = e.touches ? e.touches[0] : e;
            return { x: s.clientX - r.left, y: s.clientY - r.top };
        };

        this.canvas.addEventListener('mousedown',  (e) => { this.drawing = true; this.isSigned = true; const p = getPos(e); this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); });
        this.canvas.addEventListener('mousemove',  (e) => { if (!this.drawing) return; e.preventDefault(); const p = getPos(e); this.ctx.lineTo(p.x, p.y); this.ctx.stroke(); });
        this.canvas.addEventListener('touchstart', (e) => { this.drawing = true; this.isSigned = true; const p = getPos(e); this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); }, { passive: false });
        this.canvas.addEventListener('touchmove',  (e) => { if (!this.drawing) return; e.preventDefault(); const p = getPos(e); this.ctx.lineTo(p.x, p.y); this.ctx.stroke(); }, { passive: false });
        this.canvas.addEventListener('touchend',   () => { this.drawing = false; });
        window.addEventListener('mouseup', () => { this.drawing = false; });
    },

    clearSig() {
        if (this.canvas && this.canvas.width && this.ctx)
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.isSigned = false;
    },

    stepSkill(id, delta) {
        const el = this.$(id);
        const v  = parseInt(el.value) || 0;
        el.value = Math.max(1, Math.min(10, v + delta));
    },

    renderAlerts(t, len, maxL, avgs) {
        const container = this.$('alerts-container');
        if (!container) return;
        container.innerHTML = '';

        if (len === 0) {
            container.innerHTML = this.alertHTML('info', '💡', 'ברוך הבא', 'לא נמצאו דיווחים עדיין. הוסף משוב ראשון כדי להתחיל לקבל תובנות.');
            return;
        }

        const alerts = { green: [], red: [], orange: [], info: [] };

        if (len >= 25 && avgs.every(a => a > 85)) {
            alerts.green.push({ icon: '🟢', title: 'מוכן להסמכה', msg: 'החניך מציג יציבות גבוהה בכל הפרמטרים. ניתן לקבוע מבחן מסכם.' });
        }

        if (avgs[3] < 70) {
            alerts.red.push({ icon: '🔴', title: 'דגש בטיחות דחוף', msg: 'רמת הנהלים נמוכה מהנדרש. נדרש ריענון חוקה מיידי — החניך אינו מוכן לקו ללא שיפור.' });
        }
        if (avgs[4] < 60) {
            alerts.red.push({ icon: '🔴', title: 'חריגת משמעת', msg: 'רמת המשמעת המקצועית נמוכה. נדרשת שיחת בירור עם החניך.' });
        }

        if (avgs[2] < 70) {
            alerts.orange.push({ icon: '🟠', title: 'קושי בתפעול', msg: 'ציון סטיק נמוך. נדרש תרגול מגרש/מוסך (ללא נוסעים) לפני חזרה לקו.' });
        }
        if ((avgs[0] - avgs[2]) >= 15) {
            alerts.orange.push({ icon: '🟠', title: 'פער תפעולי', msg: 'הידע המערכתי גבוה משמעותית מהיכולת המעשית בסטיק. נדרש תרגול פיזי מוגבר.' });
        }

        if (len >= 6) {
            const lessons = t.lessons || [];
            const avgAll  = l => ([1, 2, 3, 4, 5].reduce((s, n) => s + (l['s' + n] || 0), 0) / 5);
            const recent  = lessons.slice(-3).map(avgAll);
            const prev    = lessons.slice(-6, -3).map(avgAll);
            const avgR    = recent.reduce((a, b) => a + b, 0) / 3;
            const avgP    = prev.reduce((a, b) => a + b, 0) / 3;
            const diff    = avgR - avgP;
            if (diff <= -2) {
                alerts.orange.push({ icon: '📉', title: 'ירידה משמעותית בביצועים', msg: 'שיעורים אחרונים מראים ירידה בולטת ביחס לקודמיהם. מומלץ לקיים שיחת משוב עם החניך ולבחון גורמים אפשריים כמו עומס, עייפות או קושי ספציפי בחומר.' });
            } else if (diff <= -1) {
                alerts.orange.push({ icon: '📉', title: 'ירידה קלה בביצועים', msg: 'זוהתה ירידה קלה בשיעורים האחרונים. כדאי לבדוק האם מדובר בתנודה זמנית או בקושי מתפתח.' });
            }
        }

        const hasWarnings = alerts.red.length > 0 || alerts.orange.length > 0;
        if (!hasWarnings) {
            if (len >= 6) {
                const lessons = t.lessons || [];
                const avgAll  = l => ([1, 2, 3, 4, 5].reduce((s, n) => s + (l['s' + n] || 0), 0) / 5);
                const recent  = lessons.slice(-3).map(avgAll);
                const prev    = lessons.slice(-6, -3).map(avgAll);
                const diff    = (recent.reduce((a, b) => a + b, 0) / 3) - (prev.reduce((a, b) => a + b, 0) / 3);
                if (diff >= 2) {
                    alerts.info.push({ icon: '📈', title: 'שיפור בולט בביצועים', msg: 'שיעורים אחרונים מראים עלייה בולטת לעומת הקודמים. החניך בפסגת הביצועים שלו — כדאי לנצל את המומנטום ולהתקדם לחומר מאתגר יותר.' });
                } else if (diff >= 1) {
                    alerts.info.push({ icon: '📈', title: 'שיפור מתמיד', msg: 'ביצועי החניך בשיפור מתמיד בשיעורים האחרונים. כדאי לשמר את קצב ההתקדמות.' });
                }
            }
            if (avgs[2] > 85 && maxL > 10) {
                alerts.info.push({ icon: '✅', title: 'ביצועי סטיק מצוינים', msg: 'ניתן להתקדם לתרגול קטעים מורכבים בקו.' });
            }
            if (maxL > 30 && maxL < 45) {
                alerts.info.push({ icon: '📊', title: 'שלב תפעולי מתקדם', msg: 'דגש על עמידה בלוחות זמנים ועל מסחריות מול נוסעים.' });
            }
            if (maxL >= 45) {
                alerts.info.push({ icon: '🏁', title: 'לקראת סיום הכשרה', msg: 'החניך מתקרב לשיעור 50. מומלץ לתזמן סימולציית מבחן מסכם.' });
            }
            if (!alerts.info.length && !alerts.green.length) {
                alerts.info.push({ icon: '💡', title: 'התקדמות תקינה', msg: 'החניך בשלבי למידה. מומלץ לוודא הבנה של מערכות הנהיגה הבסיסיות.' });
            }
        }

        if (len > 0) {
            const lastLesson = (t.lessons || []).slice(-1)[0];
            if (lastLesson?.date) {
                const days = Math.floor((Date.now() - new Date(lastLesson.date)) / 86400000);
                if (days > 14) {
                    alerts.info.push({ icon: '⏰', title: 'תזכורת המשך הכשרה', msg: `לא בוצע שיעור כבר ${days} ימים. מומלץ לתזמן המשך הכשרה בהקדם.` });
                }
            }
        }

        [...alerts.green, ...alerts.red, ...alerts.orange, ...alerts.info].forEach(a => {
            const level = alerts.green.includes(a) ? 'green' : alerts.red.includes(a) ? 'red' : alerts.orange.includes(a) ? 'orange' : 'info';
            container.innerHTML += this.alertHTML(level, a.icon, a.title, a.msg);
        });
    },

    alertHTML(level, icon, title, msg) {
        const styles = {
            green:  { bg: '#f0fff4', border: '#38a169', right: '5px solid #38a169' },
            red:    { bg: '#fff5f5', border: '#e74c3c', right: '5px solid #e74c3c' },
            orange: { bg: '#fffaf0', border: '#f39c12', right: '5px solid #f39c12' },
            info:   { bg: '#ebf8ff', border: '#3498db', right: '5px solid #3498db' },
        };
        const s = styles[level] || styles.info;
        return `<div style="
            background:${s.bg};
            border:1px solid ${s.border};
            border-right:${s.right};
            padding:14px 18px;
            border-radius:12px;
            margin-bottom:10px;
            display:flex;
            align-items:flex-start;
            gap:12px;
        ">
            <span style="font-size:20px; line-height:1.3;">${icon}</span>
            <div>
                <b style="color:#1a2a3a; display:block; margin-bottom:3px; font-size:0.95em;">${title}</b>
                <span style="color:#4a5568; font-size:0.88em; line-height:1.5;">${msg}</span>
            </div>
        </div>`;
    }
};

if (typeof window !== 'undefined') window.TraineeSystem = TraineeSystem;
