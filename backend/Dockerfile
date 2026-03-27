FROM python:3.11-slim

# Install Java 17
RUN apt-get update && \
    apt-get install -y --no-install-recommends openjdk-17-jre-headless && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (cached layer before copying the rest)
COPY backend/app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Flask app
COPY backend/app/ ./app/

# Copy inference engine jar
COPY backend/drools-engine/target/drools-engine.jar /app/drools-engine.jar

# Copy ontology
COPY backend/ontologia/clase_temporal.rdf /app/clase_temporal.rdf

ENV DROOLS_JAR=/app/drools-engine.jar
ENV OWL_PATH=/app/clase_temporal.rdf

EXPOSE 5000

CMD ["gunicorn", "app.app:app", "--bind", "0.0.0.0:5000"]
