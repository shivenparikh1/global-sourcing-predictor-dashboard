import { blankProductDetails, createBlankScenario, createExampleScenario } from "./seedData";
import type { Scenario } from "./types";

const CURRENT_KEY = "global-sourcing-predictor-current-v2";
const SAVED_KEY = "global-sourcing-predictor-saved-v2";
const DASHBOARD_SLOTS_KEY = "global-sourcing-predictor-dashboard-slots-v1";
const ACTIVE_DASHBOARD_KEY = "global-sourcing-predictor-active-dashboard-v1";
const DASHBOARD_SLOT_COUNT = 6;
const EXAMPLE_DASHBOARD_INDEX = DASHBOARD_SLOT_COUNT - 1;

export const normalizeScenario = (scenario: Partial<Scenario>): Scenario => {
  const blank = createBlankScenario();
  return {
    ...blank,
    ...scenario,
    id: scenario.id || `scenario-${Date.now()}`,
    budget: { ...blank.budget, ...(scenario.budget ?? {}) },
    demandHubs: scenario.demandHubs ?? [],
    logisticsHubs: scenario.logisticsHubs ?? [],
    suppliers: scenario.suppliers ?? [],
    routes: scenario.routes ?? [],
    riskEvents: scenario.riskEvents ?? [],
    levers: scenario.levers ?? [],
    regionalRiskProfiles: scenario.regionalRiskProfiles ?? [],
    forecastAssumptions: { ...blank.forecastAssumptions, ...(scenario.forecastAssumptions ?? {}) },
    productDetails: { ...blankProductDetails, ...(scenario.productDetails ?? {}) },
    importedFiles: scenario.importedFiles ?? [],
    updatedAt: scenario.updatedAt ?? new Date().toISOString(),
  };
};

export const loadCurrentScenario = (): Scenario => {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    return raw ? normalizeScenario(JSON.parse(raw)) : createBlankScenario();
  } catch {
    return createBlankScenario();
  }
};

export const persistCurrentScenario = (scenario: Scenario) => {
  localStorage.setItem(CURRENT_KEY, JSON.stringify({ ...scenario, updatedAt: new Date().toISOString() }));
};

export const loadSavedScenarios = (): Scenario[] => {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as Scenario[]).map(normalizeScenario) : [];
  } catch {
    return [];
  }
};

export const loadActiveDashboardIndex = () => {
  const value = Number(localStorage.getItem(ACTIVE_DASHBOARD_KEY));
  return Number.isInteger(value) && value >= 0 && value < DASHBOARD_SLOT_COUNT ? value : 0;
};

export const persistActiveDashboardIndex = (index: number) => {
  localStorage.setItem(ACTIVE_DASHBOARD_KEY, String(index));
};

export const loadDashboardSlots = (): Scenario[] => {
  try {
    const raw = localStorage.getItem(DASHBOARD_SLOTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Scenario[]) : [];
    const current = loadCurrentScenario();
    const slots = parsed.length ? parsed.map(normalizeScenario) : [current];
    return Array.from({ length: DASHBOARD_SLOT_COUNT }, (_, index) => {
      if (index === EXAMPLE_DASHBOARD_INDEX && (!slots[index] || slots[index].id === "example-command-center")) return createExampleScenario();
      return normalizeScenario(slots[index] ?? { ...createBlankScenario(), name: `Dashboard ${index + 1}` });
    });
  } catch {
    return Array.from({ length: DASHBOARD_SLOT_COUNT }, (_, index) => (index === EXAMPLE_DASHBOARD_INDEX ? createExampleScenario() : { ...createBlankScenario(), name: `Dashboard ${index + 1}` }));
  }
};

export const persistDashboardSlots = (slots: Scenario[]) => {
  localStorage.setItem(DASHBOARD_SLOTS_KEY, JSON.stringify(slots.slice(0, DASHBOARD_SLOT_COUNT).map(normalizeScenario)));
};

export const saveScenarioSnapshot = (scenario: Scenario) => {
  const saved = loadSavedScenarios().filter((item) => item.id !== scenario.id);
  const next = { ...scenario, updatedAt: new Date().toISOString() };
  localStorage.setItem(SAVED_KEY, JSON.stringify([next, ...saved].slice(0, 12)));
  localStorage.setItem(CURRENT_KEY, JSON.stringify(next));
  return next;
};

export const resetScenario = () => {
  const blank = createBlankScenario();
  localStorage.setItem(CURRENT_KEY, JSON.stringify(blank));
  return blank;
};

export const parseScenarioImport = (text: string): Scenario => {
  const parsed = JSON.parse(text) as Scenario;
  if (!Array.isArray(parsed.suppliers) || !parsed.budget || !Array.isArray(parsed.riskEvents) || !Array.isArray(parsed.levers)) {
    throw new Error("Imported JSON does not look like a sourcing scenario.");
  }
  return normalizeScenario({ ...parsed, id: parsed.id || `import-${Date.now()}`, updatedAt: new Date().toISOString() });
};
