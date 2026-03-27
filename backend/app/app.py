import json
import os
import subprocess

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Configurable via env vars for Railway deployment
JAR_PATH = os.environ.get(
    "DROOLS_JAR",
    os.path.join(BASE_DIR, "..", "drools-engine", "target", "drools-engine.jar"),
)
OWL_PATH = os.environ.get(
    "OWL_PATH",
    os.path.join(BASE_DIR, "ontologia", "clase_temporal.rdf"),
)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/inferir", methods=["POST"])
def inferir():
    data = request.get_json(force=True)

    try:
        # Build CLI args in exact order expected by DroolsEngine.java:
        # args[0]=owl_path, args[1..4]=ints, args[5]=string, args[6..14]=booleans
        def b(key):
            return str(bool(data[key])).lower()  # True -> "true", False -> "false"

        cmd = [
            "java", "-jar", os.path.abspath(JAR_PATH),
            os.path.abspath(OWL_PATH),
            str(int(data["edadInicioEnDias"])),
            str(int(data["duracionCrisisSegundos"])),
            str(int(data["frecuenciaCrisisPorDia"])),
            str(int(data["puntuacionAPGAR"])),
            str(data["lateralizacionCrisis"]),
            b("asociadoFiebre"),
            b("complicacionPerinatal"),
            b("regresionDesarrollo"),
            b("tieneAntecedenteFamiliar"),
            b("tieneCrisisClonicas"),
            b("tieneCrisisTonicas"),
            b("tieneEspasmos"),
            b("tieneHipotonia"),
            b("tieneMioclonias"),
        ]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        stdout = proc.stdout.strip()
        if not stdout:
            return jsonify({
                "error": "Sin respuesta del motor de inferencia",
                "stderr": proc.stderr[-500:] if proc.stderr else "",
            }), 500

        result = json.loads(stdout)

        # Fallback: no rule fired -> No_Clasificado
        if "error" in result:
            result = {
                "diagnostico": "No_Clasificado",
                "urgencia": "Urgencia_Media",
                "pronostico": "",
            }

        return jsonify(result)

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Tiempo de espera agotado en el motor de inferencia"}), 504
    except KeyError as e:
        return jsonify({"error": f"Variable faltante en la solicitud: {e}"}), 400
    except json.JSONDecodeError:
        return jsonify({"error": "Respuesta inesperada del motor", "raw": stdout}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
