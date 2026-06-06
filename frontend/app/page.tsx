'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface FormState {
  edadInicioEnDias: number;
  duracionCrisisSegundos: number;
  frecuenciaCrisisPorDia: number;
  puntuacionAPGAR: number;
  lateralizacionCrisis: string;
  asociadoFiebre: boolean;
  complicacionPerinatal: boolean;
  regresionDesarrollo: boolean;
  tieneAntecedenteFamiliar: boolean;
  tieneCrisisClonicas: boolean;
  tieneCrisisTonicas: boolean;
  tieneEspasmos: boolean;
  tieneHipotonia: boolean;
  tieneMioclonias: boolean;
}

interface Result {
  diagnostico?: string;
  urgencia?: string;
  pronostico?: string;
  error?: string;
}

const URGENCIA_STYLE: Record<string, string> = {
  Urgencia_Alta:  'border-red-500    bg-red-50    text-red-900',
  Urgencia_Media: 'border-yellow-500 bg-yellow-50 text-yellow-900',
  Urgencia_Baja:  'border-green-500  bg-green-50  text-green-900',
};

const LABEL: Record<string, string> = {
  Urgencia_Alta: 'Alta', Urgencia_Media: 'Media', Urgencia_Baja: 'Baja',
  Pronostico_Favorable: 'Favorable', Pronostico_Reservado: 'Reservado', Pronostico_Grave: 'Grave',
};

const BOOL_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: 'asociadoFiebre',           label: 'Asociado a fiebre' },
  { key: 'complicacionPerinatal',    label: 'Complicación perinatal' },
  { key: 'regresionDesarrollo',      label: 'Regresión del desarrollo' },
  { key: 'tieneAntecedenteFamiliar', label: 'Antecedente familiar de epilepsia neonatal' },
  { key: 'tieneCrisisClonicas',      label: 'Crisis clónicas' },
  { key: 'tieneCrisisTonicas',       label: 'Crisis tónicas' },
  { key: 'tieneEspasmos',            label: 'Espasmos epilépticos' },
  { key: 'tieneHipotonia',           label: 'Hipotonía generalizada' },
  { key: 'tieneMioclonias',          label: 'Mioclonías' },
];

const INT_FIELDS: { key: keyof FormState; label: string; max: number; unit: string }[] = [
  { key: 'edadInicioEnDias',        label: 'Edad de inicio de crisis', max: 28,  unit: 'días' },
  { key: 'duracionCrisisSegundos',  label: 'Duración promedio de crisis', max: 300, unit: 'seg' },
  { key: 'frecuenciaCrisisPorDia',  label: 'Frecuencia de crisis',    max: 50,  unit: '/día' },
  { key: 'puntuacionAPGAR',         label: 'Puntuación APGAR',         max: 10,  unit: 'pts' },
];

const DEFAULT_FORM: FormState = {
  edadInicioEnDias: 0,
  duracionCrisisSegundos: 0,
  frecuenciaCrisisPorDia: 0,
  puntuacionAPGAR: 0,
  lateralizacionCrisis: 'unilateral',
  asociadoFiebre: false,
  complicacionPerinatal: false,
  regresionDesarrollo: false,
  tieneAntecedenteFamiliar: false,
  tieneCrisisClonicas: false,
  tieneCrisisTonicas: false,
  tieneEspasmos: false,
  tieneHipotonia: false,
  tieneMioclonias: false,
};

const GLOSSARY = [
  { term: 'Crisis epiléptica', def: 'Episodio transitorio de signos y/o síntomas debidos a actividad neuronal anormal excesiva o sincrónica en el cerebro. En neonatos puede manifestarse como movimientos sutiles, tónicos, clónicos, mioclónicos o espasmos.' },
  { term: 'Crisis tónica', def: 'Se caracteriza por rigidez o tensión muscular sostenida, generalmente de los miembros o del tronco. Puede ser unilateral o bilateral.' },
  { term: 'Crisis clónica', def: 'Movimientos rítmicos y repetitivos de uno o más grupos musculares. En neonatos suelen ser focales (un brazo, una pierna) y pueden migrar de un lado al otro.' },
  { term: 'Espasmos epilépticos', def: 'Contracciones bruscas y breves, generalmente en flexión o extensión del tronco y extremidades. Característicos de síndromes como el Síndrome de West.' },
  { term: 'Mioclonías', def: 'Sacudidas musculares breves, bruscas e involuntarias. Pueden ser focales, multifocales o generalizadas y no siempre son de origen epiléptico.' },
  { term: 'Hipotonía', def: 'Disminución del tono muscular. En el contexto neonatal puede ser un marcador de compromiso neurológico subyacente asociado a epilepsia.' },
  { term: 'Lateralización', def: 'Describe el hemisferio o lado del cuerpo donde se origina o predomina la crisis. Puede ser unilateral (un solo lado), bilateral (ambos lados) o migratoria (cambia de lado durante la crisis).' },
  { term: 'Síndrome epiléptico', def: 'Conjunto de características clínicas, electroencefalográficas y etiológicas que definen una entidad específica. La clasificación ILAE 2021 reconoce síndromes neonatales específicos como KCNQ2, CDKL5 y Ohtahara, entre otros.' },
  { term: 'APGAR', def: 'Escala de valoración del recién nacido al minuto y a los 5 minutos del nacimiento. Evalúa frecuencia cardíaca, respiración, tono muscular, reflejos y color. Una puntuación baja puede indicar asfixia perinatal, factor de riesgo para epilepsia neonatal.' },
  { term: 'ILAE', def: 'International League Against Epilepsy (Liga Internacional contra la Epilepsia). Organismo que establece la clasificación y terminología oficial de las epilepsias y crisis epilépticas a nivel mundial.' },
  { term: 'Complicación perinatal', def: 'Evento adverso ocurrido durante el embarazo, el parto o el período inmediatamente posterior al nacimiento que puede causar daño neurológico, como asfixia, infecciones o hemorragias intracraneales.' },
  { term: 'Regresión del desarrollo', def: 'Pérdida de habilidades previamente adquiridas (motoras, cognitivas o del lenguaje). En neonatos puede observarse como pérdida de reflejos normales o falta de progreso esperado.' },
];

type Tab = 'wizard' | 'cuestionario' | 'acerca' | 'glosario';

async function inferir(form: FormState): Promise<Result> {
  const res = await fetch(`${API_URL}/inferir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });
  return res.json();
}

function ResultBox({ result, onReset }: { result: Result; onReset: () => void }) {
  const urgenciaClass = result.urgencia && !result.error
    ? (URGENCIA_STYLE[result.urgencia] ?? 'border-gray-400 bg-gray-50 text-gray-900') : '';
  const diagLabel = result.diagnostico?.replace(/_Diagnostico$/, '').replace(/_/g, ' ') ?? '';

  return (
    <div className="space-y-4">
      {result.error ? (
        <div className="p-6 border-2 border-gray-300 bg-gray-50 rounded-2xl text-sm text-gray-700">
          <p className="font-semibold mb-1">Sin clasificación</p>
          <p>{result.error}</p>
        </div>
      ) : (
        <div className={`p-6 border-2 rounded-2xl ${urgenciaClass}`}>
          <h2 className="text-lg font-bold mb-4">Resultado de la inferencia</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex gap-2">
              <dt className="font-semibold w-28 shrink-0">Diagnóstico</dt>
              <dd className="font-mono">{diagLabel || result.diagnostico}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold w-28 shrink-0">Urgencia</dt>
              <dd>{result.urgencia ? (LABEL[result.urgencia] ?? result.urgencia) : '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold w-28 shrink-0">Pronóstico</dt>
              <dd>{result.pronostico ? (LABEL[result.pronostico] ?? result.pronostico) : '—'}</dd>
            </div>
          </dl>
        </div>
      )}
      <button onClick={onReset}
        className="w-full border border-gray-300 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50">
        Nueva consulta
      </button>
    </div>
  );
}

// ── Wizard por pasos ─────────────────────────────────────────────────────────
const WIZARD_STEPS = [
  { title: 'Datos del paciente' },
  { title: 'Tipo de crisis' },
  { title: 'Antecedentes clínicos' },
];

function WizardTab() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setInt = (key: keyof FormState, v: string) =>
    setForm(f => ({ ...f, [key]: parseInt(v, 10) || 0 }));
  const setBool = (key: keyof FormState, v: boolean) =>
    setForm(f => ({ ...f, [key]: v }));

  const submit = async () => {
    setLoading(true); setError(null);
    try { setResult(await inferir(form)); }
    catch { setError('No se pudo conectar con el servidor.'); }
    finally { setLoading(false); }
  };

  const reset = () => { setForm(DEFAULT_FORM); setStep(0); setResult(null); setError(null); };

  const sliderField = (key: keyof FormState) => {
    const f = INT_FIELDS.find(x => x.key === key)!;
    return (
      <div key={key}>
        <div className="flex justify-between text-sm mb-1">
          <label className="font-medium text-gray-700">{f.label}</label>
          <span className="text-blue-600 font-semibold">{form[key] as number} {f.unit}</span>
        </div>
        <input type="range" min={0} max={f.max} step={1}
          value={form[key] as number}
          onChange={e => setInt(key, e.target.value)}
          className="w-full accent-blue-600" />
      </div>
    );
  };

  const toggleField = (key: keyof FormState) => {
    const f = BOOL_FIELDS.find(x => x.key === key)!;
    return (
      <div key={key} className="flex items-center justify-between">
        <span className="text-sm text-gray-700">{f.label}</span>
        <button type="button" onClick={() => setBool(key, !(form[key] as boolean))}
          className={`relative w-11 h-6 rounded-full transition-colors ${form[key] ? 'bg-blue-600' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : ''}`} />
        </button>
      </div>
    );
  };

  if (result) return <ResultBox result={result} onReset={reset} />;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Paso {step + 1} de {WIZARD_STEPS.length}</span>
          <span>{WIZARD_STEPS[step].title}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full">
          <div className="h-1.5 bg-blue-600 rounded-full transition-all"
            style={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%` }} />
        </div>
      </div>

      <h2 className="text-base font-semibold text-gray-800">{WIZARD_STEPS[step].title}</h2>

      <div className="space-y-5">
        {step === 0 && (
          <>
            {sliderField('edadInicioEnDias')}
            {sliderField('duracionCrisisSegundos')}
            {sliderField('frecuenciaCrisisPorDia')}
            {sliderField('puntuacionAPGAR')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lateralización</label>
              <div className="flex gap-2">
                {['unilateral', 'bilateral', 'migratoria'].map(v => (
                  <button key={v} type="button"
                    onClick={() => setForm(f => ({ ...f, lateralizacionCrisis: v }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.lateralizacionCrisis === v
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {step === 1 && ['tieneCrisisClonicas', 'tieneCrisisTonicas', 'tieneEspasmos', 'tieneHipotonia', 'tieneMioclonias'].map(k => toggleField(k as keyof FormState))}
        {step === 2 && ['asociadoFiebre', 'complicacionPerinatal', 'regresionDesarrollo', 'tieneAntecedenteFamiliar'].map(k => toggleField(k as keyof FormState))}
      </div>

      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
            Atrás
          </button>
        )}
        {step < WIZARD_STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold">
            Siguiente
          </button>
        ) : (
          <button onClick={submit} disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold">
            {loading ? 'Analizando…' : 'Inferir diagnóstico'}
          </button>
        )}
      </div>
      {error && <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-sm text-red-700">{error}</div>}
    </div>
  );
}

// ── Cuestionario Sí/No ───────────────────────────────────────────────────────
const QUESTIONS: { key: keyof FormState; question: string }[] = [
  { key: 'tieneCrisisTonicas',       question: '¿El paciente presenta crisis tónicas (rigidez muscular)?' },
  { key: 'tieneCrisisClonicas',      question: '¿Presenta movimientos clónicos (sacudidas rítmicas)?' },
  { key: 'tieneEspasmos',            question: '¿Se han observado espasmos epilépticos?' },
  { key: 'tieneMioclonias',          question: '¿Presenta mioclonías (sacudidas breves y bruscas)?' },
  { key: 'tieneHipotonia',           question: '¿Hay hipotonía generalizada?' },
  { key: 'asociadoFiebre',           question: '¿Las crisis están asociadas a fiebre?' },
  { key: 'complicacionPerinatal',    question: '¿Hubo complicación perinatal (asfixia, infección, etc.)?' },
  { key: 'regresionDesarrollo',      question: '¿Se observa regresión en el desarrollo?' },
  { key: 'tieneAntecedenteFamiliar', question: '¿Existe antecedente familiar de epilepsia neonatal?' },
];

function CuestionarioTab() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [qIdx, setQIdx] = useState(-1);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setInt = (key: keyof FormState, v: string) =>
    setForm(f => ({ ...f, [key]: parseInt(v, 10) || 0 }));

  const answer = (val: boolean) => {
    const updated = { ...form, [QUESTIONS[qIdx].key]: val };
    setForm(updated);
    if (qIdx < QUESTIONS.length - 1) {
      setQIdx(i => i + 1);
    } else {
      submit(updated);
    }
  };

  const submit = async (finalForm: FormState) => {
    setLoading(true); setError(null);
    try { setResult(await inferir(finalForm)); }
    catch { setError('No se pudo conectar con el servidor.'); }
    finally { setLoading(false); }
  };

  const reset = () => { setForm(DEFAULT_FORM); setQIdx(-1); setResult(null); setError(null); };

  const progress = qIdx === -1 ? 0 : ((qIdx + 1) / QUESTIONS.length) * 100;

  if (result) return <ResultBox result={result} onReset={reset} />;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{qIdx === -1 ? 'Datos iniciales' : `Pregunta ${qIdx + 1} de ${QUESTIONS.length}`}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full">
          <div className="h-1.5 bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {qIdx === -1 && (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Datos del paciente</h2>
          {INT_FIELDS.map(({ key, label, max, unit }) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <label className="font-medium text-gray-700">{label}</label>
                <span className="text-blue-600 font-semibold">{form[key] as number} {unit}</span>
              </div>
              <input type="range" min={0} max={max} step={1}
                value={form[key] as number}
                onChange={e => setInt(key, e.target.value)}
                className="w-full accent-blue-600" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lateralización de crisis</label>
            <div className="flex gap-2">
              {['unilateral', 'bilateral', 'migratoria'].map(v => (
                <button key={v} type="button"
                  onClick={() => setForm(f => ({ ...f, lateralizacionCrisis: v }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.lateralizacionCrisis === v
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setQIdx(0)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl">
            Continuar
          </button>
        </div>
      )}

      {qIdx >= 0 && !loading && (
        <div className="space-y-8">
          <p className="text-lg font-medium text-gray-800 leading-snug text-center">
            {QUESTIONS[qIdx].question}
          </p>
          <div className="flex gap-4">
            <button onClick={() => answer(false)}
              className="flex-1 py-5 rounded-2xl border-2 border-red-300 text-red-600 font-bold text-xl hover:bg-red-50 transition-colors">
              No
            </button>
            <button onClick={() => answer(true)}
              className="flex-1 py-5 rounded-2xl border-2 border-green-400 text-green-700 font-bold text-xl hover:bg-green-50 transition-colors">
              Sí
            </button>
          </div>
          {qIdx > 0 && (
            <button onClick={() => setQIdx(i => i - 1)}
              className="w-full text-sm text-gray-400 hover:text-gray-600">
              ← Pregunta anterior
            </button>
          )}
        </div>
      )}

      {loading && <p className="text-center text-gray-500 py-8">Analizando…</p>}
      {error && <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-sm text-red-700">{error}</div>}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
type TabDef = { id: Tab; label: string };

const TABS: TabDef[] = [
  { id: 'wizard',       label: 'Por pasos' },
  { id: 'cuestionario', label: 'Cuestionario' },
  { id: 'acerca',       label: 'Acerca del sistema' },
  { id: 'glosario',     label: 'Glosario clínico' },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>('wizard');

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
      tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">CDSS — Epilepsia Neonatal</h1>
          <p className="text-gray-500 mt-1 text-sm">Sistema de apoyo diagnóstico para síndromes epilépticos neonatales</p>
        </div>

        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} className={tabClass(t.id)} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'wizard'       && <WizardTab />}
        {tab === 'cuestionario' && <CuestionarioTab />}

        {tab === 'acerca' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6 text-sm text-gray-700">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">¿Qué es este sistema?</h2>
              <p className="text-justify">El <strong>Sistema de Apoyo a la Decisión Clínica (CDSS)</strong> para epilepsia neonatal es una herramienta de apoyo diagnóstico diseñada para asistir a médicos generales y de primer contacto en la identificación temprana de síndromes epilépticos en recién nacidos.</p>
              <p className="text-justify">El sistema no reemplaza el juicio clínico del médico; su propósito es reducir los tiempos de atención y orientar la derivación oportuna al especialista, mejorando el pronóstico del paciente neonatal.</p>
            </section>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Base clínica</h2>
              <p className="text-justify">La clasificación está fundamentada en la <strong>Clasificación Operacional de Tipos de Crisis de la ILAE 2017</strong> y en la propuesta de clasificación de síndromes epilépticos neonatales de la <strong>Liga Internacional contra la Epilepsia (ILAE) 2021</strong>, que establece criterios diagnósticos basados en edad de inicio, tipo de crisis, etiología y características electroclínicas.</p>
            </section>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">¿A quién está dirigido?</h2>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Médicos generales y de primer contacto</li>
                <li>Médicos en áreas de urgencias pediátricas o neonatales</li>
                <li>Personal de salud en entornos con acceso limitado a neurología pediátrica</li>
              </ul>
            </section>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Tecnología</h2>
              <p className="text-justify">El motor de inferencia está basado en un sistema experto implementado con <strong>Drools</strong> (motor de reglas en Java) y una ontología OWL que representa el conocimiento clínico. El razonamiento sigue las reglas definidas por especialistas en neurología pediátrica y la clasificación ILAE vigente.</p>
            </section>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Contexto académico</h2>
              <p className="text-justify">Este sistema fue desarrollado como parte de una tesis de <strong>Maestría en Ciencias e Ingeniería de Datos</strong> de la Universidad Autónoma de Tamaulipas (UAT).</p>
            </section>
            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100 text-justify">Este sistema es únicamente una herramienta de apoyo. El diagnóstico definitivo debe ser realizado por un médico especialista.</p>
          </div>
        )}

        {tab === 'glosario' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-4">
            <p className="text-sm text-gray-500">Terminología clínica básica utilizada en el contexto de epilepsia neonatal.</p>
            <dl className="space-y-5">
              {GLOSSARY.map(({ term, def }) => (
                <div key={term} className="border-b border-gray-100 pb-4 last:border-0">
                  <dt className="font-semibold text-gray-900 text-sm mb-1">{term}</dt>
                  <dd className="text-sm text-gray-600 leading-relaxed text-justify">{def}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

      </div>
    </main>
  );
}
