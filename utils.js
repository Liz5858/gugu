const storageKey = "gugumon-player-name"
const clearedLevelsKeyPrefix = "gugumon-cleared-levels"
const BOLTS_STORAGE_KEY = "userBolts"
const defaultName = "댕댕"
const SUB_LEVELS_PER_DAN = 19
const PROBLEMS_PER_STAGE = 19
const BASIC_LEVEL_MAX = 9
const SPEED_BONUS_FAST_MS = 2000
const SPEED_BONUS_MID_MS = 4000
const LEVEL_UP_AVG_TIME_MS = 3000
const LEVEL_UP_MIN_MASTERY = 150
const ZONE_PAIR_BOLT_REWARD = 15

function getZoneClearBoltBonus(zoneDan) {
  return (zoneDan - 1) * 10
}

let toastTimer
let popupTimer
let levelClearTimer
let zoneClearTimer
let zonePreviewTimer
let activeSlot = "a"
let lastProblem = null
let currentPower = 0

const gameState = {
  bolts: 0,
  combo: 0,
  inputs: { a: "", b: "" },
  foundPairs: new Set(),
  zoneDan: 2,
  zoneTargetN: 8,
  zoneFactorPairs: [],
}

function loadUserBoltsMap() {
  const raw = localStorage.getItem(BOLTS_STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function saveBolts(userName = getCurrentPlayerName()) {
  const boltsMap = loadUserBoltsMap()
  boltsMap[userName] = gameState.bolts
  localStorage.setItem(BOLTS_STORAGE_KEY, JSON.stringify(boltsMap))
}

function loadBolts(userName = getCurrentPlayerName()) {
  const boltsMap = loadUserBoltsMap()
  gameState.bolts = Number(boltsMap[userName]) || 0
  return gameState.bolts
}

function resetStoredBolts(userName = getCurrentPlayerName()) {
  gameState.bolts = 0
  const boltsMap = loadUserBoltsMap()
  delete boltsMap[userName]
  localStorage.setItem(BOLTS_STORAGE_KEY, JSON.stringify(boltsMap))
}

const playState = {
  multiplier: 2,
  multiplicand: 1,
  subLevel: 1,
  answerInput: "",
  currentDan: 2,
  currentTimes: 1,
  bundleCount: 0,
  isSwapped: false,
  questionsAnswered: 0,
  questionStartTime: 0,
  stageCombo: 0,
  sessionResults: [],
}

function syncBundleStateFromQuestion() {
  playState.currentDan = playState.multiplier
  playState.currentTimes = playState.multiplicand
}

function getBundleUiElements() {
  return {
    totalDisplay: document.getElementById("total-text-display"),
    circleArea: document.getElementById("circle-display-area"),
    circleBundles: document.getElementById("circleBundles"),
    addBundleBtn: document.getElementById("add-bundle-btn"),
    swapBtn: document.getElementById("swap-btn"),
    playHintEl: document.getElementById("playHint"),
  }
}

function getBundleMaxCount() {
  return playState.currentTimes
}

function ensureBundleButtonsVisible() {
  const { addBundleBtn, swapBtn } = getBundleUiElements()

  if (addBundleBtn) {
    addBundleBtn.hidden = false
    addBundleBtn.style.removeProperty("display")
    addBundleBtn.style.removeProperty("visibility")
  }

  if (swapBtn) {
    swapBtn.hidden = false
    swapBtn.style.removeProperty("display")
    swapBtn.style.removeProperty("visibility")
  }
}

function updateTotalDisplay() {
  const { totalDisplay } = getBundleUiElements()
  if (!totalDisplay) return

  const bundleCount = playState.bundleCount
  const currentDan = playState.currentDan
  const maxBundles = getBundleMaxCount()

  if (bundleCount === 0) {
    totalDisplay.textContent = ""
    return
  }

  const valuesToShow = bundleCount === maxBundles ? bundleCount - 1 : bundleCount
  const parts = []

  for (let i = 1; i <= valuesToShow; i += 1) {
    parts.push(String(i * currentDan))
  }

  if (bundleCount === maxBundles) {
    parts.push("?")
  }

  totalDisplay.textContent = parts.join(" ")
}

function renderBundleCircles() {
  const { circleArea, circleBundles } = getBundleUiElements()
  if (!circleArea || !circleBundles) return

  circleBundles.innerHTML = ""

  if (playState.bundleCount === 0) {
    circleArea.classList.remove("circle-area--active")
    return
  }

  circleArea.classList.add("circle-area--active")

  for (let bundleIndex = 0; bundleIndex < playState.bundleCount; bundleIndex += 1) {
    const bundle = document.createElement("div")
    bundle.className = "circle-bundle"
    if (bundleIndex === playState.bundleCount - 1) {
      bundle.classList.add("circle-bundle--new")
    }

    for (let dotIndex = 0; dotIndex < playState.currentDan; dotIndex += 1) {
      const dot = document.createElement("div")
      dot.className = "circle-dot"
      dot.setAttribute("aria-hidden", "true")
      bundle.appendChild(dot)
    }

    circleBundles.appendChild(bundle)
  }
}

function updateAddBundleButton() {
  const { addBundleBtn } = getBundleUiElements()
  if (!addBundleBtn) return

  const isComplete = playState.bundleCount >= getBundleMaxCount()
  addBundleBtn.disabled = isComplete
  addBundleBtn.classList.toggle("action-btn--disabled", isComplete)
  ensureBundleButtonsVisible()
}

function syncBundleUi() {
  updateTotalDisplay()
  renderBundleCircles()
  updateAddBundleButton()
  ensureBundleButtonsVisible()
}

function resetBundleControls() {
  playState.bundleCount = 0
  syncBundleUi()
}

function setBundleHint(message) {
  const { playHintEl } = getBundleUiElements()
  if (playHintEl) playHintEl.textContent = message
}

function addOneBundle() {
  const maxBundles = getBundleMaxCount()
  if (playState.bundleCount >= maxBundles) return

  playState.bundleCount += 1
  syncBundleUi()

  if (playState.bundleCount === maxBundles) {
    setBundleHint("모든 묶음을 만들었어요! 이제 [확인] 버튼으로 정답을 입력해 보세요.")
    return
  }

  setBundleHint(`${playState.currentDan}씩 묶음 ${playState.bundleCount}/${maxBundles}개를 만들었어요!`)
}

function swapBundleOrder() {
  const tempDan = playState.currentDan
  playState.currentDan = playState.currentTimes
  playState.currentTimes = tempDan
  playState.isSwapped = !playState.isSwapped
  playState.bundleCount = 0

  updatePlayView()
  syncBundleUi()
  setBundleHint(`${playState.currentDan}×${playState.currentTimes} 순서로 다시 묶어 봐요!`)
}

function initBundleControls() {
  ensureBundleButtonsVisible()
  syncBundleUi()
}

function calculateMastery(timeMs, isCorrect, combo) {
  if (!isCorrect) return 0

  const baseScore = 100
  let speedBonus = 0
  if (timeMs <= SPEED_BONUS_FAST_MS) speedBonus = 100
  else if (timeMs <= SPEED_BONUS_MID_MS) speedBonus = 50

  return (baseScore + speedBonus) * (1 + combo * 0.1)
}

function checkLevelUp(sessionResults) {
  if (sessionResults.length < PROBLEMS_PER_STAGE) {
    return { passed: false, reason: "incomplete", accuracy: 0, avgTime: 0, avgMastery: 0 }
  }

  const total = sessionResults.length
  const correctCount = sessionResults.filter((result) => result.isCorrect).length
  const accuracy = correctCount / total
  const avgTime = sessionResults.reduce((sum, result) => sum + result.timeMs, 0) / total
  const avgMastery = sessionResults.reduce((sum, result) => sum + result.masteryScore, 0) / total

  if (accuracy < 1) {
    return { passed: false, reason: "accuracy", accuracy, avgTime, avgMastery }
  }
  if (avgTime > LEVEL_UP_AVG_TIME_MS) {
    return { passed: false, reason: "speed", accuracy, avgTime, avgMastery }
  }
  if (avgMastery < LEVEL_UP_MIN_MASTERY) {
    return { passed: false, reason: "mastery", accuracy, avgTime, avgMastery }
  }

  return { passed: true, reason: "clear", accuracy, avgTime, avgMastery }
}

function getSessionSummary(sessionResults = playState.sessionResults) {
  const count = sessionResults.length
  if (count === 0) {
    return { avgTime: 0, avgMastery: 0, accuracy: 0 }
  }

  const correctCount = sessionResults.filter((result) => result.isCorrect).length
  return {
    avgTime: sessionResults.reduce((sum, result) => sum + result.timeMs, 0) / count,
    avgMastery: sessionResults.reduce((sum, result) => sum + result.masteryScore, 0) / count,
    accuracy: correctCount / count,
  }
}

function updatePlanetVisual(dan, growthStage) {
  const planet = document.querySelector(`.planet[data-level="${dan}"]`)
  if (!planet) return

  const progress = loadGugudanProgress(dan)
  planet.style.setProperty("--growth-stage", growthStage)
  planet.classList.remove("planet--growing")
  void planet.offsetWidth
  planet.classList.add("planet--growing")
  applyPlanetGrowth(planet, progress)
}

function showToast(message) {
  window.clearTimeout(toastTimer)
  toast.textContent = message
  toast.classList.add("show")
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show")
  }, 2200)
}

function showCelebration() {
  window.clearTimeout(popupTimer)
  celebrationPopup.classList.add("show")
  popupTimer = window.setTimeout(() => {
    celebrationPopup.classList.remove("show")
  }, 1500)
}

function getAvatarText(name) {
  return name.trim().charAt(0) || defaultName.charAt(0)
}

function getCurrentPlayerName() {
  return localStorage.getItem(storageKey)?.trim() || defaultName
}

function renderCurrentUser(name) {
  currentUserName.textContent = name
  friendCardName.textContent = name
  const avatarText = getAvatarText(name)
  currentUserAvatar.textContent = avatarText
  friendCardAvatar.textContent = avatarText
  playPlayerName.textContent = name
  zonePlayerName.textContent = name
}

function saveCurrentUser(name) {
  localStorage.setItem(storageKey, name)
  renderCurrentUser(name)
  loadBolts(name)
  updateSharedHud()
  friendCardHint.textContent = "저장된 이름을 눌러 바로 시작해요."
}

function loadCurrentUser() {
  const savedName = localStorage.getItem(storageKey)?.trim()
  const hasSavedName = Boolean(savedName)
  const name = savedName || defaultName
  renderCurrentUser(name)
  renderLevelMap()
  loadBolts()
  updateSharedHud()
  friendCardHint.textContent = hasSavedName
    ? "저장된 이름을 눌러 바로 시작해요."
    : "이름을 적고 친구 추가를 누르면 저장돼요."
}

function getGugudanStorageKey(dan) {
  return `gugudan_${dan}_${getCurrentPlayerName()}`
}

function getDefaultGugudanProgress() {
  return { currentLevel: 1, isCompleted: false }
}

function loadGugudanProgress(dan) {
  const raw = localStorage.getItem(getGugudanStorageKey(dan))
  if (!raw) return getDefaultGugudanProgress()
  try {
    const parsed = JSON.parse(raw)
    return {
      currentLevel: Math.min(Math.max(Number(parsed.currentLevel) || 1, 1), SUB_LEVELS_PER_DAN + 1),
      isCompleted: Boolean(parsed.isCompleted),
    }
  } catch {
    return getDefaultGugudanProgress()
  }
}

function saveGugudanProgress(dan, progress) {
  localStorage.setItem(getGugudanStorageKey(dan), JSON.stringify(progress))
}

function getGrowthStage(progress) {
  if (progress.isCompleted) return SUB_LEVELS_PER_DAN
  return Math.max(0, progress.currentLevel - 1)
}

function advanceGugudanProgress(dan) {
  const progress = loadGugudanProgress(dan)
  if (progress.isCompleted) return progress

  const nextLevel = progress.currentLevel + 1
  if (nextLevel > SUB_LEVELS_PER_DAN) {
    const completed = { currentLevel: SUB_LEVELS_PER_DAN + 1, isCompleted: true }
    saveGugudanProgress(dan, completed)
    return completed
  }

  const updated = { currentLevel: nextLevel, isCompleted: false }
  saveGugudanProgress(dan, updated)
  return updated
}

function migrateOldClearedLevels() {
  const clearedLevels = loadClearedLevels()
  clearedLevels.forEach((dan) => {
    const progress = loadGugudanProgress(dan)
    if (progress.currentLevel === 1 && !progress.isCompleted) {
      saveGugudanProgress(dan, { currentLevel: SUB_LEVELS_PER_DAN + 1, isCompleted: true })
    }
  })
}

function getClearedLevelsStorageKey() {
  return `${clearedLevelsKeyPrefix}-${getCurrentPlayerName()}`
}

function loadClearedLevels() {
  const raw = localStorage.getItem(getClearedLevelsStorageKey())
  if (!raw) return new Set()
  try { return new Set(JSON.parse(raw)) } catch { return new Set() }
}

function saveClearedLevel(level) {
  saveGugudanProgress(level, { currentLevel: SUB_LEVELS_PER_DAN + 1, isCompleted: true })
  renderLevelMap()
}

function applyPlanetGrowth(planet, progress) {
  const growthStage = getGrowthStage(progress)
  planet.style.setProperty("--growth-stage", growthStage)
  planet.classList.toggle("planet--completed", progress.isCompleted)
  planet.classList.toggle("planet--cleared", growthStage > 0)

  const progressEl = planet.querySelector(".planet__progress")
  if (progressEl) {
    progressEl.textContent = progress.isCompleted ? "완료" : `${growthStage}/${SUB_LEVELS_PER_DAN}`
  }

  const buddy = planet.querySelector(".planet__buddy")
  if (buddy) {
    buddy.textContent = progress.isCompleted ? "🪐" : growthStage > 0 ? "🐣" : "🌱"
  }
}

function renderLevelMap() {
  migrateOldClearedLevels()
  planetButtons.forEach((planet) => {
    const dan = Number(planet.dataset.level)
    applyPlanetGrowth(planet, loadGugudanProgress(dan))
  })
}

function showLevelResultPopup({ passed, dan, stageLevel, growthStage, isCompleted, result, onDone }) {
  window.clearTimeout(levelClearTimer)

  const levelClearPopup = document.getElementById("levelClearPopup")
  const levelClearPlanet = document.getElementById("levelClearPlanet")
  const levelClearKicker = document.getElementById("levelClearKicker")
  const levelClearPlanetNumber = document.getElementById("levelClearPlanetNumber")
  const levelClearMessage = document.getElementById("levelClearMessage")
  const levelClearGrowth = document.getElementById("levelClearGrowth")

  levelClearKicker.textContent = passed ? "Level Clear!" : "조금만 더 빨리!"
  levelClearPlanetNumber.textContent = dan

  if (passed) {
    levelClearMessage.textContent = `레벨 마스터! ${dan}단 행성이 더 커졌어요!`
    levelClearGrowth.textContent = isCompleted
      ? `${dan}단 행성이 완전히 자랐어요! 평균 숙련도 ${Math.round(result.avgMastery)}점`
      : `${stageLevel}단계 통과 · 평균 ${(result.avgTime / 1000).toFixed(1)}초 · 숙련도 ${Math.round(result.avgMastery)}점`
  } else {
    levelClearMessage.textContent = `${dan}단 ${stageLevel}단계를 다시 도전해요!`
    if (result.reason === "accuracy") {
      levelClearGrowth.textContent = `정확도 100%가 필요해요 · 평균 숙련도 ${Math.round(result.avgMastery)}점`
    } else if (result.reason === "speed") {
      levelClearGrowth.textContent = `평균 ${(result.avgTime / 1000).toFixed(1)}초 · 목표 3초 이내 · 숙련도 ${Math.round(result.avgMastery)}점`
    } else if (result.reason === "mastery") {
      levelClearGrowth.textContent = `평균 숙련도 ${Math.round(result.avgMastery)}점 · 목표 ${LEVEL_UP_MIN_MASTERY}점 이상`
    } else {
      levelClearGrowth.textContent = `평균 숙련도 ${Math.round(result.avgMastery)}점 · 평균 ${(result.avgTime / 1000).toFixed(1)}초`
    }
  }

  levelClearPlanet.style.setProperty("--growth-stage", growthStage)
  levelClearPlanet.classList.toggle("level-clear-popup__planet--completed", isCompleted)
  levelClearPlanet.classList.remove("level-clear-popup__planet--growing")
  void levelClearPlanet.offsetWidth
  if (passed) levelClearPlanet.classList.add("level-clear-popup__planet--growing")

  levelClearPopup.classList.toggle("level-clear-popup--fail", !passed)
  levelClearPopup.classList.add("show")
  if (passed) renderLevelMap()

  levelClearTimer = window.setTimeout(() => {
    levelClearPopup.classList.remove("show", "level-clear-popup--fail")
    levelClearPlanet.classList.remove("level-clear-popup__planet--growing")
    if (typeof onDone === "function") onDone()
  }, passed ? 2600 : 2200)
}

function showLevelClearPopup(dan, clearedLevel, growthStage, isCompleted, result, onDone) {
  showLevelResultPopup({
    passed: true,
    dan,
    stageLevel: clearedLevel,
    growthStage,
    isCompleted,
    result,
    onDone,
  })
}

function showLevelFailPopup(dan, stageLevel, result, onDone) {
  const growthStage = Math.max(0, stageLevel - 1)
  showLevelResultPopup({
    passed: false,
    dan,
    stageLevel,
    growthStage,
    isCompleted: false,
    result,
    onDone,
  })
}

function startLevel(dan) {
  const progress = loadGugudanProgress(dan)
  if (progress.isCompleted) {
    showToast(`${dan}단은 이미 완료했어요! 처음부터 다시 도전해요.`)
    saveGugudanProgress(dan, getDefaultGugudanProgress())
    renderLevelMap()
  }

  const activeProgress = loadGugudanProgress(dan)
  const subLevel = Math.min(activeProgress.currentLevel, SUB_LEVELS_PER_DAN)
  setupPlayGame(dan, subLevel)
  renderCurrentUser(getCurrentPlayerName())
  showScreen("game")
  showToast(`${dan}단 ${subLevel}단계 · 19문제 숙련도 챌린지!`)
}

function showScreen(screenName) {
  const screenMap = { home: homeScreen, main: mainScreen, levelmap: levelMapScreen, game: gameScreen, zone: zoneScreen }
  Object.entries(screenMap).forEach(([name, element]) => {
    const isVisible = name === screenName
    element.style.display = isVisible ? "flex" : "none"
    element.classList.toggle("is-visible", isVisible)
  })
  const inGameContext = screenName === "game" || screenName === "zone"
  phoneFrame.classList.toggle("phone-frame--game", inGameContext)
}

function updateComboBar(comboFillEl, comboCountEl, combo) {
  const percent = Math.min(combo * 10, 100)
  comboFillEl.style.width = `${percent}%`
  comboFillEl.parentElement.querySelector(".combo-bar__egg").style.left = `${percent}%`
  comboCountEl.textContent = combo
}

function updatePowerBar(fillEl, countEl, powerValue) {
  if (!fillEl || !countEl) return

  const percent = Math.max(0, Math.min(100, powerValue))
  fillEl.style.width = `${percent}%`
  fillEl.setAttribute("aria-valuenow", String(percent))
  countEl.textContent = percent

  fillEl.classList.remove(
    "combo-bar__fill--stage-start",
    "combo-bar__fill--stage-focus",
    "combo-bar__fill--stage-master",
    "combo-bar__fill--pulse"
  )

  if (percent <= 30) {
    fillEl.classList.add("combo-bar__fill--stage-start")
  } else if (percent <= 70) {
    fillEl.classList.add("combo-bar__fill--stage-focus")
  } else if (percent > 0) {
    fillEl.classList.add("combo-bar__fill--stage-master")
  }

  if (percent >= 100) {
    fillEl.classList.add("combo-bar__fill--pulse")
  }

  const marker = fillEl.parentElement?.querySelector(".combo-bar__egg")
  if (marker) marker.style.left = `${percent}%`
}

function updatePowerGauge(amount) {
  currentPower += amount
  if (currentPower > 100) currentPower = 100
  if (currentPower < 0) currentPower = 0

  const powerBarEl = document.getElementById("power-bar")
  if (powerBarEl) {
    powerBarEl.style.width = `${currentPower}%`
  }

  updatePowerBar(powerBarEl || powerBar, playComboCount, currentPower)
}

function resetPowerGauge() {
  currentPower = 0

  const powerBarEl = document.getElementById("power-bar")
  if (powerBarEl) {
    powerBarEl.style.width = "0%"
  }

  updatePowerBar(powerBarEl || powerBar, playComboCount, 0)
}

function updateSharedHud() {
  playBoltCount.textContent = gameState.bolts
  zoneBoltCount.textContent = gameState.bolts
  updatePowerBar(powerBar, playComboCount, currentPower)
  updateComboBar(zoneComboFill, zoneComboCount, gameState.combo)
  if (foundCount && gameState.zoneFactorPairs.length > 0) {
    foundCount.textContent = `${gameState.foundPairs.size} / ${gameState.zoneFactorPairs.length}`
  }
}

function updatePlayView() {
  playMultiplier.textContent = playState.currentDan
  playMultiplicand.textContent = playState.currentTimes
  playAnswerDisplay.textContent = playState.answerInput || "?"
  const level = getDifficultyLevel(playState.subLevel)
  const levelLabelMap = { 1: "기초 구구단", 2: "5의 배수", 3: "두 자리 수" }
  const modeLabel = levelLabelMap[level]
  playModeLabel.textContent = `${playState.multiplier}단 · ${playState.subLevel}단계 (Lv.${level} ${modeLabel})`
  playHint.textContent = `${playState.currentDan}×${playState.currentTimes} · ${playState.questionsAnswered + 1}/${PROBLEMS_PER_STAGE}번째 · 묶음을 만들어 봐요!`
}

function getDifficultyLevel(subLevel) {
  if (subLevel <= 9) return 1
  if (subLevel <= 14) return 2
  return 3
}

function getMultiplicandPool(level) {
  if (level === 1) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9]
  }
  if (level === 2) {
    return [5, 10, 15, 20]
  }
  return [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
}

function getAllowedMultiplicands() {
  const level = getDifficultyLevel(playState.subLevel)
  return getMultiplicandPool(level)
}

function formatProblemKey(multiplier, multiplicand) {
  return `${multiplier}x${multiplicand}`
}

function generateRandomMultiplicand() {
  const multiplier = playState.multiplier
  const pool = getAllowedMultiplicands()

  const pickFromPool = () => pool[Math.floor(Math.random() * pool.length)]

  let multiplicand = pickFromPool()

  if (pool.length > 1) {
    while (formatProblemKey(multiplier, multiplicand) === lastProblem) {
      multiplicand = pickFromPool()
    }
  }

  return multiplicand
}

function nextPlayQuestion() {
  if (playState.questionsAnswered > 0) {
    lastProblem = formatProblemKey(playState.multiplier, playState.multiplicand)
  }

  playState.multiplicand = generateRandomMultiplicand()
  playState.answerInput = ""
  playState.bundleCount = 0
  playState.isSwapped = false
  playState.questionStartTime = Date.now()
  syncBundleStateFromQuestion()
  updatePlayView()
  resetBundleControls()
}

function setupPlayGame(dan = 2, subLevel = 1) {
  gameState.combo = 0
  gameState.foundPairs = new Set()
  loadBolts()
  lastProblem = null
  currentPower = 0
  playState.questionsAnswered = 0
  playState.stageCombo = 0
  playState.sessionResults = []
  playState.multiplier = dan
  playState.subLevel = subLevel
  updateSharedHud()
  resetPowerGauge()
  nextPlayQuestion()
}

function finishStage() {
  const dan = playState.multiplier
  const stageLevel = playState.subLevel
  const result = checkLevelUp(playState.sessionResults)

  if (!result.passed) {
    showLevelFailPopup(dan, stageLevel, result, () => {
      setupPlayGame(dan, stageLevel)
      showToast(`${dan}단 ${stageLevel}단계를 다시 도전해요!`)
    })
    return
  }

  const clearedLevel = stageLevel
  const progress = advanceGugudanProgress(dan)
  const growthStage = Math.min(clearedLevel, SUB_LEVELS_PER_DAN)
  const isCompleted = progress.isCompleted

  updatePlanetVisual(dan, growthStage)
  showLevelClearPopup(dan, clearedLevel, growthStage, isCompleted, result, () => {
    if (isCompleted) {
      renderLevelMap()
      showScreen("levelmap")
      showToast(`${dan}단 행성이 완성됐어요!`)
      return
    }
    setupPlayGame(dan, progress.currentLevel)
  })
}

function recordPlayAnswer(isCorrect) {
  const timeMs = Math.max(0, Date.now() - playState.questionStartTime)
  const masteryScore = calculateMastery(timeMs, isCorrect, playState.stageCombo)

  playState.sessionResults.push({ timeMs, isCorrect, masteryScore })
  playState.questionsAnswered += 1

  if (isCorrect) {
    playState.stageCombo += 1
    gameState.combo += 1
    gameState.bolts += 10 * (gameState.combo / 10)
    saveBolts()
  } else {
    playState.stageCombo = 0
    gameState.combo = 0
    resetPowerGauge()
  }

  updateSharedHud()

  if (playState.questionsAnswered >= PROBLEMS_PER_STAGE) {
    finishStage()
    return true
  }

  return false
}

function handlePlayCorrect() {
  const stageFinished = recordPlayAnswer(true)
  if (stageFinished) return

  showCelebration()
  nextPlayQuestion()
}

function getFactors(n) {
  const pairs = []
  for (let a = 1; a * a <= n; a += 1) {
    if (n % a === 0) {
      pairs.push([a, n / a])
    }
  }
  return pairs
}

function pairKey(a, b) {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  return `${min}x${max}`
}

function pickZoneTarget(dan) {
  const multiplier = Math.floor(Math.random() * 9) + 1
  return dan * multiplier
}

function isValidZonePairKey(key) {
  return gameState.zoneFactorPairs.some(([a, b]) => `${a}x${b}` === key)
}

function renderZoneFactorTiles() {
  const tilesContainer = document.getElementById("zoneFactorTiles")
  if (!tilesContainer) return

  tilesContainer.innerHTML = ""

  gameState.zoneFactorPairs.forEach(([a, b]) => {
    const key = `${a}x${b}`
    const tile = document.createElement("div")
    tile.className = "zone-factor-tile"
    tile.dataset.pair = key

    if (gameState.foundPairs.has(key)) {
      tile.classList.add("zone-factor-tile--found")
      tile.textContent = `${a}×${b}`
    } else {
      tile.classList.add("zone-factor-tile--hidden")
      tile.textContent = "?"
    }

    tilesContainer.appendChild(tile)
  })
}

function renderZoneCirclePreview(a, b) {
  const preview = document.getElementById("zoneCirclePreview")
  if (!preview) return

  window.clearTimeout(zonePreviewTimer)
  preview.hidden = false
  preview.innerHTML = ""

  const title = document.createElement("p")
  title.className = "zone-circle-preview__title"
  title.textContent = `${a}×${b} 묶음`
  preview.appendChild(title)

  const grid = document.createElement("div")
  grid.className = "zone-circle-preview__grid"

  for (let row = 0; row < b; row += 1) {
    const rowEl = document.createElement("div")
    rowEl.className = "zone-circle-preview__row"

    for (let col = 0; col < a; col += 1) {
      const dot = document.createElement("div")
      dot.className = "zone-circle-preview__dot"
      rowEl.appendChild(dot)
    }

    grid.appendChild(rowEl)
  }

  preview.appendChild(grid)
  preview.classList.remove("zone-circle-preview--show")
  void preview.offsetWidth
  preview.classList.add("zone-circle-preview--show")

  zonePreviewTimer = window.setTimeout(() => {
    preview.classList.remove("zone-circle-preview--show")
    preview.hidden = true
    preview.innerHTML = ""
  }, 2600)
}

function showZoneClearPopup(bonusBolts, onDone) {
  window.clearTimeout(zoneClearTimer)

  const zoneClearPopup = document.getElementById("zoneClearPopup")
  const zoneClearMessage = document.getElementById("zoneClearMessage")
  const zoneClearReward = document.getElementById("zoneClearReward")

  if (zoneClearMessage) {
    zoneClearMessage.textContent = `${gameState.zoneTargetN}의 모든 곱셈 조합을 찾았어요!`
  }
  if (zoneClearReward) {
    zoneClearReward.textContent = `+${bonusBolts} ⚡`
  }

  if (zoneClearPopup) {
    zoneClearPopup.classList.add("show")
  }

  zoneClearTimer = window.setTimeout(() => {
    if (zoneClearPopup) zoneClearPopup.classList.remove("show")
    if (typeof onDone === "function") onDone()
  }, 2800)
}

function updateZoneView() {
  const zoneTargetN = document.getElementById("zoneTargetN")
  if (zoneTargetN) zoneTargetN.textContent = gameState.zoneTargetN
  if (resultValue) resultValue.textContent = gameState.zoneTargetN
  if (slotAValue) slotAValue.textContent = gameState.inputs.a || "?"
  if (slotBValue) slotBValue.textContent = gameState.inputs.b || "?"
  if (foundCount) {
    foundCount.textContent = `${gameState.foundPairs.size} / ${gameState.zoneFactorPairs.length}`
  }
}

function startNextZoneRound() {
  gameState.foundPairs = new Set()
  gameState.inputs = { a: "", b: "" }
  gameState.zoneTargetN = pickZoneTarget(gameState.zoneDan)
  gameState.zoneFactorPairs = getFactors(gameState.zoneTargetN)
  activeSlot = "a"

  renderZoneFactorTiles()
  updateZoneView()
  if (gameHelper) {
    gameHelper.textContent = `${gameState.zoneDan}배 존 · ${gameState.zoneTargetN}을 만드는 조합을 모두 찾아봐요!`
  }
  setActiveSlot("a")
  resetZoneInputs()
}

function setupZoneGame(dan) {
  gameState.combo = 0
  loadBolts()
  gameState.zoneDan = dan
  startNextZoneRound()
  updateSharedHud()
  showToast(`${dan}배 보너스 존 · 목표 ${gameState.zoneTargetN}!`)
}

function setActiveSlot(slotName) {
  activeSlot = slotName
  slotAButton.classList.toggle("is-active", slotName === "a")
  slotBButton.classList.toggle("is-active", slotName === "b")
}

function resetZoneInputs(nextSlot = "a") {
  gameState.inputs.a = ""
  gameState.inputs.b = ""
  setActiveSlot(nextSlot)
  updateZoneView()
}

function handleZoneCorrect(a, b) {
  const key = pairKey(a, b)
  gameState.foundPairs.add(key)
  gameState.combo += 1
  gameState.bolts += ZONE_PAIR_BOLT_REWARD
  saveBolts()

  renderZoneFactorTiles()
  renderZoneCirclePreview(a, b)
  updateSharedHud()
  showCelebration()

  if (gameHelper) {
    gameHelper.textContent = `${a}×${b} 정답! ⚡ +${ZONE_PAIR_BOLT_REWARD}`
  }

  if (gameState.foundPairs.size >= gameState.zoneFactorPairs.length) {
    const clearBonus = getZoneClearBoltBonus(gameState.zoneDan)
    gameState.bolts += clearBonus
    saveBolts()
    updateSharedHud()
    showZoneClearPopup(clearBonus, () => {
      startNextZoneRound()
      if (gameHelper) {
        gameHelper.textContent = `다음 목표 ${gameState.zoneTargetN}! 조합을 모두 찾아봐요!`
      }
      showToast(`다음 목표 숫자 ${gameState.zoneTargetN}`)
    })
    return
  }

  resetZoneInputs()
}

function handleZoneWrong(message) {
  gameState.combo = 0
  updateSharedHud()
  if (gameHelper) gameHelper.textContent = message
  showToast(message)
  resetZoneInputs()
}

function submitZoneEquation() {
  if (gameState.inputs.a === "" || gameState.inputs.b === "") {
    showToast("두 수를 모두 입력해 주세요.")
    return
  }

  const firstValue = Number(gameState.inputs.a)
  const secondValue = Number(gameState.inputs.b)

  if (firstValue <= 0 || secondValue <= 0) {
    handleZoneWrong("1보다 큰 수를 입력해 봐요!")
    return
  }

  if (firstValue * secondValue !== gameState.zoneTargetN) {
    handleZoneWrong(`곱이 ${gameState.zoneTargetN}이 되도록 다시 생각해 봐요!`)
    return
  }

  const normalizedKey = pairKey(firstValue, secondValue)

  if (!isValidZonePairKey(normalizedKey)) {
    handleZoneWrong("올바른 조합이 아니에요!")
    return
  }

  if (gameState.foundPairs.has(normalizedKey)) {
    handleZoneWrong("이미 찾은 조합이에요!")
    return
  }

  const [a, b] = normalizedKey.split("x").map(Number)
  handleZoneCorrect(a, b)
}

function handleZoneKeypadNumber(value) {
  const current = gameState.inputs[activeSlot]
  if (current.length >= 2) return
  gameState.inputs[activeSlot] = current + value
  updateZoneView()
}

function handlePlayWrong(message) {
  const stageFinished = recordPlayAnswer(false)
  playState.answerInput = ""
  updatePlayView()

  if (stageFinished) return

  showToast(message)
  nextPlayQuestion()
}

function submitPlayAnswer() {
  if (playState.answerInput === "") {
    showToast("답을 입력해 주세요.")
    return
  }
  const expected = playState.multiplier * playState.multiplicand
  const answer = Number(playState.answerInput)
  if (answer === expected) {
    updatePowerGauge(10)
    handlePlayCorrect()
    return
  }
  handlePlayWrong("다시 생각해 봐요!")
}

function handlePlayKeypadNumber(value) {
  const maxLength = playState.multiplier * playState.multiplicand >= 100 ? 3 : 2
  if (playState.answerInput.length >= maxLength) return
  playState.answerInput += value
  updatePlayView()
}

function bindKeypad(keypadElement, handlers) {
  keypadElement.querySelectorAll(".keypad-button").forEach((button) => {
    button.addEventListener("click", () => {
      const { key, action } = button.dataset
      if (key) { handlers.onNumber(key); return }
      if (action === "clear") { handlers.onClear(); return }
      if (action === "submit") { handlers.onSubmit() }
    })
  })
}
