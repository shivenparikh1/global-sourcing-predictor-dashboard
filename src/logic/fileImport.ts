import * as XLSX from "xlsx";
import { getRegionForCountry, normalizeCountryName } from "./referenceData";
import { modeDefaults } from "./seedData";
import type { DemandHub, ImportedFileSummary, ProductDetails, RiskEvent, Route, Scenario, Supplier } from "./types";

type Row = Record<string, string | number | boolean | null | undefined>;

const asText = (value: unknown) => String(value ?? "").trim();
const asNumber = (value: unknown) => {
  const number = Number(String(value ?? "").replace(/[$,%]/g, "").trim());
  return Number.isFinite(number) ? number : 0;
};
const keyOf = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const get = (row: Row, keys: string[]) => {
  const entries = Object.entries(row).map(([key, value]) => [keyOf(key), value] as const);
  const match = entries.find(([key]) => keys.some((candidate) => key === keyOf(candidate) || key.includes(keyOf(candidate))));
  return match ? match[1] : "";
};
const splitLines = (text: string) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const splitList = (text: string) => text.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
const cloneModeDefaults = () => ({
  Sea: { ...modeDefaults.Sea },
  Air: { ...modeDefaults.Air },
  Land: { ...modeDefaults.Land },
  Multimodal: { ...modeDefaults.Multimodal },
});

const createSupplierFromRow = (row: Row): Supplier => {
  const country = normalizeCountryName(asText(get(row, ["country", "supplier country", "manufacturing country", "origin country"])));
  return {
    id: `supplier-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: asText(get(row, ["supplier", "supplier name", "vendor", "factory", "name"])),
    country,
    region: asText(get(row, ["region", "supplier region"])) || getRegionForCountry(country),
    productCategory: asText(get(row, ["product category", "category", "commodity"])),
    baseUnitCost: asNumber(get(row, ["base unit cost", "unit cost", "cost", "price"])),
    tariffRate: asNumber(get(row, ["tariff", "tariff rate"])),
    freightCost: asNumber(get(row, ["freight", "freight cost"])),
    insuranceRate: asNumber(get(row, ["insurance", "insurance rate"])),
    leadTime: asNumber(get(row, ["lead time", "supplier lead time"])),
    reliability: asNumber(get(row, ["reliability", "otd", "on time"])),
    capacity: asNumber(get(row, ["capacity", "monthly capacity"])),
    moq: asNumber(get(row, ["moq", "minimum order"])),
    esgScore: asNumber(get(row, ["esg", "esg score"])),
    politicalRisk: asNumber(get(row, ["political risk"])),
    currencyRisk: asNumber(get(row, ["currency risk"])),
    naturalDisasterRisk: asNumber(get(row, ["natural disaster risk", "disaster risk"])),
    financialHealth: asNumber(get(row, ["financial health"])),
    qualityScore: asNumber(get(row, ["quality", "quality score"])),
    notes: asText(get(row, ["notes", "comments"])),
    allocation: asNumber(get(row, ["allocation", "allocation pct"])),
    included: true,
    transportMode: "Sea",
    coordinates: { x: 50, y: 45 },
    transportOverrides: cloneModeDefaults(),
  };
};

const createDemandFromRow = (row: Row): DemandHub => {
  const country = normalizeCountryName(asText(get(row, ["demand country", "country", "destination country"])));
  return {
    id: `demand-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: asText(get(row, ["demand hub", "customer", "destination", "market", "name"])),
    country,
    region: asText(get(row, ["region", "demand region"])) || getRegionForCountry(country),
    monthlyDemand: asNumber(get(row, ["monthly demand", "demand", "volume"])),
    forecastDemand: asNumber(get(row, ["forecast demand", "forecast"])),
    serviceLevelTarget: asNumber(get(row, ["service target", "service level"])),
    maxLeadTime: asNumber(get(row, ["max lead time", "lead time target"])),
    currentInventory: asNumber(get(row, ["current inventory", "inventory"])),
    safetyStock: asNumber(get(row, ["safety stock"])),
    priorityLevel: "Medium",
    requiredDeliveryDate: asText(get(row, ["required date", "delivery date"])),
    coordinates: { x: 18, y: 42 },
    notes: asText(get(row, ["notes", "comments"])),
  };
};

const createRiskFromRow = (row: Row): RiskEvent => ({
  id: `risk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: asText(get(row, ["risk", "risk event", "event", "name"])),
  description: asText(get(row, ["description", "notes", "comments"])),
  affectedCountries: splitList(asText(get(row, ["affected countries", "country"]))),
  affectedSupplierIds: [],
  affectedDemandHubIds: [],
  affectedModes: [],
  costImpactPct: asNumber(get(row, ["cost impact", "landed cost impact"])),
  freightImpactPct: asNumber(get(row, ["freight impact"])),
  leadTimeImpactDays: asNumber(get(row, ["lead impact", "lead time impact"])),
  reliabilityImpactPct: asNumber(get(row, ["reliability impact"])),
  riskScoreImpact: asNumber(get(row, ["risk score impact"])),
  severity: asNumber(get(row, ["severity"])),
  confidenceLevel: asNumber(get(row, ["confidence"])),
  probability: "Medium",
  durationDays: 30,
  active: true,
  coordinates: { x: 55, y: 44 },
});

const updateProductFromRows = (current: ProductDetails, rows: Row[]) => {
  const combined = rows.reduce<ProductDetails>((product, row) => {
    const name = asText(get(row, ["product", "product name", "item", "part name"]));
    const category = asText(get(row, ["product category", "category", "commodity"]));
    const descriptors = asText(get(row, ["descriptors", "descriptor", "attributes", "features"]));
    return {
      ...product,
      name: product.name || name,
      sku: product.sku || asText(get(row, ["sku", "part number", "item number"])),
      category: product.category || category,
      descriptors: [product.descriptors, descriptors].filter(Boolean).join("\n"),
      specification: product.specification || asText(get(row, ["specification", "spec", "requirements"])),
      complianceRequirements: product.complianceRequirements || asText(get(row, ["compliance", "certifications"])),
      qualityRequirements: product.qualityRequirements || asText(get(row, ["quality requirements", "quality"])),
      annualVolume: product.annualVolume || asNumber(get(row, ["annual volume", "annual demand"])),
      unitOfMeasure: product.unitOfMeasure || asText(get(row, ["uom", "unit", "unit of measure"])),
      notes: [product.notes, asText(get(row, ["product notes", "notes"]))].filter(Boolean).join("\n"),
    };
  }, current);
  return combined;
};

const parseDelimited = (text: string): Row[] => {
  const lines = splitLines(text);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
};

const rowsFromFile = async (file: File): Promise<{ rows: Row[]; text: string }> => {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (extension === "xlsx" || extension === "xls") {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const rows = workbook.SheetNames.flatMap((sheetName) => XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheetName], { defval: "" }));
    return { rows, text: rows.map((row) => Object.values(row).join(" ")).join("\n") };
  }
  if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { rows: parseDelimited(result.value), text: result.value };
  }
  const text = await file.text();
  if (extension === "json") {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return { rows: parsed, text };
    if (Array.isArray(parsed.rows)) return { rows: parsed.rows, text };
    return { rows: [parsed], text };
  }
  return { rows: parseDelimited(text), text };
};

const inferRows = (rows: Row[], scenario: Scenario) => {
  const suppliers: Supplier[] = [];
  const demandHubs: DemandHub[] = [];
  const risks: RiskEvent[] = [];
  const routes: Route[] = [];
  const manualInputs: string[] = [];
  const mappedFields: string[] = [];

  rows.forEach((row) => {
    const type = asText(get(row, ["type", "record type", "entity"])).toLowerCase();
    const hasSupplier = type.includes("supplier") || Boolean(get(row, ["supplier name", "supplier", "vendor", "factory"]));
    const hasDemand = type.includes("demand") || Boolean(get(row, ["demand hub", "monthly demand", "customer", "destination"]));
    const hasRisk = type.includes("risk") || Boolean(get(row, ["risk event", "risk", "severity"]));
    const hasRoute = type.includes("route") || Boolean(get(row, ["origin", "destination", "allocation", "freight cost"]));

    if (hasSupplier && !hasRoute) {
      const supplier = createSupplierFromRow(row);
      suppliers.push(supplier);
      mappedFields.push(`Supplier: ${supplier.name || "Unnamed"}`);
      if (!supplier.name) manualInputs.push("Supplier name");
      if (!supplier.country) manualInputs.push("Supplier country");
      if (!supplier.baseUnitCost) manualInputs.push(`${supplier.name || "Supplier"} unit cost`);
      if (!supplier.capacity) manualInputs.push(`${supplier.name || "Supplier"} capacity`);
      return;
    }

    if (hasDemand && !hasRoute) {
      const hub = createDemandFromRow(row);
      demandHubs.push(hub);
      mappedFields.push(`Demand Hub: ${hub.name || "Unnamed"}`);
      if (!hub.name) manualInputs.push("Demand hub name");
      if (!hub.monthlyDemand) manualInputs.push(`${hub.name || "Demand hub"} monthly demand`);
      return;
    }

    if (hasRisk) {
      const risk = createRiskFromRow(row);
      risks.push(risk);
      mappedFields.push(`Risk Event: ${risk.name || "Unnamed"}`);
      if (!risk.name) manualInputs.push("Risk event name");
      if (!risk.severity) manualInputs.push(`${risk.name || "Risk event"} severity`);
      return;
    }

    if (hasRoute) {
      const supplierName = asText(get(row, ["supplier", "origin supplier", "origin"]));
      const demandName = asText(get(row, ["demand hub", "destination demand hub", "destination", "customer"]));
      const supplier = [...scenario.suppliers, ...suppliers].find((item) => item.name === supplierName || item.country === supplierName);
      const demand = [...scenario.demandHubs, ...demandHubs].find((item) => item.name === demandName || item.country === demandName);
      if (!supplier || !demand) {
        manualInputs.push(`Route for ${supplierName || "origin"} to ${demandName || "destination"} needs supplier and demand hub match`);
        return;
      }
      const route: Route = {
        id: `route-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        supplierId: supplier.id,
        demandHubId: demand.id,
        originLabel: supplier.country || supplier.name,
        destinationLabel: demand.name || demand.country,
        mode: supplier.transportMode,
        active: true,
        allocationPct: asNumber(get(row, ["allocation", "allocation pct"])),
        freightCost: asNumber(get(row, ["freight", "freight cost"])),
        transitTime: asNumber(get(row, ["transit", "transit time"])),
        delayProbability: asNumber(get(row, ["delay", "delay probability"])),
        customsRisk: asNumber(get(row, ["customs", "customs risk"])),
        portCongestionRisk: asNumber(get(row, ["congestion", "port congestion"])),
        emissionsFactor: asNumber(get(row, ["emissions", "emissions factor"])),
        distanceEstimate: asNumber(get(row, ["distance", "distance estimate"])),
        from: supplier.coordinates,
        to: demand.coordinates,
      };
      routes.push(route);
      mappedFields.push(`Route: ${supplier.name || supplier.country} to ${demand.name || demand.country}`);
      if (!route.allocationPct) manualInputs.push(`${route.originLabel} to ${route.destinationLabel} allocation`);
    }
  });

  return { suppliers, demandHubs, risks, routes, manualInputs, mappedFields };
};

const productFromText = (productDetails: ProductDetails, text: string) => {
  const lines = splitLines(text);
  const findLine = (labels: string[]) => {
    const line = lines.find((item) => labels.some((label) => keyOf(item).startsWith(keyOf(label))));
    return line?.split(":").slice(1).join(":").trim() ?? "";
  };
  return {
    ...productDetails,
    name: productDetails.name || findLine(["product", "product name", "item"]),
    category: productDetails.category || findLine(["category", "product category"]),
    specification: productDetails.specification || findLine(["specification", "spec", "requirements"]),
    complianceRequirements: productDetails.complianceRequirements || findLine(["compliance"]),
    qualityRequirements: productDetails.qualityRequirements || findLine(["quality"]),
    descriptors: productDetails.descriptors || lines.slice(0, 20).join("\n"),
  };
};

export const importOperationalFile = async (file: File, scenario: Scenario): Promise<Scenario> => {
  const { rows, text } = await rowsFromFile(file);
  const parsed = inferRows(rows, scenario);
  const productDetails = rows.length ? updateProductFromRows(scenario.productDetails, rows) : productFromText(scenario.productDetails, text);
  const mappedFields = [...parsed.mappedFields];
  if (productDetails !== scenario.productDetails && (productDetails.name || productDetails.category || productDetails.descriptors)) mappedFields.push("Product Details");
  const manualInputs = Array.from(new Set(parsed.manualInputs));
  if (!mappedFields.length) manualInputs.push("No structured supplier, demand, route, risk, or product fields were detected");

  const summary: ImportedFileSummary = {
    id: `import-${Date.now()}`,
    fileName: file.name,
    fileType: file.type || file.name.split(".").pop() || "file",
    status: !mappedFields.length ? "Needs Manual Input" : manualInputs.length ? "Partial" : "Mapped",
    mappedFields,
    manualInputs,
    createdAt: new Date().toISOString(),
  };

  return {
    ...scenario,
    productDetails,
    suppliers: [...scenario.suppliers, ...parsed.suppliers],
    demandHubs: [...scenario.demandHubs, ...parsed.demandHubs],
    riskEvents: [...scenario.riskEvents, ...parsed.risks],
    routes: [...scenario.routes, ...parsed.routes],
    importedFiles: [summary, ...(scenario.importedFiles ?? [])].slice(0, 8),
  };
};
