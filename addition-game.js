/**
 * 덧셈 게임 UI + 파워(Power) 시스템
 * - 전략 버튼 클릭 시 보조 수식 표시
 * - 가로/세로셈 전환 (은하계)
 * - 파워 게이지 Max 200 · 콤보 가산 · 전략 보너스 · 오답 페널티
 * ※ 곱셈 모드와 분리된 덧셈 전용 로직
 */

const ADDITION_POWER_MAX = 200
const ADDITION_POWER_BASE = 10
const ADDITION_POWER_COMBO_BONUS = 5
const ADDITION_POWER_STRATEGY_BONUS = 5
const ADDITION_POWER_WRONG_PENALTY = -10
const ADDITION_POWER_RETRY_REWARD = 10
const ADDITION_POWER_VOLT_BONUS = 10

const additionState = {
  galaxyId: null,
  galaxyName: "",
  level: null,
  currentProblem: null,
  answerInput: "",
  activeStrategy: null,
  layout: ADDITION_LAYOUT.HORIZONTAL,
  recentProblemKeys: [],
  currentPower: 0,
  powerCombo: 0,
  totalVolts: 0,
  stageCompleted: false,
  missedCurrentProblem: false,
  usedStrategyOnCurrent: false,
}

// ─── 파워 점수 계산 ───────────────────────────────────────────

/**
 * 정답/오답에 따른 파워 변화량(gainPower) 계산
 * @param {{ isCorrect: boolean, powerCombo: number, usedStrategy: boolean, isRetry: boolean }} params
 * @returns {number} gainPower
 *
 * 정답(일반): 기본 10 + (콤보-1)×5 + 전략 5
 * 재도전 정답: +10 (+ 전략 사용 시 +5)
 * 오답: -10
 */
function calculatePowerGain({ isCorrect, powerCombo, usedStrategy, isRetry }) {
  if (!isCorrect) return ADDITION_POWER_WRONG_PENALTY

  if (isRetry) {
    return ADDITION_POWER_RETRY_REWARD + (usedStrategy ? ADDITION_POWER_STRATEGY_BONUS : 0)
  }

  const comboBonus = Math.max(0, powerCombo - 1) * ADDITION_POWER_COMBO_BONUS
  const strategyBonus = usedStrategy ? ADDITION_POWER_STRATEGY_BONUS : 0
  return ADDITION_POWER_BASE + comboBonus + strategyBonus
}

function syncAdditionVoltsToGameState() {
  gameState.bolts = additionState.totalVolts
  saveBolts()
}

function updateAdditionPowerBar() {
  const fillEl = document.getElementById("addition-power-bar")
  const countEl = document.getElementById("additionPowerCount")
  const boltEl = document.getElementById("additionBoltCount")

  const power = additionState.currentPower
  const percent = ADDITION_POWER_MAX > 0 ? (power / ADDITION_POWER_MAX) * 100 : 0

  if (fillEl) {
    fillEl.style.width = `${percent}%`
    fillEl.setAttribute("aria-valuemax", String(ADDITION_POWER_MAX))
    fillEl.setAttribute("aria-valuenow", String(power))
    fillEl.classList.toggle("combo-bar__fill--pulse", power >= ADDITION_POWER_MAX)
  }

  if (countEl) countEl.textContent = `${power} / ${ADDITION_POWER_MAX}`
  if (boltEl) boltEl.textContent = additionState.totalVolts

  const marker = fillEl?.parentElement?.querySelector(".combo-bar__egg")
  if (marker) marker.style.left = `${percent}%`
}

/**
 * 파워 점수 반영
 * - 200 도달: 스테이지 완료(다음 단계 오픈)
 * - 이미 완료된 스테이지에서 200 유지 시: 볼트 증가
 */
function applyAdditionPowerDelta(gainPower) {
  const previous = additionState.currentPower
  let next = previous + gainPower
  if (next < 0) next = 0

  // 이미 완료된 단계: 게이지는 200 유지, 추가 정답 시 볼트
  if (additionState.stageCompleted) {
    let awardedVolts = 0
    if (gainPower > 0) {
      additionState.currentPower = ADDITION_POWER_MAX
      awardedVolts = ADDITION_POWER_VOLT_BONUS
      additionState.totalVolts += awardedVolts
      syncAdditionVoltsToGameState()
    } else {
      additionState.currentPower = Math.min(ADDITION_POWER_MAX, next)
    }
    persistAdditionLevelProgress({ isCompleted: true })
    updateAdditionPowerBar()
    return {
      stageCleared: false,
      awardedVolts,
      previous,
      current: additionState.currentPower,
      gainPower,
    }
  }

  // 파워 200 도달 → 스테이지 클리어 / 다음 단계 오픈
  if (next >= ADDITION_POWER_MAX) {
    additionState.currentPower = ADDITION_POWER_MAX
    additionState.stageCompleted = true
    persistAdditionLevelProgress({ isCompleted: true })
    updateAdditionPowerBar()
    return {
      stageCleared: true,
      awardedVolts: 0,
      previous,
      current: ADDITION_POWER_MAX,
      gainPower,
    }
  }

  additionState.currentPower = next
  persistAdditionLevelProgress()
  updateAdditionPowerBar()
  return {
    stageCleared: false,
    awardedVolts: 0,
    previous,
    current: next,
    gainPower,
  }
}

function handleAdditionCorrectPower() {
  const usedStrategy = Boolean(additionState.usedStrategyOnCurrent)
  const isRetry = additionState.missedCurrentProblem

  if (isRetry) {
    additionState.powerCombo = 1
  } else {
    additionState.powerCombo += 1
  }

  const gainPower = calculatePowerGain({
    isCorrect: true,
    powerCombo: additionState.powerCombo,
    usedStrategy,
    isRetry,
  })

  additionState.missedCurrentProblem = false
  additionState.usedStrategyOnCurrent = false

  return applyAdditionPowerDelta(gainPower)
}

function handleAdditionWrongPower() {
  additionState.powerCombo = 0
  additionState.missedCurrentProblem = true

  const gainPower = calculatePowerGain({
    isCorrect: false,
    powerCombo: 0,
    usedStrategy: false,
    isRetry: false,
  })

  return applyAdditionPowerDelta(gainPower)
}

function resetAdditionPowerSession() {
  const levelId = additionState.level?.id
  const saved = levelId ? loadAdditionLevelProgress(levelId) : getDefaultAdditionLevelProgress()

  additionState.currentPower = saved.isCompleted
    ? ADDITION_POWER_MAX
    : Math.min(ADDITION_POWER_MAX, saved.currentPower)
  additionState.powerCombo = 0
  additionState.stageCompleted = Boolean(saved.isCompleted)
  additionState.missedCurrentProblem = false
  additionState.usedStrategyOnCurrent = false
  additionState.totalVolts = gameState.bolts
  updateAdditionPowerBar()
}

function persistAdditionLevelProgress(overrides = {}) {
  if (!additionState.level?.id) return

  saveAdditionLevelProgress(additionState.level.id, {
    currentPower: additionState.currentPower,
    isCompleted:
      overrides.isCompleted ??
      (additionState.stageCompleted || additionState.currentPower >= ADDITION_POWER_MAX),
    ...overrides,
  })
}

let additionPowerMaxTimer = null

function showAdditionPowerMaxFx(message = "다음 단계가 열렸어요!") {
  const fx = document.getElementById("additionPowerMaxFx")
  const particles = document.getElementById("additionPowerMaxParticles")
  const messageEl = document.getElementById("additionPowerMaxMessage")
  if (!fx) return

  if (messageEl) messageEl.textContent = message

  if (particles) {
    particles.innerHTML = ""
    const colors = ["#57f0b3", "#ffd45d", "#58cfff", "#ffb8cf", "#b07cff", "#ffffff"]
    for (let i = 0; i < 28; i += 1) {
      const spark = document.createElement("span")
      spark.className = "addition-power-max__spark"
      spark.style.setProperty("--spark-x", `${(Math.random() * 160 - 80).toFixed(1)}vw`)
      spark.style.setProperty("--spark-y", `${(Math.random() * 120 - 20).toFixed(1)}vh`)
      spark.style.setProperty("--spark-delay", `${(Math.random() * 0.35).toFixed(2)}s`)
      spark.style.setProperty("--spark-color", colors[i % colors.length])
      spark.style.setProperty("--spark-size", `${6 + Math.random() * 10}px`)
      particles.appendChild(spark)
    }
  }

  window.clearTimeout(additionPowerMaxTimer)
  fx.classList.remove("is-show")
  void fx.offsetWidth
  fx.classList.add("is-show")

  additionPowerMaxTimer = window.setTimeout(() => {
    fx.classList.remove("is-show")
  }, 2600)
}

// ─── 게임 진입 / 맵 렌더링 ─────────────────────────────────────

function buildAdditionConstellationPath(nodes) {
  return nodes
    .map((node) => {
      const x = Number.parseFloat(String(node.mapPosition.x))
      const y = Number.parseFloat(String(node.mapPosition.y))
      // % → viewBox(300×520) 좌표
      return `${(x / 100) * 300},${(y / 100) * 520}`
    })
    .join(" ")
}

function applyAdditionPlanetVisual(planetEl, node, unlock) {
  const { progress, status } = unlock
  const power = Math.min(ADDITION_POWER_MAX, progress.currentPower || 0)
  const powerBand = progress.isCompleted
    ? 5
    : Math.min(5, Math.max(1, Math.ceil((power / ADDITION_POWER_MAX) * 5) || 1))

  planetEl.style.setProperty("--power-level", progress.isCompleted ? 1 : powerBand)
  // 완료 행성은 기본 크기 유지 (확대 없음)
  planetEl.style.setProperty(
    "--growth-stage",
    progress.isCompleted ? 0 : Math.round((power / ADDITION_POWER_MAX) * 12)
  )

  planetEl.classList.toggle("planet--locked", status === "locked")
  planetEl.classList.toggle("planet--current", status === "current")
  planetEl.classList.toggle("planet--completed", status === "completed")
  planetEl.classList.toggle("planet--cleared", power > 0 || status === "completed")

  for (let lv = 1; lv <= 5; lv += 1) {
    planetEl.classList.toggle(
      `planet--power-lv${lv}`,
      !progress.isCompleted && powerBand === lv && status !== "locked"
    )
  }

  const progressEl = planetEl.querySelector(".planet__progress")
  if (progressEl) {
    if (status === "locked") progressEl.textContent = "잠김"
    else if (status === "completed") progressEl.textContent = "완료"
    else progressEl.textContent = `${power}`
  }

  const buddy = planetEl.querySelector(".planet__buddy")
  if (buddy) {
    if (status === "locked") buddy.textContent = "🌑"
    else if (status === "completed") buddy.textContent = "🪐"
    else buddy.textContent = node.theme.buddy
  }

  planetEl.setAttribute("aria-disabled", status === "locked" ? "true" : "false")
}

function createAdditionPlanetElement(node) {
  const unlock = getAdditionLevelUnlockState(node.levelId)
  const planet = document.createElement("button")
  planet.type = "button"
  planet.className = "planet addition-planet"
  planet.dataset.levelId = node.levelId
  planet.dataset.galaxyId = node.galaxyId
  planet.dataset.stage = String(node.stageNumber)
  planet.style.setProperty("--planet-x", node.mapPosition.x)
  planet.style.setProperty("--planet-y", node.mapPosition.y)
  planet.setAttribute(
    "aria-label",
    `${node.galaxyName} ${node.label} · ${node.subtitle}`
  )

  planet.innerHTML = `
    <span class="planet__ring" aria-hidden="true"></span>
    <span class="planet__glow" aria-hidden="true"></span>
    <span class="planet__buddy" aria-hidden="true">${node.theme.buddy}</span>
    <span class="planet__label">${node.galaxyName}</span>
    <span class="planet__progress">Lv${node.stageNumber}</span>
    <strong class="planet__number">${node.stageNumber}</strong>
  `

  applyAdditionPlanetVisual(planet, node, unlock)

  planet.addEventListener("click", () => {
    const latest = getAdditionLevelUnlockState(node.levelId)
    if (latest.isLocked) {
      showToast("아직 잠긴 행성이에요. 이전 레벨을 먼저 완료해요!")
      return
    }
    startAdditionLevel(node.galaxyId, node.stageNumber)
  })

  return planet
}

function renderAdditionMap() {
  const map = document.getElementById("additionConstellationMap")
  const linesSvg = document.getElementById("additionConstellationLines")
  if (!map) return

  const nodes = getAllAdditionMapNodes()

  map.querySelectorAll(".addition-planet").forEach((el) => el.remove())

  if (linesSvg) {
    linesSvg.innerHTML = `<polyline points="${buildAdditionConstellationPath(nodes)}" />`
  }

  nodes.forEach((node) => {
    map.appendChild(createAdditionPlanetElement(node))
  })
}

function startAdditionLevel(galaxyId, stageNumber) {
  const found = getAdditionLevel(galaxyId, stageNumber)
  if (!found) {
    showToast("레벨을 찾을 수 없어요.")
    return
  }

  const unlock = getAdditionLevelUnlockState(found.level.id)
  if (unlock.isLocked) {
    showToast("아직 잠긴 행성이에요. 이전 레벨을 먼저 완료해요!")
    return
  }

  additionState.galaxyId = galaxyId
  additionState.galaxyName = found.galaxy.name
  additionState.level = found.level
  additionState.layout = found.level.uiConfig.defaultLayout
  additionState.recentProblemKeys = []
  additionState.activeStrategy = null

  loadBolts()
  resetAdditionPowerSession()
  nextAdditionQuestion()
  updateAdditionView()
  showScreen("additiongame")
  showToast(`${found.galaxy.name} Lv${stageNumber} 시작!`)
}

function nextAdditionQuestion() {
  additionState.currentProblem = generateAdditionProblem(additionState.level, {
    recentProblemKeys: additionState.recentProblemKeys,
  })
  const problemKey = additionFormatProblemKey(additionState.currentProblem)
  additionState.recentProblemKeys.push(problemKey)
  if (additionState.recentProblemKeys.length > ADDITION_RECENT_PROBLEM_LIMIT) {
    additionState.recentProblemKeys.shift()
  }
  additionState.answerInput = ""
  additionState.activeStrategy = null
  additionState.usedStrategyOnCurrent = false
  // missedCurrentProblem은 정답 처리 후 이미 false.
  // 새 문제로 넘어가므로 명시적으로 초기화한다.
  additionState.missedCurrentProblem = false
}

// ─── 메인 수식 렌더링 ─────────────────────────────────────────

function isAdditionBlankProblem(problem) {
  if (!problem) return false
  return (
    problem.operationType === ADDITION_OPERATION_TYPES.MAKE_TEN_COMPLEMENT ||
    problem.operationType === ADDITION_OPERATION_TYPES.MISSING_ADDEND
  )
}

/** 역산/? 문제의 최대 입력 자릿수 (정답 자릿수 기준, 1~2) */
function getAdditionAnswerMaxDigits(problem) {
  if (!problem) return 4
  if (!isAdditionBlankProblem(problem)) return 4

  const answerDigits = String(Math.abs(Number(problem.answer) || 0)).length
  return Math.min(2, Math.max(1, answerDigits))
}

function getAdditionBlankDisplayValue() {
  return additionState.answerInput === "" ? "?" : additionState.answerInput
}

function renderAdditionMainEquation(problem, layout) {
  const el = document.getElementById("additionMainEquation")
  if (!el || !problem) return

  el.classList.toggle("addition-main-equation--vertical", layout === ADDITION_LAYOUT.VERTICAL)

  if (layout === ADDITION_LAYOUT.VERTICAL && problem.operationType === ADDITION_OPERATION_TYPES.STANDARD) {
    el.innerHTML = `
      <div class="addition-vertical">
        <div class="addition-vertical__row addition-vertical__row--a">${problem.operandA}</div>
        <div class="addition-vertical__row addition-vertical__row--addend">
          <span class="addition-vertical__op" aria-hidden="true">+</span>
          <span class="addition-vertical__num">${problem.operandB}</span>
        </div>
        <div class="addition-vertical__line" aria-hidden="true"></div>
        <div class="addition-vertical__row addition-vertical__row--answer">${additionState.answerInput || "?"}</div>
      </div>
    `
    return
  }

  if (isAdditionBlankProblem(problem)) {
    const blankValue = getAdditionBlankDisplayValue()
    const blankClass =
      additionState.answerInput === ""
        ? "addition-term addition-term--unknown"
        : "addition-term addition-term--unknown addition-term--filled"

    el.innerHTML = buildHorizontalEquationHtml([
      { text: String(problem.operandA), className: "addition-term addition-term--a" },
      { text: "+", className: "play-equation__op" },
      { text: blankValue, className: blankClass },
      { text: "=", className: "play-equation__op" },
      { text: String(problem.target), className: "addition-term addition-term--target" },
    ])
    return
  }

  el.innerHTML = buildHorizontalEquationHtml([
    { text: String(problem.operandA), className: "addition-term addition-term--a" },
    { text: "+", className: "play-equation__op" },
    { text: String(problem.operandB), className: "addition-term addition-term--b" },
    { text: "=", className: "play-equation__op" },
    { text: additionState.answerInput || "?", className: "play-equation__answer" },
  ])
}

function buildHorizontalEquationHtml(parts) {
  return parts
    .map((part) => `<span class="${part.className}">${part.text}</span>`)
    .join("")
}

function pulseAdditionMainOperand(strategyId) {
  const mainEl = document.getElementById("additionMainEquation")
  if (!mainEl) return

  mainEl.classList.remove(
    "addition-main-equation--pulse-a",
    "addition-main-equation--pulse-b"
  )
  void mainEl.offsetWidth

  if (strategyId === ADDITION_STRATEGIES.SLIDE) {
    mainEl.classList.add("addition-main-equation--pulse-a")
  } else if (strategyId === ADDITION_STRATEGIES.MAKE10) {
    mainEl.classList.add("addition-main-equation--pulse-b")
  }
}

// ─── 전략 수식 렌더링 ─────────────────────────────────────────

function buildAdditionStrategyEquationHtml(operandA, operandB, strategyId) {
  if (strategyId === ADDITION_STRATEGIES.SLIDE) {
    const parts = decomposeByPlaceValue(operandA)
    if (parts.length <= 1) {
      return `<span class="addition-strategy-expr">${operandA}<span class="play-equation__op">+</span>${operandB}<span class="play-equation__op">=</span><span class="play-equation__answer">?</span></span>`
    }

    const mid = (parts.length - 1) / 2
    const decomposed = parts
      .map((part, index) => {
        const offset = index - mid
        return `<span class="addition-part addition-part--split" style="--part-index:${index}; --slide-offset:${offset}">${part.value}</span>`
      })
      .join('<span class="play-equation__op addition-op--fade">+</span>')

    return `
      <span class="addition-strategy-expr addition-strategy-expr--slide">
        <span class="addition-ghost" aria-hidden="true">${operandA}</span>
        <span class="addition-group addition-group--split">(${decomposed})</span>
        <span class="play-equation__op">+</span>
        <span class="addition-part addition-part--b">${operandB}</span>
        <span class="play-equation__op">=</span>
        <span class="play-equation__answer">?</span>
      </span>
    `
  }

  if (strategyId === ADDITION_STRATEGIES.MAKE10) {
    const split = decomposeForMake10(operandA, operandB)
    if (!split) {
      return `<span class="addition-strategy-expr">${operandA}<span class="play-equation__op">+</span>${operandB}<span class="play-equation__op">=</span><span class="play-equation__answer">?</span></span>`
    }

    return `
      <span class="addition-strategy-expr addition-strategy-expr--make10">
        <span class="addition-part addition-part--a">${operandA}</span>
        <span class="play-equation__op">+</span>
        <span class="addition-ghost addition-ghost--b" aria-hidden="true">${operandB}</span>
        <span class="addition-group addition-group--make10">(
          <span class="addition-part addition-part--ten" style="--part-index:0">${split.complement}</span>
          <span class="play-equation__op addition-op--fade">+</span>
          <span class="addition-part addition-part--rest" style="--part-index:1">${split.remainder}</span>
        )</span>
        <span class="play-equation__op">=</span>
        <span class="play-equation__answer">?</span>
      </span>
    `
  }

  return formatAdditionStrategyEquation(operandA, operandB, strategyId)
}

function selectAdditionStrategy(strategyId) {
  const problem = additionState.currentProblem
  const level = additionState.level
  if (!problem || !level) return
  if (!levelSupportsStrategy(level, strategyId)) return
  if (problem.operandB == null) return

  if (
    strategyId === ADDITION_STRATEGIES.MAKE10 &&
    !decomposeForMake10(problem.operandA, problem.operandB)
  ) {
    showToast("이 문제는 10만들기 마법을 쓰기 어려워요.")
    return
  }

  additionState.activeStrategy = strategyId
  additionState.usedStrategyOnCurrent = true

  const strategyButtons = document.querySelectorAll(".addition-strategy-btn")
  strategyButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.strategy === strategyId)
  })

  pulseAdditionMainOperand(strategyId)

  const equationEl = document.getElementById("additionStrategyEquation")
  if (!equationEl) return

  equationEl.innerHTML = buildAdditionStrategyEquationHtml(
    problem.operandA,
    problem.operandB,
    strategyId
  )
  equationEl.hidden = false
  equationEl.classList.remove(
    "addition-strategy__equation--visible",
    "addition-strategy__equation--slide",
    "addition-strategy__equation--make10",
    "addition-strategy__equation--animating"
  )
  void equationEl.offsetWidth
  equationEl.classList.add("addition-strategy__equation--visible")
  equationEl.classList.add("addition-strategy__equation--animating")
  equationEl.classList.add(
    strategyId === ADDITION_STRATEGIES.SLIDE
      ? "addition-strategy__equation--slide"
      : "addition-strategy__equation--make10"
  )
}

function clearAdditionStrategyDisplay() {
  additionState.activeStrategy = null

  document.querySelectorAll(".addition-strategy-btn").forEach((button) => {
    button.classList.remove("is-active")
  })

  const mainEl = document.getElementById("additionMainEquation")
  mainEl?.classList.remove(
    "addition-main-equation--pulse-a",
    "addition-main-equation--pulse-b"
  )

  const equationEl = document.getElementById("additionStrategyEquation")
  if (!equationEl) return

  equationEl.hidden = true
  equationEl.innerHTML = ""
  equationEl.classList.remove(
    "addition-strategy__equation--visible",
    "addition-strategy__equation--slide",
    "addition-strategy__equation--make10",
    "addition-strategy__equation--animating"
  )
}

// ─── UI 갱신 ─────────────────────────────────────────────────

function updateAdditionStrategyButtons() {
  const level = additionState.level
  const area = document.getElementById("additionStrategyArea")
  const slideBtn = document.getElementById("additionStrategySlide")
  const make10Btn = document.getElementById("additionStrategyMake10")
  if (!level || !area || !slideBtn || !make10Btn) return

  const strategies = level.uiConfig.strategies
  const hasStrategies = strategies.length > 0

  area.hidden = !hasStrategies
  slideBtn.hidden = !strategies.includes(ADDITION_STRATEGIES.SLIDE)
  make10Btn.hidden = !strategies.includes(ADDITION_STRATEGIES.MAKE10)
}

function updateAdditionLayoutToggle() {
  const level = additionState.level
  const toggle = document.getElementById("additionLayoutToggle")
  if (!toggle || !level) return

  const show = levelSupportsLayoutToggle(level)
  toggle.hidden = !show
  toggle.classList.toggle("is-visible", show)
  toggle.setAttribute("aria-hidden", show ? "false" : "true")

  if (!show) {
    additionState.layout = ADDITION_LAYOUT.HORIZONTAL
  }

  toggle.querySelectorAll(".addition-layout-toggle__btn").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.layout === additionState.layout)
  })
}

function updateAdditionView() {
  const problem = additionState.currentProblem
  const level = additionState.level
  if (!problem || !level) return

  const modeLabel = document.getElementById("additionModeLabel")
  const hint = document.getElementById("additionHint")
  const playerName = document.getElementById("additionPlayerName")

  if (modeLabel) {
    modeLabel.textContent = `${additionState.galaxyName} · Lv${level.stageNumber}`
  }
  if (playerName) playerName.textContent = getCurrentPlayerName()

  if (hint) {
    hint.textContent = isInverseAdditionLevel(level)
      ? "빈칸에 들어갈 수를 입력해요!"
      : "전략 버튼을 눌러 수식을 바꿔 봐요!"
  }

  updateAdditionStrategyButtons()
  updateAdditionLayoutToggle()
  updateAdditionPowerBar()
  renderAdditionMainEquation(problem, additionState.layout)
  clearAdditionStrategyDisplay()
}

function setAdditionLayout(layout) {
  if (!levelSupportsLayoutToggle(additionState.level)) return
  additionState.layout = layout
  updateAdditionLayoutToggle()
  renderAdditionMainEquation(additionState.currentProblem, additionState.layout)
}

// ─── 입력 처리 ───────────────────────────────────────────────

function handleAdditionKeypadNumber(value) {
  const problem = additionState.currentProblem
  const maxDigits = getAdditionAnswerMaxDigits(problem)
  if (additionState.answerInput.length >= maxDigits) return

  additionState.answerInput += value
  renderAdditionMainEquation(problem, additionState.layout)
}

function clearAdditionAnswerDigit() {
  additionState.answerInput = additionState.answerInput.slice(0, -1)
  renderAdditionMainEquation(additionState.currentProblem, additionState.layout)
}

function submitAdditionAnswer() {
  const problem = additionState.currentProblem
  if (!problem) return

  if (additionState.answerInput === "") {
    showToast(
      isAdditionBlankProblem(problem)
        ? "? 자리에 숫자를 입력해 주세요."
        : "답을 입력해 주세요."
    )
    return
  }

  if (checkAdditionAnswer(problem, additionState.answerInput)) {
    const result = handleAdditionCorrectPower()

    if (result.stageCleared) {
      showAdditionPowerMaxFx("다음 단계가 열렸어요!")
    } else if (result.awardedVolts > 0) {
      showToast(`파워 MAX 유지! 볼트 +${result.awardedVolts} ⚡`)
    } else {
      const sign = result.gainPower >= 0 ? "+" : ""
      showToast(`정답! 파워 ${sign}${result.gainPower}`)
    }

    nextAdditionQuestion()
    updateAdditionView()
    return
  }

  const result = handleAdditionWrongPower()
  showToast(`다시 생각해 봐요! (파워 ${result.gainPower})`)
  additionState.answerInput = ""
  renderAdditionMainEquation(additionState.currentProblem, additionState.layout)
  updateAdditionPowerBar()
}

function initAdditionGame() {
  const slideBtn = document.getElementById("additionStrategySlide")
  const make10Btn = document.getElementById("additionStrategyMake10")
  const layoutToggle = document.getElementById("additionLayoutToggle")
  const exitBtn = document.getElementById("additionExitButton")
  const mapBackBtn = document.getElementById("additionMapBackButton")
  const keypad = document.getElementById("additionKeypad")

  slideBtn?.addEventListener("click", () => {
    selectAdditionStrategy(ADDITION_STRATEGIES.SLIDE)
  })

  make10Btn?.addEventListener("click", () => {
    selectAdditionStrategy(ADDITION_STRATEGIES.MAKE10)
  })

  layoutToggle?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-layout]")
    if (!button) return
    setAdditionLayout(button.dataset.layout)
  })

  exitBtn?.addEventListener("click", () => {
    persistAdditionLevelProgress()
    renderAdditionMap()
    showScreen("additionmap")
  })

  mapBackBtn?.addEventListener("click", () => {
    showScreen("main")
  })

  if (keypad) {
    bindKeypad(keypad, {
      onNumber: handleAdditionKeypadNumber,
      onClear: clearAdditionAnswerDigit,
      onSubmit: submitAdditionAnswer,
    })
  }
}
