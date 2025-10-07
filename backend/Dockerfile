FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY scripts ./scripts
ENV PYTHONPATH=.
EXPOSE 8000
CMD ["bash", "scripts/dev.sh"]
