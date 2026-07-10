/**
 * 덧셈 게임 UI + 숙련도(파워) 시스템
 * - 전략 버튼 클릭 시 보조 수식 표시
 * - 가로/세로셈 전환 (은하계)
 * - 파워 게이지 Max 200 · 콤보 · 전략 보너스 · 오답 페널티
 */

const ADDITION_POWER_MAX = 200
const ADDITION_POWER_BASE = 10
const ADDITION_POWER_COMBO_BONUS = 5
const ADDITION_POWER_STRATEGY_BONUS = 5
const ADDITION_POWER_WRONG_PENALTY = -10
const ADDITION_POWER_RETRY_REWARD = 10
const ADDITION_MAX_POWER_LEVEL = 5
const ADDITION_MAX_LEVEL_VOLT_BONUS = 10

const additionState = {
  galaxyId: null,
  galaxyName: "",
  level: null,
  currentProblem: null,
  answerInput: "",
  activeStrategy: null,
  layout: ADDITION_LAYOUT.HORIZONTAL,
  lastProblemKey: null,
  currentPower: 0,
  comboCount: 0,
  totalVolts: 0,
  powerLevel: 1,
  missedCurrentProblem: false,
  usedStrategyOnCurrent: false,
}

// ─── 숙련도(파워) 계산 ─────────────────────────────────────────

/**
 * 정답/오답에 따른 파워 변화량 계산
 * @param {{ isCorrect: boolean, comboCount: number, usedStrategy: boolean, isRetry: boolean }} params
 * @returns {number}
 *
 * 정답(일반): 기본 10 + (콤보-1)×5 + 전략 5
 *   1콤보 +10, 2콤보 +15, 3콤보 +20 ...
 * 재도전 정답: +10 (+ 전략 사용 시 +5)
 * 오답: -10
 */
function calculatePowerGain({ isCorrect, comboCount, usedStrategy, isRetry }) {
  if (!isCorrect) return ADDITION_POWER_WRONG_PENALTY

  if (isRetry) {
    return ADDITION_POWER_RETRY_REWARD + (usedStrategy ? ADDITION_POWER_STRATEGY_BONUS : 0)
  }

  const comboBonus = Math.max(0, comboCount - 1) * ADDITION_POWER_COMBO_BONUS
  const strategyBonus = usedStrategy ? ADDITION_POWER_STRATEGY_BONUS : 0
  return ADDITION_POWER_BASE + comboBonus + strategyBonus
}

function isAdditionMaxPowerLevel() {
  return additionState.powerLevel >= ADDITION_MAX_POWER_LEVEL
}

function syncAdditionVoltsToGameState() {
  gameState.bolts = additionState.totalVolts
  saveBolts()
}

function updateAdditionPowerBar() {
  const fillEl = document.getElementById("addition-power-bar")
  const countEl = document.getElementById("additionPowerCount")
  const metaEl = document.getElementById("additionPowerMeta")
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
  if (metaEl) {
    metaEl.textContent = `콤보 ${additionState.comboCount} · 숙련 Lv${additionState.powerLevel}`
  }
  if (boltEl) boltEl.textContent = additionState.totalVolts

  const marker = fillEl?.parentElement?.querySelector(".combo-bar__egg")
  if (marker) marker.style.left = `${percent}%`
}

function applyAdditionPowerDelta(delta) {
  const previous = additionState.currentPower
  let next = previous + delta
  if (next < 0) next = 0

  if (isAdditionMaxPowerLevel()) {
    let awardedVolts = 0
    if (next >= ADDITION_POWER_MAX) {
      additionState.currentPower = ADDITION_POWER_MAX
      if (delta > 0) {
        awardedVolts = ADDITION_MAX_LEVEL_VOLT_BONUS
        additionState.totalVolts += awardedVolts
        syncAdditionVoltsToGameState()
      }
    } else {
      additionState.currentPower = next
    }
    updateAdditionPowerBar()
    return {
      leveledUp: false,
      awardedVolts,
      previous,
      current: additionState.currentPower,
      gain: delta,
    }
  }

  if (next >= ADDITION_POWER_MAX) {
    additionState.powerLevel = Math.min(
      additionState.powerLevel + 1,
      ADDITION_MAX_POWER_LEVEL
    )
    additionState.currentPower = isAdditionMaxPowerLevel() ? ADDITION_POWER_MAX : 0
    updateAdditionPowerBar()
    return {
      leveledUp: true,
      awardedVolts: 0,
      previous,
      current: additionState.currentPower,
      gain: delta,
    }
  }

  additionState.currentPower = next
  updateAdditionPowerBar()
  return {
    leveledUp: false,
    awardedVolts: 0,
    previous,
    current: next,
    gain: delta,
  }
}

function handleAdditionCorrectPower() {
  const usedStrategy = Boolean(additionState.usedStrategyOnCurrent)
  const isRetry = additionState.missedCurrentProblem

  if (isRetry) {
    additionState.comboCount = 1
  } else {
    additionState.comboCount += 1
  }

  const gain = calculatePowerGain({
    isCorrect: true,
    comboCount: additionState.comboCount,
    usedStrategy,
    isRetry,
  })

  additionState.missedCurrentProblem = false
  additionState.usedStrategyOnCurrent = false

  return applyAdditionPowerDelta(gain)
}

function handleAdditionWrongPower() {
  additionState.comboCount = 0
  additionState.missedCurrentProblem = true

  const gain = calculatePowerGain({
    isCorrect: false,
    comboCount: 0,
    usedStrategy: false,
    isRetry: false,
  })

  return applyAdditionPowerDelta(gain)
}

function resetAdditionPowerSession() {
  additionState.currentPower = 0
  additionState.comboCount = 0
  additionState.powerLevel = 1
  additionState.missedCurrentProblem = false
  additionState.usedStrategyOnCurrent = false
  additionState.totalVolts = gameState.bolts
  updateAdditionPowerBar()
}

// ─── 게임 진입 ───────────────────────────────────────────────

function renderAdditionMap() {
  const container = document.getElementById("additionMapGroups")
  if (!container) return

  container.innerHTML = ""

  ADDITION_GALAXIES.forEach((galaxy) => {
    const section = document.createElement("section")
    section.className = "addition-map-group"
    section.innerHTML = `
      <header class="addition-map-group__header">
        <span class="addition-map-group__icon" aria-hidden="true">${galaxy.theme.buddy}</span>
        <div>
          <h3>${galaxy.name}</h3>
          <p>${galaxy.subtitle}</p>
        </div>
      </header>
      <div class="addition-map-group__levels"></div>
    `

    const levelsEl = section.querySelector(".addition-map-group__levels")
    galaxy.levels.forEach((level) => {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "addition-map-level"
      button.innerHTML = `
        <strong>Lv${level.stageNumber}</strong>
        <span>${level.name}</span>
      `
      button.addEventListener("click", () => {
        startAdditionLevel(galaxy.id, level.stageNumber)
      })
      levelsEl.appendChild(button)
    })

    container.appendChild(section)
  })
}

function startAdditionLevel(galaxyId, stageNumber) {
  const found = getAdditionLevel(galaxyId, stageNumber)
  if (!found) {
    showToast("레벨을 찾을 수 없어요.")
    return
  }

  additionState.galaxyId = galaxyId
  additionState.galaxyName = found.galaxy.name
  additionState.level = found.level
  additionState.layout = found.level.uiConfig.defaultLayout
  additionState.lastProblemKey = null
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
    lastProblemKey: additionState.lastProblemKey,
  })
  additionState.lastProblemKey = additionFormatProblemKey(additionState.currentProblem)
  additionState.answerInput = ""
  additionState.activeStrategy = null
  additionState.usedStrategyOnCurrent = false
  // missedCurrentProblem은 정답 처리 후 이미 false.
  // 새 문제로 넘어가므로 명시적으로 초기화한다.
  additionState.missedCurrentProblem = false
}

// ─── 메인 수식 렌더링 ─────────────────────────────────────────

function renderAdditionMainEquation(problem, layout) {
  const el = document.getElementById("additionMainEquation")
  if (!el || !problem) return

  el.classList.toggle("addition-main-equation--vertical", layout === ADDITION_LAYOUT.VERTICAL)

  if (layout === ADDITION_LAYOUT.VERTICAL && problem.operationType === ADDITION_OPERATION_TYPES.STANDARD) {
    el.innerHTML = `
      <div class="addition-vertical">
        <div class="addition-vertical__row addition-vertical__row--b">${problem.operandB}</div>
        <div class="addition-vertical__row addition-vertical__row--op">+</div>
        <div class="addition-vertical__row addition-vertical__row--a">${problem.operandA}</div>
        <div class="addition-vertical__line" aria-hidden="true"></div>
        <div class="addition-vertical__row addition-vertical__row--answer">${additionState.answerInput || "?"}</div>
      </div>
    `
    return
  }

  if (problem.operationType === ADDITION_OPERATION_TYPES.MAKE_TEN_COMPLEMENT) {
    el.innerHTML = buildHorizontalEquationHtml([
      { text: String(problem.operandA), className: "addition-term" },
      { text: "+", className: "play-equation__op" },
      { text: "?", className: "addition-term addition-term--unknown" },
      { text: "=", className: "play-equation__op" },
      { text: String(problem.target), className: "addition-term addition-term--target" },
    ])
    return
  }

  if (problem.operationType === ADDITION_OPERATION_TYPES.MISSING_ADDEND) {
    el.innerHTML = buildHorizontalEquationHtml([
      { text: String(problem.operandA), className: "addition-term" },
      { text: "+", className: "play-equation__op" },
      { text: "?", className: "addition-term addition-term--unknown" },
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
  if (additionState.answerInput.length >= 4) return
  additionState.answerInput += value
  renderAdditionMainEquation(additionState.currentProblem, additionState.layout)
}

function submitAdditionAnswer() {
  const problem = additionState.currentProblem
  if (!problem) return

  if (additionState.answerInput === "") {
    showToast("답을 입력해 주세요.")
    return
  }

  if (checkAdditionAnswer(problem, additionState.answerInput)) {
    const result = handleAdditionCorrectPower()

    if (result.leveledUp) {
      showToast(`숙련도 Lv${additionState.powerLevel}! 대단해요!`)
    } else if (result.awardedVolts > 0) {
      showToast(`만렙! 볼트 +${result.awardedVolts} ⚡`)
    } else {
      const sign = result.gain >= 0 ? "+" : ""
      showToast(`정답! 파워 ${sign}${result.gain}`)
    }

    nextAdditionQuestion()
    updateAdditionView()
    return
  }

  const result = handleAdditionWrongPower()
  showToast(`다시 생각해 봐요! (파워 ${result.gain})`)
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
    showScreen("additionmap")
  })

  mapBackBtn?.addEventListener("click", () => {
    showScreen("main")
  })

  if (keypad) {
    bindKeypad(keypad, {
      onNumber: handleAdditionKeypadNumber,
      onClear: () => {
        additionState.answerInput = additionState.answerInput.slice(0, -1)
        renderAdditionMainEquation(additionState.currentProblem, additionState.layout)
      },
      onSubmit: submitAdditionAnswer,
    })
  }
}
