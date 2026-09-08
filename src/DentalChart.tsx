import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState
} from "react";
import {
  COLORS,
  FDI,
  FINDINGS,
  SURFACES,
  chartReducer,
  countFindings,
  createHistory,
  isPatientRight,
  isUpper,
  toothKind,
  usesSurfaces,
  type ChartValue,
  type Dentition,
  type FindingKind,
  type Language,
  type Surface
} from "./model";
import { MESSAGES } from "./i18n";
import { Tooth } from "./Tooth";

export interface DentalChartProps {
  /**
   * Initial snapshot, read once on mount.
   * The component owns its subsequent state.
   */
  initialValue?: ChartValue;

  /**
   * Called after clinical changes: add, remove, undo, reset.
   * Not called for selection, drafts, language, or dentition switching.
   * Treat emitted snapshots as immutable.
   */
  onChange?: (value: ChartValue) => void;

  initialLanguage?: Language;
}

type Status = "applied" | "removed" | "undone" | "resetDone" | null;

export function DentalChart({
  initialValue,
  onChange,
  initialLanguage = "ar"
}: DentalChartProps) {
  const [history, dispatch] = useReducer(
    chartReducer,
    initialValue,
    createHistory
  );

  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [dentition, setDentition] = useState<Dentition>("permanent");
  const [selection, setSelection] = useState<Record<Dentition, string>>({
    permanent: "11",
    primary: "51"
  });

  const [kind, setKind] = useState<FindingKind>("caries");
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>(null);

  const previousValue = useRef(history.value);
  const id = useId();

  const t = MESSAGES[language];
  const number = selection[dentition];
  const currentFindings = history.value[dentition][number] ?? [];
  const needsSurfaces = usesSurfaces(kind);
  const canApply = !needsSurfaces || surfaces.length > 0;
  const recordedCount = countFindings(history.value, dentition);
  const toothCount =
    FDI[dentition].upper.length + FDI[dentition].lower.length;

  useEffect(() => {
    if (previousValue.current !== history.value) {
      previousValue.current = history.value;
      onChange?.(history.value);
    }
  }, [history.value, onChange]);

  function clearDraft() {
    setSurfaces([]);
    setNote("");
  }

  function selectTooth(next: string) {
    if (next === number) return;

    setSelection((previous) => ({
      ...previous,
      [dentition]: next
    }));

    clearDraft();
    setStatus(null);
  }

  function switchDentition(next: Dentition) {
    if (next === dentition) return;

    setDentition(next);
    clearDraft();
    setStatus(null);
  }

  function selectKind(next: FindingKind) {
    if (next === kind) return;

    setKind(next);
    // Draft surfaces belong to the finding being entered: never carry
    // an uncommitted selection over to another finding.
    setSurfaces([]);
    setStatus(null);
  }

  function toggleSurface(surface: Surface) {
    setSurfaces((previous) =>
      previous.includes(surface)
        ? previous.filter((item) => item !== surface)
        : SURFACES.filter(
            (item) => item === surface || previous.includes(item)
          )
    );
  }

  function applyFinding() {
    if (!canApply) return;

    dispatch({
      type: "add",
      dentition,
      tooth: number,
      finding: {
        id: crypto.randomUUID(),
        kind,
        surfaces: needsSurfaces ? surfaces : [],
        note
      }
    });

    clearDraft();
    setStatus("applied");
  }

  function undo() {
    const previous = history.past.at(-1);
    if (!previous) return;

    // Make the affected dentition visible when undo crosses dentitions.
    setDentition(previous.dentition);
    dispatch({ type: "undo" });
    clearDraft();
    setStatus("undone");
  }

  function reset() {
    const confirmed = window.confirm(
      dentition === "permanent"
        ? t.confirmPermanent
        : t.confirmPrimary
    );

    if (!confirmed) return;

    dispatch({ type: "reset", dentition });
    clearDraft();
    setStatus("resetDone");
  }

  const quadrantLabel = isUpper(number)
    ? isPatientRight(number)
      ? t.upperRight
      : t.upperLeft
    : isPatientRight(number)
      ? t.lowerRight
      : t.lowerLeft;

  return (
    <main
      className="sd-chart"
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
    >
      <div className="sd-shell">
        <section className="sd-controls" aria-label={t.dentition}>
          <h1 className="sd-title">{t.title}</h1>
          <div
            className="sd-segmented"
            role="group"
            aria-label={t.dentition}
          >
            {(["permanent", "primary"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`sd-segment ${
                  dentition === item ? "is-active" : ""
                }`}
                aria-pressed={dentition === item}
                onClick={() => switchDentition(item)}
              >
                {t[item]}
                <span className="sd-count" dir="ltr">
                  {item === "permanent" ? "32" : "20"}
                </span>
              </button>
            ))}
          </div>

          <div className="sd-history-actions">
            <button
              className="sd-button"
              type="button"
              disabled={history.past.length === 0}
              onClick={undo}
            >
              <span aria-hidden="true">↶</span>
              {t.undo}
            </button>

            <button
              className="sd-button sd-danger"
              type="button"
              disabled={recordedCount === 0}
              onClick={reset}
            >
              {t.reset}
            </button>
          </div>

          <button
            className="sd-button sd-language"
            type="button"
            onClick={() =>
              setLanguage((previous) => previous === "ar" ? "en" : "ar")
            }
            lang={language === "ar" ? "en" : "ar"}
          >
            <span aria-hidden="true">◎</span>
            {language === "ar" ? "English" : "العربية"}
          </button>
        </section>

        <section
          className="sd-card sd-toolbar"
          aria-labelledby={`${id}-toolbar-title`}
        >
          <h2 id={`${id}-toolbar-title`} className="sd-small-heading">
            <span className="sd-step">01</span>
            {t.findingToolbar}
          </h2>

          <div
            className="sd-finding-buttons"
            role="group"
            aria-label={t.findingToolbar}
          >
            {FINDINGS.map((findingKind) => (
              <button
                key={findingKind}
                type="button"
                className={`sd-finding-button ${
                  kind === findingKind ? "is-active" : ""
                }`}
                aria-pressed={kind === findingKind}
                onClick={() => selectKind(findingKind)}
              >
                <span
                  className="sd-swatch"
                  style={{ backgroundColor: COLORS[findingKind] }}
                  aria-hidden="true"
                />
                {t.findings[findingKind]}
                {kind === findingKind && (
                  <span className="sd-check" aria-hidden="true">✓</span>
                )}
              </button>
            ))}
          </div>
        </section>

        <div className="sd-workspace">
          <section
            className="sd-card sd-odontogram"
            aria-labelledby={`${id}-chart-title`}
          >
            <div className="sd-card-heading">
              <div>
                <h2 id={`${id}-chart-title`}>
                  <span className="sd-step">02</span>
                  {t.chart}
                </h2>
                <p>{t.chartHelp}</p>
              </div>
              <span className="sd-tag" dir="ltr">FDI</span>
            </div>

            <div
              className="sd-chart-scroll"
              dir="ltr"
              role="region"
              aria-label={t.chart}
              tabIndex={0}
            >
              <svg
                className="sd-arch"
                viewBox="0 16 900 700"
                aria-label={`${t.chart} — ${t[dentition]}`}
              >
                <g aria-hidden="true" className="sd-arch-guides">
                  <path d="M450 28 V178 M450 550 V704" />
                  <text x="450" y="243">{t.upperJaw}</text>
                  <text x="450" y="497">{t.lowerJaw}</text>
                  <text x="95" y="365" className="sd-side-label">
                    {t.patientRight}
                  </text>
                  <text x="805" y="365" className="sd-side-label">
                    {t.patientLeft}
                  </text>
                  <text x="450" y="357" className="sd-center-label">
                    {t[dentition]}
                  </text>
                  <text x="450" y="383" className="sd-center-count">
                    {toothCount} {t.teeth} · FDI
                  </text>
                </g>

                {(["upper", "lower"] as const).map((arch) =>
                  FDI[dentition][arch].map((tooth, index) => (
                    <Tooth
                      key={tooth}
                      number={tooth}
                      index={index}
                      count={FDI[dentition][arch].length}
                      upper={arch === "upper"}
                      selected={tooth === number}
                      findings={history.value[dentition][tooth] ?? []}
                      language={language}
                      onSelect={() => selectTooth(tooth)}
                    />
                  ))
                )}
              </svg>
            </div>

            <div className="sd-chart-footer">
              <span className="sd-selection-key">
                <span aria-hidden="true" />
                {t.selected}
              </span>
              <span>{recordedCount} {t.marked}</span>
              <span className="sd-scroll-help">{t.scrollHelp}</span>
            </div>

          </section>

          <aside
            className="sd-card sd-details"
            aria-labelledby={`${id}-details-title`}
          >
            <div className="sd-details-heading">
              <div>
                <div className="sd-eyebrow">{t.selectedTooth}</div>
                <h2 id={`${id}-details-title`}>
                  {t.tooth}
                  {" "}
                  <bdi>{number}</bdi>
                </h2>
                <p>
                  {quadrantLabel}
                  <span aria-hidden="true"> · </span>
                  {t.toothKinds[toothKind(number)]}
                </p>
              </div>
              <span className="sd-tooth-number" dir="ltr">
                {number}
              </span>
            </div>

            <div className="sd-draft">
              <div className="sd-draft-kind">
                <span
                  className="sd-swatch"
                  style={{ backgroundColor: COLORS[kind] }}
                  aria-hidden="true"
                />
                <strong>{t.findings[kind]}</strong>
                <span className="sd-step">03</span>
              </div>

              <fieldset className="sd-surfaces" disabled={!needsSurfaces}>
                <legend>{t.surfacesTitle}</legend>
                <div className="sd-surface-buttons" dir="ltr">
                  {SURFACES.map((surface) => (
                    <button
                      key={surface}
                      type="button"
                      aria-label={`${surface} — ${t.surfaces[surface]}`}
                      aria-pressed={
                        needsSurfaces && surfaces.includes(surface)
                      }
                      title={t.surfaces[surface]}
                      className={`sd-surface ${
                        needsSurfaces && surfaces.includes(surface)
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() => toggleSurface(surface)}
                    >
                      {surface}
                    </button>
                  ))}
                </div>
              </fieldset>

              <p className="sd-helper">
                {needsSurfaces ? t.surfacesHelp : t.wholeToothHelp}
              </p>

              {needsSurfaces && surfaces.length > 0 && (
                <div className="sd-surface-summary">
                  {surfaces.map((surface) => (
                    <span key={surface}>
                      <bdi>{surface}</bdi>
                      {" · "}
                      {t.surfaces[surface]}
                    </span>
                  ))}
                </div>
              )}

              <label className="sd-note-label" htmlFor={`${id}-note`}>
                {t.note}
              </label>
              <textarea
                id={`${id}-note`}
                className="sd-note"
                dir="auto"
                rows={3}
                maxLength={160}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                aria-describedby={`${id}-note-help`}
              />
              <div className="sd-note-meta" id={`${id}-note-help`}>
                <span>{t.noteHelp}</span>
                <bdi>{note.length}/160</bdi>
              </div>

              <button
                className="sd-button sd-apply"
                type="button"
                disabled={!canApply}
                onClick={applyFinding}
              >
                <span aria-hidden="true">+</span>
                {t.apply}
              </button>

              {!canApply && (
                <p className="sd-helper">{t.chooseSurfaces}</p>
              )}
            </div>

            <section
              className="sd-current"
              aria-labelledby={`${id}-current-title`}
            >
              <div className="sd-current-heading">
                <h3 id={`${id}-current-title`}>{t.currentFindings}</h3>
                <span className="sd-count">{currentFindings.length}</span>
              </div>

              {currentFindings.length === 0 ? (
                <p className="sd-empty">{t.noFindings}</p>
              ) : (
                <ul className="sd-record-list">
                  {currentFindings.map((finding) => (
                    <li key={finding.id} className="sd-record">
                      <div className="sd-record-top">
                        <span
                          className="sd-swatch"
                          style={{
                            backgroundColor: COLORS[finding.kind]
                          }}
                          aria-hidden="true"
                        />
                        <strong>{t.findings[finding.kind]}</strong>
                        <button
                          className="sd-remove"
                          type="button"
                          aria-label={`${t.remove}: ${t.findings[finding.kind]}`}
                          title={t.remove}
                          onClick={() => {
                            dispatch({
                              type: "remove",
                              dentition,
                              tooth: number,
                              id: finding.id
                            });
                            setStatus("removed");
                          }}
                        >
                          <span aria-hidden="true">×</span>
                        </button>
                      </div>

                      <div className="sd-record-surfaces">
                        {finding.surfaces.length
                          ? finding.surfaces.map((surface) => (
                              <span
                                key={surface}
                                title={t.surfaces[surface]}
                              >
                                <bdi>{surface}</bdi>
                                {" · "}
                                {t.surfaces[surface]}
                              </span>
                            ))
                          : <span>{t.wholeTooth}</span>}
                      </div>

                      {finding.note && (
                        <p className="sd-record-note" dir="auto">
                          {finding.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div
              className="sd-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {status ? t[status] : "\u00a0"}
            </div>
          </aside>
        </div>


      </div>
    </main>
  );
}