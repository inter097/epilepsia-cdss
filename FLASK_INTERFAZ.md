# ============================================================
# Prototipo de interfaz web — Sistema de Apoyo Diagnóstico
# Basado en ontología OWL/SWRL para síndromes epilépticos neonatales
# Autor: José Eliuth Torres Ortiz
# Motor de inferencia: Drools (reglas SWRL con built-ins numéricos)
# Backend: Flask + owlready2
# Frontend final: Next.js + Tailwind + TypeScript → Vercel
# Backend final: Flask + owlready2 + Drools → Railway
# Fase IV — Implementación
# ============================================================

# ------------------------------------------------------------
# CONSTANTES — Extraídas del .owl (clase_temporal.rdf)
# Namespace: http://www.semanticweb.org/eliut/ontologies/2026/1/untitled-ontology-103#
# ------------------------------------------------------------

# DATA PROPERTIES de Paciente (14 exactas en el .owl)
# Nombre                  | Tipo xsd      | Usado en regla
# ----------------------- | ------------- | ---------------
# edadInicioEnDias        | xsd:integer   | SeLNE, SeLNIE, SeLIE, EIDEE, IESS, EIMFS, Dravet, MEI
# duracionCrisisSegundos  | xsd:integer   | Dravet
# frecuenciaCrisisPorDia  | xsd:integer   | (no usado en reglas de diagnóstico actuales)
# puntuacionAPGAR         | xsd:integer   | (no usado en reglas de diagnóstico actuales)
# lateralizacionCrisis    | xsd:string    | (no usado en reglas de diagnóstico actuales)
# asociadoFiebre          | xsd:boolean   | Dravet
# complicacionPerinatal   | xsd:boolean   | (obsoleto en EIDEE — reemplazado por regresionDesarrollo)
# regresionDesarrollo     | xsd:boolean   | SeLNIE, SeLIE, EIDEE, IESS, EIMFS, MEI
# tieneAntecedenteFamiliar| xsd:boolean   | SeLNE, SeLNIE, SeLIE, EIMFS
# tieneCrisisClonicas     | xsd:boolean   | SeLNE, SeLNIE, SeLIE, EIMFS, Dravet
# tieneCrisisTonicas      | xsd:boolean   | EIDEE, EIMFS
# tieneEspasmos           | xsd:boolean   | IESS
# tieneHipotonia          | xsd:boolean   | SeLIE, EIDEE, IESS, EIMFS, MEI
# tieneMioclonias         | xsd:boolean   | MEI

# INDIVIDUOS — tieneDiagnostico (8 valores posibles)
# Dravet_Diagnostico
# EIDEE_Diagnostico
# EIMFS_Diagnostico
# IESS_Diagnostico
# MEI_Diagnostico
# SeLIE_Diagnostico
# SeLNE_Diagnostico
# SeLNIE_Diagnostico

# INDIVIDUOS — tieneNivelUrgencia (3 valores posibles)
# Urgencia_Alta
# Urgencia_Media
# Urgencia_Baja

# INDIVIDUOS — tienePronostico (3 valores posibles)
# Pronostico_Favorable
# Pronostico_Reservado
# Pronostico_Grave

# NOTA: tieneApnea y patronMigratorio NO existen como DatatypeProperty
# en la ontología — no deben usarse como variables de entrada.

---

## 1. Arquitectura General

```
[Next.js — Vercel]  <-->  [Flask — Railway]  <-->  [Drools .jar + OWL]
```

- **Next.js**: formulario de captura de variables clínicas y visualización de resultados
- **Flask**: API REST que recibe variables, construye individuo en ABox, llama a Drools vía subprocess
- **Drools .jar**: ejecuta las 24 reglas SWRL (con built-ins numéricos) sobre el individuo
- **owlready2**: carga la ontología OWL para estructura y consultas SPARQL auxiliares

---

## 2. Variables de Entrada (14 — verificadas contra .owl)

| Variable | Tipo | Usado en diagnóstico |
|----------|------|----------------------|
| `edadInicioEnDias` | Integer | Todos los síndromes |
| `duracionCrisisSegundos` | Integer | Dravet |
| `frecuenciaCrisisPorDia` | Integer | No usado actualmente |
| `puntuacionAPGAR` | Integer | No usado actualmente |
| `lateralizacionCrisis` | String | No usado actualmente |
| `asociadoFiebre` | Boolean | Dravet |
| `complicacionPerinatal` | Boolean | Obsoleto en EIDEE |
| `regresionDesarrollo` | Boolean | SeLNIE, SeLIE, EIDEE, IESS, EIMFS, MEI |
| `tieneAntecedenteFamiliar` | Boolean | SeLNE, SeLNIE, SeLIE, EIMFS |
| `tieneCrisisClonicas` | Boolean | SeLNE, SeLNIE, SeLIE, EIMFS, Dravet |
| `tieneCrisisTonicas` | Boolean | EIDEE, EIMFS |
| `tieneEspasmos` | Boolean | IESS |
| `tieneHipotonia` | Boolean | SeLIE, EIDEE, IESS, EIMFS, MEI |
| `tieneMioclonias` | Boolean | MEI |

---

## 3. Salidas del Sistema (individuos exactos del .owl)

| Propiedad | Valores posibles |
|-----------|-----------------|
| `tieneDiagnostico` | `Dravet_Diagnostico`, `EIDEE_Diagnostico`, `EIMFS_Diagnostico`, `IESS_Diagnostico`, `MEI_Diagnostico`, `SeLIE_Diagnostico`, `SeLNE_Diagnostico`, `SeLNIE_Diagnostico` |
| `tieneNivelUrgencia` | `Urgencia_Alta`, `Urgencia_Media`, `Urgencia_Baja` |
| `tienePronostico` | `Pronostico_Favorable`, `Pronostico_Reservado`, `Pronostico_Grave` |

---

## 4. Manejo de Casos No Clasificados (Fallback)

SWRL opera bajo Open World Assumption — no puede expresar "si no tiene diagnóstico".
La detección del caso no clasificado se maneja en Flask:

```python
# Pseudocódigo — lógica de fallback en Flask
resultado = ejecutar_drools(variables_paciente)

hay_crisis = any([
    variables_paciente.get("tieneCrisisClonicas"),
    variables_paciente.get("tieneCrisisTonicas"),
    variables_paciente.get("tieneEspasmos"),
    variables_paciente.get("tieneMioclonias"),
])

if resultado.get("diagnostico") is None and hay_crisis:
    respuesta = {
        "diagnostico": "No_Clasificado",
        "urgencia": "Urgencia_Alta",
        "pronostico": "Pronostico_Reservado",
        "mensaje": "El perfil clínico no corresponde a ningún síndrome ILAE 2022 modelado. Derivar a neurología pediátrica."
    }
elif resultado.get("diagnostico") is None and not hay_crisis:
    respuesta = {
        "diagnostico": None,
        "mensaje": "El paciente no presenta variables de crisis. No aplica inferencia sindróminca."
    }
else:
    respuesta = resultado
```

---

## 5. Endpoints Flask

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/inferir` | Recibe JSON con variables clínicas, ejecuta Drools, devuelve diagnóstico + urgencia + pronóstico |
| `GET` | `/sindromes` | Lista los 8 síndromes con descripción clínica |
| `GET` | `/health` | Estado del servicio |

### Request (POST /inferir)

```json
{
  "edadInicioEnDias": 45,
  "tieneCrisisClonicas": true,
  "tieneAntecedenteFamiliar": true,
  "regresionDesarrollo": false,
  "tieneHipotonia": false,
  "tieneEspasmos": false,
  "tieneMioclonias": false,
  "tieneCrisisTonicas": false,
  "asociadoFiebre": false,
  "duracionCrisisSegundos": 120
}
```

### Response exitoso

```json
{
  "diagnostico": "SeLNIE_Diagnostico",
  "urgencia": "Urgencia_Media",
  "pronostico": "Pronostico_Favorable",
  "mensaje": null
}
```

### Response no clasificado

```json
{
  "diagnostico": "No_Clasificado",
  "urgencia": "Urgencia_Alta",
  "pronostico": "Pronostico_Reservado",
  "mensaje": "El perfil clínico no corresponde a ningún síndrome ILAE 2022 modelado. Derivar a neurología pediátrica."
}
```

---

## 6. Integración Flask → Drools

Flask llama al `.jar` via subprocess:

```python
# Pseudocódigo
import subprocess, json

def ejecutar_drools(variables: dict) -> dict:
    entrada = json.dumps(variables)
    resultado = subprocess.run(
        ["java", "-jar", "drools/epilepsia-cdss.jar"],
        input=entrada,
        capture_output=True,
        text=True
    )
    return json.loads(resultado.stdout)
```

---

## 7. Pendientes de Implementación

- [ ] Construir Drools `.jar` (ver ARQUITECTURA.md → sección Drools)
- [ ] Configurar entorno Flask + dependencias
- [ ] Implementar endpoint `POST /inferir`
- [ ] Implementar fallback casos no clasificados
- [ ] Implementar endpoint `GET /sindromes`
- [ ] Implementar endpoint `GET /health`
- [ ] Diseñar formulario Next.js con las 14 variables
- [ ] Conectar frontend con backend
- [ ] Deploy frontend → Vercel
- [ ] Deploy backend → Railway

---

## 8. Nota Académica

El sistema no implementa la detección de casos no clasificados a nivel de inferencia
ontológica, dado que SWRL opera bajo Open World Assumption y no soporta
negación-as-failure. Esta limitación es inherente al paradigma OWL/SWRL y se
resuelve en la capa Flask, donde se verifica la ausencia de `tieneDiagnostico`
tras la ejecución de Drools. Esta decisión es metodológicamente coherente con
la separación de responsabilidades entre modelo de conocimiento y lógica de presentación.
