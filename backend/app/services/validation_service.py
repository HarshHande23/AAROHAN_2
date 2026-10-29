import re
from typing import List, Tuple, Dict, Any

class ValidationService:
    @staticmethod
    def validate_student_record(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []

        # Rule 1: Mandatory Fields
        required_fields = ["apaar_id", "student_id", "full_name", "email", "institution_id", "degree_program", "certificate_number"]
        for rf in required_fields:
            val = data.get(rf)
            if val is None or str(val).strip() == "":
                errors.append(f"Missing mandatory field: '{rf}' cannot be empty.")

        # Rule 2: APAAR Identifier Specification
        apaar = str(data.get("apaar_id", "")).strip().upper()
        if apaar:
            # Pattern allows APAAR-YYYY-XXXX, APAAR-XXXX-XXXX, or 10-18 alphanumeric chars
            if len(apaar) < 8 or not re.match(r'^(APAAR-?([0-9]{4})-?[A-Z0-9]{4,10}|[A-Z0-9]{10,20})$', apaar):
                errors.append(f"Invalid APAAR ID format '{apaar}'. Must comply with national schema (e.g. APAAR-YYYY-XXXX).")

        # Rule 3: CGPA & GPA Scale (Standard 0.0 - 4.0)
        try:
            cgpa = float(data.get("cgpa", 0.0))
            if cgpa < 0.0 or cgpa > 4.0:
                errors.append(f"CGPA value {cgpa} is out of bounds. Valid academic range is 0.00 to 4.00.")
        except (ValueError, TypeError):
            errors.append("Invalid CGPA numeric format.")

        try:
            last_gpa = float(data.get("last_semester_gpa", 0.0))
            if last_gpa < 0.0 or last_gpa > 4.0:
                errors.append(f"Last semester GPA {last_gpa} is out of bounds. Valid range is 0.00 to 4.00.")
        except (ValueError, TypeError):
            errors.append("Invalid Last Semester GPA numeric format.")

        # Rule 4: Attendance Range Check (0.0% to 100.0%)
        try:
            att = float(data.get("attendance_percentage", 0.0))
            if att < 0.0 or att > 100.0:
                errors.append(f"Attendance percentage {att}% is invalid. Must be between 0.0% and 100.0%.")
        except (ValueError, TypeError):
            errors.append("Invalid Attendance percentage format.")

        # Rule 5: Certificate Issue Date & Chronology Check
        adm_date = str(data.get("admission_date", "")).strip()
        cert_date = str(data.get("certificate_issue_date", "")).strip()
        if adm_date and cert_date:
            try:
                # Compare ISO dates YYYY-MM-DD
                if cert_date < adm_date:
                    errors.append(f"Chronology conflict: Certificate issue date ({cert_date}) precedes admission date ({adm_date}).")
            except Exception:
                pass

        # Rule 6: Email Domain & Format Check
        email = str(data.get("email", "")).strip()
        if email and not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
            errors.append(f"Invalid email address syntax: '{email}'.")

        is_valid = len(errors) == 0
        return is_valid, errors

validation_service = ValidationService()

