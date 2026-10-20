/**
 * Shiloh Clinic & Maternity — Central Demo Data
 * ──────────────────────────────────────────────────────────────────────
 * Single source of truth for ALL demo data used across every page.
 * Import this file in any service or page that needs demo data.
 *
 * Usage:
 *   <script src="../data/demo-data.js"></script>
 *   Then access: window.DemoData.patients, .doctors, .appointments, etc.
 */

const DemoData = {

  /* ━━━ PATIENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  patients: [
    {
      id: 'P-001',
      name: 'John O. Adekunle',
      hospitalNo: 'SHC-000001',
      gender: 'Male',
      age: '34',
      bloodType: 'O+',
      maritalStatus: 'Married',
      occupation: 'Business',
      genotype: 'AA',
      patientType: 'Outpatient',
      religion: 'Christianity',
      stateOfOrigin: 'Edo State',
      lga: 'Uromi',
      dateOfBirth: '15 / 06 / 1990',
      lastVisit: 'May 16, 2025',
      registeredOn: 'May 17, 2025 09:30 AM',
      registeredBy: 'Receptionist',
      phonePrimary: '0803 123 4567',
      phoneSecondary: '0705 765 4321',
      email: 'johnade@gmail.com',
      address: '12 Mission Road, Uromi, Edo State, Nigeria',
      lastCheckIn: 'May 17, 2025',
      status: 'Active',
      allergies: 'No known allergies',
      chronicConditions: 'No chronic conditions recorded',
      emergencyContact: {
        name: 'Mrs. Mary Adekunle',
        relationship: 'Wife',
        phone: '0803 222 3344',
        address: '12 Mission Road, Uromi, Edo State, Nigeria'
      },
      visitHistory: [
        { id: 'VIS-000089', date: 'May 16, 2025', department: 'General OPD', doctor: 'Dr. Samuel O.', status: 'Completed', reason: 'Persistent headache and dizziness for 3 days', diagnosis: 'Tension headache', notes: 'Prescribed analgesics, advised rest. Follow up in 2 weeks if no improvement.' },
        { id: 'VIS-000075', date: 'May 9, 2025', department: 'General OPD', doctor: 'Dr. Samuel O.', status: 'Completed', reason: 'Recurrent abdominal pain after meals', diagnosis: 'Gastritis', notes: 'Started on antacids. Avoid spicy foods.' },
        { id: 'VIS-000061', date: 'Apr 28, 2025', department: 'General OPD', doctor: 'Dr. Samuel O.', status: 'Completed', reason: 'Annual health check-up', diagnosis: 'Generally healthy', notes: 'All vitals normal. Blood work ordered.' },
        { id: 'VIS-000048', date: 'Apr 20, 2025', department: 'General OPD', doctor: 'Dr. Samuel O.', status: 'Completed', reason: 'Persistent cough for 1 week', diagnosis: 'Upper respiratory infection', notes: 'Prescribed antibiotics and cough suppressant.' },
        { id: 'VIS-000033', date: 'Apr 12, 2025', department: 'General OPD', doctor: 'Dr. Samuel O.', status: 'Completed', reason: 'Follow-up on hypertension management', diagnosis: 'Hypertension - controlled', notes: 'BP stable at 130/85. Continue current medication.' }
      ],
      prescriptionHistory: [
        { id: 'RX-000067', date: 'May 16, 2025', doctor: 'Dr. Samuel O.', status: 'Dispensed' },
        { id: 'RX-000055', date: 'May 9, 2025', doctor: 'Dr. Samuel O.', status: 'Dispensed' },
        { id: 'RX-000043', date: 'Apr 28, 2025', doctor: 'Dr. Samuel O.', status: 'Dispensed' },
        { id: 'RX-000029', date: 'Apr 20, 2025', doctor: 'Dr. Samuel O.', status: 'Dispensed' },
        { id: 'RX-000018', date: 'Apr 12, 2025', doctor: 'Dr. Samuel O.', status: 'Dispensed' }
      ],
      contactHistory: [
        { type: 'Phone', value: '0803 123 4567', date: 'May 17, 2025' },
        { type: 'Email', value: 'johnade@gmail.com', date: 'May 15, 2025' },
        { type: 'Address', value: '12 Mission Road, Uromi, Edo State, Nigeria', date: 'May 10, 2025' }
      ]
    },
    {
      id: 'P-002',
      name: 'Mary A. Johnson',
      hospitalNo: 'SHC-000002',
      gender: 'Female',
      age: '28',
      bloodType: 'A-',
      maritalStatus: 'Single',
      occupation: 'Nurse',
      genotype: 'AS',
      patientType: 'Outpatient',
      religion: 'Islam',
      stateOfOrigin: 'Lagos State',
      lga: 'Ikeja',
      dateOfBirth: '02 / 08 / 1997',
      lastVisit: 'May 15, 2025',
      registeredOn: 'May 1, 2025 10:15 AM',
      registeredBy: 'Nurse',
      phonePrimary: '0805 555 1234',
      phoneSecondary: '0811 222 3334',
      email: 'mary.johnson@email.com',
      address: '8 Bridge Street, Lagos, Lagos State, Nigeria',
      lastCheckIn: 'May 15, 2025',
      status: 'Active',
      allergies: 'Penicillin',
      chronicConditions: 'Asthma',
      emergencyContact: {
        name: 'Mr. Johnson O.',
        relationship: 'Father',
        phone: '0803 444 5555',
        address: '10 Street, Lagos, Lagos State, Nigeria'
      },
      visitHistory: [
        { id: 'VIS-000088', date: 'May 15, 2025', department: 'General OPD', doctor: 'Dr. Adeola', status: 'Completed', reason: 'Asthma flare-up, difficulty breathing', diagnosis: 'Acute asthma exacerbation', notes: 'Adjusted inhaler dosage. Avoid dust exposure.' },
        { id: 'VIS-000076', date: 'May 10, 2025', department: 'Dermatology', doctor: 'Dr. Funke', status: 'Completed', reason: 'Skin rash on arms and torso', diagnosis: 'Contact dermatitis', notes: 'Prescribed topical corticosteroid. Avoid suspected irritant.' }
      ],
      prescriptionHistory: [
        { id: 'RX-000101', date: 'May 15, 2025', doctor: 'Dr. Adeola', status: 'Dispensed' },
        { id: 'RX-000089', date: 'May 10, 2025', doctor: 'Dr. Funke', status: 'Dispensed' }
      ],
      contactHistory: [
        { type: 'Phone', value: '0805 555 1234', date: 'May 15, 2025' },
        { type: 'Email', value: 'mary.johnson@email.com', date: 'May 14, 2025' }
      ]
    },
    {
      id: 'P-003',
      name: 'Peter I. Okafor',
      hospitalNo: 'SHC-000003',
      gender: 'Male',
      age: '45',
      bloodType: 'B+',
      maritalStatus: 'Single',
      occupation: 'Engineer',
      genotype: 'SS',
      patientType: 'Outpatient',
      religion: 'Tradist',
      stateOfOrigin: 'Anambra State',
      lga: 'Awka',
      dateOfBirth: '10 / 11 / 1980',
      lastVisit: 'May 12, 2025',
      registeredOn: 'Apr 20, 2025 02:30 PM',
      registeredBy: 'Doctor',
      phonePrimary: '0806 666 7777',
      phoneSecondary: '0815 333 4445',
      email: 'peter.o@email.com',
      address: '25 High Street, Awka, Anambra State, Nigeria',
      lastCheckIn: 'May 12, 2025',
      status: 'Active',
      allergies: 'Shellfish',
      chronicConditions: 'Hypertension',
      emergencyContact: {
        name: 'Mrs. Okafor',
        relationship: 'Mother',
        phone: '0807 888 9999',
        address: '10 Street, Awka, Anambra State, Nigeria'
      },
      visitHistory: [
        { id: 'VIS-000087', date: 'May 12, 2025', department: 'General OPD', doctor: 'Dr. Adeola', status: 'Completed', reason: 'Chest pain and shortness of breath', diagnosis: 'Musculoskeletal chest pain', notes: 'ECG normal. Prescribed anti-inflammatory. Return if symptoms worsen.' },
        { id: 'VIS-000055', date: 'May 5, 2025', department: 'Orthopaedic', doctor: 'Dr. Chinedu', status: 'Completed', reason: 'Follow-up on left knee injury', diagnosis: 'Mild ligament sprain', notes: 'Physiotherapy recommended. Avoid heavy lifting for 2 weeks.' }
      ],
      prescriptionHistory: [
        { id: 'RX-000077', date: 'May 12, 2025', doctor: 'Dr. Adeola', status: 'Dispensed' },
        { id: 'RX-000055', date: 'May 5, 2025', doctor: 'Dr. Chinedu', status: 'Dispensed' }
      ],
      contactHistory: [
        { type: 'Phone', value: '0806 666 7777', date: 'May 12, 2025' },
        { type: 'Email', value: 'peter.o@email.com', date: 'May 10, 2025' }
      ]
    },
    {
      id: 'P-004',
      name: 'Grace U. Emu',
      hospitalNo: 'SHC-000004',
      gender: 'Female',
      age: '32',
      bloodType: 'AB-',
      maritalStatus: 'Married',
      occupation: 'Trader',
      genotype: 'AA',
      patientType: 'Outpatient',
      religion: 'Christianity',
      stateOfOrigin: 'Delta State',
      lga: 'Warri',
      dateOfBirth: '25 / 12 / 1992',
      lastVisit: 'May 11, 2025',
      registeredOn: 'Mar 15, 2025 11:00 AM',
      registeredBy: 'Midwife',
      phonePrimary: '0807 888 9999',
      phoneSecondary: '0816 777 8888',
      email: 'grace.emu@email.com',
      address: '36 Water Road, Warri, Delta State, Nigeria',
      lastCheckIn: 'May 11, 2025',
      status: 'Active',
      allergies: 'None',
      chronicConditions: 'None',
      emergencyContact: {
        name: 'Chukwudi Emu',
        relationship: 'Husband',
        phone: '0805 555 7777',
        address: '36 Water Road, Warri, Delta State, Nigeria'
      },
      visitHistory: [
        { id: 'VIS-000086', date: 'May 11, 2025', department: 'General OPD', doctor: 'Dr. Adeola', status: 'Completed', reason: 'Lower abdominal pain', diagnosis: 'Mild pelvic inflammatory disease', notes: 'Prescribed antibiotics. Follow up in 1 week.' },
        { id: 'VIS-000044', date: 'May 3, 2025', department: 'Family Planning', doctor: 'Dr. Funke', status: 'Completed', reason: 'Family planning consultation', diagnosis: 'Counseling completed', notes: 'Discussed contraceptive options. Patient chose IUD. Inserted successfully.' }
      ],
      prescriptionHistory: [
        { id: 'RX-000071', date: 'May 11, 2025', doctor: 'Dr. Adeola', status: 'Dispensed' },
        { id: 'RX-000044', date: 'May 3, 2025', doctor: 'Dr. Funke', status: 'Dispensed' }
      ],
      contactHistory: [
        { type: 'Phone', value: '0807 888 9999', date: 'May 11, 2025' },
        { type: 'Email', value: 'grace.emu@email.com', date: 'May 8, 2025' }
      ]
    },
    {
      id: 'P-005',
      name: 'Michael E. Lucky',
      hospitalNo: 'SHC-000005',
      gender: 'Male',
      age: '51',
      bloodType: 'O+',
      maritalStatus: 'Divorced',
      occupation: 'Civil Servant',
      genotype: 'AC',
      patientType: 'Outpatient',
      religion: 'Christianity',
      stateOfOrigin: 'Oyo State',
      lga: 'Ibadan',
      dateOfBirth: '08 / 03 / 1974',
      lastVisit: 'May 10, 2025',
      registeredOn: 'Feb 14, 2025 04:00 PM',
      registeredBy: 'Accountant',
      phonePrimary: '0808 888 9999',
      phoneSecondary: '0817 444 5555',
      email: 'm.lucky@email.com',
      address: '18 Challenge Road, Ibadan, Oyo State, Nigeria',
      lastCheckIn: 'May 10, 2025',
      status: 'Active',
      allergies: 'Sulfa drugs',
      chronicConditions: 'Diabetes Type 2',
      emergencyContact: {
        name: 'Funmi Lucky',
        relationship: 'Ex-wife',
        phone: '0805 555 6666',
        address: '18 Challenge Road, Ibadan, Oyo State, Nigeria'
      },
      visitHistory: [
        { id: 'VIS-000085', date: 'May 10, 2025', department: 'General OPD', doctor: 'Dr. Adeola', status: 'Completed', reason: 'Routine diabetes follow-up', diagnosis: 'Type 2 Diabetes - poorly controlled', notes: 'HbA1c elevated. Increased Metformin dosage. Diet review scheduled.' },
        { id: 'VIS-000050', date: 'May 3, 2025', department: 'Laboratory', doctor: 'Dr. Chika', status: 'Completed', reason: 'Blood glucose monitoring', diagnosis: 'Hyperglycemia', notes: 'Fasting glucose 180mg/dL. Adjusted medication.' }
      ],
      prescriptionHistory: [
        { id: 'RX-000072', date: 'May 10, 2025', doctor: 'Dr. Adeola', status: 'Dispensed' },
        { id: 'RX-000050', date: 'May 3, 2025', doctor: 'Dr. Chika', status: 'Dispensed' }
      ],
      contactHistory: [
        { type: 'Phone', value: '0808 888 9999', date: 'May 10, 2025' },
        { type: 'Email', value: 'm.lucky@email.com', date: 'May 8, 2025' }
      ]
    },
    {
      id: 'P-006',
      name: 'Amina B. Yusuf',
      hospitalNo: 'SHC-000006',
      gender: 'Female',
      age: '27',
      bloodType: 'A+',
      maritalStatus: 'Married',
      occupation: 'Teacher',
      genotype: 'AA',
      patientType: 'Outpatient',
      religion: 'Islam',
      stateOfOrigin: 'Kano State',
      lga: 'Kano Municipal',
      dateOfBirth: '18 / 03 / 1998',
      lastVisit: 'May 14, 2025',
      registeredOn: 'Jan 10, 2025 08:45 AM',
      registeredBy: 'Receptionist',
      phonePrimary: '0809 111 2222',
      phoneSecondary: '0812 333 4444',
      email: 'amina.yusuf@email.com',
      address: '5 Murtala Mohammed Way, Kano, Kano State, Nigeria',
      lastCheckIn: 'May 14, 2025',
      status: 'Active',
      allergies: 'No known allergies',
      chronicConditions: 'None',
      emergencyContact: {
        name: 'Ibrahim Yusuf',
        relationship: 'Husband',
        phone: '0809 555 6666',
        address: '5 Murtala Mohammed Way, Kano, Kano State, Nigeria'
      },
      visitHistory: [
        { id: 'VIS-000090', date: 'May 14, 2025', department: 'Antenatal', doctor: 'Dr. Funke', status: 'Completed', reason: 'Monthly antenatal checkup - 28 weeks', diagnosis: 'Normal pregnancy progression', notes: 'Fundal height normal. Fetal heartbeat strong. Continue folic acid.' },
        { id: 'VIS-000080', date: 'May 7, 2025', department: 'Antenatal', doctor: 'Dr. Funke', status: 'Completed', reason: 'Antenatal visit - blood pressure check', diagnosis: 'Mild pregnancy-induced hypertension', notes: 'BP 138/90. Monitor closely. Return in 1 week.' }
      ],
      prescriptionHistory: [
        { id: 'RX-000095', date: 'May 14, 2025', doctor: 'Dr. Funke', status: 'Dispensed' },
        { id: 'RX-000085', date: 'May 7, 2025', doctor: 'Dr. Funke', status: 'Dispensed' }
      ],
      contactHistory: [
        { type: 'Phone', value: '0809 111 2222', date: 'May 14, 2025' }
      ]
    },
    {
      id: 'P-007',
      name: 'Emeka D. Nwosu',
      hospitalNo: 'SHC-000007',
      gender: 'Male',
      age: '39',
      bloodType: 'B-',
      maritalStatus: 'Married',
      occupation: 'Lawyer',
      genotype: 'AA',
      patientType: 'Outpatient',
      religion: 'Christianity',
      stateOfOrigin: 'Imo State',
      lga: 'Owerri',
      dateOfBirth: '22 / 07 / 1986',
      lastVisit: 'May 13, 2025',
      registeredOn: 'Mar 2, 2025 01:20 PM',
      registeredBy: 'Receptionist',
      phonePrimary: '0803 777 8888',
      phoneSecondary: '0814 999 0000',
      email: 'emeka.nwosu@email.com',
      address: '42 Wetheral Road, Owerri, Imo State, Nigeria',
      lastCheckIn: 'May 13, 2025',
      status: 'Active',
      allergies: 'Ibuprofen',
      chronicConditions: 'None',
      emergencyContact: {
        name: 'Ngozi Nwosu',
        relationship: 'Wife',
        phone: '0803 111 0000',
        address: '42 Wetheral Road, Owerri, Imo State, Nigeria'
      },
      visitHistory: [
        { id: 'VIS-000091', date: 'May 13, 2025', department: 'General OPD', doctor: 'Dr. Samuel O.', status: 'Completed', reason: 'Back pain radiating to left leg', diagnosis: 'Lumbar disc herniation', notes: 'MRI recommended. Prescribed muscle relaxant and painkiller. Avoid prolonged sitting.' }
      ],
      prescriptionHistory: [
        { id: 'RX-000098', date: 'May 13, 2025', doctor: 'Dr. Samuel O.', status: 'Dispensed' }
      ],
      contactHistory: [
        { type: 'Phone', value: '0803 777 8888', date: 'May 13, 2025' },
        { type: 'Email', value: 'emeka.nwosu@email.com', date: 'May 12, 2025' }
      ]
    },
    {
      id: 'P-008',
      name: 'Fatima H. Abdullahi',
      hospitalNo: 'SHC-000008',
      gender: 'Female',
      age: '41',
      bloodType: 'O-',
      maritalStatus: 'Widowed',
      occupation: 'Nurse',
      genotype: 'AS',
      patientType: 'Outpatient',
      religion: 'Islam',
      stateOfOrigin: 'Kaduna State',
      lga: 'Kaduna North',
      dateOfBirth: '05 / 11 / 1984',
      lastVisit: 'May 8, 2025',
      registeredOn: 'Dec 15, 2024 09:00 AM',
      registeredBy: 'Nurse',
      phonePrimary: '0805 333 4444',
      phoneSecondary: '0816 555 6666',
      email: 'fatima.abdullahi@email.com',
      address: '17 Ahmadu Bello Way, Kaduna, Kaduna State, Nigeria',
      lastCheckIn: 'May 8, 2025',
      status: 'Active',
      allergies: 'No known allergies',
      chronicConditions: 'Hypertension',
      emergencyContact: {
        name: 'Yusuf Abdullahi',
        relationship: 'Brother',
        phone: '0805 777 8888',
        address: '17 Ahmadu Bello Way, Kaduna, Kaduna State, Nigeria'
      },
      visitHistory: [
        { id: 'VIS-000084', date: 'May 8, 2025', department: 'General OPD', doctor: 'Dr. Adeola', status: 'Completed', reason: 'Hypertension follow-up', diagnosis: 'Hypertension - borderline controlled', notes: 'BP 140/90. Adjusted Amlodipine to 10mg. Low salt diet reinforced.' },
        { id: 'VIS-000070', date: 'Apr 25, 2025', department: 'Cardiology', doctor: 'Dr. Chinedu', status: 'Completed', reason: 'Cardiac evaluation - palpitations', diagnosis: 'Sinus tachycardia', notes: 'ECG showed normal sinus rhythm. No structural abnormality. Reassurance given.' }
      ],
      prescriptionHistory: [
        { id: 'RX-000068', date: 'May 8, 2025', doctor: 'Dr. Adeola', status: 'Dispensed' },
        { id: 'RX-000052', date: 'Apr 25, 2025', doctor: 'Dr. Chinedu', status: 'Dispensed' }
      ],
      contactHistory: [
        { type: 'Phone', value: '0805 333 4444', date: 'May 8, 2025' }
      ]
    },
    {
      id: 'P-009',
      name: 'Tunde B. Oladipo',
      hospitalNo: 'SHC-000009',
      gender: 'Male',
      age: '55',
      bloodType: 'AB+',
      maritalStatus: 'Married',
      occupation: 'Farmer',
      genotype: 'AC',
      patientType: 'Outpatient',
      religion: 'Christianity',
      stateOfOrigin: 'Ogun State',
      lga: 'Abeokuta',
      dateOfBirth: '30 / 01 / 1970',
      lastVisit: 'May 6, 2025',
      registeredOn: 'Nov 20, 2024 03:15 PM',
      registeredBy: 'Receptionist',
      phonePrimary: '0807 222 3333',
      phoneSecondary: '0818 444 5555',
      email: 'tunde.oladipo@email.com',
      address: '9 Olabisi Onabanjo Avenue, Abeokuta, Ogun State, Nigeria',
      lastCheckIn: 'May 6, 2025',
      status: 'Active',
      allergies: 'Penicillin, Dust',
      chronicConditions: 'Diabetes Type 2, Hypertension',
      emergencyContact: {
        name: 'Bukola Oladipo',
        relationship: 'Wife',
        phone: '0807 666 7777',
        address: '9 Olabisi Onabanjo Avenue, Abeokuta, Ogun State, Nigeria'
      },
      visitHistory: [
        { id: 'VIS-000082', date: 'May 6, 2025', department: 'Endocrinology', doctor: 'Dr. Chika', status: 'Completed', reason: 'Diabetes and hypertension review', diagnosis: 'Uncontrolled diabetes with hypertension', notes: 'HbA1c 8.2%. BP elevated. Increased Metformin, added Gliclazide. Dietitian referral.' },
        { id: 'VIS-000068', date: 'Apr 22, 2025', department: 'General OPD', doctor: 'Dr. Samuel O.', status: 'Completed', reason: 'Foot numbness and tingling', diagnosis: 'Diabetic peripheral neuropathy', notes: 'Started on Pregabalin. Foot care education provided.' }
      ],
      prescriptionHistory: [
        { id: 'RX-000065', date: 'May 6, 2025', doctor: 'Dr. Chika', status: 'Dispensed' },
        { id: 'RX-000048', date: 'Apr 22, 2025', doctor: 'Dr. Samuel O.', status: 'Dispensed' }
      ],
      contactHistory: [
        { type: 'Phone', value: '0807 222 3333', date: 'May 6, 2025' },
        { type: 'Email', value: 'tunde.oladipo@email.com', date: 'May 5, 2025' }
      ]
    },
    {
      id: 'P-010',
      name: 'Chidinma E. Okolo',
      hospitalNo: 'SHC-000010',
      gender: 'Female',
      age: '29',
      bloodType: 'A+',
      maritalStatus: 'Single',
      occupation: 'Pharmacist',
      genotype: 'AA',
      patientType: 'Outpatient',
      religion: 'Christianity',
      stateOfOrigin: 'Abia State',
      lga: 'Umuahia',
      dateOfBirth: '14 / 09 / 1996',
      lastVisit: 'May 15, 2025',
      registeredOn: 'Feb 28, 2025 10:30 AM',
      registeredBy: 'Receptionist',
      phonePrimary: '0809 888 9999',
      phoneSecondary: '0812 777 8888',
      email: 'chidinma.okolo@email.com',
      address: '3 Mission Hill Road, Umuahia, Abia State, Nigeria',
      lastCheckIn: 'May 15, 2025',
      status: 'Active',
      allergies: 'No known allergies',
      chronicConditions: 'None',
      emergencyContact: {
        name: 'Nnabuchi Okolo',
        relationship: 'Father',
        phone: '0809 111 2222',
        address: '3 Mission Hill Road, Umuahia, Abia State, Nigeria'
      },
      visitHistory: [
        { id: 'VIS-000092', date: 'May 15, 2025', department: 'Dental', doctor: 'Dr. Funke', status: 'Completed', reason: 'Toothache - upper right molar', diagnosis: 'Dental caries with pulpitis', notes: 'X-ray taken. Root canal recommended. Amoxicillin prescribed for infection.' }
      ],
      prescriptionHistory: [
        { id: 'RX-000102', date: 'May 15, 2025', doctor: 'Dr. Funke', status: 'Pending' }
      ],
      contactHistory: [
        { type: 'Phone', value: '0809 888 9999', date: 'May 15, 2025' },
        { type: 'Email', value: 'chidinma.okolo@email.com', date: 'May 14, 2025' }
      ]
    }
  ],

  /* ━━━ DOCTORS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  doctors: [
    { id: 'D-001', name: 'Dr. Samuel O.', specialty: 'General Practice', phone: '0803 100 1001', email: 'samuel.o@shilohclinic.com', department: 'General OPD', status: 'Active' },
    { id: 'D-002', name: 'Dr. Adeola', specialty: 'Internal Medicine', phone: '0803 100 1002', email: 'adeola@shilohclinic.com', department: 'General OPD', status: 'Active' },
    { id: 'D-003', name: 'Dr. Funke', specialty: 'Dermatology', phone: '0803 100 1003', email: 'funke@shilohclinic.com', department: 'Dermatology', status: 'Active' },
    { id: 'D-004', name: 'Dr. Chinedu', specialty: 'Orthopaedic Surgery', phone: '0803 100 1004', email: 'chinedu@shilohclinic.com', department: 'Orthopaedic', status: 'Active' },
    { id: 'D-005', name: 'Dr. Chika', specialty: 'Endocrinology', phone: '0803 100 1005', email: 'chika@shilohclinic.com', department: 'Endocrinology', status: 'Active' },
    { id: 'D-006', name: 'Dr. Amara', specialty: 'Paediatrics', phone: '0803 100 1006', email: 'amara@shilohclinic.com', department: 'Paediatrics', status: 'Active' },
    { id: 'D-007', name: 'Dr. Bola', specialty: 'Obstetrics & Gynaecology', phone: '0803 100 1007', email: 'bola@shilohclinic.com', department: 'Antenatal', status: 'Active' },
    { id: 'D-008', name: 'Dr. Emeka', specialty: 'Cardiology', phone: '0803 100 1008', email: 'emeka@shilohclinic.com', department: 'Cardiology', status: 'Active' }
  ],

  /* ━━━ APPOINTMENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  appointments: [
    { id: 'APT-001', patientId: 'P-001', patientName: 'John O. Adekunle', doctor: 'Dr. Samuel O.', department: 'General OPD', date: 'May 18, 2025', time: '09:00 AM', status: 'Scheduled', type: 'Follow-up' },
    { id: 'APT-002', patientId: 'P-002', patientName: 'Mary A. Johnson', doctor: 'Dr. Adeola', department: 'General OPD', date: 'May 18, 2025', time: '10:30 AM', status: 'Scheduled', type: 'Consultation' },
    { id: 'APT-003', patientId: 'P-006', patientName: 'Amina B. Yusuf', doctor: 'Dr. Funke', department: 'Antenatal', date: 'May 18, 2025', time: '11:00 AM', status: 'Scheduled', type: 'Antenatal' },
    { id: 'APT-004', patientId: 'P-003', patientName: 'Peter I. Okafor', doctor: 'Dr. Chinedu', department: 'Orthopaedic', date: 'May 19, 2025', time: '02:00 PM', status: 'Scheduled', type: 'Follow-up' },
    { id: 'APT-005', patientId: 'P-009', patientName: 'Tunde B. Oladipo', doctor: 'Dr. Chika', department: 'Endocrinology', date: 'May 19, 2025', time: '09:30 AM', status: 'Scheduled', type: 'Lab Review' },
    { id: 'APT-006', patientId: 'P-004', patientName: 'Grace U. Emu', doctor: 'Dr. Funke', department: 'Family Planning', date: 'May 20, 2025', time: '10:00 AM', status: 'Scheduled', type: 'Consultation' },
    { id: 'APT-007', patientId: 'P-007', patientName: 'Emeka D. Nwosu', doctor: 'Dr. Samuel O.', department: 'General OPD', date: 'May 20, 2025', time: '02:30 PM', status: 'Scheduled', type: 'Follow-up' },
    { id: 'APT-008', patientId: 'P-010', patientName: 'Chidinma E. Okolo', doctor: 'Dr. Funke', department: 'Dental', date: 'May 21, 2025', time: '11:30 AM', status: 'Scheduled', type: 'Check-up' }
  ],

  /* ━━━ DEPARTMENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  departments: [
    { id: 'DEPT-001', name: 'General OPD', head: 'Dr. Samuel O.', phone: '0803 200 1001', status: 'Active' },
    { id: 'DEPT-002', name: 'Antenatal', head: 'Dr. Funke', phone: '0803 200 1002', status: 'Active' },
    { id: 'DEPT-003', name: 'Labour Ward', head: 'Dr. Bola', phone: '0803 200 1003', status: 'Active' },
    { id: 'DEPT-004', name: 'Paediatrics', head: 'Dr. Amara', phone: '0803 200 1004', status: 'Active' },
    { id: 'DEPT-005', name: 'Laboratory', head: 'Dr. Chika', phone: '0803 200 1005', status: 'Active' },
    { id: 'DEPT-006', name: 'Pharmacy', head: 'Pharm. Chidinma', phone: '0803 200 1006', status: 'Active' },
    { id: 'DEPT-007', name: 'Billing', head: 'Mr. Tunde', phone: '0803 200 1007', status: 'Active' },
    { id: 'DEPT-008', name: 'Dermatology', head: 'Dr. Funke', phone: '0803 200 1008', status: 'Active' },
    { id: 'DEPT-009', name: 'Orthopaedic', head: 'Dr. Chinedu', phone: '0803 200 1009', status: 'Active' },
    { id: 'DEPT-010', name: 'Cardiology', head: 'Dr. Emeka', phone: '0803 200 1010', status: 'Active' },
    { id: 'DEPT-011', name: 'Endocrinology', head: 'Dr. Chika', phone: '0803 200 1011', status: 'Active' },
    { id: 'DEPT-012', name: 'Dental', head: 'Dr. Funke', phone: '0803 200 1012', status: 'Active' },
    { id: 'DEPT-013', name: 'Radiology', head: 'Dr. Emeka', phone: '0803 200 1013', status: 'Active' },
    { id: 'DEPT-014', name: 'Family Planning', head: 'Dr. Funke', phone: '0803 200 1014', status: 'Active' }
  ],

  /* ━━━ LAB TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  labTests: [
    { id: 'LAB-001', patientId: 'P-001', patientName: 'John O. Adekunle', test: 'Full Blood Count', date: 'May 16, 2025', orderedBy: 'Dr. Samuel O.', status: 'Completed', result: 'Normal' },
    { id: 'LAB-002', patientId: 'P-002', patientName: 'Mary A. Johnson', test: 'Urinalysis', date: 'May 15, 2025', orderedBy: 'Dr. Adeola', status: 'Completed', result: 'Normal' },
    { id: 'LAB-003', patientId: 'P-003', patientName: 'Peter I. Okafor', test: 'Lipid Profile', date: 'May 12, 2025', orderedBy: 'Dr. Chinedu', status: 'Completed', result: 'High Cholesterol' },
    { id: 'LAB-004', patientId: 'P-009', patientName: 'Tunde B. Oladipo', test: 'HbA1c', date: 'May 6, 2025', orderedBy: 'Dr. Chika', status: 'Completed', result: 'Elevated (8.2%)' },
    { id: 'LAB-005', patientId: 'P-008', patientName: 'Fatima H. Abdullahi', test: 'Blood Pressure Monitoring', date: 'May 8, 2025', orderedBy: 'Dr. Adeola', status: 'Completed', result: '140/90 mmHg' },
    { id: 'LAB-006', patientId: 'P-001', patientName: 'John O. Adekunle', test: 'Blood Glucose', date: 'May 16, 2025', orderedBy: 'Dr. Samuel O.', status: 'Completed', result: '95 mg/dL (Normal)' },
    { id: 'LAB-007', patientId: 'P-010', patientName: 'Chidinma E. Okolo', test: 'Dental X-Ray', date: 'May 15, 2025', orderedBy: 'Dr. Funke', status: 'Pending', result: '' }
  ],

  /* ━━━ PRESCRIPTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  prescriptions: [
    { id: 'RX-000067', patientId: 'P-001', patientName: 'John O. Adekunle', doctor: 'Dr. Samuel O.', date: 'May 16, 2025', medications: ['Paracetamol 500mg', 'Vitamin C 1000mg'], status: 'Dispensed' },
    { id: 'RX-000055', patientId: 'P-001', patientName: 'John O. Adekunle', doctor: 'Dr. Samuel O.', date: 'May 9, 2025', medications: ['Amoxicillin 500mg', 'Metronidazole 400mg'], status: 'Dispensed' },
    { id: 'RX-000101', patientId: 'P-002', patientName: 'Mary A. Johnson', doctor: 'Dr. Adeola', date: 'May 15, 2025', medications: ['Salbutamol Inhaler', 'Cetirizine 10mg'], status: 'Dispensed' },
    { id: 'RX-000077', patientId: 'P-003', patientName: 'Peter I. Okafor', doctor: 'Dr. Adeola', date: 'May 12, 2025', medications: ['Amlodipine 5mg', 'Aspirin 75mg'], status: 'Dispensed' },
    { id: 'RX-000095', patientId: 'P-006', patientName: 'Amina B. Yusuf', doctor: 'Dr. Funke', date: 'May 14, 2025', medications: ['Folic Acid 5mg', 'Iron Supplement'], status: 'Dispensed' },
    { id: 'RX-000065', patientId: 'P-009', patientName: 'Tunde B. Oladipo', doctor: 'Dr. Chika', date: 'May 6, 2025', medications: ['Metformin 500mg', 'Gliclazide 80mg', 'Amlodipine 5mg'], status: 'Dispensed' },
    { id: 'RX-000102', patientId: 'P-010', patientName: 'Chidinma E. Okolo', doctor: 'Dr. Funke', date: 'May 15, 2025', medications: ['Amoxicillin 500mg', 'Ibuprofen 400mg'], status: 'Pending' }
  ],

  /* ━━━ BILLING / INVOICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  invoices: [
    { id: 'INV-001', patientId: 'P-001', patientName: 'John O. Adekunle', date: 'May 16, 2025', items: ['Consultation', 'Lab Tests', 'Medications'], total: 15500, paid: 15500, status: 'Paid' },
    { id: 'INV-002', patientId: 'P-002', patientName: 'Mary A. Johnson', date: 'May 15, 2025', items: ['Consultation', 'Medications'], total: 8500, paid: 8500, status: 'Paid' },
    { id: 'INV-003', patientId: 'P-003', patientName: 'Peter I. Okafor', date: 'May 12, 2025', items: ['Consultation', 'Lab Tests', 'Medications'], total: 22000, paid: 22000, status: 'Paid' },
    { id: 'INV-004', patientId: 'P-006', patientName: 'Amina B. Yusuf', date: 'May 14, 2025', items: ['Antenatal Visit', 'Lab Tests', 'Medications'], total: 18500, paid: 18500, status: 'Paid' },
    { id: 'INV-005', patientId: 'P-009', patientName: 'Tunde B. Oladipo', date: 'May 6, 2025', items: ['Consultation', 'Lab Tests', 'Medications'], total: 25000, paid: 15000, status: 'Partial' },
    { id: 'INV-006', patientId: 'P-010', patientName: 'Chidinma E. Okolo', date: 'May 15, 2025', items: ['Dental Consultation', 'X-Ray', 'Medications'], total: 12000, paid: 0, status: 'Unpaid' }
  ],

  /* ━━━ ADMISSIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  admissions: [
    { id: 'ADM-001', patientId: 'P-003', patientName: 'Peter I. Okafor', date: 'May 12, 2025', department: 'Orthopaedic', bedNo: 'W3-B02', doctor: 'Dr. Chinedu', status: 'Discharged', reason: 'Fracture management' },
    { id: 'ADM-002', patientId: 'P-009', patientName: 'Tunde B. Oladipo', date: 'May 6, 2025', department: 'Endocrinology', bedNo: 'W2-B05', doctor: 'Dr. Chika', status: 'Discharged', reason: 'Diabetes management' },
    { id: 'ADM-003', patientId: 'P-008', patientName: 'Fatima H. Abdullahi', date: 'May 8, 2025', department: 'Cardiology', bedNo: 'W1-B01', doctor: 'Dr. Emeka', status: 'Discharged', reason: 'Hypertension crisis' }
  ],

  /* ━━━ STAFF / USERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  users: [
    { id: 'U-001', name: 'Receptionist', role: 'Front Desk', department: 'Reception', email: 'reception@shilohclinic.com', status: 'Active' },
    { id: 'U-002', name: 'Dr. Samuel O.', role: 'Doctor', department: 'General OPD', email: 'samuel.o@shilohclinic.com', status: 'Active' },
    { id: 'U-003', name: 'Dr. Adeola', role: 'Doctor', department: 'General OPD', email: 'adeola@shilohclinic.com', status: 'Active' },
    { id: 'U-004', name: 'Dr. Funke', role: 'Doctor', department: 'Dermatology', email: 'funke@shilohclinic.com', status: 'Active' },
    { id: 'U-005', name: 'Nurse Tolu', role: 'Nurse', department: 'Nursing', email: 'tolu@shilohclinic.com', status: 'Active' },
    { id: 'U-006', name: 'Pharm. Chidinma', role: 'Pharmacist', department: 'Pharmacy', email: 'chidinma@shilohclinic.com', status: 'Active' },
    { id: 'U-007', name: 'Lab Tech. Ahmed', role: 'Lab Technician', department: 'Laboratory', email: 'ahmed@shilohclinic.com', status: 'Active' },
    { id: 'U-008', name: 'Mr. Tunde', role: 'Accountant', department: 'Billing', email: 'tunde@shilohclinic.com', status: 'Active' }
  ],

  /* ━━━ WAITING / QUEUE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  waitingQueue: [
    { patientId: 'P-001', patientName: 'John O. Adekunle', hospitalNo: 'SHC-000001', department: 'General OPD', waitTime: '15 min', status: 'Waiting' },
    { patientId: 'P-002', patientName: 'Mary A. Johnson', hospitalNo: 'SHC-000002', department: 'General OPD', waitTime: '30 min', status: 'Waiting' },
    { patientId: 'P-006', patientName: 'Amina B. Yusuf', hospitalNo: 'SHC-000006', department: 'Antenatal', waitTime: '10 min', status: 'Waiting' },
    { patientId: 'P-007', patientName: 'Emeka D. Nwosu', hospitalNo: 'SHC-000007', department: 'General OPD', waitTime: '45 min', status: 'Waiting' },
    { patientId: 'P-004', patientName: 'Grace U. Emu', hospitalNo: 'SHC-000004', department: 'Family Planning', waitTime: '20 min', status: 'Waiting' },
    { patientId: 'P-010', patientName: 'Chidinma E. Okolo', hospitalNo: 'SHC-000010', department: 'Dental', waitTime: '5 min', status: 'Waiting' },
    { patientId: 'P-003', patientName: 'Peter I. Okafor', hospitalNo: 'SHC-000003', department: 'Orthopaedic', waitTime: '25 min', status: 'Waiting' },
    { patientId: 'P-009', patientName: 'Tunde B. Oladipo', hospitalNo: 'SHC-000009', department: 'Endocrinology', waitTime: '35 min', status: 'Waiting' },
    { patientId: 'P-008', patientName: 'Fatima H. Abdullahi', hospitalNo: 'SHC-000008', department: 'Cardiology', waitTime: '40 min', status: 'Waiting' },
    { patientId: 'P-005', patientName: 'Michael E. Lucky', hospitalNo: 'SHC-000005', department: 'Laboratory', waitTime: '50 min', status: 'Waiting' }
  ]
};

/* ── Export for browser ──────────────────────────────────────────── */
window.DemoData = DemoData;
