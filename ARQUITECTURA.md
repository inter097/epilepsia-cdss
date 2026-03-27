# Arquitectura del Sistema de Apoyo Diagnóstico — Síndromes Epilépticos Neonatales

## Decisiones técnicas acordadas

### Stack final

| Capa | Tecnología | Despliegue |
|---|---|---|
| Frontend | Next.js + Tailwind CSS + TypeScript | Vercel |
| Backend | Flask + owlready2 | Railway |
| Motor de inferencia | Drools vía subprocess (.jar) | Railway (mismo servidor) |
| Ontología | OWL/SWRL — Protégé | Cargada por owlready2 en backend |

### ¿Por qué este stack?

- Next.js se despliega en Vercel nativamente con un click
- Drools es el único motor open source que ejecuta built-ins numéricos SWRL (`greaterThanOrEqual`, `lessThanOrEqual`) de forma confiable
- owlready2 carga el `.owl` directamente desde Python sin configuración extra
- owlready2 solo **NO puede** ejecutar las 8 reglas de diagnóstico (usan built-ins numéricos) — Drools es obligatorio
- Fuseki, Jena y owlready2 solos fueron descartados por no soportar built-ins numéricos de forma estable
- Jess fue descartado por licencia comercial
- if/else en Python fue descartado por debilitar la contribución académica de la tesis

---

## Flujo completo

```
Dr. General
↓ llena formulario (14 variables clínicas)
Next.js (Vercel)
↓ POST /inferir → JSON
Flask (Railway)
↓ owlready2 carga ontología
↓ subprocess llama a Drools (.jar)
Drools ejecuta 24 reglas SWRL
↓ stdout JSON → Flask parsea resultado
Flask aplica lógica fallback si no hay diagnóstico
↓ JSON de respuesta
Next.js muestra: diagnóstico + urgencia + pronóstico
```

---

## Variables de entrada (14 — verificadas contra .owl)

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `edadInicioEnDias` | xsd:integer | Días de vida al inicio de la primera crisis |
| `duracionCrisisSegundos` | xsd:integer | Duración promedio del episodio |
| `frecuenciaCrisisPorDia` | xsd:integer | Número de crisis por día |
| `puntuacionAPGAR` | xsd:integer | Puntuación APGAR al nacimiento |
| `lateralizacionCrisis` | xsd:string | Lateralización de la crisis |
| `asociadoFiebre` | xsd:boolean | Crisis precipitadas por fiebre |
| `complicacionPerinatal` | xsd:boolean | Complicación perinatal documentada |
| `regresionDesarrollo` | xsd:boolean | Pérdida de hitos del desarrollo |
| `tieneAntecedenteFamiliar` | xsd:boolean | Epilepsia neonatal en familiar de 1.er grado |
| `tieneCrisisClonicas` | xsd:boolean | Crisis clónicas presentes |
| `tieneCrisisTonicas` | xsd:boolean | Crisis tónicas presentes |
| `tieneEspasmos` | xsd:boolean | Espasmos epilépticos presentes |
| `tieneHipotonia` | xsd:boolean | Hipotonía generalizada |
| `tieneMioclonias` | xsd:boolean | Mioclonías presentes |

> `tieneApnea` y `patronMigratorio` NO existen en el .owl — no se usan.

---

## Salidas del sistema (verificadas contra .owl)

| Propiedad | Valores posibles |
|---|---|
| `tieneDiagnostico` | `Dravet_Diagnostico`, `EIDEE_Diagnostico`, `EIMFS_Diagnostico`, `IESS_Diagnostico`, `MEI_Diagnostico`, `SeLIE_Diagnostico`, `SeLNE_Diagnostico`, `SeLNIE_Diagnostico` |
| `tieneNivelUrgencia` | `Urgencia_Alta`, `Urgencia_Media`, `Urgencia_Baja` |
| `tienePronostico` | `Pronostico_Favorable`, `Pronostico_Reservado`, `Pronostico_Grave` |

---

## Reglas SWRL (24 total — en clase_temporal.rdf)

- **8 reglas de diagnóstico** → requieren Drools (usan built-ins numéricos `swrlb:greaterThanOrEqual`, `swrlb:lessThanOrEqual`, `swrlb:greaterThan`)
- **8 reglas de urgencia** → encadenadas sobre `tieneDiagnostico`
- **8 reglas de pronóstico** → encadenadas sobre `tieneDiagnostico`

---

## Motores descartados y razón

| Motor | Razón de descarte |
|---|---|
| owlready2 solo | No ejecuta built-ins numéricos SWRL |
| Fuseki + openllet | StackOverflow con built-ins numéricos |
| Jena | Soporte SWRL built-ins parcial e inestable |
| Jess | Licencia comercial |
| if/else Python | Debilita contribución académica de la tesis |

---

## Drools .jar — Cómo construirlo

### Qué es y por qué un .jar

Drools es un motor de reglas Java. Para usarlo desde Flask (Python), se empaqueta como un archivo `.jar` ejecutable que:
1. Recibe las variables del paciente por `stdin` como JSON
2. Ejecuta las 24 reglas SWRL contra esas variables
3. Devuelve el diagnóstico, urgencia y pronóstico por `stdout` como JSON

Flask lo llama con `subprocess.run(["java", "-jar", "epilepsia-cdss.jar"])`.

### Requisitos previos

1. **Java JDK 11 o superior** — descarga desde: https://adoptium.net
   - Verifica con: `java -version`
2. **Maven** — descarga desde: https://maven.apache.org/download.cgi
   - Verifica con: `mvn -version`

### Estructura del proyecto Drools

```
backend/drools/
├── pom.xml                          ← configuración Maven (dependencias Drools)
└── src/main/java/mx/uat/epilepsia/
    ├── Main.java                    ← entry point: lee stdin JSON, llama motor, escribe stdout JSON
    ├── InferenceEngine.java         ← carga reglas y ejecuta inferencia
    └── PacienteInput.java           ← modelo de datos de entrada
```

### Pasos para construir el .jar

```bash
# 1. Ir a la carpeta del proyecto Drools
cd epilepsia-cdss/backend/drools

# 2. Construir el .jar con Maven
mvn clean package

# 3. El .jar queda en:
# target/epilepsia-cdss-1.0.jar

# 4. Probar manualmente:
echo '{"edadInicioEnDias": 5, "tieneCrisisClonicas": true, "tieneAntecedenteFamiliar": true}' | java -jar target/epilepsia-cdss-1.0.jar
```

> Claude Code creará todos los archivos Java y el pom.xml — tú solo ejecutas `mvn clean package`.

---

## Estructura del repositorio

```
epilepsia-cdss/
├── ARQUITECTURA.md          ← este archivo
├── frontend/                ← Next.js + Tailwind + TypeScript
│   └── (inicializar con: npx create-next-app@latest)
├── backend/
│   ├── app/                 ← Flask
│   │   ├── app.py           ← entry point Flask
│   │   ├── requirements.txt
│   │   └── ontologia/       ← copia de clase_temporal.rdf
│   └── drools/              ← proyecto Maven para el .jar
│       ├── pom.xml
│       └── src/
└── ontologia/               ← fuente de verdad del .owl
```

---

## Repositorio

- Repo: `epilepsia-cdss/` en `C:\Users\eliut\OneDrive\Escritorio\Maestria\`
- Estructura: `frontend/` (Next.js → Vercel) + `backend/` (Flask + Drools → Railway)

---

## Pendientes de implementación

- [ ] Crear archivos Java + pom.xml del proyecto Drools
- [ ] Ejecutar `mvn clean package` para construir el .jar
- [ ] Probar el .jar manualmente con los 8 pacientes de referencia
- [ ] Implementar `backend/app/app.py` con Flask
- [ ] Inicializar frontend con `create-next-app`
- [ ] Implementar formulario con las 14 variables
- [ ] Implementar endpoint `POST /inferir`
- [ ] Implementar fallback "No_Clasificado"
- [ ] Desplegar frontend en Vercel
- [ ] Desplegar backend en Railway
- [ ] Conectar frontend con backend en producción
