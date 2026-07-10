/**
 * 덧셈 게임 UI (3단계)
 * - 전략 버튼 클릭 시 보조 수식 표시
 * - 가로/세로셈 전환 (은하계)
 */

const additionState = {
  galaxyId: null,
  galaxyName: "",
  level: null,
  currentProblem: null,
  answerInput: "",
  activeStrategy: null,
  layout: ADDITION_LAYOUT.HORIZONTAL,
  lastProblemKey: null,
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
    { text: String(problem.operandA), className: "addition-term" },
    { text: "+", className: "play-equation__op" },
    { text: String(problem.operandB), className: "addition-term" },
    { text: "=", className: "play-equation__op" },
    { text: additionState.answerInput || "?", className: "play-equation__answer" },
  ])
}

function buildHorizontalEquationHtml(parts) {
  return parts
    .map((part) => `<span class="${part.className}">${part.text}</span>`)
    .join("")
}

// ─── 전략 수식 렌더링 ─────────────────────────────────────────

function buildAdditionStrategyEquationHtml(operandA, operandB, strategyId) {
  if (strategyId === ADDITION_STRATEGIES.SLIDE) {
    const parts = decomposeByPlaceValue(operandA)
    if (parts.length <= 1) {
      return `<span class="addition-strategy-expr">${operandA}<span class="play-equation__op">+</span>${operandB}<span class="play-equation__op">=</span><span class="play-equation__answer">?</span></span>`
    }

    const decomposed = parts
      .map(
        (part, index) =>
          `<span class="addition-part addition-part--split" style="--part-index:${index}">${part.value}</span>`
      )
      .join('<span class="play-equation__op">+</span>')

    return `
      <span class="addition-strategy-expr addition-strategy-expr--slide">
        <span class="addition-group">(${decomposed})</span>
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
        <span class="addition-group">(
          <span class="addition-part addition-part--ten" style="--part-index:0">${split.complement}</span>
          <span class="play-equation__op">+</span>
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

  additionState.activeStrategy = strategyId

  const strategyButtons = document.querySelectorAll(".addition-strategy-btn")
  strategyButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.strategy === strategyId)
  })

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
    "addition-strategy__equation--make10"
  )
  void equationEl.offsetWidth
  equationEl.classList.add("addition-strategy__equation--visible")
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

  const equationEl = document.getElementById("additionStrategyEquation")
  if (!equationEl) return

  equationEl.hidden = true
  equationEl.innerHTML = ""
  equationEl.classList.remove(
    "addition-strategy__equation--visible",
    "addition-strategy__equation--slide",
    "addition-strategy__equation--make10"
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
  const boltCount = document.getElementById("additionBoltCount")

  if (modeLabel) modeLabel.textContent = `${additionState.galaxyName} · Lv${level.stageNumber}`
  if (playerName) playerName.textContent = getCurrentPlayerName()
  if (boltCount) boltCount.textContent = gameState.bolts

  if (hint) {
    hint.textContent = isInverseAdditionLevel(level)
      ? "빈칸에 들어갈 수를 입력해요!"
      : "전략 버튼을 눌러 수식을 바꿔 봐요!"
  }

  updateAdditionStrategyButtons()
  updateAdditionLayoutToggle()
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
    gameState.bolts += 10
    saveBolts()
    showToast("정답이에요!")
    nextAdditionQuestion()
    updateAdditionView()
    return
  }

  showToast("다시 생각해 봐요!")
  additionState.answerInput = ""
  renderAdditionMainEquation(additionState.currentProblem, additionState.layout)
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
