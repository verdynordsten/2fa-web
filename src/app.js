// 2FA Live Code — static TOTP generator, no backend, no database.
(function () {
  'use strict';

  var STORE_KEY = 'totp2fa.accounts.v1';
  var PERIOD = 30;

  var els = {};
  ['secretInput', 'labelInput', 'pasteBtn', 'addBtn', 'scanBtn', 'uploadBtn',
   'qrFile', 'scannerWrap', 'scannerVideo', 'stopScanBtn', 'codeDisplay',
   'copyBtn', 'autoCopy', 'activeLabel', 'accountList', 'exportBtn',
   'importBtn', 'importFile', 'clearBtn', 'clearCache', 'timeFill', 'countText'
  ].forEach(function (id) { els[id] = document.getElementById(id); });

  var state = {
    accounts: loadAccounts(),
    activeId: null,
    lastCode: '',
    scanStream: null,
    scanTimer: null
  };

  function loadAccounts() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveAccounts() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.accounts)); } catch (e) {}
  }

  function uid() {
    return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Accept raw base32 secret or otpauth:// URI. Returns {secret, label}.
  function parseInput(raw) {
    var text = (raw || '').trim().replace(/[\s-]/g, '');
    if (!text) return null;
    if (/^otpauth:\/\//i.test(raw.trim())) {
      try {
        var uri = OTPAuth.URI.parse(raw.trim());
        return { secret: uri.secret.base32, label: uri.label || uri.issuer || 'account' };
      } catch (e) { return null; }
    }
    var secret = text.toUpperCase();
    if (!/^[A-Z2-7]+=*$/.test(secret) || secret.length < 8) return null;
    return { secret: secret, label: '' };
  }

  function currentTotp(secret) {
    var totp = new OTPAuth.TOTP({ secret: secret, digits: 6, period: PERIOD });
    return totp.generate();
  }

  // Format 6-digit code as "123 456" for display.
  function pretty(code) {
    return code.length === 6 ? code.slice(0, 3) + ' ' + code.slice(3) : code;
  }

  function activeAccount() {
    for (var i = 0; i < state.accounts.length; i++) {
      if (state.accounts[i].id === state.activeId) return state.accounts[i];
    }
    return null;
  }

  function maskSecret(secret) {
    var s = String(secret).replace(/[\s-]/g, '');
    if (s.length <= 8) return s.slice(0, 4) + ' \u2022\u2022\u2022\u2022';
    return s.slice(0, 4) + ' \u2022\u2022\u2022\u2022 ' + s.slice(-4);
  }

  function refreshLoop() {
    var now = Math.floor(Date.now() / 1000);
    var remain = PERIOD - (now % PERIOD);
    var frac = remain / PERIOD;
    els.countText.textContent = String(remain) + 's left';
    els.timeFill.style.width = (frac * 100).toFixed(1) + '%';

    var secret = els.secretInput.value.trim();
    var acc = activeAccount();
    if (acc) secret = acc.secret;
    if (!secret) {
      els.codeDisplay.textContent = '--- ---';
      els.activeLabel.textContent = 'Waiting for a live feed';
      return;
    }
    var parsed = parseInput(secret);
    if (!parsed) {
      els.codeDisplay.textContent = '--- ---';
      els.activeLabel.textContent = 'Invalid secret';
      return;
    }
    try {
      var code = currentTotp(parsed.secret);
      els.codeDisplay.textContent = pretty(code);
      els.activeLabel.textContent = acc ? ('Live: ' + acc.label) : 'Live one-shot feed (not pinned)';
      if (code !== state.lastCode) {
        state.lastCode = code;
        if (els.autoCopy.checked) copyText(code);
      }
    } catch (e) {
      els.codeDisplay.textContent = '--- ---';
      els.activeLabel.textContent = 'Invalid secret';
    }
  }

  function copyText(text) {
    var clean = String(text).replace(/\s/g, '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(clean).catch(function () { fallbackCopy(clean); });
    } else { fallbackCopy(clean); }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function flashBtn(btn, label) {
    var old = btn.textContent;
    btn.textContent = label || 'Copied';
    setTimeout(function () { btn.textContent = old; }, 1200);
  }

  function renderAccounts() {
    els.accountList.innerHTML = '';
    if (!state.accounts.length) {
      var empty = document.createElement('li');
      empty.textContent = 'No pinned feeds yet. Feed a secret to go live.';
      els.accountList.appendChild(empty);
      return;
    }
    state.accounts.forEach(function (acc) {
      var li = document.createElement('li');
      var dot = document.createElement('span');
      dot.className = 'key-dot';
      var mask = document.createElement('span');
      mask.className = 'key-mask';
      mask.textContent = acc.label + '  ' + maskSecret(acc.secret) + (acc.id === state.activeId ? ' (active)' : '');
      var mini = document.createElement('span');
      mini.className = 'recent-code';
      try { mini.textContent = pretty(currentTotp(acc.secret)); } catch (e) { mini.textContent = '--- ---'; }
      var btns = document.createElement('span');
      btns.className = 'row-btns';
      var useBtn = document.createElement('button');
      useBtn.textContent = 'Use';
      useBtn.addEventListener('click', function () {
        state.activeId = acc.id;
        els.secretInput.value = '';
        renderAccounts();
      });
      var copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', function () {
        var raw = mini.textContent.replace(/\s/g, '');
        if (!/^\d{6}$/.test(raw)) return;
        copyText(raw);
        flashBtn(copyBtn);
      });
      var delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'danger';
      delBtn.addEventListener('click', function () {
        askConfirm(
          'Delete this feed?',
          'Feed "' + acc.label + '" will be removed from this browser. Its live codes stop here.',
          'Yes, delete',
          function () {
            state.accounts = state.accounts.filter(function (a) { return a.id !== acc.id; });
            if (state.activeId === acc.id) state.activeId = null;
            saveAccounts();
            renderAccounts();
            toast('Feed deleted');
          }
        );
      });
      btns.appendChild(useBtn);
      btns.appendChild(copyBtn);
      btns.appendChild(delBtn);
      li.appendChild(dot);
      li.appendChild(mask);
      li.appendChild(mini);
      li.appendChild(btns);
      els.accountList.appendChild(li);
    });
  }

  // ---- QR: upload decode ----
  function decodeQrFromCanvas(canvas) {
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var res = jsQR(data.data, canvas.width, canvas.height);
    return res ? res.data : null;
  }

  function applyQrText(qrText) {
    var parsed = parseInput(qrText);
    if (!parsed) {
      els.activeLabel.textContent = 'QR decoded but no TOTP secret found';
      return;
    }
    els.secretInput.value = parsed.secret;
    if (parsed.label && !els.labelInput.value) els.labelInput.value = parsed.label;
    els.activeLabel.textContent = 'Loaded from QR: ' + (parsed.label || 'secret');
  }

  // ---- QR: live camera scan ----
  function startScan() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      els.activeLabel.textContent = 'Camera not supported in this browser';
      return;
    }
    els.scannerWrap.classList.remove('hidden');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (stream) {
        state.scanStream = stream;
        els.scannerVideo.srcObject = stream;
        return els.scannerVideo.play();
      })
      .then(function () { state.scanTimer = setInterval(tickScan, 400); })
      .catch(function () { els.activeLabel.textContent = 'Camera permission denied'; });
  }

  function tickScan() {
    var v = els.scannerVideo;
    if (!v.videoWidth) return;
    var canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d').drawImage(v, 0, 0);
    var text = decodeQrFromCanvas(canvas);
    if (text) {
      applyQrText(text);
      stopScan();
    }
  }

  function stopScan() {
    if (state.scanTimer) { clearInterval(state.scanTimer); state.scanTimer = null; }
    if (state.scanStream) {
      state.scanStream.getTracks().forEach(function (t) { t.stop(); });
      state.scanStream = null;
    }
    els.scannerWrap.classList.add('hidden');
  }

  // ---- events ----
  els.pasteBtn.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) { els.secretInput.value = t.trim(); }).catch(function () {
        els.activeLabel.textContent = 'Clipboard blocked — paste manually (Ctrl+V)';
      });
    } else {
      els.activeLabel.textContent = 'Clipboard API unavailable — paste manually (Ctrl+V)';
    }
  });

  els.clearBtn.addEventListener('click', function () {
    els.secretInput.value = '';
    state.activeId = null;
    renderAccounts();
  });

  els.addBtn.addEventListener('click', function () {
    var parsed = parseInput(els.secretInput.value);
    if (!parsed) {
      els.activeLabel.textContent = 'Invalid secret — check and retry';
      return;
    }
    var label = els.labelInput.value.trim() || parsed.label || ('account-' + (state.accounts.length + 1));
    state.accounts.push({ id: uid(), label: label, secret: parsed.secret });
    state.activeId = state.accounts[state.accounts.length - 1].id;
    els.secretInput.value = '';
    els.labelInput.value = '';
    saveAccounts();
    renderAccounts();
  });

  els.scanBtn.addEventListener('click', startScan);
  els.stopScanBtn.addEventListener('click', stopScan);
  els.uploadBtn.addEventListener('click', function () { els.qrFile.click(); });
  els.qrFile.addEventListener('change', function () {
    var f = els.qrFile.files[0];
    if (!f) return;
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      var text = decodeQrFromCanvas(canvas);
      if (text) applyQrText(text);
      else els.activeLabel.textContent = 'No QR code found in image';
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
    els.qrFile.value = '';
  });

  function toast(msg) {
    var box = document.getElementById('toast');
    var text = document.getElementById('toastText');
    if (!box || !text) return;
    text.textContent = msg;
    box.classList.remove('hidden');
    // Force reflow so the transition replays on rapid clicks.
    void box.offsetWidth;
    box.classList.add('show');
    if (toast._t) clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      box.classList.remove('show');
      setTimeout(function () { box.classList.add('hidden'); }, 300);
    }, 2200);
  }

  function askConfirm(title, text, yesLabel, onYes) {
    var wrap = document.getElementById('confirmWrap');
    var titleEl = document.getElementById('confirmTitle');
    var textEl = document.getElementById('confirmText');
    var yesBtn = document.getElementById('confirmYes');
    var noBtn = document.getElementById('confirmNo');
    if (!wrap || !titleEl || !textEl || !yesBtn || !noBtn) {
      onYes();
      return;
    }
    titleEl.textContent = title;
    textEl.textContent = text;
    yesBtn.textContent = yesLabel;
    wrap.classList.remove('hidden');
    yesBtn.onclick = function () {
      wrap.classList.add('hidden');
      onYes();
    };
    noBtn.onclick = function () {
      wrap.classList.add('hidden');
    };
    wrap.onclick = function (ev) {
      if (ev.target === wrap) wrap.classList.add('hidden');
    };
  }

  els.copyBtn.addEventListener('click', function () {
    var raw = els.codeDisplay.textContent.replace(/\s/g, '');
    if (/^\d{6}$/.test(raw)) {
      copyText(raw);
      toast('Live code copied');
    }
  });

  els.exportBtn.addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(state.accounts, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'totp-accounts.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });

  els.importBtn.addEventListener('click', function () { els.importFile.click(); });
  els.importFile.addEventListener('change', function () {
    var f = els.importFile.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error('bad file');
        var clean = arr.filter(function (a) { return a && a.secret && a.label; })
          .map(function (a) { return { id: uid(), label: String(a.label), secret: String(a.secret) }; });
        state.accounts = state.accounts.concat(clean);
        saveAccounts();
        renderAccounts();
      } catch (e) { els.activeLabel.textContent = 'Import failed — invalid JSON'; }
    };
    reader.readAsText(f);
    els.importFile.value = '';
  });

  els.clearCache.addEventListener('click', function () {
    if (!state.accounts.length) {
      toast('Nothing to clear');
      return;
    }
    askConfirm(
      'Clear all feeds?',
      'All ' + state.accounts.length + ' pinned feeds will be removed from this browser. Export a backup first if needed.',
      'Yes, clear all',
      function () {
        state.accounts = [];
        state.activeId = null;
        saveAccounts();
        renderAccounts();
        toast('Local cache cleared');
      }
    );
  });

  renderAccounts();
  setInterval(refreshLoop, 500);
  setInterval(renderAccounts, 5000);
  refreshLoop();
})();
