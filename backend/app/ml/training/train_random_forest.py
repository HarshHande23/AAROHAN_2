import os
import json
import datetime
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
)
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

def train_random_forest():
    print("=" * 70)
    print("TRAINING RANDOM FOREST SUPERVISED CLASSIFIER")
    print("=" * 70)
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    dataset_path = os.path.join(base_dir, "datasets", "Students suspicious behaviors detection dataset_V1.csv")
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "saved_models"))
    os.makedirs(models_dir, exist_ok=True)
    
    print(f"Loading official dataset: {dataset_path}")
    df = pd.read_csv(dataset_path)
    print(f"Dataset shape: {df.shape}")
    
    # Target column
    target_col = "label"
    if target_col not in df.columns:
        raise ValueError(f"Ground-truth target '{target_col}' not found in dataset!")
        
    # Check class distribution
    class_dist = df[target_col].value_counts().to_dict()
    print(f"Legitimate target distribution: {class_dist}")
    
    # Select predictive features
    feature_cols = [
        "face_present", "no_of_face", "face_conf", "face_x", "face_y", "face_w", "face_h",
        "hand_count", "hand_obj_interaction", "left_hand_x", "left_hand_y", "right_hand_x", "right_hand_y",
        "head_pitch", "head_yaw", "head_roll",
        "phone_present", "phone_conf", "phone_loc_x", "phone_loc_y",
        "gaze_on_script", "gazePoint_x", "gazePoint_y", "pupil_left_x", "pupil_left_y", "pupil_right_x", "pupil_right_y"
    ]
    
    # Verify features exist
    for f in feature_cols:
        if f not in df.columns:
            raise ValueError(f"Feature '{f}' missing from dataset!")
            
    X = df[feature_cols].copy()
    y = df[target_col].copy()
    
    # Impute missing values with median
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)
    
    # Stratified train/test split (80% train, 20% holdout test)
    X_train, X_test, y_train, y_test = train_test_split(
        X_imputed, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Train split: {len(X_train)} samples, Test split: {len(X_test)} samples")
    
    # Train RandomForestClassifier with 100 trees, balanced weights
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    
    # Cross-validation on train split
    cv_scores = cross_val_score(rf, X_train, y_train, cv=5, scoring="f1")
    print(f"5-Fold Cross-Validation F1 Scores: {cv_scores}")
    print(f"Mean CV F1: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
    
    # Fit final model
    rf.fit(X_train, y_train)
    
    # Evaluate on unseen holdout test set
    y_pred = rf.predict(X_test)
    y_prob = rf.predict_proba(X_test)[:, 1]
    
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred))
    rec = float(recall_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred))
    auc = float(roc_auc_score(y_test, y_prob))
    cm = confusion_matrix(y_test, y_pred).tolist()
    
    print("\n--- Genuine Evaluation Results on Unseen Holdout Test Set ---")
    print(f"Accuracy:  {acc:.4f} ({acc*100:.2f}%)")
    print(f"Precision: {prec:.4f} ({prec*100:.2f}%)")
    print(f"Recall:    {rec:.4f} ({rec*100:.2f}%)")
    print(f"F1-Score:  {f1:.4f} ({f1*100:.2f}%)")
    print(f"ROC-AUC:   {auc:.4f}")
    print(f"Confusion Matrix: {cm} (TN={cm[0][0]}, FP={cm[0][1]}, FN={cm[1][0]}, TP={cm[1][1]})")
    
    # Feature importances
    importances = dict(zip(feature_cols, [round(float(imp), 4) for imp in rf.feature_importances_]))
    top_features = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True)[:10])
    print(f"Top 10 Most Important Features: {top_features}")
    
    # Bundle pipeline
    pipeline = {
        "imputer": imputer,
        "model": rf,
        "features": feature_cols,
        "target": target_col,
        "classes": [0, 1],
        "class_names": {0: "GENUINE", 1: "SUSPICIOUS"}
    }
    
    model_file = os.path.join(models_dir, "random_forest_model.joblib")
    joblib.dump(pipeline, model_file)
    print(f"\nSaved model artifact: {model_file}")
    
    # Metadata
    metadata = {
        "model_name": "APAAR Academic Suspicious Behavior Classifier",
        "version": "1.0.0",
        "algorithm": "sklearn.ensemble.RandomForestClassifier",
        "is_trained": True,
        "trained_at": datetime.datetime.utcnow().isoformat(),
        "training_records": len(X_train),
        "test_records": len(X_test),
        "training_dataset": "Students suspicious behaviors detection dataset_V1.csv",
        "target": "label (0=Normal/Genuine, 1=Suspicious)",
        "features": feature_cols,
        "metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "cross_val_mean_f1": round(float(cv_scores.mean()), 4),
            "confusion_matrix": cm,
            "top_features": top_features
        },
        "status_message": "Operational - Trained and verified on official labeled dataset"
    }
    
    meta_file = os.path.join(models_dir, "random_forest_metadata.json")
    with open(meta_file, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata: {meta_file}")
    
    return metadata

if __name__ == "__main__":
    train_random_forest()

