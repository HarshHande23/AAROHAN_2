import os
import pandas as pd
import numpy as np

datasets_dir = r"c:\Users\Harsh\Desktop\Aarohan_PS2\datasets"
files = [
    "ecotec_online_student_risk.csv",
    "golden data.csv",
    "ResearchInformation3.csv",
    "student-mat.csv",
    "Students suspicious behaviors detection dataset_V1.csv"
]

print("=" * 80)
print("INSPECTION OF THE 5 OFFICIAL DATASETS")
print("=" * 80)

for f in files:
    file_path = os.path.join(datasets_dir, f)
    print("\n" + "#" * 80)
    print(f"FILE: {f}")
    print("#" * 80)
    
    # Try reading with comma first, then semicolon if only 1 col
    try:
        df = pd.read_csv(file_path)
        if len(df.columns) == 1 and ';' in df.columns[0]:
            df = pd.read_csv(file_path, sep=';')
    except Exception as e:
        print(f"Error reading {f}: {e}")
        continue

    print(f"Shape: {df.shape} (Rows: {df.shape[0]}, Columns: {df.shape[1]})")
    print(f"Memory Usage: {df.memory_usage(deep=True).sum() / 1024:.2f} KB")
    
    # Duplicate rows
    num_duplicates = df.duplicated().sum()
    print(f"Duplicate rows: {num_duplicates} ({num_duplicates/len(df)*100:.2f}%)")
    
    # Missing values
    missing = df.isnull().sum()
    missing_cols = missing[missing > 0]
    if len(missing_cols) > 0:
        print(f"Columns with Missing Values ({len(missing_cols)}):")
        for col, count in missing_cols.items():
            print(f"  - {col}: {count} missing ({count/len(df)*100:.2f}%)")
    else:
        print("Missing Values: None (0 across all columns)")
        
    print("\nColumns & Data Types:")
    for col, dtype in zip(df.columns, df.dtypes):
        n_unique = df[col].nunique()
        print(f"  - {col} ({dtype}): {n_unique} unique values")
        
    print("\nFirst 3 rows:")
    print(df.head(3).to_string())
    
    # Check potential target/label columns or categorical distributions
    print("\nColumn Detail / Value Distributions for Non-Numeric or Low-Cardinality Numeric:")
    for col in df.columns:
        if df[col].nunique() <= 10:
            vc = df[col].value_counts(dropna=False).to_dict()
            print(f"  * {col}: {vc}")

