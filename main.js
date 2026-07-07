function setViewportHeight() {
  document.documentElement.style.setProperty("--app-vh", `${window.innerHeight}px`)
}
setViewportHeight()
window.addEventListener("resize", setViewportHeight)
window.addEventListener("orientationchange", setViewportHeight)

const toast = document.getElementById("toast")
const friendForm = document.getElementById("friendForm")
const friendNameInput = document.getElementById("friendName")
const homeButton = document.getElementById("homeButton")
const phoneFrame = document.querySelector(".phone-frame")
const homeScreen = document.getElementById("home-screen")
const mainScreen = document.getElementById("main-screen")
const levelMapScreen = document.getElementById("level-map-screen")
const gameScreen = document.getElementById("game-screen")
const zoneScreen = document.getElementById("zone-screen")
const currentUserName = document.getElementById("currentUserName")
const currentUserAvatar = document.getElementById("currentUserAvatar")
const friendCardAvatar = document.getElementById("friendCardAvatar")
const friendCardName = document.getElementById("friendCardName")
const savedFriendButton = document.getElementById("savedFriendButton")
const friendCardHint = document.getElementById("friendCardHint")
const modeSelectButtons = document.querySelectorAll(".mode-select-button")
const celebrationPopup = document.getElementById("celebrationPopup")

const playBoltCount = document.getElementById("playBoltCount")
const playComboCount = document.getElementById("playComboCount")
const powerBar = document.getElementById("power-bar")
const playModeLabel = document.getElementById("playModeLabel")
const playPlayerName = document.getElementById("playPlayerName")
const playHint = document.getElementById("playHint")
const playMultiplier = document.getElementById("playMultiplier")
const playMultiplicand = document.getElementById("playMultiplicand")
const playAnswerDisplay = document.getElementById("playAnswerDisplay")
const gameControlsContainer = document.getElementById("gameControlsContainer")
const exitGameButton = document.getElementById("exitGameButton")
const playKeypad = document.getElementById("playKeypad")

const zoneBoltCount = document.getElementById("zoneBoltCount")
const zoneComboCount = document.getElementById("zoneComboCount")
const zoneComboFill = document.getElementById("zoneComboFill")
const zonePlayerName = document.getElementById("zonePlayerName")
const foundCount = document.getElementById("foundCount")
const resultValue = document.getElementById("resultValue")
const gameHelper = document.getElementById("gameHelper")
const slotAButton = document.getElementById("slotA")
const slotBButton = document.getElementById("slotB")
const slotAValue = document.getElementById("slotAValue")
const slotBValue = document.getElementById("slotBValue")
const zoneBackButton = document.getElementById("zoneBackButton")
const zoneKeypad = document.getElementById("zoneKeypad")
const levelMapBackButton = document.getElementById("levelMapBackButton")
const planetButtons = document.querySelectorAll(".planet")
const satelliteButtons = document.querySelectorAll(".planet__satellite")

friendForm.addEventListener("submit", (event) => {
  event.preventDefault()
  const name = friendNameInput.value.trim()
  if (!name) {
    showToast("이름을 먼저 적어 주세요.")
    friendNameInput.focus()
    return
  }
  saveCurrentUser(name)
  friendNameInput.value = ""
  renderLevelMap()
  showToast(`${name} 친구가 추가되었어요!`)
  showScreen("main")
})

savedFriendButton.addEventListener("click", () => {
  const savedName = localStorage.getItem(storageKey)?.trim()
  if (!savedName) {
    friendNameInput.focus()
    showToast("먼저 이름을 저장해 주세요.")
    return
  }
  loadBolts(savedName)
  updateSharedHud()
  showScreen("main")
})

homeButton.addEventListener("click", () => {
  showScreen("home")
  showToast("홈으로 돌아왔어요.")
})

modeSelectButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode
    const isAvailable = button.dataset.available === "true"
    if (isAvailable) {
      renderLevelMap()
      showScreen("levelmap")
      showToast("우주 맵에서 단을 선택해요!")
      return
    }
    showToast(`${mode}은(는) 준비 중이에요.`)
  })
})

exitGameButton.addEventListener("click", () => {
  renderLevelMap()
  showScreen("levelmap")
})

levelMapBackButton.addEventListener("click", () => {
  showScreen("main")
})

planetButtons.forEach((planet) => {
  planet.addEventListener("click", (event) => {
    if (event.target.closest(".planet__satellite")) return
    const level = Number(planet.dataset.level)
    startLevel(level)
  })
})

satelliteButtons.forEach((satellite) => {
  satellite.addEventListener("click", () => {
    const level = Number(satellite.dataset.level)
    setupZoneGame(level)
    showScreen("zone")
  })
})

zoneBackButton.addEventListener("click", () => {
  showScreen("levelmap")
})

if (gameControlsContainer) {
  gameControlsContainer.addEventListener("click", (event) => {
    const button = event.target.closest("button")
    if (!button) return

    if (button.id === "add-bundle-btn") {
      addOneBundle()
      return
    }

    if (button.id === "swap-btn") {
      swapBundleOrder()
    }
  })
}

initBundleControls()

slotAButton.addEventListener("click", () => {
  setActiveSlot("a")
})

slotBButton.addEventListener("click", () => {
  setActiveSlot("b")
})

bindKeypad(playKeypad, {
  onNumber: handlePlayKeypadNumber,
  onClear: () => {
    playState.answerInput = playState.answerInput.slice(0, -1)
    updatePlayView()
  },
  onSubmit: submitPlayAnswer,
})

bindKeypad(zoneKeypad, {
  onNumber: handleZoneKeypadNumber,
  onClear: () => {
    gameState.inputs[activeSlot] = ""
    updateZoneView()
  },
  onSubmit: submitZoneEquation,
})

loadCurrentUser()
renderLevelMap()
showScreen("home")
