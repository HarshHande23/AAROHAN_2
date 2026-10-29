from fastapi import APIRouter, Depends, HTTPException, status
from app.models.entities import User
from app.schemas.schemas import MLModelStatusResponse
from app.security.auth import get_current_user
from app.security.rbac import require_roles
from app.services.ml_service import ml_service
from app.ml.training.train_isolation_forest import train_isolation_forest
from app.ml.training.train_random_forest import train_random_forest

router = APIRouter(prefix="/ml", tags=["Machine Learning"])

@router.get("/status")
def get_ml_status(current_user: User = Depends(get_current_user)):
    # Refresh metadata in service if available
    ml_service.load_models()

    if_meta = ml_service.if_metadata or {
        "model_name": "APAAR Student Lifestyle Anomaly Detector",
        "version": "1.0.0",
        "algorithm": "sklearn.ensemble.IsolationForest",
        "is_trained": ml_service.if_pipeline is not None,
        "status_message": "Model not initialized"
    }

    rf_meta = ml_service.rf_metadata or {
        "model_name": "APAAR Academic Suspicious Behavior Classifier",
        "version": "1.0.0",
        "algorithm": "sklearn.ensemble.RandomForestClassifier",
        "is_trained": ml_service.rf_pipeline is not None,
        "status_message": "Model not initialized"
    }

    return {
        "isolation_forest": if_meta,
        "random_forest": rf_meta
    }

@router.post("/isolation-forest/train")
def retrain_isolation_forest(
    current_user: User = Depends(require_roles(["AICTE_ADMIN"]))
):
    try:
        metadata = train_isolation_forest()
        ml_service.load_models()
        return {
            "success": True,
            "message": "Isolation Forest model retrained and serialized successfully on official golden data.csv.",
            "metadata": metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Isolation Forest retraining failed: {str(e)}")

@router.post("/random-forest/train")
def retrain_random_forest(
    current_user: User = Depends(require_roles(["AICTE_ADMIN"]))
):
    try:
        metadata = train_random_forest()
        ml_service.load_models()
        return {
            "success": True,
            "message": "Random Forest classifier retrained and serialized successfully on Students suspicious behaviors dataset.",
            "metadata": metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Random Forest retraining failed: {str(e)}")

