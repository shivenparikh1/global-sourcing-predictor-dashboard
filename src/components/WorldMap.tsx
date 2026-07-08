import { Anchor, Boxes, CircleDot, Layers, LocateFixed, MapPin, Maximize2, Minimize2, Minus, Move, Plus, RadioTower, Route as RouteIcon, ShieldAlert } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { geoCentroid } from "d3-geo";
import { ComposableMap, Geographies, Geography, Line, Marker, ZoomableGroup } from "react-simple-maps";
import { feature } from "topojson-client";
import countries from "world-atlas/countries-110m.json";
import { getRegionForCountry, normalizeCountryName } from "../logic/referenceData";
import type { Coordinates, DemandHub, LogisticsHub, PredictionResult, RiskEvent, Route, Scenario, Supplier } from "../logic/types";

export type MapMode = "select" | "supplier" | "demand" | "logistics" | "risk" | "route";
export type MapLayerKey = "suppliers" | "demandHubs" | "logisticsHubs" | "routes" | "riskEvents" | "demandHeatmap" | "riskHeatmap";
export type MapLayers = Record<MapLayerKey, boolean>;
export type SelectedMapItem =
  | { type: "supplier"; id: string }
  | { type: "demandHub"; id: string }
  | { type: "logisticsHub"; id: string }
  | { type: "route"; id: string }
  | { type: "risk"; id: string };

interface WorldMapProps {
  scenario: Scenario;
  prediction: PredictionResult;
  selectedItem: SelectedMapItem | null;
  mapMode: MapMode;
  layers: MapLayers;
  routeDisabledReason?: string;
  onModeChange: (mode: MapMode) => void;
  onLayerChange: (layers: MapLayers) => void;
  onSelectItem: (item: SelectedMapItem | null) => void;
  onAddSupplierAt: (coordinates: Coordinates) => void;
  onAddDemandHubAt: (coordinates: Coordinates) => void;
  onAddLogisticsHubAt: (coordinates: Coordinates) => void;
  onAddRiskAt: (coordinates: Coordinates) => void;
  onCreateRoute: () => void;
}

const worldTopology = countries as unknown as { objects: { countries: never } };
const geography = feature(countries as never, worldTopology.objects.countries) as unknown;

const layerLabels: Array<{ key: MapLayerKey; label: string }> = [
  { key: "suppliers", label: "Suppliers" },
  { key: "demandHubs", label: "Demand Hubs" },
  { key: "logisticsHubs", label: "Ports and Logistics" },
  { key: "routes", label: "Routes" },
  { key: "riskEvents", label: "Risk Events" },
  { key: "demandHeatmap", label: "Demand Heatmap" },
  { key: "riskHeatmap", label: "Risk Heatmap" },
];

const toLonLat = (coordinates: Coordinates): [number, number] => {
  if (typeof coordinates.lng === "number" && typeof coordinates.lat === "number") return [coordinates.lng, coordinates.lat];
  return [coordinates.x * 3.6 - 180, 90 - coordinates.y * 2];
};

const fromPointer = (event: MouseEvent<HTMLDivElement>): Coordinates => {
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = Math.max(3, Math.min(97, ((event.clientX - bounds.left) / bounds.width) * 100));
  const y = Math.max(4, Math.min(86, ((event.clientY - bounds.top) / bounds.height) * 90));
  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
    lng: Number((x * 3.6 - 180).toFixed(3)),
    lat: Number((90 - y * 2).toFixed(3)),
  };
};

const coordinatesFromCountry = (geo: { properties?: Record<string, unknown> }) => {
  const [lng, lat] = geoCentroid(geo as never);
  const country = normalizeCountryName(String(geo.properties?.name ?? ""));
  return {
    x: Number(Math.max(3, Math.min(97, (lng + 180) / 3.6)).toFixed(1)),
    y: Number(Math.max(4, Math.min(86, (90 - lat) / 2)).toFixed(1)),
    lng: Number(lng.toFixed(3)),
    lat: Number(lat.toFixed(3)),
    country,
    region: getRegionForCountry(country),
  } as Coordinates & { country: string; region: string };
};

const routeStroke: Record<string, string> = {
  Sea: "#23d3ee",
  Air: "#8bdcff",
  Land: "#33d17a",
  Multimodal: "#f4b94f",
};

const routeDash: Record<string, string | undefined> = {
  Sea: undefined,
  Air: "7 7",
  Land: "2 6",
  Multimodal: "10 4 2 4",
};

export default function WorldMap({
  scenario,
  prediction,
  selectedItem,
  mapMode,
  layers,
  routeDisabledReason,
  onModeChange,
  onLayerChange,
  onSelectItem,
  onAddSupplierAt,
  onAddDemandHubAt,
  onAddLogisticsHubAt,
  onAddRiskAt,
  onCreateRoute,
}: WorldMapProps) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([12, 18]);
  const [layerOpen, setLayerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const activeRoutes = useMemo(() => scenario.routes.filter((route) => route.active), [scenario.routes]);
  const activeRiskCount = scenario.riskEvents.filter((risk) => risk.active).length;
  const networkStatus = prediction.confidenceScore < 60 || !scenario.suppliers.length || !scenario.demandHubs.length || !activeRoutes.length ? "Incomplete" : activeRiskCount || prediction.weightedRisk > 62 ? "At Risk" : "Ready";
  const networkStatusTone = networkStatus === "Ready" ? "good" : networkStatus === "At Risk" ? "risk" : "warn";

  const handleMapClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    if (mapMode === "select") {
      onSelectItem(null);
      return;
    }

    const coordinates = fromPointer(event);
    if (mapMode === "supplier") onAddSupplierAt(coordinates);
    if (mapMode === "demand") onAddDemandHubAt(coordinates);
    if (mapMode === "logistics") onAddLogisticsHubAt(coordinates);
    if (mapMode === "risk") onAddRiskAt(coordinates);
    if (mapMode === "route") onCreateRoute();
    if (mapMode !== "route") onModeChange("select");
  };

  const toggleLayer = (key: MapLayerKey) => onLayerChange({ ...layers, [key]: !layers[key] });

  return (
    <section className={`panel relative overflow-hidden ${expanded ? "fixed inset-3 z-[80] min-h-0" : "min-h-[37rem]"}`}>
      <div className="absolute inset-0 command-grid opacity-55" />
      <div className="pointer-events-none absolute inset-0 map-scanline opacity-35" />
      <div className="pointer-events-none absolute inset-0 map-vignette" />

      <div className={`relative z-10 flex h-full flex-col ${expanded ? "min-h-[calc(100vh-1.5rem)]" : "min-h-[37rem]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-500/15 px-4 py-2.5">
          <div>
            <h2 className="text-sm font-semibold text-white">Command Map</h2>
            <p className="text-xs text-slate-500">Real geography, manual nodes, live route intelligence</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <LegendDot color="#17e6c3" label="Supplier" />
            <LegendDot color="#8b5cf6" label="Demand" square />
            <LegendDot color="#23d3ee" label="Port" diamond />
            <LegendDot color="#ff6b3a" label="Risk" />
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden" onClick={handleMapClick}>
          <ComposableMap projection="geoNaturalEarth1" projectionConfig={{ scale: 184, center: [8, 8] }} className="h-full min-h-[33rem] w-full">
            <ZoomableGroup center={center} zoom={zoom} minZoom={1} maxZoom={4} onMoveEnd={(position: { coordinates: [number, number] }) => setCenter(position.coordinates)}>
              <Geographies geography={geography}>
                {({ geographies }: { geographies: Array<{ rsmKey: string; id?: string; properties?: Record<string, unknown> }> }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={(event: MouseEvent<SVGPathElement>) => {
                        event.stopPropagation();
                        if (mapMode === "select") {
                          onSelectItem(null);
                          return;
                        }
                        const coordinates = coordinatesFromCountry(geo);
                        if (mapMode === "supplier") onAddSupplierAt(coordinates);
                        if (mapMode === "demand") onAddDemandHubAt(coordinates);
                        if (mapMode === "logistics") onAddLogisticsHubAt(coordinates);
                        if (mapMode === "risk") onAddRiskAt(coordinates);
                        if (mapMode === "route") onCreateRoute();
                        if (mapMode !== "route") onModeChange("select");
                      }}
                      className="outline-none transition duration-300 hover:fill-cyanline/25"
                      style={{
                        default: { fill: "#10263c", stroke: "#8bdcff", strokeOpacity: 0.12, strokeWidth: 0.42 },
                        hover: { fill: "#163d55", stroke: "#8bf3ff", strokeOpacity: 0.38, strokeWidth: 0.55, filter: "drop-shadow(0 0 8px rgba(35,211,238,.28))" },
                        pressed: { fill: "#1b526a", stroke: "#8bf3ff", strokeOpacity: 0.5, strokeWidth: 0.65 },
                      }}
                    />
                  ))
                }
              </Geographies>

              {layers.demandHeatmap &&
                scenario.demandHubs.map((hub) => <HeatGlow key={`demand-heat-${hub.id}`} coordinates={hub.coordinates} color="#8b5cf6" intensity={Math.min(0.6, (hub.monthlyDemand || hub.forecastDemand || 0) / 25000)} />)}
              {layers.riskHeatmap &&
                scenario.riskEvents.filter((risk) => risk.active).map((risk) => <HeatGlow key={`risk-heat-${risk.id}`} coordinates={risk.coordinates} color="#ff6b3a" intensity={Math.min(0.75, risk.severity / 100 || 0.28)} />)}

              {layers.routes &&
                activeRoutes.map((route) => {
                  const supplier = scenario.suppliers.find((item) => item.id === route.supplierId);
                  const hub = scenario.demandHubs.find((item) => item.id === route.demandHubId);
                  if (!supplier || !hub) return null;
                  const selected = selectedItem?.type === "route" && selectedItem.id === route.id;
                  return (
                    <g key={route.id} data-testid={`map-route-${route.id}`} className="cursor-pointer" onClick={(event) => { event.stopPropagation(); onSelectItem({ type: "route", id: route.id }); }}>
                      <Line
                        from={toLonLat(supplier.coordinates)}
                        to={toLonLat(hub.coordinates)}
                        stroke={routeStroke[route.mode]}
                        strokeOpacity={selected ? 0.92 : 0.42}
                        strokeWidth={selected ? 2.8 : 1.7}
                        strokeLinecap="round"
                        style={{ filter: selected ? "drop-shadow(0 0 10px rgba(35,211,238,.65))" : "drop-shadow(0 0 5px rgba(35,211,238,.25))" }}
                      />
                      <Line
                        from={toLonLat(supplier.coordinates)}
                        to={toLonLat(hub.coordinates)}
                        stroke={routeStroke[route.mode]}
                        strokeWidth={selected ? 1.4 : 0.9}
                        strokeLinecap="round"
                        strokeDasharray={routeDash[route.mode] ?? "4 9"}
                        className="animate-dash-flow"
                        style={{ filter: selected ? "drop-shadow(0 0 8px rgba(35,211,238,.55))" : undefined }}
                      />
                    </g>
                  );
                })}

              {layers.demandHubs &&
                scenario.demandHubs.map((hub) => (
        <DemandHubMarker key={hub.id} hub={hub} selected={selectedItem?.type === "demandHub" && selectedItem.id === hub.id} onSelect={() => onSelectItem({ type: "demandHub", id: hub.id })} />
                ))}
              {layers.logisticsHubs &&
                scenario.logisticsHubs.map((hub) => (
                  <LogisticsHubMarker key={hub.id} hub={hub} selected={selectedItem?.type === "logisticsHub" && selectedItem.id === hub.id} onSelect={() => onSelectItem({ type: "logisticsHub", id: hub.id })} />
                ))}
              {layers.suppliers &&
                scenario.suppliers.map((supplier) => {
                  const supplierPrediction = prediction.suppliers.find((item) => item.supplierId === supplier.id);
                  return (
                    <SupplierMarker
                      key={supplier.id}
                      supplier={supplier}
                      riskScore={supplierPrediction?.riskScore ?? 0}
                      selected={selectedItem?.type === "supplier" && selectedItem.id === supplier.id}
                      onSelect={() => onSelectItem({ type: "supplier", id: supplier.id })}
                    />
                  );
                })}
              {layers.riskEvents &&
                scenario.riskEvents.map((risk) => <RiskGeoMarker key={risk.id} risk={risk} selected={selectedItem?.type === "risk" && selectedItem.id === risk.id} onSelect={() => onSelectItem({ type: "risk", id: risk.id })} />)}
            </ZoomableGroup>
          </ComposableMap>

          <div className="absolute left-3 right-3 top-4 z-20 grid grid-cols-2 gap-2 sm:left-4 sm:right-auto sm:flex sm:max-w-[calc(100%-2rem)] sm:flex-wrap">
            <MapModeButton active={mapMode === "select"} icon={CircleDot} label="Select" tone="neutral" onClick={() => onModeChange("select")} />
            <MapModeButton active={mapMode === "supplier"} icon={Boxes} label="Add Supplier" tone="primary" onClick={() => onModeChange("supplier")} testId="map-add-supplier-mode" />
            <MapModeButton active={mapMode === "demand"} icon={Anchor} label="Add Demand Hub" tone="primary" onClick={() => onModeChange("demand")} testId="map-add-demand-mode" />
            <MapModeButton active={mapMode === "logistics"} icon={MapPin} label="Add Port" tone="secondary" onClick={() => onModeChange("logistics")} testId="map-add-logistics-mode" />
            <MapModeButton active={mapMode === "risk"} icon={ShieldAlert} label="Add Risk" tone="secondary" onClick={() => onModeChange("risk")} testId="map-add-risk-mode" />
            <button
              data-testid="map-create-route"
              className={`btn bg-ink-950/85 text-xs ${mapMode === "route" ? "border-cyanline/60 bg-cyanline/15 text-cyan-50 shadow-glow" : ""} disabled:cursor-not-allowed disabled:opacity-45`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!routeDisabledReason) {
                  onModeChange("route");
                  onCreateRoute();
                }
              }}
              disabled={Boolean(routeDisabledReason)}
              title={routeDisabledReason || "Create a supplier-to-demand route"}
            >
              <RouteIcon size={15} />
              Create Route
            </button>
          </div>

          <div className="absolute left-3 right-3 top-[10rem] z-20 flex flex-wrap justify-start gap-2 sm:left-auto sm:right-4 sm:top-[7.25rem] sm:justify-end 2xl:top-4">
            <button className="btn bg-ink-950/85 px-2" type="button" title="Zoom in" onClick={(event) => { event.stopPropagation(); setZoom((value) => Math.min(4, Number((value + 0.45).toFixed(2)))); }}>
              <Plus size={16} />
            </button>
            <button className="btn bg-ink-950/85 px-2" type="button" title="Zoom out" onClick={(event) => { event.stopPropagation(); setZoom((value) => Math.max(1, Number((value - 0.45).toFixed(2)))); }}>
              <Minus size={16} />
            </button>
            <button className="btn bg-ink-950/85 px-2" type="button" title="Reset map" onClick={(event) => { event.stopPropagation(); setZoom(1); setCenter([12, 18]); }}>
              <LocateFixed size={16} />
            </button>
            <button className="btn bg-ink-950/85 px-2" type="button" title={expanded ? "Exit Full Screen" : "Enlarge Map"} onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }}>
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button className="btn bg-ink-950/85" type="button" title="Layer controls" onClick={(event) => { event.stopPropagation(); setLayerOpen((open) => !open); }}>
              <Layers size={16} />
              Layers
            </button>
          </div>

          {layerOpen && (
            <div className="absolute left-3 right-3 top-[13rem] z-30 rounded-lg border border-cyan-200/15 bg-ink-950/94 p-3 shadow-panel backdrop-blur-xl animate-panel-in sm:left-auto sm:right-4 sm:top-[10.25rem] sm:w-64 2xl:top-16" onClick={(event) => event.stopPropagation()}>
              <p className="mb-2 text-xs font-semibold text-cyan-100/75">Map Layers</p>
              <div className="grid gap-2">
                {layerLabels.map((layer) => (
                  <label key={layer.key} className="flex items-center justify-between rounded-md border border-cyan-200/10 bg-white/[0.03] px-2 py-2 text-xs text-cyan-100/68">
                    <span>{layer.label}</span>
                    <input type="checkbox" checked={layers[layer.key]} onChange={() => toggleLayer(layer.key)} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {mapMode !== "select" && (
            <div className="absolute left-3 right-3 top-[13rem] z-20 rounded-lg border border-cyanline/30 bg-ink-950/90 px-3 py-2 text-xs text-cyan-100/75 shadow-panel backdrop-blur-xl animate-panel-in sm:left-4 sm:right-auto sm:top-[10.25rem] 2xl:top-16">
              {mapMode === "route" ? routeDisabledReason || "Choose supplier and demand hub in the route form." : `Click the world map to place a ${mapMode === "demand" ? "demand hub" : mapMode === "logistics" ? "port/logistics hub" : mapMode}.`}
            </div>
          )}

          <div className="absolute inset-x-3 bottom-4 z-20 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-500/15 bg-ink-950/82 px-2.5 py-2 text-[0.68rem] text-slate-300 shadow-panel backdrop-blur-xl sm:left-4 sm:right-auto">
            <StatusChip label="Network Status" value={networkStatus} tone={networkStatusTone} />
            <StatusChip label="Suppliers" value={String(scenario.suppliers.length)} tone={scenario.suppliers.length ? "good" : "warn"} />
            <StatusChip label="Demand Hubs" value={String(scenario.demandHubs.length)} tone={scenario.demandHubs.length ? "good" : "warn"} />
            <StatusChip label="Routes" value={String(activeRoutes.length)} tone={activeRoutes.length ? "good" : "warn"} />
            <StatusChip label="Active Risks" value={String(activeRiskCount)} tone={activeRiskCount ? "risk" : "good"} />
            <StatusChip label="Confidence" value={`${prediction.confidenceScore}%`} tone={prediction.confidenceScore >= 80 ? "good" : prediction.confidenceScore >= 60 ? "warn" : "risk"} />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeatGlow({ coordinates, color, intensity }: { coordinates: Coordinates; color: string; intensity: number }) {
  return (
    <Marker coordinates={toLonLat(coordinates)}>
      <circle r={34 + intensity * 30} fill={color} opacity={0.07 + intensity * 0.15} />
      <circle r={15 + intensity * 18} fill={color} opacity={0.08 + intensity * 0.18} />
    </Marker>
  );
}

function SupplierMarker({ supplier, riskScore, selected, onSelect }: { supplier: Supplier; riskScore: number; selected: boolean; onSelect: () => void }) {
  const color = riskScore >= 64 ? "#ff6b3a" : riskScore >= 42 ? "#f4b94f" : "#17e6c3";
  return (
    <Marker coordinates={toLonLat(supplier.coordinates)}>
      <g data-testid={`map-supplier-${supplier.id}`} className="cursor-pointer transition duration-200 hover:scale-125" onClick={(event) => { event.stopPropagation(); onSelect(); }}>
        <circle r={selected ? 13 : 10} fill="none" stroke={color} strokeOpacity="0.28" strokeWidth="8" className="animate-pulse-node" />
        <circle r={selected ? 6.5 : 5.2} fill={color} stroke="#e7f6ff" strokeOpacity="0.82" strokeWidth="1" />
        <title>{supplier.name || "Unnamed supplier"}</title>
      </g>
    </Marker>
  );
}

function DemandHubMarker({ hub, selected, onSelect }: { hub: DemandHub; selected: boolean; onSelect: () => void }) {
  return (
    <Marker coordinates={toLonLat(hub.coordinates)}>
      <g data-testid={`map-demand-${hub.id}`} className="cursor-pointer transition duration-200 hover:scale-125" onClick={(event) => { event.stopPropagation(); onSelect(); }}>
        <rect x="-11" y="-11" width="22" height="22" rx="4" fill="#8b5cf6" opacity="0.24" transform="rotate(45)" className="animate-demand-glow" />
        <rect x={selected ? -7 : -5.5} y={selected ? -7 : -5.5} width={selected ? 14 : 11} height={selected ? 14 : 11} rx="2" fill="#8b5cf6" stroke="#f7f2ff" strokeOpacity="0.78" strokeWidth="1" transform="rotate(45)" />
        <title>{hub.name || "Unnamed demand hub"}</title>
      </g>
    </Marker>
  );
}

function LogisticsHubMarker({ hub, selected, onSelect }: { hub: LogisticsHub; selected: boolean; onSelect: () => void }) {
  return (
    <Marker coordinates={toLonLat(hub.coordinates)}>
      <g data-testid={`map-logistics-${hub.id}`} className="cursor-pointer transition duration-200 hover:scale-125" onClick={(event) => { event.stopPropagation(); onSelect(); }}>
        <path d={selected ? "M0 -10 L9 0 L0 10 L-9 0Z" : "M0 -8 L7 0 L0 8 L-7 0Z"} fill="#23d3ee" fillOpacity="0.92" stroke="#e7faff" strokeOpacity="0.7" strokeWidth="1" />
        <title>{hub.name || "Unnamed logistics hub"}</title>
      </g>
    </Marker>
  );
}

function RiskGeoMarker({ risk, selected, onSelect }: { risk: RiskEvent; selected: boolean; onSelect: () => void }) {
  if (!risk.active) return null;
  const size = selected ? 14 : 11;
  const opacity = Math.max(0.18, Math.min(0.55, risk.severity / 140));
  return (
    <Marker coordinates={toLonLat(risk.coordinates)}>
      <g data-testid={`map-risk-${risk.id}`} className="cursor-pointer transition duration-200 hover:scale-125" onClick={(event) => { event.stopPropagation(); onSelect(); }}>
        <circle r={size * 2.2} fill="#ff6b3a" opacity={opacity} className="animate-risk-glow" />
        <path d={`M0 -${size} L${size} ${size} L-${size} ${size}Z`} fill="#ff6b3a" stroke="#ffe1d7" strokeOpacity="0.78" strokeWidth="1" />
        <title>{risk.name || "Risk event"}</title>
      </g>
    </Marker>
  );
}

function LegendDot({ color, label, square, diamond }: { color: string; label: string; square?: boolean; diamond?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`${square ? "rounded-[3px]" : diamond ? "rotate-45 rounded-[2px]" : "rounded-full"} h-2.5 w-2.5`} style={{ backgroundColor: color, boxShadow: `0 0 14px ${color}` }} />
      {label}
    </span>
  );
}

function StatusChip({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "risk" }) {
  const toneClass = tone === "good" ? "text-green-100" : tone === "warn" ? "text-amber-100" : "text-orange-100";
  return (
    <span className="inline-flex items-center gap-1 rounded border border-slate-500/15 bg-slate-300/[0.06] px-2 py-1">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </span>
  );
}

function MapModeButton({ active, icon: Icon, label, tone, onClick, testId }: { active: boolean; icon: typeof Move; label: string; tone: "primary" | "secondary" | "neutral"; onClick: () => void; testId?: string }) {
  const inactiveTone = tone === "primary" ? "hover:border-cyanline/40 hover:bg-cyanline/10" : tone === "secondary" ? "hover:border-slate-300/35 hover:bg-slate-300/[0.09]" : "";
  return (
    <button data-testid={testId} className={`btn bg-ink-950/85 text-xs ${active ? "border-cyanline/60 bg-cyanline/15 text-cyan-50 shadow-glow" : inactiveTone}`} type="button" onClick={(event) => { event.stopPropagation(); onClick(); }}>
      <Icon size={15} />
      {label}
    </button>
  );
}
