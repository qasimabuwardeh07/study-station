(function () {
  'use strict';

  /* ============================================================
     CONSTANTS
     ============================================================ */
  const LS_KEY_LINKS = 'study_links';
  const LS_KEY_NOTES = 'study_notes';
  const LS_KEY_TASKS = 'study_tasks';
  const LS_KEY_WRITING = 'study_writing';
  const LS_KEY_STREAK = 'study_streak';
  const LS_KEY_LAST_DATE = 'study_last_date';
  const LS_KEY_TODAY_SESSIONS = 'study_today_sessions';
  const LS_KEY_TOTAL_SESSIONS = 'study_total_sessions';
  const LS_KEY_DAILY_GOAL = 'study_daily_goal';

  const FOCUS_SECONDS = 25 * 60;
  const BREAK_SECONDS = 5 * 60;
  const DAILY_GOAL_DEFAULT = 8;

  const TRACKS = [
    { 
        name: 'سورة البقرة', 
        artist: 'مشاري العفاسي', 
        src: 'https://server8.mp3quran.net/afs/002.mp3', 
        duration: '2:04:31' 
    },
    { 
        name: 'سورة الكهف', 
        artist: 'عبد الرحمن السديس', 
        src: 'https://server7.mp3quran.net/sds/018.mp3', 
        duration: '28:15' 
    },
    { 
        name: 'سورة الملك', 
        artist: 'ماهر المعيقلي', 
        src: 'https://server12.mp3quran.net/maher/067.mp3', 
        duration: '07:34' 
    },
    { 
        name: 'سورة الرحمن', 
        artist: 'إسلام صبحي', 
        src: 'https://server14.mp3quran.net/islam/055.mp3', 
        duration: '11:18' 
    }
];
  const QUOTES = [
    'The secret of getting ahead is getting started. — Mark Twain',
    'The only way to do great work is to love what you do. — Steve Jobs',
    'Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill',
    'Believe you can and you\'re halfway there. — Theodore Roosevelt',
    'The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt',
    'It does not matter how slowly you go as long as you do not stop. — Confucius',
    'Everything you\'ve ever wanted is on the other side of fear. — George Addair',
    'The only person you are destined to become is the person you decide to be. — Ralph Waldo Emerson',
    'What lies behind us and what lies before us are tiny matters compared to what lies within us. — Ralph Waldo Emerson',
    'Creativity is intelligence having fun. — Albert Einstein',
    'The mind is everything. What you think you become. — Buddha',
    'The best time to plant a tree was 20 years ago. The second best time is now. — Chinese Proverb',
    'You miss 100% of the shots you don\'t take. — Wayne Gretzky',
    'The only limit to our realization of tomorrow will be our doubts of today. — Franklin D. Roosevelt',
    'Do what you can, with what you have, where you are. — Theodore Roosevelt',
    'Strive not to be a success, but rather to be of value. — Albert Einstein',
    'The way to get started is to quit talking and begin doing. — Walt Disney',
    'Life is what happens when you\'re busy making other plans. — John Lennon',
    'The purpose of our lives is to be happy. — Dalai Lama',
    'Get busy living or get busy dying. — Stephen King',
    'You only live once, but if you do it right, once is enough. — Mae West',
    'The unexamined life is not worth living. — Socrates',
    'Turn your wounds into wisdom. — Oprah Winfrey',
    'In the middle of every difficulty lies opportunity. — Albert Einstein',
    'What we think, we become. — Buddha',
    'The only impossible journey is the one you never begin. — Tony Robbins',
    'Act as if what you do makes a difference. It does. — William James',
    'What you get by achieving your goals is not as important as what you become by achieving your goals. — Zig Ziglar',
    'Be the change that you wish to see in the world. — Mahatma Gandhi',
    'The best revenge is massive success. — Frank Sinatra',
    'First, solve the problem. Then, write the code. — John Johnson',
    'Talk is cheap. Show me the code. — Linus Torvalds',
    'Programming isn\'t about what you know; it\'s about what you can figure out. — Chris Pine',
  ];

  /* ============================================================
     STATE
     ============================================================ */
  let state = {
    links: [],
    tasks: [],
    notes: '',
    writingContent: '',
    streak: 0,
    lastStudyDate: null,
    todaySessions: 0,
    totalSessions: 0,
    dailyGoal: DAILY_GOAL_DEFAULT,
    // pomodoro
    pomodoroSeconds: FOCUS_SECONDS,
    pomodoroRemaining: FOCUS_SECONDS,
    pomodoroMode: 'focus',
    pomodoroRunning: false,
    pomodoroInterval: null,
    // radio
    currentTrackIndex: 0,
    isPlaying: false,
  };

  let audio = null;
  let canvasCtx = null;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  /* ============================================================
     DOM REFS
     ============================================================ */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ============================================================
     LOCAL STORAGE HELPERS
     ============================================================ */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function saveJSON(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function loadState() {
    state.links = loadJSON(LS_KEY_LINKS, []);
    state.tasks = loadJSON(LS_KEY_TASKS, []);
    state.notes = localStorage.getItem(LS_KEY_NOTES) || '';
    state.writingContent = localStorage.getItem(LS_KEY_WRITING) || '';
    state.streak = loadJSON(LS_KEY_STREAK, 0);
    state.lastStudyDate = localStorage.getItem(LS_KEY_LAST_DATE) || null;
    state.todaySessions = loadJSON(LS_KEY_TODAY_SESSIONS, 0);
    state.totalSessions = loadJSON(LS_KEY_TOTAL_SESSIONS, 0);
    state.dailyGoal = loadJSON(LS_KEY_DAILY_GOAL, DAILY_GOAL_DEFAULT);
    // reset todaySessions if it's a new day
    const today = getDateStr();
    if (state.lastStudyDate !== today) {
      state.todaySessions = 0;
      saveJSON(LS_KEY_TODAY_SESSIONS, 0);
    }
  }

  function getDateStr() {
    return new Date().toISOString().split('T')[0];
  }

  /* ============================================================
     SPA ROUTER
     ============================================================ */
  function navigateTo(page) {
    $$('.page').forEach(p => p.classList.remove('active'));
    $$('.nav-link').forEach(l => l.classList.remove('active'));

    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');

    const linkEl = document.querySelector('.nav-link[data-page="' + page + '"]');
    if (linkEl) linkEl.classList.add('active');

    if (page === 'sketch') initCanvas();
  }

  function handleHash() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
  }

  /* ============================================================
     TOAST NOTIFICATIONS
     ============================================================ */
  function showToast(msg, duration) {
    duration = duration || 3000;
    const toast = document.getElementById('notification-toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.add('hidden'), duration);
  }

  /* ============================================================
     QUOTES
     ============================================================ */
  function setRandomQuote() {
    const el = document.getElementById('quote-text');
    if (!el) return;
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    el.textContent = q;
  }

  /* ============================================================
     STREAK & PROGRESS
     ============================================================ */
  function updateStreak() {
    document.getElementById('streak-count').textContent = state.streak;
  }

  function updateProgress() {
    document.getElementById('today-sessions').textContent = state.todaySessions;
    document.getElementById('total-sessions').textContent = state.totalSessions;
    const pct = Math.min(100, (state.todaySessions / state.dailyGoal) * 100);
    document.getElementById('daily-progress-fill').style.width = pct + '%';
    document.getElementById('daily-progress-text').textContent = state.todaySessions + ' / ' + state.dailyGoal + ' sessions';
    updateStreak();
  }

  function recordSession() {
    const today = getDateStr();
    state.totalSessions++;
    saveJSON(LS_KEY_TOTAL_SESSIONS, state.totalSessions);

    if (state.lastStudyDate === today) {
      state.todaySessions++;
    } else if (state.lastStudyDate === getYesterday()) {
      state.streak++;
      state.lastStudyDate = today;
      state.todaySessions = 1;
    } else {
      state.streak = 1;
      state.lastStudyDate = today;
      state.todaySessions = 1;
    }

    saveJSON(LS_KEY_STREAK, state.streak);
    localStorage.setItem(LS_KEY_LAST_DATE, state.lastStudyDate);
    saveJSON(LS_KEY_TODAY_SESSIONS, state.todaySessions);
    updateProgress();
  }

  function getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  /* ============================================================
     DING SOUND (Web Audio API)
     ============================================================ */
  function playDing() {
    try {
      const aCtx = new (window.AudioContext || window.webkitAudioContext)();

      const osc1 = aCtx.createOscillator();
      const gain1 = aCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(aCtx.destination);
      osc1.frequency.setValueAtTime(660, aCtx.currentTime);
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.3, aCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, aCtx.currentTime + 0.6);
      osc1.start(aCtx.currentTime);
      osc1.stop(aCtx.currentTime + 0.6);

      const osc2 = aCtx.createOscillator();
      const gain2 = aCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(aCtx.destination);
      osc2.frequency.setValueAtTime(880, aCtx.currentTime + 0.15);
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, aCtx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, aCtx.currentTime + 0.8);
      osc2.start(aCtx.currentTime + 0.15);
      osc2.stop(aCtx.currentTime + 0.8);
    } catch (e) {
      // silently fail
    }
  }

  /* ============================================================
     BROWSER NOTIFICATION
     ============================================================ */
  function sendNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body: body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification(title, { body: body });
        }
      });
    }
  }

  /* ============================================================
     POMODORO TIMER
     ============================================================ */
  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    display.textContent = formatTime(state.pomodoroRemaining);

    const total = state.pomodoroMode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS;
    const pct = ((total - state.pomodoroRemaining) / total) * 100;
    document.getElementById('timer-progress-fill').style.width = pct + '%';

    document.getElementById('timer-mode-label').textContent =
      state.pomodoroMode === 'focus' ? 'Focus' : 'Break';

    display.classList.toggle('break-mode', state.pomodoroMode !== 'focus');
  }

  function timerTick() {
    if (state.pomodoroRemaining > 0) {
      state.pomodoroRemaining--;
      updateTimerDisplay();
    }

    if (state.pomodoroRemaining <= 0) {
      clearInterval(state.pomodoroInterval);
      state.pomodoroInterval = null;
      state.pomodoroRunning = false;

      playDing();
      sendNotification('Pomodoro Complete', state.pomodoroMode === 'focus' ? 'Time for a break!' : 'Focus session starting!');

      if (state.pomodoroMode === 'focus') {
        recordSession();
        showToast('Focus session complete! Great work.');
        state.pomodoroMode = 'break';
        state.pomodoroRemaining = BREAK_SECONDS;
      } else {
        state.pomodoroMode = 'focus';
        state.pomodoroRemaining = FOCUS_SECONDS;
        showToast('Break over. Time to focus!');
      }

      updateTimerDisplay();
      document.getElementById('timer-start-btn').disabled = false;
      document.getElementById('timer-pause-btn').disabled = true;
    }
  }

  function startPomodoro() {
    if (state.pomodoroRunning) return;
    if (state.pomodoroRemaining <= 0) {
      state.pomodoroRemaining = state.pomodoroMode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS;
    }
    state.pomodoroRunning = true;
    state.pomodoroInterval = setInterval(timerTick, 1000);
    document.getElementById('timer-start-btn').disabled = true;
    document.getElementById('timer-pause-btn').disabled = false;
  }

  function pausePomodoro() {
    if (!state.pomodoroRunning) return;
    clearInterval(state.pomodoroInterval);
    state.pomodoroInterval = null;
    state.pomodoroRunning = false;
    document.getElementById('timer-start-btn').disabled = false;
    document.getElementById('timer-pause-btn').disabled = true;
  }

  function resetPomodoro() {
    clearInterval(state.pomodoroInterval);
    state.pomodoroInterval = null;
    state.pomodoroRunning = false;
    state.pomodoroMode = 'focus';
    state.pomodoroRemaining = FOCUS_SECONDS;
    updateTimerDisplay();
    document.getElementById('timer-start-btn').disabled = false;
    document.getElementById('timer-pause-btn').disabled = true;
  }

  /* ============================================================
     STUDY RESOURCES - LINKS
     ============================================================ */
  function renderLinks() {
    const container = document.getElementById('links-list');
    if (!container) return;
    if (state.links.length === 0) {
      container.innerHTML = '<li class="empty-state">No links saved yet.</li>';
      return;
    }
    container.innerHTML = state.links.map((link, idx) =>
      '<li class="link-item">' +
        '<a href="' + link.url + '" target="_blank" rel="noopener">' +
          (link.title || link.url) +
        '</a>' +
        '<button class="delete-link-btn" data-index="' + idx + '">' +
          '<i data-lucide="x"></i>' +
        '</button>' +
      '</li>'
    ).join('');
    lucide.createIcons();
    container.querySelectorAll('.delete-link-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.dataset.index);
        state.links.splice(idx, 1);
        saveJSON(LS_KEY_LINKS, state.links);
        renderLinks();
        showToast('Link removed.');
      });
    });
  }

  function addLink() {
    const urlInput = document.getElementById('link-url');
    const titleInput = document.getElementById('link-title');
    const url = urlInput.value.trim();
    if (!url) return;
    let href = url;
    if (!/^https?:\/\//i.test(href)) href = 'https://' + href;
    state.links.push({ url: href, title: titleInput.value.trim() });
    saveJSON(LS_KEY_LINKS, state.links);
    urlInput.value = '';
    titleInput.value = '';
    renderLinks();
    showToast('Link added.');
  }

  /* ============================================================
     STUDY RESOURCES - NOTES
     ============================================================ */
  function loadNotes() {
    const ta = document.getElementById('notes-textarea');
    if (ta) ta.value = state.notes;
  }

  function saveNotes() {
    const ta = document.getElementById('notes-textarea');
    if (!ta) return;
    state.notes = ta.value;
    localStorage.setItem(LS_KEY_NOTES, state.notes);
  }

  /* ============================================================
     TASK BOARD
     ============================================================ */
  function renderTasks() {
    const container = document.getElementById('tasks-list');
    if (!container) return;
    if (state.tasks.length === 0) {
      container.innerHTML = '<li class="empty-state">No tasks yet. Add one above.</li>';
      return;
    }
    container.innerHTML = state.tasks.map((task, idx) =>
      '<li class="task-item' + (task.completed ? ' completed' : '') + '">' +
        '<input type="checkbox" class="task-checkbox" data-index="' + idx + '"' +
          (task.completed ? ' checked' : '') + ' />' +
        '<span class="task-text">' + escapeHtml(task.text) + '</span>' +
        '<button class="delete-task-btn" data-index="' + idx + '">' +
          '<i data-lucide="trash-2"></i>' +
        '</button>' +
      '</li>'
    ).join('');
    lucide.createIcons();

    container.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('change', function () {
        const idx = parseInt(this.dataset.index);
        state.tasks[idx].completed = this.checked;
        saveJSON(LS_KEY_TASKS, state.tasks);
        renderTasks();
      });
    });

    container.querySelectorAll('.delete-task-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.dataset.index);
        state.tasks.splice(idx, 1);
        saveJSON(LS_KEY_TASKS, state.tasks);
        renderTasks();
        showToast('Task deleted.');
      });
    });
  }

  function addTask() {
    const input = document.getElementById('task-input');
    const text = input.value.trim();
    if (!text) return;
    state.tasks.push({ text: text, completed: false, createdAt: Date.now() });
    saveJSON(LS_KEY_TASKS, state.tasks);
    input.value = '';
    renderTasks();
    showToast('Task added.');
  }

  /* ============================================================
     WRITING LAB
     ============================================================ */
  function loadWriting() {
    const ta = document.getElementById('writing-textarea');
    if (ta) ta.value = state.writingContent;
  }

  function saveWriting() {
    const ta = document.getElementById('writing-textarea');
    if (!ta) return;
    state.writingContent = ta.value;
    localStorage.setItem(LS_KEY_WRITING, state.writingContent);
  }

  function downloadTxt() {
    const content = state.writingContent || '';

    // Count paragraphs/words for stats
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const lines = content ? content.split('\n').length : 0;
    const chars = content.length;

    const header =
      'Study OS - Writing Lab Export\n' +
      'Exported: ' + new Date().toLocaleString() + '\n' +
      'Stats: ' + words + ' words | ' + lines + ' lines | ' + chars + ' characters\n' +
      '─────────────────────────────────────────\n\n';

    const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'writing-export-' + Date.now() + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Writing exported as .txt');
  }

  /* ============================================================
     SKETCH PAD
     ============================================================ */
  function initCanvas() {
    const canvas = document.getElementById('sketch-canvas');
    if (!canvas) return;

    // Set actual canvas resolution
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      // Save drawing data across resize
      const tempData = canvasCtx ? canvasCtx.getImageData(0, 0, canvas.width, canvas.height) : null;
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvasCtx = canvas.getContext('2d');
      canvasCtx.strokeStyle = document.getElementById('sketch-color').value;
      canvasCtx.lineWidth = parseInt(document.getElementById('sketch-size').value);
      canvasCtx.lineCap = 'round';
      canvasCtx.lineJoin = 'round';
      if (tempData && tempData.width > 0 && tempData.height > 0) {
        canvasCtx.putImageData(tempData, 0, 0);
      }
    } else if (!canvasCtx) {
      canvasCtx = canvas.getContext('2d');
      canvasCtx.strokeStyle = document.getElementById('sketch-color').value;
      canvasCtx.lineWidth = parseInt(document.getElementById('sketch-size').value);
      canvasCtx.lineCap = 'round';
      canvasCtx.lineJoin = 'round';
    }
  }

  function getCanvasPos(e) {
    const canvas = document.getElementById('sketch-canvas');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getCanvasPos(e);
    lastX = pos.x;
    lastY = pos.y;
  }

  function draw(e) {
    e.preventDefault();
    if (!isDrawing || !canvasCtx) return;
    const pos = getCanvasPos(e);
    canvasCtx.beginPath();
    canvasCtx.moveTo(lastX, lastY);
    canvasCtx.lineTo(pos.x, pos.y);
    canvasCtx.stroke();
    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDrawing(e) {
    e.preventDefault();
    isDrawing = false;
  }

  function updateBrush() {
    if (!canvasCtx) return;
    canvasCtx.strokeStyle = document.getElementById('sketch-color').value;
    canvasCtx.lineWidth = parseInt(document.getElementById('sketch-size').value);
  }

  function clearCanvas() {
    const canvas = document.getElementById('sketch-canvas');
    if (!canvas || !canvasCtx) return;
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    showToast('Canvas cleared.');
  }

  function saveCanvas() {
    const canvas = document.getElementById('sketch-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketch-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Sketch saved as PNG.');
  }

  /* ============================================================
     LO-FI RADIO
     ============================================================ */
  function initRadio() {
    if (!audio) {
      audio = new Audio();
      audio.volume = parseFloat(document.getElementById('volume-slider').value);
    }
    renderPlaylist();
  }

  function renderPlaylist() {
    const container = document.getElementById('playlist-list');
    if (!container) return;
    container.innerHTML = TRACKS.map((track, idx) =>
      '<li class="playlist-item' + (idx === state.currentTrackIndex ? ' active' : '') + '" data-index="' + idx + '">' +
        '<span class="track-num">' + (idx + 1) + '</span>' +
        '<div class="track-info">' +
          '<div class="track-name">' + track.name + '</div>' +
          '<div class="track-artist">' + track.artist + '</div>' +
        '</div>' +
        '<span class="track-duration">' + track.duration + '</span>' +
      '</li>'
    ).join('');

    container.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', function () {
        const idx = parseInt(this.dataset.index);
        playTrack(idx);
      });
    });
  }

  function playTrack(index) {
    if (!audio) initRadio();
    state.currentTrackIndex = index;
    const track = TRACKS[index];
    audio.src = track.src;
    audio.load();
    audio.play().then(() => {
      state.isPlaying = true;
      updateRadioUI();
      renderPlaylist();
    }).catch(() => {
      showToast('Could not play stream. Try a different track.');
    });
  }

  function togglePlayPause() {
    if (!audio || !audio.src) {
      playTrack(0);
      return;
    }
    if (state.isPlaying) {
      audio.pause();
      state.isPlaying = false;
    } else {
      audio.play().then(() => {
        state.isPlaying = true;
      }).catch(() => {
        playTrack(state.currentTrackIndex);
      });
    }
    updateRadioUI();
  }

  function updateRadioUI() {
    const playBtn = document.getElementById('radio-play-btn');
    if (!playBtn) return;
    const icon = playBtn.querySelector('i');
    if (state.isPlaying) {
      playBtn.innerHTML = '<i data-lucide="pause"></i>';
    } else {
      playBtn.innerHTML = '<i data-lucide="play"></i>';
    }
    lucide.createIcons();

    document.getElementById('track-name').textContent =
      TRACKS[state.currentTrackIndex] ? TRACKS[state.currentTrackIndex].name : 'No track selected';
    document.getElementById('track-artist').textContent =
      TRACKS[state.currentTrackIndex] ? TRACKS[state.currentTrackIndex].artist : 'Lo-fi Beats';
  }

  function updateVolume() {
    if (audio) {
      audio.volume = parseFloat(document.getElementById('volume-slider').value);
    }
  }

  function updateSeek() {
    if (audio && audio.duration) {
      const pct = (audio.currentTime / audio.duration) * 100;
      document.getElementById('seek-slider').value = pct;
      document.getElementById('current-time').textContent = formatTimeAudio(audio.currentTime);
      document.getElementById('duration').textContent = formatTimeAudio(audio.duration);
    }
  }

  function seekTo(e) {
    if (audio && audio.duration) {
      const pct = parseFloat(e.target.value);
      audio.currentTime = (pct / 100) * audio.duration;
    }
  }

  function formatTimeAudio(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function handleTrackEnd() {
    state.isPlaying = false;
    updateRadioUI();
    // Auto-play next track
    const next = (state.currentTrackIndex + 1) % TRACKS.length;
    playTrack(next);
  }

  /* ============================================================
     ESCAPE HTML
     ============================================================ */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ============================================================
     EVENT BINDING
     ============================================================ */
  function bindEvents() {
    // Router
    window.addEventListener('hashchange', handleHash);

    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function (e) {
        // Let the hashchange handle navigation
      });
    });

    // Links
    document.getElementById('add-link-btn').addEventListener('click', addLink);
    document.getElementById('link-url').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addLink();
    });

    // Notes auto-save (debounced)
    const notesTa = document.getElementById('notes-textarea');
    if (notesTa) {
      let notesTimer;
      notesTa.addEventListener('input', function () {
        clearTimeout(notesTimer);
        notesTimer = setTimeout(saveNotes, 500);
      });
    }

    // Timer
    document.getElementById('timer-start-btn').addEventListener('click', startPomodoro);
    document.getElementById('timer-pause-btn').addEventListener('click', pausePomodoro);
    document.getElementById('timer-reset-btn').addEventListener('click', resetPomodoro);

    // Tasks
    document.getElementById('add-task-btn').addEventListener('click', addTask);
    document.getElementById('task-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addTask();
    });

    // Writing
    const writingTa = document.getElementById('writing-textarea');
    if (writingTa) {
      let writingTimer;
      writingTa.addEventListener('input', function () {
        clearTimeout(writingTimer);
        writingTimer = setTimeout(saveWriting, 500);
      });
    }
    document.getElementById('download-txt-btn').addEventListener('click', downloadTxt);

    // Sketch
    document.getElementById('sketch-color').addEventListener('input', updateBrush);
    document.getElementById('sketch-size').addEventListener('input', updateBrush);
    document.getElementById('sketch-clear-btn').addEventListener('click', clearCanvas);
    document.getElementById('sketch-save-btn').addEventListener('click', saveCanvas);

    const canvas = document.getElementById('sketch-canvas');
    if (canvas) {
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseleave', stopDrawing);
      canvas.addEventListener('touchstart', startDrawing, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', stopDrawing, { passive: false });
    }

    // Radio
    document.getElementById('radio-play-btn').addEventListener('click', togglePlayPause);
    document.getElementById('volume-slider').addEventListener('input', updateVolume);
    document.getElementById('seek-slider').addEventListener('input', seekTo);
    if (audio) {
      audio.addEventListener('timeupdate', updateSeek);
      audio.addEventListener('ended', handleTrackEnd);
    }
  }

  /* ============================================================
     RESIZE HANDLER for Canvas
     ============================================================ */
  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const page = document.getElementById('page-sketch');
      if (page && page.classList.contains('active')) {
        initCanvas();
      }
    }, 200);
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    loadState();

    // Render initial UI
    setRandomQuote();
    updateProgress();
    renderLinks();
    loadNotes();
    renderTasks();
    loadWriting();
    initRadio();

    // Set initial timer display
    updateTimerDisplay();

    // Handle initial hash
    handleHash();

    // Bind all events
    bindEvents();

    // Create Lucide icons
    lucide.createIcons();

    // Resize listener
    window.addEventListener('resize', handleResize);

    console.log('Study OS initialized.');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
