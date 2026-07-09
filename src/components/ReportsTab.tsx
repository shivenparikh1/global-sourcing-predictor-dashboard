import { Clipboard, Download, FileJson, FileText, Printer, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { appConfig } from "../appConfig";
import type { PredictionResult, Recommendation, Scenario } from "../logic/types";
import {
  buildDataQuality,
  generateReportText,
  reportTypes,
  type ReportType,
  type SourcingStrategy,
} from "../logic/workflowIntelligence";

interface ReportsTabProps {
  scenario: Scenario;
  prediction: PredictionResult;
  recommendation: Recommendation;
  strategy: SourcingStrategy;
}

export default function ReportsTab({ scenario, prediction, recommendation, strategy }: ReportsTabProps) {
  const [selectedType, setSelectedType] = useState<ReportType>("decision-memo");
  const [copied, setCopied] = useState(false);
  const quality = useMemo(() => buildDataQuality(scenario, prediction), [scenario, prediction]);
  const reportText = useMemo(() => generateReportText(selectedType, scenario, prediction, recommendation, quality, strategy), [selectedType, scenario, prediction, recommendation, quality, strategy]);
  const selectedLabel = reportTypes.find((type) => type.id === selectedType)?.label ?? "Sourcing Report";

  const copyText = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const download = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const popup = window.open("", "_blank", "width=900,height=1100");
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>${selectedLabel}</title><style>body{font-family:Inter,Arial,sans-serif;line-height:1.55;padding:40px;color:#101827}pre{white-space:pre-wrap;font:inherit}</style></head><body><pre>${escapeHtml(reportText)}</pre><script>window.print()</script></body></html>`);
    popup.document.close();
  };

  return (
    <section className="grid gap-4 animate-tab-in xl:grid-cols-[18rem_minmax(0,1fr)_23rem]">
      <aside className="panel p-3">
        <h2 className="text-sm font-semibold text-white">Reports</h2>
        <p className="mt-1 text-xs leading-5 text-cyan-100/52">Generate sourcing deliverables from current data only.</p>
        <div className="mt-4 grid gap-1">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`rounded-md px-3 py-2 text-left text-sm transition ${selectedType === type.id ? "bg-cyanline/15 text-cyan-50 shadow-glow" : "text-cyan-100/62 hover:bg-white/[0.04] hover:text-white"}`}
              onClick={() => setSelectedType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </aside>

      <div className="grid gap-4">
        <section className="panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{selectedLabel}</h2>
              <p className="mt-1 text-sm text-cyan-100/55">Includes objective, input summary, supplier comparison, risk summary, cost summary, recommendation, tradeoffs, missing data, and final decision.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" type="button" onClick={copyText}>
                <Clipboard size={16} />
                {copied ? "Copied" : "Copy Text"}
              </button>
              <button className="btn" type="button" onClick={() => download(`${appConfig.exportFilePrefix}-${selectedType}.md`, reportText, "text/markdown;charset=utf-8")}>
                <Download size={16} />
                Markdown
              </button>
              <button className="btn" type="button" onClick={() => download(`${appConfig.exportFilePrefix}-${selectedType}.json`, JSON.stringify({ type: selectedType, generatedAt: new Date().toISOString(), report: reportText, scenario }, null, 2), "application/json")}>
                <FileJson size={16} />
                JSON
              </button>
              <button className="btn btn-primary" type="button" onClick={printReport}>
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
        </section>

        <section className="panel-soft overflow-hidden">
          <div className="border-b border-cyan-200/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText size={17} className="text-cyanline" />
              <h3 className="text-sm font-semibold text-white">Generated Report</h3>
            </div>
          </div>
          <pre className="max-h-[48rem] overflow-auto whitespace-pre-wrap p-4 text-sm leading-6 text-cyan-50/[0.82]">{reportText}</pre>
        </section>
      </div>

      <aside className="grid content-start gap-4">
        <section className="panel-soft p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className={quality.reliable ? "text-good" : "text-risk"} />
            <h3 className="text-sm font-semibold text-white">Report Readiness</h3>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-cyan-100/58">Data Quality</span>
              <span className="font-semibold text-white">{quality.score}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-950">
              <div className={`h-full rounded-full ${quality.reliable ? "bg-good" : quality.band === "medium" ? "bg-amber-300" : "bg-risk"}`} style={{ width: `${quality.score}%` }} />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-cyan-100/62">{quality.reliable ? "Ready for a decision memo draft." : "Report can be exported, but call out missing data before using it for approval."}</p>
        </section>

        <section className="panel-soft p-4">
          <h3 className="text-sm font-semibold text-white">Missing Data and Assumptions</h3>
          <div className="mt-3 grid gap-2">
            {quality.missingFields.length ? (
              quality.missingFields.map((field) => (
                <div key={field} className="rounded-md border border-risk/20 bg-risk/10 px-3 py-2 text-xs text-orange-100/85">
                  {field}
                </div>
              ))
            ) : (
              <div className="rounded-md border border-good/20 bg-good/10 px-3 py-2 text-xs text-green-100">No critical missing fields detected.</div>
            )}
          </div>
        </section>
      </aside>
    </section>
  );
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
