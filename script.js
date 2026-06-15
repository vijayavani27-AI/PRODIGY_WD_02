document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     DOM ELEMENTS
     ========================================================================== */
  const displayHours = document.getElementById('time-hours');
  const displayMinutes = document.getElementById('time-minutes');
  const displaySeconds = document.getElementById('time-seconds');
  const displayMs = document.getElementById('time-ms');
  const deltaDisplay = document.getElementById('delta-time');
  
  const statusBadge = document.getElementById('status-badge');
  const badgeText = statusBadge.querySelector('.badge-text');
  const timerRing = document.getElementById('timer-ring');
  const progressIndicator = document.getElementById('progress-indicator');
  
  const btnStart = document.getElementById('btn-start');
  const btnLap = document.getElementById('btn-lap');
  const btnReset = document.getElementById('btn-reset');
  
  const lapsPanel = document.getElementById('laps-panel');
  const lapsList = document.getElementById('laps-list');
  const btnClearLaps = document.getElementById('btn-clear-laps');
  
  const fastestLapVal = document.getElementById('fastest-lap-val');
  const slowestLapVal = document.getElementById('slowest-lap-val');

  /* ==========================================================================
     STOPWATCH STATE VARIABLES
     ========================================================================== */
  let startTime = 0;
  let accumulatedTime = 0;
  let running = false;
  let animationFrameId = null;
  
  let laps = [];
  let lastLapCumulativeTime = 0;

  // Track progress circle circumference dynamically for responsiveness
  let circumference = progressIndicator.getTotalLength();
  
  // Set initial indicator state
  progressIndicator.style.strokeDasharray = circumference;
  progressIndicator.style.strokeDashoffset = circumference;

  // Readjust circumference on resize
  window.addEventListener('resize', () => {
    circumference = progressIndicator.getTotalLength();
    progressIndicator.style.strokeDasharray = circumference;
    if (!running && accumulatedTime === 0) {
      progressIndicator.style.strokeDashoffset = circumference;
    }
  });

  /* ==========================================================================
     TIME FORMATTING HELPERS
     ========================================================================== */
  function formatTime(totalMs) {
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const ms = Math.floor((totalMs % 1000) / 10); // 2 digits display

    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
      ms: String(ms).padStart(2, '0')
    };
  }

  function formatTimeToString(totalMs) {
    const time = formatTime(totalMs);
    return `${time.minutes}:${time.seconds}.${time.ms}`;
  }

  /* ==========================================================================
     STOPWATCH ENGINE LOOP
     ========================================================================== */
  function updateTimer() {
    const currentTime = performance.now();
    const elapsedTime = currentTime - startTime + accumulatedTime;
    
    // Update digital readout
    const formatted = formatTime(elapsedTime);
    
    if (displayHours.textContent !== formatted.hours) displayHours.textContent = formatted.hours;
    if (displayMinutes.textContent !== formatted.minutes) displayMinutes.textContent = formatted.minutes;
    if (displaySeconds.textContent !== formatted.seconds) displaySeconds.textContent = formatted.seconds;
    if (displayMs.textContent !== formatted.ms) displayMs.textContent = formatted.ms;

    // Update live lap delta
    const currentLapDelta = elapsedTime - lastLapCumulativeTime;
    deltaDisplay.textContent = formatTimeToString(currentLapDelta);

    // Update circular indicator progress (fill up every 60 seconds)
    const cycleMs = elapsedTime % 60000;
    const progress = cycleMs / 60000;
    const offset = circumference - (progress * circumference);
    progressIndicator.style.strokeDashoffset = offset;

    // Request next frame
    animationFrameId = requestAnimationFrame(updateTimer);
  }

  /* ==========================================================================
     STOPWATCH ACTIONS
     ========================================================================== */
  function startStopwatch() {
    if (running) return;
    running = true;
    
    startTime = performance.now();
    
    // Trigger loop
    animationFrameId = requestAnimationFrame(updateTimer);

    // Update UI states
    statusBadge.className = 'status-badge running';
    badgeText.textContent = 'Running';
    timerRing.classList.add('active-pulse');
    
    btnStart.classList.add('running');
    btnStart.innerHTML = `<i class="fa-solid fa-pause"></i><span>Pause</span>`;
    
    btnLap.disabled = false;
    btnReset.disabled = true; // Disable reset while running
  }

  function pauseStopwatch() {
    if (!running) return;
    running = false;
    
    // Stop loop
    cancelAnimationFrame(animationFrameId);
    
    // Save state
    accumulatedTime += performance.now() - startTime;

    // Update UI states
    statusBadge.className = 'status-badge paused';
    badgeText.textContent = 'Paused';
    timerRing.classList.remove('active-pulse');
    
    btnStart.classList.remove('running');
    btnStart.innerHTML = `<i class="fa-solid fa-play"></i><span>Resume</span>`;
    
    btnLap.disabled = true; // Cannot record laps while paused
    btnReset.disabled = false; // Enable reset when paused
  }

  function resetStopwatch() {
    running = false;
    cancelAnimationFrame(animationFrameId);
    
    // Reset state
    accumulatedTime = 0;
    startTime = 0;
    lastLapCumulativeTime = 0;
    laps = [];

    // Reset Display
    displayHours.textContent = '00';
    displayMinutes.textContent = '00';
    displaySeconds.textContent = '00';
    displayMs.textContent = '00';
    deltaDisplay.textContent = '00:00.00';

    // Reset Progress Ring
    progressIndicator.style.strokeDashoffset = circumference;

    // Update UI States
    statusBadge.className = 'status-badge';
    badgeText.textContent = 'Ready';
    timerRing.classList.remove('active-pulse');
    
    btnStart.classList.remove('running');
    btnStart.innerHTML = `<i class="fa-solid fa-play"></i><span>Start</span>`;
    
    btnLap.disabled = true;
    btnReset.disabled = true;
    
    // Close lap history logs panel
    lapsPanel.classList.add('hidden');
    lapsList.innerHTML = '';
    
    fastestLapVal.textContent = '-';
    slowestLapVal.textContent = '-';
  }

  function recordLap() {
    if (!running) return;

    const currentTime = performance.now();
    const overallTime = currentTime - startTime + accumulatedTime;
    const splitTime = overallTime - lastLapCumulativeTime;
    
    lastLapCumulativeTime = overallTime;

    const lapNum = laps.length + 1;
    const lapData = { lapNum, splitTime, overallTime };
    laps.push(lapData);

    // Open logs panel if first lap
    if (laps.length === 1) {
      lapsPanel.classList.remove('hidden');
    }

    // Render lap row in UI
    renderLapRow(lapData);
    
    // Recalculate and highlight fastest/slowest laps
    updateLapHighlights();
  }

  /* ==========================================================================
     LAP LOGGER RENDERERS
     ========================================================================== */
  function renderLapRow(lapData) {
    const tr = document.createElement('tr');
    tr.id = `lap-row-${lapData.lapNum}`;
    
    tr.innerHTML = `
      <td class="lap-num-cell">#${String(lapData.lapNum).padStart(2, '0')}</td>
      <td class="lap-split-cell">${formatTimeToString(lapData.splitTime)}</td>
      <td class="lap-overall-cell">${formatTimeToString(lapData.overallTime)}</td>
    `;
    
    // Prepend new laps to top of list
    lapsList.insertBefore(tr, lapsList.firstChild);
    lapsList.parentElement.parentElement.scrollTop = 0; // Scroll to top
  }

  function updateLapHighlights() {
    if (laps.length < 2) {
      // Highlight single lap as fastest by default for user visual confirmation
      if (laps.length === 1) {
        const row = document.getElementById(`lap-row-1`);
        if (row) {
          row.classList.add('lap-row-fastest');
          const splitCell = row.querySelector('.lap-split-cell');
          splitCell.innerHTML = `${formatTimeToString(laps[0].splitTime)} <i class="fa-solid fa-bolt lap-tag-icon" title="Fastest"></i>`;
        }
        fastestLapVal.textContent = formatTimeToString(laps[0].splitTime);
        slowestLapVal.textContent = formatTimeToString(laps[0].splitTime);
      }
      return;
    }

    // Find min and max split values
    let minIdx = 0;
    let maxIdx = 0;
    
    for (let i = 1; i < laps.length; i++) {
      if (laps[i].splitTime < laps[minIdx].splitTime) minIdx = i;
      if (laps[i].splitTime > laps[maxIdx].splitTime) maxIdx = i;
    }

    // Reset styles of all rows
    laps.forEach(lap => {
      const row = document.getElementById(`lap-row-${lap.lapNum}`);
      if (row) {
        row.className = '';
        row.querySelector('.lap-split-cell').textContent = formatTimeToString(lap.splitTime);
      }
    });

    // Apply fastest styles
    const fastestRow = document.getElementById(`lap-row-${laps[minIdx].lapNum}`);
    if (fastestRow) {
      fastestRow.classList.add('lap-row-fastest');
      const splitCell = fastestRow.querySelector('.lap-split-cell');
      splitCell.innerHTML = `${formatTimeToString(laps[minIdx].splitTime)} <i class="fa-solid fa-bolt lap-tag-icon" title="Fastest"></i>`;
    }

    // Apply slowest styles (only if min and max are not the same node)
    if (minIdx !== maxIdx) {
      const slowestRow = document.getElementById(`lap-row-${laps[maxIdx].lapNum}`);
      if (slowestRow) {
        slowestRow.classList.add('lap-row-slowest');
        const splitCell = slowestRow.querySelector('.lap-split-cell');
        splitCell.innerHTML = `${formatTimeToString(laps[maxIdx].splitTime)} <i class="fa-solid fa-turtle lap-tag-icon" title="Slowest"></i>`;
      }
    }

    // Set summary cards
    fastestLapVal.textContent = formatTimeToString(laps[minIdx].splitTime);
    slowestLapVal.textContent = formatTimeToString(laps[maxIdx].splitTime);
  }

  /* ==========================================================================
     EVENT LISTENERS & BINDINGS
     ========================================================================== */
  btnStart.addEventListener('click', () => {
    if (running) {
      pauseStopwatch();
    } else {
      startStopwatch();
    }
  });

  btnLap.addEventListener('click', recordLap);
  btnReset.addEventListener('click', resetStopwatch);

  btnClearLaps.addEventListener('click', () => {
    // Keep lap data state but reset UI logs representation
    lapsList.innerHTML = '';
    lapsPanel.classList.add('hidden');
    fastestLapVal.textContent = '-';
    slowestLapVal.textContent = '-';
    
    // Clear array but keep active timing elapsed values running
    laps = [];
    lastLapCumulativeTime = running ? (performance.now() - startTime + accumulatedTime) : accumulatedTime;
  });

  /* ==========================================================================
     KEYBOARD SHORTCUTS HANDLERS
     ========================================================================== */
  window.addEventListener('keydown', (e) => {
    // Avoid capturing inputs if users focus interactive elements (none inside except buttons)
    if (e.target.tagName === 'BUTTON') {
      e.target.blur(); // Blur button to prevent space key double-triggering clicks
    }

    const key = e.key.toLowerCase();
    
    if (e.code === 'Space' || key === ' ') {
      e.preventDefault(); // Prevent page scrolling
      if (running) {
        pauseStopwatch();
      } else {
        startStopwatch();
      }
    } else if (key === 'l') {
      e.preventDefault();
      if (running) {
        recordLap();
      }
    } else if (key === 'r') {
      e.preventDefault();
      if (!running && accumulatedTime > 0) {
        resetStopwatch();
      }
    }
  });
});
