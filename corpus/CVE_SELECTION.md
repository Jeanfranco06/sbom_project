# Fase A.1 — Selección y Documentación de CVEs (Verdad de Terreno)

Fecha de captura de los datos (snapshot OSV / CISA KEV / FIRST EPSS): **2026-09-02**.
Método: consulta directa a la API de OSV (`/v1/query`, ecosistema PyPI), al feed
JSON de CISA KEV y a la API de FIRST EPSS, mediante `scripts/build_corpus_fixtures.py`
(reproducible). Los valores CVSS que usa el motor se calculan del vector publicado
en OSV (`app/services/cvss.py`).

## 1. CVE real en CISA KEV (explotado activamente)

| | |
|---|---|
| **CVE** | **CVE-2023-4863** (libwebp, OOB write en `BuildHuffmanTable`) |
| Paquete / versión | `pillow==10.0.0` (las ruedas de Pillow empaquetan libwebp) |
| ID OSV usado | `GHSA-j7hp-h8jx-5ppr` (alias PYSEC-2026-1794) |
| CVSS (vector OSV) | 8.8 — `CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H` |
| CISA KEV | **Sí** (única CVE del corpus presente en el feed KEV real al 2026-09-02) |
| EPSS (snapshot) | **0.9998** (máxima probabilidad de explotación) |
| Parche | Pillow **10.0.1** |
| Uso en el corpus | Caso 01 (KEV + producción expuesta → regla R1) |

## 2. CVE real con CVSS crítico (>9.0), EPSS bajo (<0.1) y sin parche

| | |
|---|---|
| **CVE** | **CVE-2013-7459** (desbordamiento de pila en `ALGnew`) |
| Paquete / versión | `pycrypto==2.6.1` (paquete **abandonado**, sin mantenimiento) |
| ID OSV usado | `GHSA-cq27-v7xp-c356` (alias PYSEC-2017-94) |
| CVSS (vector OSV) | **9.8** — `CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` |
| CISA KEV | No |
| EPSS (snapshot) | **0.0958** (< 0.1 ✓) |
| Parche | **No instalable**: OSV solo lista un commit git como `fixed`; nunca se publicó release en PyPI (ver nota de calidad de datos en README) |
| Uso en el corpus | Caso 07 (CVSS crítico sin KEV, staging expuesto, sin parche) |

CVE secundario del mismo paquete (mismo contexto, menor impacto):
**CVE-2018-6594** (`GHSA-6528-wvf6-f6qg`, CVSS 7.5, EPSS 0.0203, sin parche) —
etiquetado como `medium` en el caso 07.

## 3. CVE real con CVSS medio pero alta probabilidad de explotación

| | |
|---|---|
| **CVE** | **CVE-2023-48795** (ataque Terrapin contra el protocolo SSH) |
| Paquete / versión | `paramiko==2.10.3` |
| ID OSV usado | `GHSA-45x7-px36-x8w8` (alias PYSEC-2026-1758) |
| CVSS (vector OSV) | **5.9 (medio)** — `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N` |
| CISA KEV | No |
| EPSS (snapshot) | **0.9331** (altísima ✓) |
| Parche | paramiko **3.4.0** |
| Uso en el corpus | Caso 10 (CVSS medio + EPSS alta: el baseline solo-CVSS la subestima) |

## 4. Vulnerabilidades sintéticas (mock) para casos límite y ruido

**Justificación**: en PyPI no existe (al 2026-09-02) ninguna CVE presente en CISA
KEV que carezca de parche. Los casos 02 y 06 requieren exactamente esa combinación
(KEV sin parche), por lo que se documentan dos entradas sintéticas generadas de
forma determinista en `scripts/build_corpus_fixtures.py`:

| ID OSV | Alias CVE | Paquete (ficticio) | CVSS | KEV | EPSS | Parche | Caso |
|---|---|---|---|---|---|---|---|
| `MOCK-KEV-0001` | CVE-2026-99001 | `corpus-filexplorer==1.0.0` | 9.8 | Sí (fixture) | 0.62 | No | 02 |
| `MOCK-KEV-0002` | CVE-2026-99002 | `corpus-devkit==2.0.0` (dev) | 7.5 | Sí (fixture) | 0.41 | No | 06 |

Propiedades de los mocks:
- Marcados con `database_specific.synthetic = true` en su entrada OSV.
- Sus entradas KEV/EPSS viven únicamente en `corpus/fixtures/` (nunca en fuentes reales).
- Permiten probar la dominancia de la regla R1 (caso 02) y la tensión KEV-vs-dev (caso 06)
  sin depender de la volatilidad del catálogo KEV real.

## 5. CVEs reales de apoyo (resto de la matriz)

| CVE | Paquete | CVSS | EPSS | Parche | Caso(s) |
|---|---|---|---|---|---|
| CVE-2023-25577 | werkzeug 2.2.2 | 7.5 | 0.0142 | 2.2.3 | 03, 04 |
| CVE-2024-21503 | black 23.1.0 | 5.3 | 0.0098 | 24.3.0 | 05 |
| CVE-2024-23342 | ecdsa 0.18.0 | 7.4 | 0.0099 | **No** | 08, 11 |
| CVE-2023-43804 | urllib3 2.0.4 | 5.9 (GHSA) | 0.0121 | 2.0.6 | 09, 12 |

## 6. Casos negativos (ruido controlado)

Paquetes reales **sin vulnerabilidades conocidas** en el snapshot (verificado vía
OSV el 2026-09-02): `six==1.16.0`, `colorama==0.4.6`, `packaging==24.1`,
`typing-extensions==4.12.2`, `platformdirs==4.2.2`, `zipp==3.19.2`,
`atomicwrites==1.4.1`. (`click==8.1.7` fue descartado: reporta 1 vulnerabilidad.)

## 7. Criterios de selección aplicados

1. Toda CVE objetivo es real y verificable en OSV (salvo los mocks documentados).
2. Cada caso aísla las variables de su fila en la matriz (alcance, entorno,
   exposición, parche, criticidad) manteniendo las demás controladas.
3. Las versiones fijadas son anteriores al parche para garantizar la detección.
4. El ruido no etiquetado se acepta deliberadamente (realismo), documentando su
   recuento por paquete en el snapshot: pillow 35, werkzeug 18, urllib3 16,
   paramiko 4, pycrypto 4, ecdsa 4, black 4.
