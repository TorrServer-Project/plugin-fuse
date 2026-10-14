'use strict';

function t(key, def) {
    return (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(key, def) : key;
}

// showToast добавляет уведомление в общий контейнер: классы и разметка
// берутся из общего стиля.
function showToast(message, type) {
    var root = document.getElementById('toast-root');
    if (!root) return;

    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.textContent = message;
    root.appendChild(el);

    requestAnimationFrame(function() { el.classList.add('toast-show'); });
    setTimeout(function() {
        el.classList.remove('toast-show');
        setTimeout(function() { el.remove(); }, 300);
    }, 4000);
}

function el(id) {
    return document.getElementById(id);
}

// errorText переводит код отказа в понятное сообщение и добавляет
// подробность от сервера, если она есть.
function errorText(result) {
    var code = (result && result.code) ? result.code : 'mount_failed';
    var key = 'plugin.fuse.error_' + code;
    var text = t(key);

    if (text === key) text = t('plugin.fuse.error_mount_failed');

    var detail = result && result.detail ? String(result.detail) : '';
    return detail ? text + ': ' + detail : text;
}

function configBody() {
    return {
        autostart: el('autostart-input').checked,
        allow_other: el('allow-other-input').checked,
        path: el('path-input').value.trim()
    };
}

// fillForm заполняет поля формы. Вызывается при загрузке страницы,
// чтобы обновление состояния не стирало введённый путь.
function fillForm(config) {
    if (!config) return;
    el('path-input').value = config.path || '';
    el('autostart-input').checked = config.autostart === true;
    el('allow-other-input').checked = config.allow_other === true;
}

// renderStatus переключает режимы страницы.
// Пока ничего не смонтировано, поля доступны для правки, а кнопки
// размонтирования нет. После монтирования настройки блокируются,
// а размонтирование переезжает на панель состояния.
function renderStatus(state) {
    var supported = state.supported === true;
    var mounted = state.mounted === true;

    el('unsupported-panel').style.display = supported ? 'none' : '';
    el('mount-panel').style.display = supported ? '' : 'none';
    el('mounted-panel').style.display = mounted ? '' : 'none';

    el('path-input').disabled = mounted;
    el('autostart-input').disabled = mounted;
    el('allow-other-input').disabled = mounted;
    el('btn-save').disabled = mounted;
    el('btn-mount').disabled = mounted;

    if (mounted) el('mounted-path').textContent = state.path || '';
}

// loadStatus читает состояние и, если нужно, заполняет форму.
function loadStatus(fill) {
    return fetch('api/status')
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.error) {
                showToast(d.error, 'error');
                return;
            }
            if (fill) fillForm(d.config);
            renderStatus(d);
        })
        .catch(function(e) { showToast(e.message, 'error'); });
}

// post отправляет команду и обновляет состояние по её результату.
function post(route, body, okMessage) {
    return fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
    })
        .then(function(r) {
            return r.json().then(function(d) { return { status: r.status, body: d }; });
        })
        .then(function(res) {
            if (res.status >= 400 || res.body.ok === false) {
                showToast(errorText(res.body), 'error');
                return loadStatus(false);
            }
            showToast(okMessage, 'success');
            renderStatus(res.body);
        })
        .catch(function(e) { showToast(e.message, 'error'); });
}

document.getElementById('btn-save').addEventListener('click', function() {
    post('api/config', configBody(), t('plugin.fuse.saved'));
});

document.getElementById('btn-mount').addEventListener('click', function() {
    var body = configBody();
    if (!body.path) {
        showToast(t('plugin.fuse.error_empty_path'), 'error');
        return;
    }
    post('api/mount', { path: body.path, allow_other: body.allow_other }, t('plugin.fuse.mounted'));
});

document.getElementById('btn-unmount').addEventListener('click', function() {
    post('api/unmount', {}, t('plugin.fuse.unmounted'));
});

if (typeof i18n !== 'undefined' && i18n.apply) i18n.apply();
loadStatus(true);
