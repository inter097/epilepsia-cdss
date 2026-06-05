FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends openjdk-21-jre-headless && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY drools-engine.jar /app/drools-engine.jar
COPY ontologia/clase_temporal.rdf /app/clase_temporal.rdf

ENV DROOLS_JAR=/app/drools-engine.jar
ENV OWL_PATH=/app/clase_temporal.rdf

EXPOSE 5000

CMD ["gunicorn", "--chdir", "/app/app", "-w", "2", "-b", "0.0.0.0:5000", "app:app"]
