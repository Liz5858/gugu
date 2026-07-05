const storageKey = "gugumon-player-name"
const clearedLevelsKeyPrefix = "gugumon-cleared-levels"
const defaultName = "댕댕"

let toastTimer
let popupTimer
let activeSlot = "a"

const gameState = {
  bolts: 0,
  combo: 0,
  targetNumber: 1,
  inputs: { a: "", b: "" },
  foundPairs: new Set(),
}

const playState = {
  multiplier: 2,
  multiplicand: 2,
  answerInput: "",
  groupCount: 0,
  solved: 0,
  total: 18,
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
  friendCardHint.textContent = "저장된 이름을 눌러 바로 시작해요."
}

function loadCurrentUser() {
  const savedName = localStorage.getItem(storageKey)?.trim()
  const hasSavedName = Boolean(savedName)
  const name = savedName || defaultName
  renderCurrentUser(name)
  friendCardHint.textContent = hasSavedName
    ? "저장된 이름을 눌러 바로 시작해요."
    : "이름을 적고 친구 추가를 누르면 저장돼요."
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
  const clearedLevels = loadClearedLevels()
  clearedLevels.add(level)
  localStorage.setItem(getClearedLevelsStorageKey(), JSON.stringify([...clearedLevels]))
  renderLevelMap()
}

function renderLevelMap() {
  const clearedLevels = loadClearedLevels()
  const buddyEmoji = "🐣"
  planetButtons.forEach((planet) => {
    const level = Number(planet.dataset.level)
    const isCleared = clearedLevels.has(level)
    planet.classList.toggle("planet--cleared", isCleared)
    planet.querySelector(".planet__buddy").textContent = buddyEmoji
  })
}

function startLevel(level) {
  setupPlayGame(level)
  renderCurrentUser(getCurrentPlayerName())
  showScreen("game")
  showToast(`${level}단 행성으로 출발해요!`)
}

function showScreen(screenName) {
  const screenMap = { home: homeScreen, main: mainScreen, levelmap: levelMapScreen, game: gameScreen, zone: zoneScreen }
  Object.entries(screenMap).forEach(([name, element]) => {
    const isVisible = name === screenName
    element.style.display = isVisible ? "block" : "none"
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

function updateSharedHud() {
  playBoltCount.textContent = gameState.bolts
  zoneBoltCount.textContent = gameState.bolts
  updateComboBar(playComboFill, playComboCount, gameState.combo)
  updateComboBar(zoneComboFill, zoneComboCount, gameState.combo)
  foundCount.textContent = `${gameState.foundPairs.size} / 9`
}

function updatePlayView() {
  playMultiplier.textContent = playState.multiplier
  playMultiplicand.textContent = playState.multiplicand
  playAnswerDisplay.textContent = playState.answerInput || "?"
  playModeLabel.textContent = `곱셈 Lv.1 · ${playState.multiplier}단 시작`
  playHint.textContent = `버튼을 눌러 ${playState.multiplier}씩 묶음을 만들어 봐요`
}

function nextPlayQuestion() {
  playState.multiplicand = Math.floor(Math.random() * 9) + 1
  playState.answerInput = ""
  playState.groupCount = 0
  updatePlayView()
}

function setupPlayGame(multiplier = 2) {
  gameState.bolts = 0
  gameState.combo = 0
  gameState.foundPairs = new Set()
  gameState.targetNumber = 1
  playState.solved = 0
  playState.multiplier = multiplier
  updateSharedHud()
  nextPlayQuestion()
  resetZoneInputs()
  nextZoneTarget()
}

function setupZoneGame(level) {
  gameState.bolts = 0
  gameState.combo = 0
  gameState.foundPairs = new Set()
  gameState.targetNumber = 1
  gameState.inputs = { a: "", b: "" }
  activeSlot = "a"
  updateSharedHud()
  updateEquationView()
  gameHelper.textContent = "A와 B를 입력해서 2배 조합을 완성해요."
  setActiveSlot("a")
  resetZoneInputs()
  nextZoneTarget()
}

function handlePlayCorrect() {
  gameState.combo += 1
  gameState.bolts += 10 * (gameState.combo / 10)
  playState.solved += 1
  updateSharedHud()
  showCelebration()
  if (playState.solved >= playState.total) {
    saveClearedLevel(playState.multiplier)
    showToast(`${playState.multiplier}단 문제를 모두 맞혔어요!`)
    return
  }
  nextPlayQuestion()
}

function handlePlayWrong(message) {
  gameState.combo = 0
  updateSharedHud()
  playState.answerInput = ""
  updatePlayView()
  showToast(message)
}

function submitPlayAnswer() {
  if (playState.answerInput === "") {
    showToast("답을 입력해 주세요.")
    return
  }
  const expected = playState.multiplier * playState.multiplicand
  const answer = Number(playState.answerInput)
  if (answer === expected) {
    handlePlayCorrect()
    return
  }
  handlePlayWrong("다시 생각해 봐요!")
}

function handlePlayKeypadNumber(value) {
  if (playState.answerInput.length >= 2) return
  playState.answerInput += value
  updatePlayView()
}

function setActiveSlot(slotName) {
  activeSlot = slotName
  slotAButton.classList.toggle("is-active", slotName === "a")
  slotBButton.classList.toggle("is-active", slotName === "b")
}

function updateEquationView() {
  const result = 2 * gameState.targetNumber
  targetLabel.textContent = `2 x ${gameState.targetNumber}`
  targetValue.textContent = result
  resultValue.textContent = result
  slotAValue.textContent = gameState.inputs.a || "?"
  slotBValue.textContent = gameState.inputs.b || "?"
}

function resetZoneInputs(nextSlot = "a") {
  gameState.inputs.a = ""
  gameState.inputs.b = ""
  setActiveSlot(nextSlot)
  updateEquationView()
}

function nextZoneTarget() {
  if (gameState.foundPairs.size >= 9) {
    gameHelper.textContent = "2배 존의 모든 조합을 찾았어요!"
    return
  }
  const remainingNumbers = []
  for (let number = 1; number <= 9; number += 1) {
    const key = `2x${number}`
    if (!gameState.foundPairs.has(key)) {
      remainingNumbers.push(number)
    }
  }
  const randomIndex = Math.floor(Math.random() * remainingNumbers.length)
  gameState.targetNumber = remainingNumbers[randomIndex]
  gameHelper.textContent = "A와 B를 입력해서 2배 조합을 완성해요."
  resetZoneInputs()
}

function handleZoneCorrect() {
  gameState.combo += 1
  gameState.bolts += 10 * (gameState.combo / 10)
  updateSharedHud()
  showCelebration()
  gameHelper.textContent = "정답이에요! 새로운 2배 조합으로 넘어가요."
  nextZoneTarget()
}

function handleZoneWrong(message) {
  gameState.combo = 0
  updateSharedHud()
  gameHelper.textContent = message
  showToast(message)
  resetZoneInputs()
}

function submitZoneEquation() {
  const firstValue = Number(gameState.inputs.a)
  const secondValue = Number(gameState.inputs.b)
  if (gameState.inputs.a === "" || gameState.inputs.b === "") {
    showToast("A와 B를 모두 입력해 주세요.")
    return
  }
  const expectedResult = 2 * gameState.targetNumber
  const normalizedPair = [firstValue, secondValue].sort((a, b) => a - b).join("x")
  const canonicalPair = `2x${gameState.targetNumber}`
  if (gameState.foundPairs.has(normalizedPair)) {
    handleZoneWrong("이미 찾은 조합이에요!")
    return
  }
  if (normalizedPair !== canonicalPair || firstValue * secondValue !== expectedResult) {
    handleZoneWrong("아직 맞는 2배 조합이 아니에요!")
    return
  }
  gameState.foundPairs.add(normalizedPair)
  handleZoneCorrect()
}

function handleZoneKeypadNumber(value) {
  gameState.inputs[activeSlot] = value
  updateEquationView()
  setActiveSlot(activeSlot === "a" ? "b" : "a")
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
