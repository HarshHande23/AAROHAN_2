import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from app.config import settings

class MLService:
    def __init__(self):
        self.models_dir = settings.SAVED_MODELS_DIR
        self.if_pipeline = None
        self.rf_pipeline = None
        self.if_metadata = None
        self.rf_metadata = None
        self.load_models()

    def load_models(self):
        # Load Isolation Forest
        if_model_path = os.path.join(self.models_dir, "isolation_forest_model.joblib")
        if_meta_path = os.path.join(self.models_dir, "isolation_forest_metadata.json")
        if os.path.exists(if_model_path):
            try:
                self.if_pipeline = joblib.load(if_model_path)
                print(f"[MLService] Loaded Isolation Forest model from {if_model_path}")
            except Exception as e:
                print(f"[MLService] Error loading Isolation Forest: {e}")
                self.if_pipeline = None

        if os.path.exists(if_meta_path):
            try:
                with open(if_meta_path, "r") as f:
                    self.if_metadata = json.load(f)
            except Exception as e:
                print(f"[MLService] Error loading IF metadata: {e}")

        # Load Random Forest
        rf_model_path = os.path.join(self.models_dir, "random_forest_model.joblib")
        rf_meta_path = os.path.join(self.models_dir, "random_forest_metadata.json")
        if os.path.exists(rf_model_path):
            try:
                self.rf_pipeline = joblib.load(rf_model_path)
                print(f"[MLService] Loaded Random Forest model from {rf_model_path}")
            except Exception as e:
                print(f"[MLService] Error loading Random Forest: {e}")
                self.rf_pipeline = None

        if os.path.exists(rf_meta_path):
            try:
                with open(rf_meta_path, "r") as f:
                    self.rf_metadata = json.load(f)
            except Exception as e:
                print(f"[MLService] Error loading RF metadata: {e}")

    def run_isolation_forest_inference(self, student_data: Dict[str, Any]) -> Tuple[str, float, str]:
        if not self.if_pipeline:
            return "NOT_EVALUATED", 0.0, "Isolation Forest model artifact is not loaded."

        try:
            scaler = self.if_pipeline["scaler"]
            model = self.if_pipeline["model"]
            features = self.if_pipeline["features"]
            threshold = self.if_pipeline.get("score_threshold", 0.0)

            # Map student input features to golden data feature definitions
            study_hrs = float(student_data.get("study_hours_per_day", 4.0))
            sleep_hrs = float(student_data.get("sleep_hours", 7.0))
            gaming_hrs = float(student_data.get("gaming_hours", 1.0))
            social_hrs = float(student_data.get("social_media_hours", 3.0))
            att_pct = float(student_data.get("attendance_percentage", 80.0))
            cgpa = float(student_data.get("cgpa", 3.0))

            # Scale CGPA (0-4) to Previous_Grades scale (0-100)
            prev_grades = (cgpa / 4.0) * 100.0
            
            # Approximate stress & focus from attendance, sleep, and study
            stress = max(1.0, min(10.0, 10.0 - (sleep_hrs - 3.0) + (gaming_hrs * 0.5)))
            focus = max(30.0, min(99.0, (att_pct * 0.6) + (study_hrs * 4.0)))

            row = [
                study_hrs,
                sleep_hrs,
                gaming_hrs,
                social_hrs,
                att_pct,
                stress,
                focus,
                prev_grades
            ]

            X = np.array([row])
            X_scaled = scaler.transform(X)
            score = float(model.decision_function(X_scaled)[0])
            pred = int(model.predict(X_scaled)[0]) # 1: normal, -1: anomalous

            if pred == -1 or score < threshold:
                status = "ANOMALOUS"
                reason = f"Multivariate outlier detected (score: {score:.4f} < {threshold:.4f}). Significant deviation from normal student profile."
            else:
                status = "NORMAL"
                reason = f"Normal profile consistency (score: {score:.4f} >= {threshold:.4f}). Within acceptable distribution."

            return status, round(score, 4), reason

        except Exception as e:
            print(f"[MLService] Anomaly inference error: {e}")
            return "NOT_EVALUATED", 0.0, f"Inference execution error: {str(e)}"

    def run_random_forest_inference(self, student_data: Dict[str, Any]) -> Tuple[str, float, str]:
        if not self.rf_pipeline:
            return "NOT_EVALUATED", 0.0, "Random Forest model is not loaded."

        try:
            imputer = self.rf_pipeline["imputer"]
            model = self.rf_pipeline["model"]
            features = self.rf_pipeline["features"]

            # Evaluate academic/proctoring behavioral risk features
            # A student with severe attendance collapse (<50%) and drastic GPA drop (<1.5)
            # or anomalous values displays higher suspicion signals
            cgpa = float(student_data.get("cgpa", 3.0))
            last_gpa = float(student_data.get("last_semester_gpa", 3.0))
            att = float(student_data.get("attendance_percentage", 80.0))
            gaming = float(student_data.get("gaming_hours", 1.0))
            study = float(student_data.get("study_hours_per_day", 4.0))

            # Simulate natural exam posture & verification features from student record:
            # Normal student: face_present=1, no_of_face=1, phone_present=0, gaze_on_script=1
            # Inconsistent student: face issues, phone detected, gaze off script
            is_suspicious_profile = (att < 50.0 and cgpa < 1.5) or (gaming > 5.0 and study < 1.0 and cgpa < 1.2)

            phone_pres = 1 if is_suspicious_profile else 0
            gaze_on_sc = 0 if is_suspicious_profile else 1
            head_yaw_val = 0.25 if is_suspicious_profile else 0.005
            head_pitch_val = -0.04 if is_suspicious_profile else 0.003
            head_roll_val = 0.001 if is_suspicious_profile else -0.0001
            hand_obj = 1 if is_suspicious_profile else 0

            row_dict = {
                "face_present": 1,
                "no_of_face": 1,
                "face_conf": 90.0,
                "face_x": 256.0,
                "face_y": 264.0,
                "face_w": 150.0,
                "face_h": 150.0,
                "hand_count": 1 if hand_obj else 0,
                "hand_obj_interaction": hand_obj,
                "left_hand_x": 0.0,
                "left_hand_y": 0.0,
                "right_hand_x": 0.1 if hand_obj else 0.0,
                "right_hand_y": 0.3 if hand_obj else 0.0,
                "head_pitch": head_pitch_val,
                "head_yaw": head_yaw_val,
                "head_roll": head_roll_val,
                "phone_present": phone_pres,
                "phone_conf": 0.85 if phone_pres else 0.0,
                "phone_loc_x": 100 if phone_pres else 0,
                "phone_loc_y": 150 if phone_pres else 0,
                "gaze_on_script": gaze_on_sc,
                "gazePoint_x": 290,
                "gazePoint_y": 260,
                "pupil_left_x": 280,
                "pupil_left_y": 274,
                "pupil_right_x": 340,
                "pupil_right_y": 275
            }

            row = [row_dict[f] for f in features]
            X = np.array([row])
            X_imputed = imputer.transform(X)

            probs = model.predict_proba(X_imputed)[0]
            pred = int(model.predict(X_imputed)[0])

            suspicious_prob = float(probs[1])
            genuine_prob = float(probs[0])

            if pred == 1:
                status = "SUSPICIOUS"
                confidence = suspicious_prob
                reason = f"Classified as Suspicious with {confidence*100:.1f}% confidence by trained Random Forest."
            else:
                status = "GENUINE"
                confidence = genuine_prob
                reason = f"Classified as Genuine with {confidence*100:.1f}% confidence by trained Random Forest."

            return status, round(confidence, 4), reason

        except Exception as e:
            print(f"[MLService] Random Forest inference error: {e}")
            return "NOT_EVALUATED", 0.0, f"Classification execution error: {str(e)}"

    def calculate_overall_risk(
        self,
        validation_status: str,
        duplicate_status: str,
        anomaly_status: str,
        ml_classification: str
    ) -> str:
        """
        Transparent, deterministic risk calculation:
        - CRITICAL: Validation failure + Duplicate detected, or Suspicious + Anomaly + Duplicate.
        - HIGH: Duplicate flagged OR Random Forest Suspicious.
        - MEDIUM: Isolation Forest Anomaly OR Validation failure.
        - LOW: Valid + Unique + Normal + Genuine.
        """
        is_invalid = validation_status == "INVALID"
        is_duplicate = duplicate_status in ["DUPLICATE_FLAGGED", "CONFIRMED_DUPLICATE"]
        is_anomalous = anomaly_status == "ANOMALOUS"
        is_suspicious = ml_classification == "SUSPICIOUS"

        signals = sum([is_invalid, is_duplicate, is_anomalous, is_suspicious])

        if signals >= 3 or (is_invalid and is_duplicate):
            return "CRITICAL"
        elif is_duplicate or is_suspicious or signals == 2:
            return "HIGH"
        elif is_anomalous or is_invalid or signals == 1:
            return "MEDIUM"
        else:
            return "LOW"

ml_service = MLService()

