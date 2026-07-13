import { ArrowRight, ClipboardList } from "lucide-react";
import { appConfig } from "../appConfig";

interface ProductHeroProps {
  onExploreDemo: () => void;
  onViewMethodology: () => void;
}

export default function ProductHero({ onExploreDemo, onViewMethodology }: ProductHeroProps) {
  return (
    <section className="panel overflow-hidden px-4 py-4 sm:px-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="max-w-5xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-cyanline/25 bg-cyanline/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-cyan-100">{appConfig.categoryLabel}</span>
            <span className="rounded-md border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-amber-100">{appConfig.prototypeLabel}</span>
          </div>
          <h2 className="mt-3 max-w-4xl text-2xl font-semibold leading-tight text-white sm:text-3xl">{appConfig.heroHeading}</h2>
          <p className="mt-3 max-w-5xl text-sm leading-6 text-cyan-50/72 sm:text-base">{appConfig.heroSubheading}</p>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button className="btn btn-primary min-h-10 px-3.5" type="button" onClick={onExploreDemo}>
            Explore the Demo
            <ArrowRight size={16} />
          </button>
          <button className="btn min-h-10 px-3.5" type="button" onClick={onViewMethodology}>
            <ClipboardList size={16} />
            View the Methodology
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-cyan-200/10 pt-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {appConfig.credibilityStrip.map((item, index) => (
            <span key={item} className="inline-flex items-center gap-3">
              {index > 0 && <span className="text-cyanline/50">•</span>}
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
