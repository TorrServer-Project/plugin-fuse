'use strict';

// Конфигурация монтирования хранится в хранилище плагина.
var CONFIG_KEY = 'config';
var DEFAULT_CONFIG = {
    autostart: false,
    path: '',
    allow_other: false
};

var currentConfig = loadConfig();

function loadConfig() {
    var raw = ts.storage.get(CONFIG_KEY);
    if (!raw) return copyConfig(DEFAULT_CONFIG);

    try {
        return normalizeConfig(JSON.parse(raw));
    } catch (e) {
        console.log("[FUSE] Corrupted configuration, reset to defaults: " + e);
        return copyConfig(DEFAULT_CONFIG);
    }
}

function copyConfig(cfg) {
    return { autostart: cfg.autostart, path: cfg.path, allow_other: cfg.allow_other };
}

function normalizeConfig(raw) {
    if (!raw || typeof raw !== 'object') return copyConfig(DEFAULT_CONFIG);
    return {
        autostart: raw.autostart === true,
        path: typeof raw.path === 'string' ? raw.path.trim() : '',
        allow_other: raw.allow_other === true
    };
}

function saveConfig(cfg) {
    currentConfig = normalizeConfig(cfg);
    ts.storage.set(CONFIG_KEY, JSON.stringify(currentConfig));
    return currentConfig;
}

// requireOwner пускает только владельца: монтирование затрагивает всю машину.
function requireOwner(req, res) {
    if (!req.user || req.user.rank < 100) {
        res.status(403).json({ error: "forbidden" });
        return false;
    }
    return true;
}

function statusPayload() {
    var st = ts.fuse.status();
    return {
        supported: st.supported === true,
        mounted: st.mounted === true,
        path: st.path || '',
        mount_time: st.mount_time || 0,
        config: copyConfig(currentConfig)
    };
}

ts.web.get('/api/status', function(req, res) {
    if (!requireOwner(req, res)) return;
    res.json(statusPayload());
});

ts.web.post('/api/mount', function(req, res) {
    if (!requireOwner(req, res)) return;

    var body = req.body || {};
    var path = String(body.path || currentConfig.path || '').trim();
    if (!path) return res.status(400).json({ ok: false, code: 'empty_path' });

    var allowOther = body.allow_other === true;

    // Конфигурация сохраняется только после успешного монтирования:
    // иначе отклонённый путь затёр бы предыдущий рабочий.
    var result = ts.fuse.mount(path, { allow_other: allowOther });
    if (!result.ok) {
        console.error("[FUSE] Mount failed: " + result.code + " " + result.error);
        return res.status(400).json(result);
    }

    saveConfig({ autostart: currentConfig.autostart, path: path, allow_other: allowOther });
    res.json(statusPayload());
});

ts.web.post('/api/unmount', function(req, res) {
    if (!requireOwner(req, res)) return;

    var result = ts.fuse.unmount();
    if (!result.ok) {
        console.error("[FUSE] Unmount failed: " + result.code + " " + result.error);
        return res.status(400).json(result);
    }

    res.json(statusPayload());
});

ts.web.post('/api/config', function(req, res) {
    if (!requireOwner(req, res)) return;

    var body = req.body || {};
    saveConfig({
        autostart: body.autostart === true,
        path: typeof body.path === 'string' ? body.path : currentConfig.path,
        allow_other: body.allow_other === true
    });

    res.json(statusPayload());
});

ts.web.staticFile('/', 'index.html');
ts.web.staticFile('/index.html', 'index.html');
ts.web.staticDir('/js', 'js');
ts.web.staticDir('/img', 'img');

// Монтирование при старте: сбой не мешает загрузить плагин.
if (currentConfig.autostart && currentConfig.path && ts.fuse.supported()) {
    var started = ts.fuse.mount(currentConfig.path, { allow_other: currentConfig.allow_other });
    if (started.ok) {
        console.log("[FUSE] Mounted at startup: " + started.path);
    } else {
        console.log("[FUSE] Startup mount failed: " + started.code + " " + started.error);
    }
}

console.log("[FUSE] Started");
