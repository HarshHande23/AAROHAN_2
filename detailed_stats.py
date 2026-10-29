import os
import pandas as pd

datasets_dir = r"c:\Users\Harsh\Desktop\Aarohan_PS2\datasets"

for f in os.listdir(datasets_dir):
    p = os.path.join(datasets_dir, f)
    sep = ';' if f == 'student-mat.csv' else ','
    df = pd.read_csv(p, sep=sep)
    print(f"=== {f} ===")
    print(f"Duplicates: {df.duplicated().sum()}")
    print(f"Null count: {df.isnull().sum().sum()}")
    print("Numerical stats:")
    print(df.describe().T[['mean', 'std', 'min', '50%', 'max']])
    print()

