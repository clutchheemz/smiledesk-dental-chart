import {
  useEffect, useId, useReducer, useRef, useState, useSyncExternalStore,
  type KeyboardEvent
} from "react";
import {
  CARIES_CLASSES, COLORS, FDI, FINDINGS, chartReducer, countFindings,
  createHistory, isPatientRight, isUpper, toothKind,
  type CariesClass, type ChartAction, type ChartValue, type Dentition,
  type FindingKind, type Language
} from "./model";
import { MESSAGES } from "./i18n";
import { Tooth } from "./Tooth";

export interface DentalChartProps {
  /** Initial snapshot, read once on mount. Subsequent state is owned here. */
  initialValue?: ChartValue;
  /** Clinical changes only, including note edits. Treat snapshots as immutable. */
  onChange?: (value: ChartValue) => void;
  initialLanguage?: Language;
}

const compactQuery = "(max-width: 700px)";
function subscribeViewport(notify: () => void) {
  const media = window.matchMedia?.(compactQuery);
  media?.addEventListener("change", notify);
  return () => media?.removeEventListener("change", notify);
}
function compactSnapshot() {
  return window.matchMedia?.(compactQuery).matches ?? false;
}

type Status = {
  key: "added" | "alreadyRecorded" | "removed" | "undone" | "resetDone" | "noteSaved";
  tooth?: string;
  kind?: FindingKind;
  cariesClass?: CariesClass;
} | null;

export function DentalChart({
  initialValue, onChange, initialLanguage = "ar"
}: DentalChartProps) {
  const [history, dispatch] = useReducer(chartReducer, initialValue, createHistory);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [dentition, setDentition] = useState<Dentition>("permanent");
  const [selection, setSelection] = useState<Record<Dentition, string | null>>({
    permanent: null, primary: null
  });
  const [status, setStatus] = useState<Status>(null);
  const compact = useSyncExternalStore(subscribeViewport, compactSnapshot, () => false);
  const previousValue = useRef(history.value);
  const chartRef = useRef<SVGSVGElement>(null);
  const id = useId();
  const t = MESSAGES[language];
  const number = selection[dentition];
  const currentFindings = number ? history.value[dentition][number] ?? [] : [];
  const recordedCount = countFindings(history.value, dentition);
  const teeth = [...FDI[dentition].upper, ...FDI[dentition].lower];
  const quadrantLabels = [t.upperRight, t.upperLeft, t.lowerRight, t.lowerLeft];
  const quadrantLabel = number ? isUpper(number)
    ? isPatientRight(number) ? t.upperRight : t.upperLeft
    : isPatientRight(number) ? t.lowerRight : t.lowerLeft : "";

  useEffect(() => {
    if (previousValue.current !== history.value) {
      previousValue.current = history.value;
      onChange?.(history.value);
    }
  }, [history.value, onChange]);

  function selectTooth(next: string) {
    setSelection((previous) => ({ ...previous, [dentition]: next }));
    setStatus(null);
  }

  function addFinding(kind: FindingKind, cariesClass?: CariesClass) {
    if (!number) return;
    const action: ChartAction = {
      type: "add", dentition, tooth: number,
      finding: { id: crypto.randomUUID(), kind, cariesClass, surfaces: [], note: "" }
    };
    // Use the reducer's validation for feedback as well as batched/rapid input.
    const duplicate = chartReducer(history, action) === history;
    dispatch(action);
    setStatus({ key: duplicate ? "alreadyRecorded" : "added", tooth: number, kind, cariesClass });
  }

  function undo() {
    const previous = history.past.at(-1);
    if (!previous) return;
    setDentition(previous.dentition);
    dispatch({ type: "undo" });
    setStatus({ key: "undone" });
  }

  function reset() {
    if (!window.confirm(dentition === "permanent" ? t.confirmPermanent : t.confirmPrimary)) return;
    dispatch({ type: "reset", dentition });
    setStatus({ key: "resetDone" });
  }

  function navigateTeeth(event: KeyboardEvent<SVGSVGElement>) {
    const target = (event.target as Element).closest<SVGGElement>("[data-tooth]");
    if (!target) return;
    const index = teeth.indexOf(target.dataset.tooth!);
    const columns = FDI[dentition].upper.length / (compact ? 2 : 1);
    const rowStart = Math.floor(index / columns) * columns;
    const next = event.key === "ArrowRight" ? index + 1
      : event.key === "ArrowLeft" ? index - 1
      : event.key === "ArrowDown" ? index + columns
      : event.key === "ArrowUp" ? index - columns
      : event.key === "Home" ? rowStart
      : event.key === "End" ? rowStart + columns - 1 : null;
    if (next === null) return;
    event.preventDefault();
    if (!teeth[next]) return;
    selectTooth(teeth[next]);
    chartRef.current?.querySelector<SVGGElement>(`[data-tooth="${teeth[next]}"]`)?.focus();
  }

  return (
    <main className="sd-chart" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="sd-shell">
        <header className="sd-controls">
          <div className="sd-brand">
            <span className="sd-brand-name" dir="ltr">SmileDesk<span aria-hidden="true">.</span></span>
            <h1>{t.title}</h1>
          </div>
          <div className="sd-segmented" role="group" aria-label={t.dentition}>
            {(["permanent", "primary"] as const).map((item) => (
              <button key={item} type="button" className="sd-segment"
                aria-pressed={dentition === item}
                onClick={() => { setDentition(item); setStatus(null); }}>
                {t[item]} <span className="sd-count" dir="ltr">{item === "permanent" ? 32 : 20}</span>
              </button>
            ))}
          </div>
          <div className="sd-history-actions">
            <button className="sd-button" type="button" disabled={!history.past.length} onClick={undo}>
              <span aria-hidden="true">↶</span>{t.undo}
            </button>
            <button className="sd-button sd-danger" type="button" disabled={!recordedCount} onClick={reset} title={t.reset}>
              <span aria-hidden="true">↺</span><span className="sd-reset-label">{t.reset}</span>
            </button>
          </div>
          <button className="sd-button sd-language" type="button"
            onClick={() => { setLanguage(language === "ar" ? "en" : "ar"); setStatus(null); }}
            lang={language === "ar" ? "en" : "ar"}>
            {language === "ar" ? "English" : "العربية"}
          </button>
        </header>

        <div className="sd-workspace">
          <section className="sd-card sd-odontogram" aria-labelledby={`${id}-chart-title`}>
            <div className="sd-card-heading">
              <div><h2 id={`${id}-chart-title`}>{t.chart}</h2><p>{t.chartHelp}</p></div>
              <span className="sd-tag" dir="ltr">FDI <b>{teeth.length}</b></span>
            </div>
            <div className="sd-chart-stage" dir="ltr">
              <svg ref={chartRef} className={`sd-arch${compact ? " is-compact" : ""}`}
                viewBox={compact ? "0 0 480 560" : "0 16 900 700"}
                aria-label={`${t.chart} - ${t[dentition]}`} aria-describedby={`${id}-keyboard-help`}
                onKeyDown={navigateTeeth}>
                <g aria-hidden="true" className="sd-arch-guides">
                  {compact ? quadrantLabels.map((label, index) => (
                    <g key={index}>
                      {index > 0 && <path d={`M12 ${index * 140} H468`} />}
                      <text x="240" y={index * 140 + 15} className="sd-quadrant-label">{label}</text>
                    </g>
                  )) : <>
                    <path d="M450 28 V178 M450 550 V704" />
                    <text x="450" y="245">{t.upperJaw}</text>
                    <text x="450" y="493">{t.lowerJaw}</text>
                    <text x="160" y="365" className="sd-side-label">{t.patientRight}</text>
                    <text x="740" y="365" className="sd-side-label">{t.patientLeft}</text>
                    <text x="450" y="357" className="sd-center-label">{t[dentition]}</text>
                    <text x="450" y="383" className="sd-center-count">{teeth.length} {t.teeth}</text>
                  </>}
                </g>
                {(["upper", "lower"] as const).map((arch) =>
                  FDI[dentition][arch].map((tooth, index) => (
                    <Tooth key={tooth} number={tooth} index={index}
                      count={FDI[dentition][arch].length} upper={arch === "upper"}
                      compact={compact} selected={tooth === number}
                      tabIndex={tooth === (number ?? teeth[0]) ? 0 : -1}
                      findings={history.value[dentition][tooth] ?? []} language={language}
                      onSelect={() => selectTooth(tooth)} />
                  ))
                )}
              </svg>
            </div>
            <div className="sd-chart-footer">
              <span className="sd-selection-key"><i aria-hidden="true" />{t.selected}</span>
              <span id={`${id}-keyboard-help`} className="sd-keyboard-help">{t.keyboardHelp}</span>
              <span><b>{recordedCount}</b> {t.marked}</span>
            </div>
          </section>

          <section className="sd-card sd-actions" aria-labelledby={`${id}-selected-title`}>
            <div className="sd-selected-heading">
              <span className="sd-tooth-number" dir="ltr">{number ?? "--"}</span>
              <div>
                <div className="sd-eyebrow">{t.selectedTooth}</div>
                <h2 id={`${id}-selected-title`}>{number ? <>{t.tooth} <bdi>{number}</bdi></> : t.selectTooth}</h2>
                {number && <p>{quadrantLabel} · {t.toothKinds[toothKind(number)]}</p>}
              </div>
            </div>
            <fieldset className="sd-classes" disabled={!number}>
              <legend>{t.cariesClasses}</legend>
              <div className="sd-class-buttons" dir="ltr">
                {CARIES_CLASSES.map((cariesClass) => {
                  const recorded = currentFindings.some((finding) =>
                    finding.kind === "caries" && finding.cariesClass === cariesClass);
                  return <button key={cariesClass} className="sd-class-button" type="button"
                    aria-label={`${t.classLabel} ${cariesClass}`} aria-pressed={recorded}
                    title={`${t.classLabel} ${cariesClass}: ${t.classDescriptions[cariesClass]}`}
                    onClick={() => addFinding("caries", cariesClass)}>
                    <span className="sd-class-word" lang={language}>{t.classLabel}</span>
                    <b>{cariesClass}</b><span className="sd-class-check" aria-hidden="true">{recorded ? "✓" : "+"}</span>
                  </button>;
                })}
              </div>
            </fieldset>
            <div className="sd-status" role="status" aria-live="polite" aria-atomic="true">
              {status ? <>{t[status.key]}{status.tooth && <> · {t.tooth} <bdi>{status.tooth}</bdi></>}
                {status.kind && <> · {status.cariesClass ? <>{t.classLabel} <bdi>{status.cariesClass}</bdi></> : t.findings[status.kind]}</>}
              </> : number ? t.instantHelp : t.selectHelp}
            </div>
          </section>

          <aside className="sd-card sd-details" aria-label={t.currentFindings}>
            <details className="sd-other-findings">
              <summary>{t.otherFindings}<span aria-hidden="true">+</span></summary>
              <div className="sd-finding-buttons" role="group" aria-label={t.otherFindings}>
                {FINDINGS.filter((kind) => kind !== "caries").map((kind) => (
                  <button key={kind} className="sd-finding-button" type="button" disabled={!number}
                    onClick={() => addFinding(kind)}>
                    <span className="sd-swatch" style={{ backgroundColor: COLORS[kind] }} aria-hidden="true" />
                    {t.findings[kind]}
                  </button>
                ))}
              </div>
            </details>
            <section className="sd-current" aria-labelledby={`${id}-current-title`}>
              <div className="sd-current-heading">
                <h3 id={`${id}-current-title`}>{t.currentFindings}</h3>
                <span className="sd-count">{currentFindings.length}</span>
              </div>
              {!currentFindings.length && <p className="sd-empty">{number ? t.noFindings : t.selectTooth}</p>}
              <ul className="sd-record-list">
                {currentFindings.map((finding) => {
                  const label = finding.cariesClass
                    ? `${t.findings.caries} · ${t.classLabel} ${finding.cariesClass}` : t.findings[finding.kind];
                  return <li key={`${dentition}-${number}-${finding.id}`} className="sd-record">
                    <div className="sd-record-top">
                      <span className="sd-swatch" style={{ backgroundColor: COLORS[finding.kind] }} aria-hidden="true" />
                      <strong>{label}</strong>
                      <button className="sd-remove" type="button" aria-label={`${t.remove}: ${label}`} title={t.remove}
                        onClick={() => {
                          dispatch({ type: "remove", dentition, tooth: number!, id: finding.id });
                          setStatus({ key: "removed", tooth: number! });
                        }}><span aria-hidden="true">×</span></button>
                    </div>
                    <p className="sd-record-description">{finding.cariesClass ? t.classDescriptions[finding.cariesClass]
                      : finding.kind === "caries" ? t.legacyCaries : t.wholeTooth}</p>
                    {finding.note && <p className="sd-record-note" dir="auto">{finding.note}</p>}
                    <details className="sd-note-details">
                      <summary>{finding.note ? t.editNote : t.addNote}</summary>
                      <label className="sd-note-label">{t.note}
                        <textarea key={finding.note} className="sd-note" dir="auto" rows={2} maxLength={160}
                          defaultValue={finding.note} aria-label={`${t.note}: ${label}`}
                          aria-describedby={`${id}-note-help-${finding.id}`}
                          onBlur={(event) => {
                            // Merely viewing a legacy note must not normalize or truncate it.
                            if (event.currentTarget.value === finding.note) return;
                            const note = event.currentTarget.value.trim().slice(0, 160);
                            if (note === finding.note) { event.currentTarget.value = note; return; }
                            dispatch({ type: "note", dentition, tooth: number!, id: finding.id, note });
                            setStatus({ key: "noteSaved", tooth: number! });
                          }} />
                      </label>
                      <small id={`${id}-note-help-${finding.id}`}>{t.noteHelp} · 160</small>
                    </details>
                  </li>;
                })}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
