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

const INT_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: 'edadInicioEnDias',        label: 'Edad de inicio de crisis (días)' },
  { key: 'duracionCrisisSegundos',  label: 'Duración promedio de crisis (seg)' },
  { key: 'frecuenciaCrisisPorDia',  label: 'Frecuencia de crisis por día' },
  { key: 'puntuacionAPGAR',         label: 'Puntuación APGAR al nacimiento' },
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
  {
    term: 'Crisis epiléptica',
    def: 'Episodio transitorio de signos y/o síntomas debidos a actividad neuronal anormal excesiva o sincrónica en el cerebro. En neonatos puede manifestarse como movimientos sutiles, tónicos, clónicos, mioclónicos o espasmos.',
  },
  {
    term: 'Crisis tónica',
    def: 'Se caracteriza por rigidez o tensión muscular sostenida, generalmente de los miembros o del tronco. Puede ser unilateral o bilateral.',
  },
  {
    term: 'Crisis clónica',
    def: 'Movimientos rítmicos y repetitivos de uno o más grupos musculares. En neonatos suelen ser focales (un brazo, una pierna) y pueden migrar de un lado al otro.',
  },
  {
    term: 'Espasmos epilépticos',
    def: 'Contracciones bruscas y breves, generalmente en flexión o extensión del tronco y extremidades. Característicos de síndromes como el Síndrome de West.',
  },
  {
    term: 'Mioclonías',
    def: 'Sacudidas musculares breves, bruscas e involuntarias. Pueden ser focales, multifocales o generalizadas y no siempre son de origen epiléptico.',
  },
  {
    term: 'Hipotonía',
    def: 'Disminución del tono muscular. En el contexto neonatal puede ser un marcador de compromiso neurológico subyacente asociado a epilepsia.',
  },
  {
    term: 'Lateralización',
    def: 'Describe el hemisferio o lado del cuerpo donde se origina o predomina la crisis. Puede ser unilateral (un solo lado), bilateral (ambos lados) o migratoria (cambia de lado durante la crisis).',
  },
  {
    term: 'Síndrome epiléptico',
    def: 'Conjunto de características clínicas, electroencefalográficas y etiológicas que definen una entidad específica. La clasificación ILAE 2021 reconoce síndromes neonatales específicos como KCNQ2, CDKL5 y Ohtahara, entre otros.',
  },
  {
    term: 'APGAR',
    def: 'Escala de valoración del recién nacido al minuto y a los 5 minutos del nacimiento. Evalúa frecuencia cardíaca, respiración, tono muscular, reflejos y color. Una puntuación baja puede indicar asfixia perinatal, factor de riesgo para epilepsia neonatal.',
  },
  {
    term: 'ILAE',
    def: 'International League Against Epilepsy (Liga Internacional contra la Epilepsia). Organismo que establece la clasificación y terminología oficial de las epilepsias y crisis epilépticas a nivel mundial.',
  },
  {
    term: 'Complicación perinatal',
    def: 'Evento adverso ocurrido durante el embarazo, el parto o el período inmediatamente posterior al nacimiento que puede causar daño neurológico, como asfixia, infecciones o hemorragias intracraneales.',
  },
  {
    term: 'Regresión del desarrollo',
    def: 'Pérdida de habilidades previamente adquiridas (motoras, cognitivas o del lenguaje). En neonatos puede observarse como pérdida de reflejos normales o falta de progreso esperado.',
  },
];

type Tab = 'diagnostico' | 'acerca' | 'glosario';

export default function Home() {
  const [tab, setTab] = useState<Tab>('diagnostico');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const setInt = (key: keyof FormState, raw: string) =>
    setForm(f => ({ ...f, [key]: raw === '' ? 0 : parseInt(raw, 10) }));

  const setBool = (key: keyof FormState, checked: boolean) =>
    setForm(f => ({ ...f, [key]: checked }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFetchError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/inferir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setResult(await res.json());
    } catch {
      setFetchError('No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.');
    } finally {
      setLoading(false);
    }
  };

  const urgenciaClass =
    result?.urgencia && !result.error
      ? (URGENCIA_STYLE[result.urgencia] ?? 'border-gray-400 bg-gray-50 text-gray-900')
      : '';

  const diagLabel =
    result?.diagnostico?.replace(/_Diagnostico$/, '').replace(/_/g, ' ') ?? '';

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      tab === t
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">CDSS — Epilepsia Neonatal</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Sistema de apoyo diagnóstico para síndromes epilépticos neonatales
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          <button className={tabClass('diagnostico')} onClick={() => setTab('diagnostico')}>
            Diagnóstico
          </button>
          <button className={tabClass('acerca')} onClick={() => setTab('acerca')}>
            Acerca del sistema
          </button>
          <button className={tabClass('glosario')} onClick={() => setTab('glosario')}>
            Glosario clínico
          </button>
        </div>

        {/* Tab: Diagnóstico */}
        {tab === 'diagnostico' && (
          <>
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8"
            >
              <fieldset>
                <legend className="text-base font-semibold text-gray-800 mb-4">
                  Variables cuantitativas
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {INT_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        type="number"
                        min={0}
                        value={form[key] as number}
                        onChange={e => setInt(key, e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-base font-semibold text-gray-800 mb-4">
                  Lateralización de crisis
                </legend>
                <select
                  value={form.lateralizacionCrisis}
                  onChange={e => setForm(f => ({ ...f, lateralizacionCrisis: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unilateral">Unilateral</option>
                  <option value="bilateral">Bilateral</option>
                  <option value="migratoria">Migratoria</option>
                </select>
              </fieldset>

              <fieldset>
                <legend className="text-base font-semibold text-gray-800 mb-4">
                  Variables cualitativas
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BOOL_FIELDS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[key] as boolean}
                        onChange={e => setBool(key, e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Analizando…' : 'Inferir diagnóstico'}
              </button>
            </form>

            {fetchError && (
              <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-sm text-red-700">
                {fetchError}
              </div>
            )}

            {result && !result.error && (
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

            {result?.error && (
              <div className="p-6 border-2 border-gray-300 bg-gray-50 rounded-2xl text-sm text-gray-700">
                <p className="font-semibold mb-1">Sin clasificación</p>
                <p>{result.error}</p>
              </div>
            )}
          </>
        )}

        {/* Tab: Acerca del sistema */}
        {tab === 'acerca' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6 text-sm text-gray-700">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">¿Qué es este sistema?</h2>
              <p className="text-justify">
                El <strong>Sistema de Apoyo a la Decisión Clínica (CDSS)</strong> para epilepsia neonatal
                es una herramienta de apoyo diagnóstico diseñada para asistir a médicos generales y de
                primer contacto en la identificación temprana de síndromes epilépticos en recién nacidos.
              </p>
              <p className="text-justify">
                El sistema no reemplaza el juicio clínico del médico; su propósito es reducir los
                tiempos de atención y orientar la derivación oportuna al especialista, mejorando el
                pronóstico del paciente neonatal.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Base clínica</h2>
              <p className="text-justify">
                La clasificación está fundamentada en la{' '}
                <strong>Clasificación Operacional de Tipos de Crisis de la ILAE 2017</strong> y en la
                propuesta de clasificación de síndromes epilépticos neonatales de la{' '}
                <strong>Liga Internacional contra la Epilepsia (ILAE) 2021</strong>, que establece
                criterios diagnósticos basados en edad de inicio, tipo de crisis, etiología y
                características electroclínicas.
              </p>
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
              <p className="text-justify">
                El motor de inferencia está basado en un sistema experto implementado con{' '}
                <strong>Drools</strong> (motor de reglas en Java) y una ontología OWL que representa
                el conocimiento clínico. El razonamiento sigue las reglas definidas por especialistas
                en neurología pediátrica y la clasificación ILAE vigente.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Contexto académico</h2>
              <p className="text-justify">
                Este sistema fue desarrollado como parte de una tesis de{' '}
                <strong>Maestría en Ciencias e Ingeniería de Datos</strong> de la Universidad
                Autónoma de Tamaulipas (UAT).
              </p>
            </section>

            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100 text-justify">
              Este sistema es únicamente una herramienta de apoyo. El diagnóstico definitivo debe
              ser realizado por un médico especialista.
            </p>
          </div>
        )}

        {/* Tab: Glosario clínico */}
        {tab === 'glosario' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-4">
            <p className="text-sm text-gray-500">
              Terminología clínica básica utilizada en el contexto de epilepsia neonatal.
            </p>
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
