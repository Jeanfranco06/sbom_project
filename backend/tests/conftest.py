"""Configuracion de pruebas: dirige el almacenamiento a un directorio temporal."""
import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="secsbom_test_")
os.environ["SECSBOM_BASE_DIR"] = _TMP
os.environ["SECSBOM_MODE"] = "offline"
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP}/test.db"
