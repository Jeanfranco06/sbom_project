"""Calcula Fleiss' kappa para la validación de expertos del corpus SecSBOM.

Uso:
    python scripts/fleiss_kappa.py [--input evaluacion_expertos.csv] [--output resultados_kappa.json]

El archivo CSV de entrada debe tener formato:
    caso_id,experto_1,experto_2,...,experto_n
    caso_01,critical,high,critical,...

Donde los valores son las etiquetas de prioridad: critical, high, medium, low, info.

Referencia:
    Fleiss, J. L. (1971). Measuring nominal scale agreement among many raters.
    Psychological Bulletin, 76(5), 378–382.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

PRIORITY_LABELS = ["critical", "high", "medium", "low", "info"]


def compute_pairwise_agreement(ratings: list[list[int]]) -> float:
    """Calcula el acuerdo pareado (P) para un solo item."""
    n = len(ratings)  # número de raters
    n_categories = len(PRIORITY_LABELS)
    agree = 0
    for i in range(n_categories):
        agree += ratings[i] * (ratings[i] - 1)
    return agree / (n * (n - 1)) if n > 1 else 0.0


def fleiss_kappa(matrix: list[list[int]], n_raters: int) -> dict:
    """Calcula Fleiss' kappa dado una matriz de conteo.

    Args:
        matrix: Lista de listas donde cada fila es un item y cada columna
                es el conteo de raters para cada categoría.
        n_raters: Número de evaluadores.

    Returns:
        Diccionario con kappa, P_bar, P_e, y métricas por categoría.
    """
    n_items = len(matrix)
    n_categories = len(PRIORITY_LABELS)

    if n_raters < 2:
        raise ValueError("Se necesitan al menos 2 evaluadores para calcular kappa.")

    # Paso 1: Acuerdo observado (P_bar)
    P_items = [compute_pairwise_agreement(row) for row in matrix]
    P_bar = sum(P_items) / n_items if n_items > 0 else 0.0

    # Paso 2: Acuerdo esperado al azar (P_e)
    # Proporción de votes para cada categoría
    total_votes = n_items * n_raters
    category_proportions = []
    for j in range(n_categories):
        col_sum = sum(matrix[i][j] for i in range(n_items))
        category_proportions.append(col_sum / total_votes if total_votes > 0 else 0)

    P_e = sum(p ** 2 for p in category_proportions)

    # Paso 3: Kappa
    if P_e == 1.0:
        kappa = 1.0  # acuerdo perfecto trivial
    else:
        kappa = (P_bar - P_e) / (1 - P_e)

    # Métricas por categoría
    category_metrics = {}
    for j, label in enumerate(PRIORITY_LABELS):
        n_j = sum(matrix[i][j] for i in range(n_items))
        category_metrics[label] = {
            "proportion": category_proportions[j],
            "total_votes": n_j,
            "agreement_contribution": category_proportions[j] ** 2,
        }

    # Interpretación (Landis & Koch, 1977)
    if kappa < 0:
        interpretation = "Poor (below chance)"
    elif kappa < 0.20:
        interpretation = "Slight agreement"
    elif kappa < 0.40:
        interpretation = "Fair agreement"
    elif kappa < 0.60:
        interpretation = "Moderate agreement"
    elif kappa < 0.80:
        interpretation = "Substantial agreement"
    else:
        interpretation = "Almost perfect agreement"

    return {
        "kappa": round(kappa, 4),
        "P_observed": round(P_bar, 4),
        "P_expected": round(P_e, 4),
        "n_items": n_items,
        "n_raters": n_raters,
        "n_categories": n_categories,
        "interpretation": interpretation,
        "category_proportions": category_proportions,
        "category_metrics": category_metrics,
        "per_item_kappa": [round(k, 4) for k in P_items],
    }


def load_ratings_from_csv(csv_path: Path) -> tuple[list[str], list[list[int]], int]:
    """Carga_ratings desde un CSV.

    Returns:
        (caso_ids, matrix, n_raters)
    """
    caso_ids = []
    matrix = []
    n_raters = 0

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        n_raters = len(header) - 1  # primera columna es caso_id

        for row in reader:
            caso_ids.append(row[0])
            ratings = row[1:]
            # Contar votos por categoría
            counts = [0] * len(PRIORITY_LABELS)
            for rating in ratings:
                rating = rating.strip().lower()
                if rating in PRIORITY_LABELS:
                    counts[PRIORITY_LABELS.index(rating)] += 1
            matrix.append(counts)

    return caso_ids, matrix, n_raters


def generate_example_data() -> tuple[list[str], list[list[int]], int]:
    """Genera datos de ejemplo para demostración."""
    casos = [f"caso_{i:02d}" for i in range(1, 25)]
    n_raters = 3

    # Ejemplo: 3 expertos evaluando 24 casos
    import random
    random.seed(42)

    matrix = []
    for caso in casos:
        # Distribución realista: 60% acuerdo, 40% dispersión
        base = random.choice(range(len(PRIORITY_LABELS)))
        counts = [0] * len(PRIORITY_LABELS)
        counts[base] = n_raters - 1  # Mayoría de acuerdo
        # Un disidente
        disidente = (base + random.choice([-1, 1])) % len(PRIORITY_LABELS)
        counts[disidente] = 1
        matrix.append(counts)

    return casos, matrix, n_raters


def main() -> int:
    parser = argparse.ArgumentParser(description="Calcula Fleiss' kappa para validación de expertos")
    parser.add_argument("--input", "-i", type=Path, help="Archivo CSV con ratings de expertos")
    parser.add_argument("--output", "-o", type=Path, default=Path("resultados_kappa.json"),
                        help="Archivo de salida JSON (default: resultados_kappa.json)")
    parser.add_argument("--example", action="store_true", help="Usar datos de ejemplo")

    args = parser.parse_args()

    if args.example:
        print("Usando datos de ejemplo...")
        caso_ids, matrix, n_raters = generate_example_data()
    elif args.input and args.input.exists():
        print(f"Cargando ratings de {args.input}...")
        caso_ids, matrix, n_raters = load_ratings_from_csv(args.input)
    else:
        print("Error: Especifica --input <archivo.csv> o --example")
        print("\nGenerando datos de ejemplo...")
        caso_ids, matrix, n_raters = generate_example_data()

    print(f"Items: {len(caso_ids)}, Evaluadores: {n_raters}, Categorías: {len(PRIORITY_LABELS)}")

    # Calcular kappa
    result = fleiss_kappa(matrix, n_raters)

    # Agregar metadatos
    output = {
        "metadata": {
            "project": "SecSBOM",
            "description": "Fleiss' kappa para validación de expertos",
            "priority_labels": PRIORITY_LABELS,
            " caso_ids": caso_ids,
        },
        "results": result,
    }

    # Guardar
    args.output.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nResultados guardados en {args.output}")

    # Imprimir resumen
    print(f"\n{'='*60}")
    print(f"FLEISS' KAPPA RESULTS")
    print(f"{'='*60}")
    print(f"Kappa:              {result['kappa']:.4f}")
    print(f"Interpretation:     {result['interpretation']}")
    print(f"Observed agreement: {result['P_observed']:.4f}")
    print(f"Expected agreement: {result['P_expected']:.4f}")
    print(f"Items:              {result['n_items']}")
    print(f"Raters:             {result['n_raters']}")
    print(f"{'='*60}")

    # Guía de interpretación
    print(f"\nGuía de interpretación (Landis & Koch, 1977):")
    print(f"  < 0.00  Poor (below chance)")
    print(f"  0.00-0.20  Slight agreement")
    print(f"  0.20-0.40  Fair agreement")
    print(f"  0.40-0.60  Moderate agreement")
    print(f"  0.60-0.80  Substantial agreement")
    print(f"  0.80-1.00  Almost perfect agreement")

    return 0


if __name__ == "__main__":
    sys.exit(main())
