import os
import pandas as pd

datasets_dir = r"c:\Users\Harsh\Desktop\Aarohan_PS2\datasets"

for f in ["golden data.csv", "ResearchInformation3.csv", "student-mat.csv"]:
    p = os.path.join(datasets_dir, f)
    sep = ';' if f == 'student-mat.csv' else ','
    df = pd.read_csv(p, sep=sep)
    print("=" * 60)
    print(f"FILE: {f}")
    print(f"Shape: {df.shape}")
    print("Columns & types:")
    for col, dtype in zip(df.columns, df.dtypes):
        print(f"  {col}: {dtype} (unique: {df[col].nunique()})")
    print("\nHead(3):")
    print(df.head(3))
    print("\nValue counts for categorical/discrete columns:")
    for col in df.columns:
        if df[col].nunique() <= 10:
            print(f"  {col}: {df[col].value_counts(dropna=False).to_dict()}")

