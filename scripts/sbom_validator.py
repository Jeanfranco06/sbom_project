import json
import sys
from pathlib import Path

# Agregar la raiz del proyecto al path para importar backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.services.dependency_analyzer import analyze_project_dir

def main():
    corpus_dir = Path("corpus")
    total_expected = 0
    total_found = 0
    total_perfect_matches = 0
    
    if not corpus_dir.exists():
        print("Error: La carpeta 'corpus' no existe.")
        return

    cases_tested = 0
    for case_dir in sorted(corpus_dir.iterdir()):
        if not case_dir.is_dir():
            continue
            
        inv_file = case_dir / "manual_inventory.json"
        if not inv_file.exists():
            continue
            
        print(f"\nValidando {case_dir.name}...")
        cases_tested += 1
        
        with open(inv_file, encoding="utf-8") as f:
            manual = json.load(f)
            
        expected = manual.get("expected_components", [])
        
        try:
            packages, _ = analyze_project_dir(str(case_dir))
        except Exception as e:
            print(f"  [ERROR] Analizando dependencias: {e}")
            continue
            
        found_map = {p.name: p for p in packages}
        
        case_expected = len(expected)
        case_found = 0
        case_perfect = 0
        
        for exp in expected:
            name = exp["name"]
            if name in found_map:
                case_found += 1
                found_pkg = found_map[name]
                # Verificamos si version y tipo de dependencia coinciden
                if found_pkg.version == exp["version"] and found_pkg.is_direct == exp["is_direct"]:
                    case_perfect += 1
                else:
                    print(f"  [FALLO] {name}: Esperado v{exp['version']} (direct={exp['is_direct']}) | Encontrado v{found_pkg.version} (direct={found_pkg.is_direct})")
            else:
                print(f"  [OMITIDO] El analizador no encontro el paquete esperado: {name}")
                
        cov = (case_found / case_expected * 100) if case_expected else 0.0
        acc = (case_perfect / case_found * 100) if case_found else 0.0
        print(f"  Cobertura (Recall): {case_found}/{case_expected} ({cov:.1f}%)")
        print(f"  Exactitud (Precision estricta): {case_perfect}/{case_found} ({acc:.1f}%)")
        
        total_expected += case_expected
        total_found += case_found
        total_perfect_matches += case_perfect
        
    if cases_tested == 0:
        print("No se encontro ningun archivo 'manual_inventory.json' en las subcarpetas de corpus/.")
        return

    print("\n" + "="*40)
    print("RESUMEN GLOBAL (HIPOTESIS H4)")
    print("="*40)
    cov_total = (total_found / total_expected * 100) if total_expected else 0.0
    acc_total = (total_perfect_matches / total_found * 100) if total_found else 0.0
    print(f"Total Cobertura: {total_found}/{total_expected} ({cov_total:.1f}%)")
    print(f"Total Exactitud: {total_perfect_matches}/{total_found} ({acc_total:.1f}%)")

if __name__ == "__main__":
    main()
