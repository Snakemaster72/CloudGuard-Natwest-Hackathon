import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.data_generator import generate_mock_data

if __name__ == "__main__":
    generate_mock_data(output_path="data/synthetic_cloud_costs.csv", days=365, seed=42)
    print("wrote data/synthetic_cloud_costs.csv")
