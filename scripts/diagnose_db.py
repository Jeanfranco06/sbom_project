"""Diagnosticar el error 500 en /api/projects."""
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(r"C:\Proyects\sec_sbom\data\secsbom.db")

print(f"DB exists: {DB_PATH.exists()}")
print(f"DB size: {DB_PATH.stat().st_size} bytes")

conn = sqlite3.connect(str(DB_PATH))
cursor = conn.cursor()

# Listar tablas
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in cursor.fetchall()]
print(f"Tables: {tables}")

# Contar proyectos
try:
    cursor.execute("SELECT COUNT(*) FROM projects")
    print(f"Projects count: {cursor.fetchone()[0]}")
except Exception as e:
    print(f"Error querying projects: {e}")

# Verificar columnas de projects
try:
    cursor.execute("PRAGMA table_info(projects)")
    cols = [(c[1], c[2]) for c in cursor.fetchall()]
    print(f"Project columns: {cols}")
except Exception as e:
    print(f"Error getting columns: {e}")

conn.close()
