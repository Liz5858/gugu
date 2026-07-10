/**
 * 덧셈 우주맵 레벨 데이터
 *
 * 계층 구조:
 *   ADDITION_GALAXIES[]          — 맵 구역 (달 / 우주정거장 / 은하계)
 *     └── levels[]               — Lv1 ~ LvN 스테이지
 *           ├── problemConfig    — 연산 유형 + 문제 생성 파라미터
 *           └── uiConfig         — 전략 버튼 · 가로/세로셈 설정
 *
 * 스프레드시트:
 *   https://docs.google.com/spreadsheets/d/1i8qArP2iMN08RH8BbL5shTmFiGpmGokmhJeYrx6kTZQ
 */

const ADDITION_PROBLEMS_PER_STAGE = 19

/** 전략 ID — UI 버튼·수식 변환에 공통 사용 */
const ADDITION_STRATEGIES = {
  SLIDE: "slide", // 스르륵 분리: 23+8 → (20+3)+8
  MAKE10: "make10", // 10만들기 마법: 23+8 → 23+(7+1)
}

/** 가로셈 / 세로셈 */
const ADDITION_LAYOUT = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
}

/** 받아올림 조건 */
const ADDITION_CARRY_RULES = {
  NONE: "none",
  ONES_ONLY: "ones",
  ANY: "any",
}

/**
 * 연산 유형
 *   standard          — a + b = ?
 *   makeTenComplement — a + ? = (다음 10의 배수)  예: 18+?=20
 *   missingAddend     — a + ? = 합              예: 34+?=41
 */
const ADDITION_OPERATION_TYPES = {
  STANDARD: "standard",
  MAKE_TEN_COMPLEMENT: "makeTenComplement",
  MISSING_ADDEND: "missingAddend",
}

/** 전략 버튼 메타 (3단계 UI) */
const ADDITION_STRATEGY_META = {
  [ADDITION_STRATEGIES.SLIDE]: {
    id: ADDITION_STRATEGIES.SLIDE,
    label: "스르륵 분리!",
    shortHint: "큰 수를 십·백의 자리로 나눠요",
    transform: "decomposeA",
  },
  [ADDITION_STRATEGIES.MAKE10]: {
    id: ADDITION_STRATEGIES.MAKE10,
    label: "10만들기 마법!",
    shortHint: "작은 수를 나눠 10을 만들어요",
    transform: "decomposeBForTen",
  },
}

/**
 * 맵 + 레벨 정의 (스프레드시트 기준)
 *
 * problemConfig 스키마:
 *   operationType   — ADDITION_OPERATION_TYPES
 *   operandA/B      — { min, max, digits, multipleOf? }
 *   sumMax          — 합 상한
 *   carryRule       — ADDITION_CARRY_RULES (standard 전용)
 *
 * uiConfig 스키마:
 *   strategies            — 전략 버튼 ID 배열 (빈 배열이면 버튼 숨김)
 *   defaultLayout         — ADDITION_LAYOUT
 *   supportsLayoutToggle  — 가로/세로 전환 버튼 노출
 */
const ADDITION_GALAXIES = [
  {
    id: "moon",
    name: "달",
    subtitle: "Moon",
    mapPosition: { x: "22%", y: "20%" },
    theme: { buddy: "🌙", color: "#c8d4f0" },
    levels: [
      {
        id: "moon-lv1",
        stageNumber: 1,
        name: "2자리 + 1자리 (받아올림 X)",
        mapPosition: { x: "18%", y: "12%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 10, max: 88, digits: 2 },
          operandB: { min: 1, max: 9, digits: 1 },
          sumMax: 99,
          carryRule: ADDITION_CARRY_RULES.NONE,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: false,
        },
      },
      {
        id: "moon-lv2",
        stageNumber: 2,
        name: "10의 배수 만들기 (보수)",
        mapPosition: { x: "28%", y: "24%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.MAKE_TEN_COMPLEMENT,
          operandA: { min: 11, max: 89, digits: 2 },
          targetMultipleOf: 10,
        },
        uiConfig: {
          strategies: [],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: false,
        },
      },
      {
        id: "moon-lv3",
        stageNumber: 3,
        name: "2자리 + 1자리 (받아올림 O)",
        mapPosition: { x: "18%", y: "36%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 11, max: 89, digits: 2 },
          operandB: { min: 2, max: 9, digits: 1 },
          sumMax: 99,
          carryRule: ADDITION_CARRY_RULES.ONES_ONLY,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: false,
        },
      },
      {
        id: "moon-lv4",
        stageNumber: 4,
        name: "덧셈 역산",
        mapPosition: { x: "28%", y: "48%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.MISSING_ADDEND,
          operandA: { min: 10, max: 90, digits: 2 },
          operandB: { min: 1, max: 9, digits: 1 },
          sumMax: 99,
          carryRule: ADDITION_CARRY_RULES.ANY,
        },
        uiConfig: {
          strategies: [],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: false,
        },
      },
    ],
  },
  {
    id: "space-station",
    name: "우주정거장",
    subtitle: "Space Station",
    mapPosition: { x: "50%", y: "38%" },
    theme: { buddy: "🛸", color: "#57e0b3" },
    levels: [
      {
        id: "station-lv1",
        stageNumber: 1,
        name: "2자리 + 2자리 (받아올림 X)",
        mapPosition: { x: "46%", y: "28%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 10, max: 49, digits: 2 },
          operandB: { min: 10, max: 49, digits: 2 },
          sumMax: 98,
          carryRule: ADDITION_CARRY_RULES.NONE,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: false,
        },
      },
      {
        id: "station-lv2",
        stageNumber: 2,
        name: "2자리 + 2자리 (5의 배수)",
        mapPosition: { x: "54%", y: "38%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 10, max: 95, digits: 2, multipleOf: 5 },
          operandB: { min: 10, max: 95, digits: 2, multipleOf: 5 },
          sumMax: 190,
          carryRule: ADDITION_CARRY_RULES.ANY,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: false,
        },
      },
      {
        id: "station-lv3",
        stageNumber: 3,
        name: "2자리 + 2자리 (받아올림 O)",
        mapPosition: { x: "46%", y: "48%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 11, max: 89, digits: 2 },
          operandB: { min: 11, max: 89, digits: 2 },
          sumMax: 198,
          carryRule: ADDITION_CARRY_RULES.ONES_ONLY,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: false,
        },
      },
    ],
  },
  {
    id: "galaxy-cluster",
    name: "은하계",
    subtitle: "Galaxy",
    mapPosition: { x: "78%", y: "55%" },
    theme: { buddy: "🌌", color: "#ff8fb3" },
    levels: [
      {
        id: "galaxy-lv1",
        stageNumber: 1,
        name: "3자리 + 1자리 (받아올림 X)",
        mapPosition: { x: "72%", y: "18%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 100, max: 989, digits: 3 },
          operandB: { min: 1, max: 9, digits: 1 },
          sumMax: 999,
          carryRule: ADDITION_CARRY_RULES.NONE,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: true,
        },
      },
      {
        id: "galaxy-lv2",
        stageNumber: 2,
        name: "3자리 + 10의 배수 (100 이하)",
        mapPosition: { x: "84%", y: "30%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 100, max: 899, digits: 3 },
          operandB: { min: 10, max: 100, digits: 3, multipleOf: 10 },
          sumMax: 999,
          carryRule: ADDITION_CARRY_RULES.ANY,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: true,
        },
      },
      {
        id: "galaxy-lv3",
        stageNumber: 3,
        name: "3자리 + 100의 배수 (1000 이하)",
        mapPosition: { x: "72%", y: "42%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 100, max: 899, digits: 3 },
          operandB: { min: 100, max: 900, digits: 3, multipleOf: 100 },
          sumMax: 1000,
          carryRule: ADDITION_CARRY_RULES.ANY,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: true,
        },
      },
      {
        id: "galaxy-lv4",
        stageNumber: 4,
        name: "3자리 + 1자리 (받아올림 O)",
        mapPosition: { x: "84%", y: "54%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 101, max: 989, digits: 3 },
          operandB: { min: 2, max: 9, digits: 1 },
          sumMax: 999,
          carryRule: ADDITION_CARRY_RULES.ONES_ONLY,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: true,
        },
      },
      {
        id: "galaxy-lv5",
        stageNumber: 5,
        name: "3자리 + 2자리 (받아올림 O)",
        mapPosition: { x: "72%", y: "66%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 100, max: 989, digits: 3 },
          operandB: { min: 10, max: 99, digits: 2 },
          sumMax: 999,
          carryRule: ADDITION_CARRY_RULES.ONES_ONLY,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: true,
        },
      },
      {
        id: "galaxy-lv6",
        stageNumber: 6,
        name: "3자리 + 3자리 (받아올림 O)",
        mapPosition: { x: "84%", y: "78%" },
        problemConfig: {
          operationType: ADDITION_OPERATION_TYPES.STANDARD,
          operandA: { min: 100, max: 899, digits: 3 },
          operandB: { min: 100, max: 899, digits: 3 },
          sumMax: 1798,
          carryRule: ADDITION_CARRY_RULES.ANY,
        },
        uiConfig: {
          strategies: [ADDITION_STRATEGIES.SLIDE, ADDITION_STRATEGIES.MAKE10],
          defaultLayout: ADDITION_LAYOUT.HORIZONTAL,
          supportsLayoutToggle: true,
        },
      },
    ],
  },
]

// ─── 조회 헬퍼 ───────────────────────────────────────────────

function getAdditionGalaxy(galaxyId) {
  return ADDITION_GALAXIES.find((galaxy) => galaxy.id === galaxyId) ?? null
}

function getAdditionLevelById(levelId) {
  for (const galaxy of ADDITION_GALAXIES) {
    const level = galaxy.levels.find((entry) => entry.id === levelId)
    if (level) return { galaxy, level }
  }
  return null
}

function getAdditionLevel(galaxyId, stageNumber) {
  const galaxy = getAdditionGalaxy(galaxyId)
  if (!galaxy) return null
  const level = galaxy.levels.find((entry) => entry.stageNumber === stageNumber)
  if (!level) return null
  return { galaxy, level }
}

/** 맵 렌더링용 — 모든 노드 평탄화 */
function getAllAdditionMapNodes() {
  return ADDITION_GALAXIES.flatMap((galaxy) =>
    galaxy.levels.map((level) => ({
      galaxyId: galaxy.id,
      galaxyName: galaxy.name,
      levelId: level.id,
      stageNumber: level.stageNumber,
      label: `Lv${level.stageNumber}`,
      subtitle: level.name,
      mapPosition: level.mapPosition ?? galaxy.mapPosition,
      theme: galaxy.theme,
    }))
  )
}

function getAdditionProgressStorageKey(levelId) {
  return `addition_progress_${levelId}_${getCurrentPlayerName()}`
}

function getDefaultAdditionLevelProgress() {
  return { currentPower: 0, isCompleted: false }
}

function loadAdditionLevelProgress(levelId) {
  const raw = localStorage.getItem(getAdditionProgressStorageKey(levelId))
  if (!raw) return getDefaultAdditionLevelProgress()
  try {
    const parsed = JSON.parse(raw)
    const currentPower = Math.max(0, Math.min(200, Number(parsed.currentPower) || 0))
    // 이전 숙련도(powerLevel) 저장값 호환: Lv5 이상이면 완료로 간주
    const legacyCompleted = Number(parsed.powerLevel) >= 5
    return {
      currentPower,
      isCompleted: Boolean(parsed.isCompleted) || legacyCompleted || currentPower >= 200,
    }
  } catch {
    return getDefaultAdditionLevelProgress()
  }
}

function saveAdditionLevelProgress(levelId, progress) {
  localStorage.setItem(getAdditionProgressStorageKey(levelId), JSON.stringify(progress))
}

/**
 * 행성 상태: locked | current | completed
 * - 은하 내에서 이전 스테이지를 완료해야 다음이 열림
 * - 각 은하의 Lv1은 항상 해금
 */
function getAdditionPlanetStatus(galaxyId, stageNumber) {
  const found = getAdditionLevel(galaxyId, stageNumber)
  if (!found) return "locked"

  const progress = loadAdditionLevelProgress(found.level.id)
  if (progress.isCompleted) return "completed"

  if (stageNumber === 1) return "current"

  const previous = getAdditionLevel(galaxyId, stageNumber - 1)
  if (!previous) return "locked"

  const prevProgress = loadAdditionLevelProgress(previous.level.id)
  if (prevProgress.isCompleted) return "current"

  return "locked"
}

function getAdditionLevelUnlockState(levelId) {
  const found = getAdditionLevelById(levelId)
  if (!found) return { status: "locked", isLocked: true, isCurrent: false, isCompleted: false }

  const status = getAdditionPlanetStatus(found.galaxy.id, found.level.stageNumber)
  return {
    status,
    isLocked: status === "locked",
    isCurrent: status === "current",
    isCompleted: status === "completed",
    progress: loadAdditionLevelProgress(levelId),
  }
}

function levelSupportsStrategy(level, strategyId) {
  return level.uiConfig.strategies.includes(strategyId)
}

function levelSupportsLayoutToggle(level) {
  // 은하계(galaxy-cluster)에서만 가로/세로셈 전환 허용
  if (!level?.uiConfig?.supportsLayoutToggle) return false
  const found = getAdditionLevelById(level.id)
  return found?.galaxy?.id === "galaxy-cluster"
}

function getAdditionStrategyMeta(strategyId) {
  return ADDITION_STRATEGY_META[strategyId] ?? null
}

function isInverseAdditionLevel(level) {
  const type = level.problemConfig.operationType
  return (
    type === ADDITION_OPERATION_TYPES.MAKE_TEN_COMPLEMENT ||
    type === ADDITION_OPERATION_TYPES.MISSING_ADDEND
  )
}

/** 자릿수별 받아올림 정보 */
function getAdditionCarryFlags(a, b) {
  let carry = 0
  let hasOnesCarry = false
  let hasTensCarry = false
  let hasHundredsCarry = false
  let place = 0
  let x = Math.abs(Number(a) || 0)
  let y = Math.abs(Number(b) || 0)

  while (x > 0 || y > 0 || carry > 0) {
    const digitSum = (x % 10) + (y % 10) + carry
    const nextCarry = digitSum >= 10 ? 1 : 0
    if (nextCarry) {
      if (place === 0) hasOnesCarry = true
      else if (place === 1) hasTensCarry = true
      else hasHundredsCarry = true
    }
    carry = nextCarry
    x = Math.floor(x / 10)
    y = Math.floor(y / 10)
    place += 1
    if (place > 6) break
  }

  return { hasOnesCarry, hasTensCarry, hasHundredsCarry }
}

/** 받아올림 여부 판별 — 문제 생성에서 사용 */
function additionOperandsMatchCarryRule(a, b, carryRule) {
  const { hasOnesCarry, hasTensCarry, hasHundredsCarry } = getAdditionCarryFlags(a, b)

  if (carryRule === ADDITION_CARRY_RULES.NONE) {
    return !hasOnesCarry && !hasTensCarry && !hasHundredsCarry
  }
  if (carryRule === ADDITION_CARRY_RULES.ONES_ONLY) {
    return hasOnesCarry
  }
  return hasOnesCarry || hasTensCarry || hasHundredsCarry
}

/** 10의 배수 보수 문제의 목표값 — 예: 18 → 20 */
function getMakeTenTarget(operandA, multipleOf = 10) {
  return Math.ceil(operandA / multipleOf) * multipleOf
}

/** 연산 유형별 문제 표시 문자열 (2·3단계 UI) */
function formatAdditionProblemEquation(problem) {
  const { operationType, operandA, operandB, target } = problem

  if (operationType === ADDITION_OPERATION_TYPES.MAKE_TEN_COMPLEMENT) {
    return `${operandA}+?= ${target}`
  }
  if (operationType === ADDITION_OPERATION_TYPES.MISSING_ADDEND) {
    return `${operandA}+?= ${target}`
  }
  return `${operandA}+${operandB}=?`
}

/** 자릿수 분해 — 스르륵 분리 (3단계) */
function decomposeByPlaceValue(n) {
  const parts = []
  let remaining = n
  let place = 1

  while (remaining > 0) {
    const digit = remaining % 10
    if (digit > 0) parts.unshift({ place, value: digit * place })
    remaining = Math.floor(remaining / 10)
    place *= 10
  }

  return parts
}

/** 10만들기 분해 — 10만들기 마법 (3단계) */
function decomposeForMake10(operandA, operandB) {
  const onesA = operandA % 10
  const need = 10 - onesA
  if (need <= 0 || need >= operandB) return null
  return { complement: need, remainder: operandB - need }
}

/** 전략별 보조 수식 문자열 (3단계) */
function formatAdditionStrategyEquation(operandA, operandB, strategyId) {
  if (strategyId === ADDITION_STRATEGIES.SLIDE) {
    const parts = decomposeByPlaceValue(operandA)
    if (parts.length <= 1) return `${operandA}+${operandB}=?`
    const decomposed = parts.map((part) => part.value).join("+")
    return `(${decomposed})+${operandB}=?`
  }

  if (strategyId === ADDITION_STRATEGIES.MAKE10) {
    const split = decomposeForMake10(operandA, operandB)
    if (!split) return `${operandA}+${operandB}=?`
    return `${operandA}+(${split.complement}+${split.remainder})=?`
  }

  return `${operandA}+${operandB}=?`
}
