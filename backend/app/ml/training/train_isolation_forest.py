import os
import json
import datetime
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split

def train_isolation_forest():
    print("=" * 70)
    print("TRAINING ISOLATION FOREST ANOMALY DETECTION MODEL")
    print("=" * 70)
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    dataset_path = os.path.join(base_dir, "datasets", "golden data.csv")
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "saved_models"))
    os.makedirs(models_dir, exist_ok=True)
    
    print(f"Loading official dataset: {dataset_path}")
    df = pd.read_csv(dataset_path)
    print(f"Dataset shape: {df.shape}")
    
    # Meaningful continuous features for student academic/lifestyle anomaly detection
    feature_cols = [
        "study_hours_per_day",
        "sleep_hours",
        "gaming_hours",
        "social_media_hours",
        "attendance_percentage",
        "stress_level",
        "focus_score",
        "Previous_Grades"
    ]
    
    # Verify all feature columns exist
    for col in feature_cols:
        if col not in df.columns:
            raise ValueError(f"Required feature '{col}' missing from golden data.csv")
            
    X = df[feature_cols].copy()
    
    # Handle any potential missing values with median
    X = X.fillna(X.median())
    
    # Train / test split to evaluate stability on unseen data (80/20)
    X_train, X_test = train_test_split(X, test_size=0.2, random_state=42)
    print(f"Train records: {len(X_train)}, Holdout test records: {len(X_test)}")
    
    # Preprocessing scaler + IsolationForest estimator
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train IsolationForest with contamination 0.08 (8% statistical anomaly threshold)
    iso_forest = IsolationForest(
        n_estimators=150,
        max_samples="auto",
        contamination=0.08,
        random_state=42,
        n_jobs=-1
    )
    iso_forest.fit(X_train_scaled)
    
    # Inference on holdout test set to verify real decision function and scores
    test_preds = iso_forest.predict(X_test_scaled) # 1 for inlier/normal, -1 for outlier/anomaly
    test_scores = iso_forest.decision_function(X_test_scaled)
    anomaly_count = int(np.sum(test_preds == -1))
    normal_count = int(np.sum(test_preds == 1))
    anomaly_ratio = float(anomaly_count / len(test_preds))
    
    print(f"Holdout evaluation: {normal_count} Normal ({1-anomaly_ratio:.1%}), {anomaly_count} Anomalies ({anomaly_ratio:.1%})")
    print(f"Decision function range: Min={test_scores.min():.4f}, Mean={test_scores.mean():.4f}, Max={test_scores.max():.4f}")
    
    # Bundle pipeline and model
    pipeline = {
        "scaler": scaler,
        "model": iso_forest,
        "features": feature_cols,
        "contamination": 0.08,
        "score_threshold": float(np.percentile(test_scores, 8)) # 8th percentile threshold
    }
    
    model_file = os.path.join(models_dir, "isolation_forest_model.joblib")
    joblib.dump(pipeline, model_file)
    print(f"Saved model artifact: {model_file}")
    
    # Metadata
    metadata = {
        "model_name": "APAAR Student Lifestyle Anomaly Detector",
        "version": "1.0.0",
        "algorithm": "sklearn.ensemble.IsolationForest",
        "is_trained": True,
        "trained_at": datetime.datetime.utcnow().isoformat(),
        "training_records": len(X_train),
        "test_records": len(X_test),
        "training_dataset": "golden data.csv",
        "features": feature_cols,
        "metrics": {
            "contamination_parameter": 0.08,
            "test_anomaly_ratio": round(anomaly_ratio, 4),
            "test_score_mean": round(float(test_scores.mean()), 4),
            "test_score_min": round(float(test_scores.min()), 4),
            "test_score_max": round(float(test_scores.max()), 4),
            "threshold": round(float(pipeline["score_threshold"]), 4)
        },
        "status_message": "Operational - Trained on official golden data.csv"
    }
    
    meta_file = os.path.join(models_dir, "isolation_forest_metadata.json")
    with open(meta_file, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata: {meta_file}")
    
    return metadata

if __name__ == "__main__":
    train_isolation_forest()

