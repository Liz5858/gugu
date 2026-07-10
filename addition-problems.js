/**
 * 덧셈 문제 생성 (2단계)
 * addition-levels.js 의 problemConfig 를 읽어 난이도별 문제를 생성합니다.
 */

const ADDITION_GENERATION_MAX_ATTEMPTS = 60

// ─── 난수 유틸 ───────────────────────────────────────────────

function additionRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function additionRandomMultipleInRange(min, max, step) {
  if (!step || step <= 0) return additionRandomInt(min, max)

  const first = Math.ceil(min / step) * step
  const last = Math.floor(max / step) * step
  if (first > last) return null

  const count = Math.floor((last - first) / step) + 1
  return first + additionRandomInt(0, count - 1) * step
}

function additionGenerateOperand(rangeConfig) {
  if (!rangeConfig) return null

  const { min, max, multipleOf } = rangeConfig
  if (multipleOf) {
    return additionRandomMultipleInRange(min, max, multipleOf)
  }
  return additionRandomInt(min, max)
}

function additionFormatProblemKey(problem) {
  const b = problem.operandB ?? "?"
  const target = problem.target ?? ""
  return `${problem.operationType}:${problem.operandA}:${b}:${target}`
}

function additionIsDuplicateProblem(problem, lastProblemKey) {
  if (!lastProblemKey) return false
  return additionFormatProblemKey(problem) === lastProblemKey
}

// ─── 검증 ───────────────────────────────────────────────────

function additionIsValidStandardPair(a, b, config) {
  const sum = a + b
  if (config.sumMax != null && sum > config.sumMax) return false
  if (config.carryRule) {
    return additionOperandsMatchCarryRule(a, b, config.carryRule)
  }
  return true
}

// ─── 연산 유형별 생성 ─────────────────────────────────────────

function buildStandardAdditionProblem(a, b) {
  return {
    operandA: a,
    operandB: b,
    target: null,
    answer: a + b,
  }
}

function generateStandardAdditionProblem(config, lastProblemKey) {
  const needsA = Boolean(config.operandA)
  const needsB = Boolean(config.operandB)

  for (let attempt = 0; attempt < ADDITION_GENERATION_MAX_ATTEMPTS; attempt += 1) {
    const a = needsA ? additionGenerateOperand(config.operandA) : 0
    const b = needsB ? additionGenerateOperand(config.operandB) : 0

    if (a == null || b == null) continue
    if (!additionIsValidStandardPair(a, b, config)) continue

    const problem = {
      ...buildStandardAdditionProblem(a, b),
      operationType: ADDITION_OPERATION_TYPES.STANDARD,
    }

    if (!additionIsDuplicateProblem(problem, lastProblemKey)) {
      return problem
    }
  }

  // 생성 실패 시 안전한 기본값
  return {
    operationType: ADDITION_OPERATION_TYPES.STANDARD,
    operandA: config.operandA?.min ?? 10,
    operandB: config.operandB?.min ?? 1,
    target: null,
    answer: (config.operandA?.min ?? 10) + (config.operandB?.min ?? 1),
  }
}

function generateMakeTenComplementProblem(config, lastProblemKey) {
  const multipleOf = config.targetMultipleOf ?? 10
  const range = config.operandA

  for (let attempt = 0; attempt < ADDITION_GENERATION_MAX_ATTEMPTS; attempt += 1) {
    const a = additionGenerateOperand(range)
    if (a == null) continue
    if (a % multipleOf === 0) continue

    const target = getMakeTenTarget(a, multipleOf)
    const answer = target - a
    if (answer <= 0) continue

    const problem = {
      operationType: ADDITION_OPERATION_TYPES.MAKE_TEN_COMPLEMENT,
      operandA: a,
      operandB: null,
      target,
      answer,
    }

    if (!additionIsDuplicateProblem(problem, lastProblemKey)) {
      return problem
    }
  }

  return {
    operationType: ADDITION_OPERATION_TYPES.MAKE_TEN_COMPLEMENT,
    operandA: 18,
    operandB: null,
    target: 20,
    answer: 2,
  }
}

function generateMissingAddendProblem(config, lastProblemKey) {
  for (let attempt = 0; attempt < ADDITION_GENERATION_MAX_ATTEMPTS; attempt += 1) {
    const a = additionGenerateOperand(config.operandA)
    const b = additionGenerateOperand(config.operandB)
    if (a == null || b == null) continue
    if (!additionIsValidStandardPair(a, b, config)) continue

    const target = a + b
    const problem = {
      operationType: ADDITION_OPERATION_TYPES.MISSING_ADDEND,
      operandA: a,
      operandB: null,
      target,
      answer: b,
    }

    if (!additionIsDuplicateProblem(problem, lastProblemKey)) {
      return problem
    }
  }

  const fallbackA = config.operandA?.min ?? 34
  const fallbackB = config.operandB?.min ?? 7
  return {
    operationType: ADDITION_OPERATION_TYPES.MISSING_ADDEND,
    operandA: fallbackA,
    operandB: null,
    target: fallbackA + fallbackB,
    answer: fallbackB,
  }
}

// ─── 공개 API ─────────────────────────────────────────────────

/**
 * 레벨 설정으로 문제 1개 생성
 * @param {object} level — ADDITION_GALAXIES[].levels[] 항목
 * @param {{ lastProblemKey?: string }} options
 * @returns {AdditionProblem}
 */
function generateAdditionProblem(level, options = {}) {
  const config = level.problemConfig
  const lastProblemKey = options.lastProblemKey ?? null
  let problem

  switch (config.operationType) {
    case ADDITION_OPERATION_TYPES.MAKE_TEN_COMPLEMENT:
      problem = generateMakeTenComplementProblem(config, lastProblemKey)
      break
    case ADDITION_OPERATION_TYPES.MISSING_ADDEND:
      problem = generateMissingAddendProblem(config, lastProblemKey)
      break
    default:
      problem = generateStandardAdditionProblem(config, lastProblemKey)
  }

  return {
    ...problem,
    levelId: level.id,
    levelName: level.name,
    stageNumber: level.stageNumber,
  }
}

function generateAdditionProblemById(levelId, options = {}) {
  const found = getAdditionLevelById(levelId)
  if (!found) return null

  return {
    ...generateAdditionProblem(found.level, options),
    galaxyId: found.galaxy.id,
    galaxyName: found.galaxy.name,
  }
}

function generateAdditionProblemForLevel(galaxyId, stageNumber, options = {}) {
  const found = getAdditionLevel(galaxyId, stageNumber)
  if (!found) return null

  return {
    ...generateAdditionProblem(found.level, options),
    galaxyId: found.galaxy.id,
    galaxyName: found.galaxy.name,
  }
}

/** 스테이지 전체 문제 세트 생성 */
function generateAdditionProblemSet(level, count = ADDITION_PROBLEMS_PER_STAGE) {
  const problems = []
  let lastProblemKey = null

  for (let i = 0; i < count; i += 1) {
    const problem = generateAdditionProblem(level, { lastProblemKey })
    problems.push(problem)
    lastProblemKey = additionFormatProblemKey(problem)
  }

  return problems
}

/** 정답 검증 */
function checkAdditionAnswer(problem, userAnswer) {
  return Number(userAnswer) === problem.answer
}

/** 문제 표시용 수식 (메인 문제) */
function formatAdditionProblemDisplay(problem) {
  if (problem.operationType === ADDITION_OPERATION_TYPES.MAKE_TEN_COMPLEMENT) {
    return `${problem.operandA}+?=${problem.target}`
  }
  if (problem.operationType === ADDITION_OPERATION_TYPES.MISSING_ADDEND) {
    return `${problem.operandA}+?=${problem.target}`
  }
  return `${problem.operandA}+${problem.operandB}=?`
}
