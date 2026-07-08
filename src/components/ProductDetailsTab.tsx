import { FileUp, PackageSearch } from "lucide-react";
import { useRef, useState } from "react";
import { importOperationalFile } from "../logic/fileImport";
import { productCategoryOptions } from "../logic/referenceData";
import type { Scenario } from "../logic/types";
import NumberInput from "./NumberInput";
import SearchableSelect from "./SearchableSelect";

interface ProductDetailsTabProps {
  scenario: Scenario;
  onUpdateScenario: (scenario: Scenario) => void;
}

export default function ProductDetailsTab({ scenario, onUpdateScenario }: ProductDetailsTabProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const product = scenario.productDetails;
  const updateProduct = (next: Partial<typeof product>) => onUpdateScenario({ ...scenario, productDetails: { ...product, ...next } });

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setImporting(true);
    try {
      let nextScenario = scenario;
      for (const file of Array.from(files)) {
        nextScenario = await importOperationalFile(file, nextScenario);
      }
      onUpdateScenario(nextScenario);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not import that file.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className="grid gap-4 animate-tab-in xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="grid gap-4">
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Product Details</h2>
              <p className="mt-1 text-sm text-cyan-100/55">Product information, specifications, descriptors, and document intake for the current dashboard.</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => fileRef.current?.click()} disabled={importing}>
              <FileUp size={16} />
              {importing ? "Importing" : "Import Files"}
            </button>
            <input
              ref={fileRef}
              className="hidden"
              type="file"
              multiple
              accept=".json,.csv,.tsv,.txt,.xlsx,.xls,.docx,application/json,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => importFiles(event.target.files)}
            />
          </div>
        </div>

        <section className="panel-soft p-4">
          <div className="flex items-center gap-2">
            <PackageSearch size={17} className="text-cyanline" />
            <h3 className="text-sm font-semibold text-white">Product Profile</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <TextField label="Product Name" value={product.name} onChange={(name) => updateProduct({ name })} placeholder="Example: Battery management PCB" />
            <TextField label="SKU or Part Number" value={product.sku} onChange={(sku) => updateProduct({ sku })} placeholder="Example: BMS-240A" />
            <SearchableSelect label="Product Category" value={product.category} options={productCategoryOptions} placeholder="Search or choose a category" onChange={(category) => updateProduct({ category })} />
            {product.category === "Other" && <TextField label="Other Category" value={product.customCategory} onChange={(customCategory) => updateProduct({ customCategory })} placeholder="Describe the category" />}
            <TextField label="Unit of Measure" value={product.unitOfMeasure} onChange={(unitOfMeasure) => updateProduct({ unitOfMeasure })} placeholder="Example: units" />
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-cyan-100/75">Annual Volume</span>
              <NumberInput className="input" min={0} value={product.annualVolume} onChange={(annualVolume) => updateProduct({ annualVolume })} />
            </label>
            <TextArea label="Product Specification" value={product.specification} onChange={(specification) => updateProduct({ specification })} placeholder="Dimensions, grade, material, tolerances, revision, critical specs" />
            <TextArea label="Import Descriptors" value={product.descriptors} onChange={(descriptors) => updateProduct({ descriptors })} placeholder="Paste product descriptors, constraints, risk flags, handling needs, or commercial requirements" />
            <TextArea label="Compliance Requirements" value={product.complianceRequirements} onChange={(complianceRequirements) => updateProduct({ complianceRequirements })} placeholder="Example: RoHS, REACH, ISO 13485, IATF 16949" />
            <TextArea label="Quality Requirements" value={product.qualityRequirements} onChange={(qualityRequirements) => updateProduct({ qualityRequirements })} placeholder="Inspection, testing, certification, or audit requirements" />
            <div className="md:col-span-2">
              <TextArea label="Product Notes" value={product.notes} onChange={(notes) => updateProduct({ notes })} placeholder="Any additional product context that should influence sourcing decisions" />
            </div>
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-4">
        <section className="panel-soft p-4">
          <h3 className="text-sm font-semibold text-white">Document Intake</h3>
          <p className="mt-1 text-xs leading-5 text-cyan-100/52">Upload JSON, CSV, TSV, TXT, XLSX, XLS, or DOCX files. Recognized records are mapped into the dashboard; incomplete fields are listed for manual input.</p>
          <button className="btn btn-primary mt-4 w-full" type="button" onClick={() => fileRef.current?.click()} disabled={importing}>
            <FileUp size={16} />
            {importing ? "Reading Files" : "Upload Operational Files"}
          </button>
        </section>

        <section className="panel-soft p-4">
          <h3 className="text-sm font-semibold text-white">Import Status</h3>
          <div className="mt-3 grid gap-2">
            {scenario.importedFiles.length ? (
              scenario.importedFiles.map((file) => (
                <article key={file.id} className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-white">{file.fileName}</p>
                    <span className={`rounded border px-2 py-1 text-[0.65rem] font-semibold ${file.status === "Mapped" ? "border-good/25 bg-good/10 text-green-100" : file.status === "Partial" ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-risk/25 bg-risk/10 text-orange-100"}`}>{file.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-cyan-100/50">{file.mappedFields.length ? file.mappedFields.join(", ") : "No mapped fields yet."}</p>
                  {file.manualInputs.length > 0 && <p className="mt-2 text-xs text-orange-100/75">Needs Manual Input: {file.manualInputs.slice(0, 4).join(", ")}</p>}
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3 text-sm text-cyan-100/55">No files imported yet.</p>
            )}
          </div>
        </section>
      </aside>
    </section>
  );
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-cyan-100/75">{label}</span>
      <input className="input" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-cyan-100/75">{label}</span>
      <textarea className="input min-h-28" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
