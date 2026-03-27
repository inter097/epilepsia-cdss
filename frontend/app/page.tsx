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

export default function Home() {
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

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">CDSS — Epilepsia Neonatal</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Sistema de apoyo diagnóstico para síndromes epilépticos neonatales
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8"
        >
          {/* Integer inputs */}
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

          {/* Lateralización */}
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

          {/* Boolean checkboxes */}
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

        {/* Connection error */}
        {fetchError && (
          <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {/* Successful result */}
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

        {/* Fallback / no rule fired */}
        {result?.error && (
          <div className="p-6 border-2 border-gray-300 bg-gray-50 rounded-2xl text-sm text-gray-700">
            <p className="font-semibold mb-1">Sin clasificación</p>
            <p>{result.error}</p>
          </div>
        )}

      </div>
    </main>
  );
}
