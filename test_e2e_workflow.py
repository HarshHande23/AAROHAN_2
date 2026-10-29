import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    print("=" * 80)
    print("CRITICAL END-TO-END TEST EXECUTION FOR APAAR PS2")
    print("=" * 80)

    # 1. Login with real credentials
    print("\n[Step 1] Authenticating as AICTE Admin...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@aicte.gov.in",
        "password": "Admin@1234",
        "role": "AICTE_ADMIN"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("[PASS] Successfully authenticated! Token received.")

    # 2. Check Dashboard initial state (Empty Database)
    print("\n[Step 2 & 3] Querying initial Dashboard metrics...")
    dash_resp = requests.get(f"{BASE_URL}/dashboard", headers=headers)
    assert dash_resp.status_code == 200, f"Dashboard query failed: {dash_resp.text}"
    metrics = dash_resp.json()
    print(f"Total Students: {metrics['total_students']}")
    print(f"Duplicate Cases: {metrics['duplicate_cases']}")
    print(f"Anomalies: {metrics['anomalies_detected']}")
    print(f"Suspicious Records: {metrics['suspicious_records']}")
    print(f"Active Alerts: {metrics['active_alerts']}")
    assert metrics['total_students'] == 0, f"Expected 0 students initially, got {metrics['total_students']}"
    assert metrics['duplicate_cases'] == 0
    assert metrics['anomalies_detected'] == 0
    assert metrics['suspicious_records'] == 0
    print("[PASS] Confirmed Dashboard starts at genuine count 0 with no hardcoded or fake records!")

    # 4. Add one legitimate student
    print("\n[Step 4 & 5] Enrolling legitimate student 1...")
    student_1_payload = {
        "apaar_id": "APAAR-2026-1001",
        "student_id": "REG-2026-1001",
        "full_name": "Arjun Sundaram",
        "email": "arjun.sundaram@iitd.ac.in",
        "phone": "+919876543201",
        "gender": "Male",
        "date_of_birth": "2003-04-12",
        "institution_id": 1,
        "degree_program": "B.Tech Computer Science and Engineering",
        "department": "Computer Science and Engineering",
        "academic_year": "2025-2026",
        "current_semester": "6th",
        "admission_date": "2022-08-01",
        "cgpa": 3.85,
        "last_semester_gpa": 3.90,
        "attendance_percentage": 94.5,
        "study_hours_per_day": 6.0,
        "sleep_hours": 7.5,
        "gaming_hours": 0.5,
        "certificate_number": "CERT-2026-10010",
        "certificate_issue_date": "2022-08-15"
    }

    add_resp_1 = requests.post(f"{BASE_URL}/students", json=student_1_payload, headers=headers)
    assert add_resp_1.status_code == 200, f"Enrolment 1 failed: {add_resp_1.text}"
    s1 = add_resp_1.json()
    print(f"[PASS] Student 1 Enrolled: ID #{s1['id']} - {s1['full_name']} ({s1['apaar_id']})")

    # 6-9. Verify validation, duplicate checks, and ML inference
    print("\n[Step 6-9] Verifying real-time inference on Student 1:")
    print(f"  - Validation Status: {s1['validation_status']} (Errors: {s1['validation_errors']})")
    print(f"  - Duplicate Status:  {s1['duplicate_status']}")
    print(f"  - Isolation Forest:  {s1['anomaly_status']} (Score: {s1['anomaly_score']})")
    print(f"  - Random Forest:     {s1['ml_classification']} (Confidence: {s1['ml_confidence']*100:.1f}%)")
    print(f"  - Overall Risk:      {s1['overall_risk_level']}")
    assert s1['validation_status'] == "VALID"
    assert s1['duplicate_status'] == "UNIQUE"
    assert s1['anomaly_status'] == "NORMAL"
    assert s1['ml_classification'] == "GENUINE"
    assert s1['overall_risk_level'] == "LOW"
    print("[PASS] Validation, duplicate detection, and saved ML model inference executed successfully!")

    # 10. Confirm student appears in registry
    print("\n[Step 10] Checking registry list...")
    list_resp = requests.get(f"{BASE_URL}/students", headers=headers)
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data['total'] == 1
    assert list_data['items'][0]['id'] == s1['id']
    print(f"[PASS] Confirmed Student #{s1['id']} appears in student registry query.")

    # 11. Confirm dashboard changes from 0 to 1
    print("\n[Step 11] Checking Dashboard update...")
    dash_resp_2 = requests.get(f"{BASE_URL}/dashboard", headers=headers)
    m2 = dash_resp_2.json()
    print(f"Total Students: {m2['total_students']}")
    print(f"Records Validated: {m2['records_validated']}")
    print(f"Genuine Records: {m2['genuine_records']}")
    assert m2['total_students'] == 1, f"Expected dashboard count 1, got {m2['total_students']}"
    assert m2['records_validated'] == 1
    assert m2['genuine_records'] == 1
    print("[PASS] Confirmed Dashboard updated in real-time from 0 to 1!")

    # 12. Add another student with duplicate information
    print("\n[Step 12-14] Enrolling Student 2 with duplicate APAAR ID and certificate...")
    student_2_payload = {
        "apaar_id": "APAAR-2026-1001",  # Duplicate APAAR ID!
        "student_id": "REG-2026-9999",
        "full_name": "Imposter Record",
        "email": "imposter@test.com",
        "phone": None,
        "gender": "Male",
        "date_of_birth": "2001-01-01",
        "institution_id": 2,
        "degree_program": "B.Tech Computer Science",
        "department": "Computer Science",
        "academic_year": "2025-2026",
        "current_semester": "4th",
        "admission_date": "2023-08-01",
        "cgpa": 2.10,
        "last_semester_gpa": 2.00,
        "attendance_percentage": 45.0,
        "study_hours_per_day": 2.0,
        "sleep_hours": 5.0,
        "gaming_hours": 3.0,
        "certificate_number": "CERT-2026-10010",  # Duplicate cert!
        "certificate_issue_date": "2023-08-15"
    }

    add_resp_2 = requests.post(f"{BASE_URL}/students", json=student_2_payload, headers=headers)
    assert add_resp_2.status_code == 200, f"Enrolment 2 failed: {add_resp_2.text}"
    s2 = add_resp_2.json()
    print(f"[PASS] Student 2 Enrolled: ID #{s2['id']} - Duplicate Status: {s2['duplicate_status']}")
    print(f"  - Duplicate Reason: {s2['duplicate_reason']}")
    print(f"  - Overall Risk:     {s2['overall_risk_level']}")
    assert s2['duplicate_status'] == "DUPLICATE_FLAGGED"
    assert s2['duplicate_match_id'] == s1['id']

    # Confirm alert creation
    alerts_resp = requests.get(f"{BASE_URL}/alerts", headers=headers)
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    print(f"Active Alerts in Queue: {len(alerts)}")
    assert len(alerts) >= 1
    dup_alert = next((a for a in alerts if a['alert_type'] == 'DUPLICATE_DETECTED'), None)
    assert dup_alert is not None, "Expected DUPLICATE_DETECTED alert in queue!"
    print(f"[PASS] Confirmed Alert #{dup_alert['id']} created for Student #{s2['id']}: {dup_alert['reason']}")

    # 15. Import CSV through Bulk Import
    print("\n[Step 15-18] Testing Bulk Import feature...")
    csv_data = (
        "apaar_id,student_id,full_name,email,degree_program,cgpa,last_semester_gpa,attendance_percentage,certificate_number,admission_date,certificate_issue_date\n"
        "APAAR-2026-3001,REG-2026-3001,Meera Nambiar,meera@bits.edu,B.Tech Information Technology,3.95,3.92,96.0,CERT-2026-3001,2023-08-01,2023-08-15\n"
        "APAAR-2026-3002,REG-2026-3002,Devendra Yadav,dev@iitb.edu,B.Tech Mechanical Engineering,3.20,3.15,78.0,CERT-2026-3002,2022-08-01,2022-08-15\n"
        "APAAR-2026-3003,REG-2026-3003,Karan Malhotra,karan@dtu.edu,B.Tech Electrical Engineering,1.10,1.05,42.0,CERT-2026-3003,2023-08-01,2023-08-15\n"
        "APAAR-INVALID-XX,REG-2026-9999,Invalid Record,bad@email,B.Tech,5.50,6.00,120.0,CERT-2026-9999,2023-08-01,2023-08-15\n"  # Malformed!
    )

    files = {"file": ("test_batch.csv", csv_data, "text/csv")}
    bulk_resp = requests.post(f"{BASE_URL}/bulk-import", files=files, data={"institution_id": 1}, headers={"Authorization": f"Bearer {token}"})
    assert bulk_resp.status_code == 200, f"Bulk import failed: {bulk_resp.text}"
    b_res = bulk_resp.json()
    print(f"Bulk Import Result: Total={b_res['total_rows']}, Success={b_res['success_count']}, Failed={b_res['failed_count']}")
    print(f"Failed Rows Details: {b_res['errors']}")
    assert b_res['success_count'] == 3
    assert b_res['failed_count'] == 1
    print("[PASS] Bulk Import verified! Correctly imported 3 valid records and rejected malformed row.")

    # Check updated Dashboard counts
    dash_resp_3 = requests.get(f"{BASE_URL}/dashboard", headers=headers)
    m3 = dash_resp_3.json()
    print(f"\nUpdated Dashboard Totals: Total Students = {m3['total_students']}, Records Validated = {m3['records_validated']}")
    assert m3['total_students'] == 5 # 1 initial + 1 duplicate + 3 imported = 5 total
    print("[PASS] Dashboard accurately updated to 5 students.")

    # 19-20. Check Reports
    print("\n[Step 19] Verifying Compliance Report calculation...")
    rep_resp = requests.get(f"{BASE_URL}/reports", headers=headers)
    assert rep_resp.status_code == 200
    rep = rep_resp.json()
    print(f"Compliance Report: Total Enrolled = {rep['total_enrolled']}, Valid Rate = {rep['valid_percentage']}%, Duplicate Rate = {rep['duplicate_rate']}%")
    assert rep['total_enrolled'] == 5
    print("[PASS] Compliance report generated with real database calculations.")

    print("\n" + "=" * 80)
    print("ALL CRITICAL END-TO-END TEST CASES PASSED 100% SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
