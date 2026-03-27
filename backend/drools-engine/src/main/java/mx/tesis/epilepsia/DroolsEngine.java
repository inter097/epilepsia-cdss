package mx.tesis.epilepsia;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.semanticweb.owlapi.apibinding.OWLManager;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLDataProperty;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLObjectPropertyAssertionAxiom;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.swrlapi.core.SWRLRuleEngine;
import org.swrlapi.factory.SWRLAPIFactory;

import java.io.File;

/**
 * Motor de inferencia para síndromes epilépticos neonatales.
 * Carga la ontología OWL/SWRL creada en Protégé, inyecta los datos
 * del paciente como un individuo OWL y ejecuta las reglas SWRL
 * usando el backend Drools de SWRLAPI.
 *
 * Uso:
 *   java -jar drools-engine.jar <ruta_owl>
 *        <edadInicioEnDias> <duracionCrisisSegundos> <frecuenciaCrisisPorDia>
 *        <puntuacionAPGAR> <lateralizacionCrisis>
 *        <asociadoFiebre> <complicacionPerinatal> <regresionDesarrollo>
 *        <tieneAntecedenteFamiliar> <tieneCrisisClonicas> <tieneCrisisTonicas>
 *        <tieneEspasmos> <tieneHipotonia> <tieneMioclonias>
 *
 * Salida stdout (una sola línea JSON):
 *   {"diagnostico":"VALUE","urgencia":"VALUE","pronostico":"VALUE"}
 *   {"error":"No se pudo inferir"}  — si ninguna regla dispara
 *
 * Data properties del paciente (orden de los args, verificadas en .owl):
 *   [1]  edadInicioEnDias          xsd:integer
 *   [2]  duracionCrisisSegundos    xsd:integer
 *   [3]  frecuenciaCrisisPorDia    xsd:integer
 *   [4]  puntuacionAPGAR           xsd:integer
 *   [5]  lateralizacionCrisis      xsd:string
 *   [6]  asociadoFiebre            xsd:boolean
 *   [7]  complicacionPerinatal     xsd:boolean
 *   [8]  regresionDesarrollo       xsd:boolean
 *   [9]  tieneAntecedenteFamiliar  xsd:boolean
 *   [10] tieneCrisisClonicas       xsd:boolean
 *   [11] tieneCrisisTonicas        xsd:boolean
 *   [12] tieneEspasmos             xsd:boolean
 *   [13] tieneHipotonia            xsd:boolean
 *   [14] tieneMioclonias           xsd:boolean
 */
public class DroolsEngine {

    public static void main(String[] args) {
        if (args.length < 15) {
            printError("Se requieren 15 argumentos: <ruta_owl> + 14 variables clinicas del paciente");
            return;
        }

        try {
            // ----------------------------------------------------------
            // 1. Cargar ontología OWL
            // ----------------------------------------------------------
            String owlPath = args[0];
            OWLOntologyManager manager = OWLManager.createOWLOntologyManager();
            OWLOntology ontology = manager.loadOntologyFromOntologyDocument(new File(owlPath));
            OWLDataFactory factory = manager.getOWLDataFactory();

            // IRI base de la ontología.
            // getOntologyIRI() devuelve com.google.common.base.Optional (Guava),
            // no java.util.Optional, por eso usamos .or() en lugar de .orElse()
            com.google.common.base.Optional<IRI> iriOpt =
                    ontology.getOntologyID().getOntologyIRI();
            String base = iriOpt.isPresent()
                    ? iriOpt.get().toString()
                    : "http://epilepsia.tesis.mx/ontologia";
            if (!base.endsWith("#") && !base.endsWith("/")) {
                base = base + "#";
            }

            // ----------------------------------------------------------
            // 2. Crear individuo Paciente_Eval y declarar su clase
            // ----------------------------------------------------------
            OWLNamedIndividual paciente = factory.getOWLNamedIndividual(
                    IRI.create(base + "Paciente_Eval"));
            OWLClass clasePaciente = factory.getOWLClass(IRI.create(base + "Paciente"));
            manager.addAxiom(ontology,
                    factory.getOWLClassAssertionAxiom(clasePaciente, paciente));

            // ----------------------------------------------------------
            // 3. Inyectar las 14 data properties del paciente
            // ----------------------------------------------------------
            assertInt (manager, ontology, factory, paciente, base,
                    "edadInicioEnDias",          Integer.parseInt(args[1]));
            assertInt (manager, ontology, factory, paciente, base,
                    "duracionCrisisSegundos",    Integer.parseInt(args[2]));
            assertInt (manager, ontology, factory, paciente, base,
                    "frecuenciaCrisisPorDia",    Integer.parseInt(args[3]));
            assertInt (manager, ontology, factory, paciente, base,
                    "puntuacionAPGAR",            Integer.parseInt(args[4]));
            assertStr (manager, ontology, factory, paciente, base,
                    "lateralizacionCrisis",      args[5]);
            assertBool(manager, ontology, factory, paciente, base,
                    "asociadoFiebre",             Boolean.parseBoolean(args[6]));
            assertBool(manager, ontology, factory, paciente, base,
                    "complicacionPerinatal",      Boolean.parseBoolean(args[7]));
            assertBool(manager, ontology, factory, paciente, base,
                    "regresionDesarrollo",        Boolean.parseBoolean(args[8]));
            assertBool(manager, ontology, factory, paciente, base,
                    "tieneAntecedenteFamiliar",   Boolean.parseBoolean(args[9]));
            assertBool(manager, ontology, factory, paciente, base,
                    "tieneCrisisClonicas",        Boolean.parseBoolean(args[10]));
            assertBool(manager, ontology, factory, paciente, base,
                    "tieneCrisisTonicas",         Boolean.parseBoolean(args[11]));
            assertBool(manager, ontology, factory, paciente, base,
                    "tieneEspasmos",              Boolean.parseBoolean(args[12]));
            assertBool(manager, ontology, factory, paciente, base,
                    "tieneHipotonia",             Boolean.parseBoolean(args[13]));
            assertBool(manager, ontology, factory, paciente, base,
                    "tieneMioclonias",            Boolean.parseBoolean(args[14]));

            // ----------------------------------------------------------
            // 4. Ejecutar reglas SWRL con backend Drools (SWRLAPI)
            // ----------------------------------------------------------
            SWRLRuleEngine ruleEngine = SWRLAPIFactory.createSWRLRuleEngine(ontology);
            ruleEngine.infer();

            // ----------------------------------------------------------
            // 5. Leer propiedades de objeto inferidas sobre el paciente
            // ----------------------------------------------------------
            String diagnostico = null;
            String urgencia    = null;
            String pronostico  = null;

            for (OWLObjectPropertyAssertionAxiom ax :
                    ontology.getObjectPropertyAssertionAxioms(paciente)) {
                if (ax.getProperty().isAnonymous() || ax.getObject().isAnonymous()) continue;
                String prop = ax.getProperty().asOWLObjectProperty().getIRI().getShortForm();
                String val  = ax.getObject().asOWLNamedIndividual().getIRI().getShortForm();
                switch (prop) {
                    case "tieneDiagnostico"    -> diagnostico = val;
                    case "tieneNivelUrgencia"  -> urgencia    = val;
                    case "tienePronostico"     -> pronostico  = val;
                    default -> { /* otras propiedades, ignorar */ }
                }
            }

            // ----------------------------------------------------------
            // 6. Imprimir resultado como JSON
            // ----------------------------------------------------------
            if (diagnostico == null) {
                System.out.println("{\"error\": \"No se pudo inferir\"}");
            } else {
                ObjectMapper mapper = new ObjectMapper();
                ObjectNode json = mapper.createObjectNode();
                json.put("diagnostico", diagnostico);
                json.put("urgencia",    urgencia   != null ? urgencia   : "");
                json.put("pronostico",  pronostico != null ? pronostico : "");
                System.out.println(json.toString());
            }

        } catch (Exception e) {
            e.printStackTrace(System.err);
            printError(e.getMessage());
        }
    }

    // ------------------------------------------------------------------ //
    //  Helpers para agregar OWL data property assertions                  //
    // ------------------------------------------------------------------ //

    private static void assertInt(OWLOntologyManager m, OWLOntology o,
                                  OWLDataFactory f, OWLNamedIndividual ind,
                                  String base, String prop, int val) {
        OWLDataProperty dp = f.getOWLDataProperty(IRI.create(base + prop));
        m.addAxiom(o, f.getOWLDataPropertyAssertionAxiom(dp, ind, f.getOWLLiteral(val)));
    }

    private static void assertStr(OWLOntologyManager m, OWLOntology o,
                                  OWLDataFactory f, OWLNamedIndividual ind,
                                  String base, String prop, String val) {
        OWLDataProperty dp = f.getOWLDataProperty(IRI.create(base + prop));
        m.addAxiom(o, f.getOWLDataPropertyAssertionAxiom(dp, ind, f.getOWLLiteral(val)));
    }

    private static void assertBool(OWLOntologyManager m, OWLOntology o,
                                   OWLDataFactory f, OWLNamedIndividual ind,
                                   String base, String prop, boolean val) {
        OWLDataProperty dp = f.getOWLDataProperty(IRI.create(base + prop));
        m.addAxiom(o, f.getOWLDataPropertyAssertionAxiom(dp, ind, f.getOWLLiteral(val)));
    }

    private static void printError(String msg) {
        String safe = msg != null ? msg.replace("\"", "'").replace("\n", " ") : "error desconocido";
        System.out.println("{\"error\": \"" + safe + "\"}");
    }
}
