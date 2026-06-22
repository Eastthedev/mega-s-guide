export interface Week {
  n: number;
  label: string;
  dates: string;
  deadline?: boolean;
  haem: string[];
  chem: string[];
  morb_tue: string[];
  mcb: string[];
  pharm: string[];
  morb_fri: string[];
}

export const W: Week[] = [
  {
    n: 1, label: "Week 1", dates: "June 1–5",
    haem: ["Classification of Myeloproliferative Neoplasms", "Molecular approach to medical practice", "Primary Myelofibrosis", "MDS-MPN Neoplasms"],
    chem: ["Patient sample collection & use of the laboratory"],
    morb_tue: ["Introduction to Systemic Pathology"],
    mcb: ["Spirochetes", "Trematode", "Classification & properties of Herpesviruses", "Herpesviruses (cont.)", "HIV/AIDS ×2 sessions"],
    pharm: ["Treatment of Bronchial Asthma, Antitussives & Mucolytics", "Anti-emetic agents & Anti-diarrheal drugs", "Topical preparations", "Disinfectants & Antiseptics"],
    morb_fri: ["Lymph Nodes: Reactive Hyperplasia", "Infections of lymph nodes", "Lymphomas — intro & classification"]
  },
  {
    n: 2, label: "Week 2", dates: "June 8–12",
    haem: ["Myelodysplastic Syndrome", "Molecular Medicine 1: DNA Structure, Replication & Function", "Molecular pathophysiology of SCD & new treatment", "Molecular basis of haematologic malignancies", "Essential Thrombocythaemia"],
    chem: ["Hypothalamic-Pituitary-Adrenal axis & its disorders"],
    morb_tue: ["Lymph Nodes: Lymphomas (continued)", "Types of lymphoma — detailed classification"],
    mcb: ["Practical (Microbiology lab)"],
    pharm: ["Anti-cancer drugs 1 & 2", "Adrenal Steroids 1 & 2"],
    morb_fri: ["Renal Pathology: Congenital abnormalities & Renal cysts", "Syndromes of glomerular diseases"]
  },
  {
    n: 3, label: "Week 3", dates: "June 15–19",
    haem: ["Polycythemia Vera", "Inherited Red Cell Membrane & Enzyme Disorders", "Paroxysmal Nocturnal Haemoglobinuria", "Molecular Medicine II"],
    chem: ["Hypothalamic-Pituitary-Gonadal axis & its disorders"],
    morb_tue: ["Renal Pathology: Tubulo-interstitial inflammation", "Renal failure & Renal tumours"],
    mcb: ["Hepatitis ×2", "Rodent-borne viruses ×2", "Arthropod-borne viruses ×2", "Picorna viruses"],
    pharm: ["Treatment of Amoebiasis", "Toxoplasmosis & other protozoan diseases", "Thrombolytic agents & Antiplatelets", "Laxatives"],
    morb_fri: ["Morbid Anatomy Practical / Seminar", "Consolidate Lymph Nodes & Renal topics"]
  },
  {
    n: 4, label: "Week 4", dates: "June 22–26",
    haem: ["Haemolytic disease of the newborn", "Other Chronic MPNs: CNL", "Other Chronic MPNs: CEL etc.", "Chronic Myelomonocytic Leukaemia"],
    chem: ["Hypothalamic-Pituitary-Thyroidal axis & its disorders"],
    morb_tue: ["Practical / Seminar (Morbid Anatomy)", "Review Renal + Lymph Node slides"],
    mcb: ["Practical (Microbiology lab)"],
    pharm: ["Introduction to cardiovascular pharmacology", "Antihypertensives 1 & 2", "Intro to Endocrine Pharmacology; Hypothalamus & Pituitary"],
    morb_fri: ["Respiratory Pathology: Upper airway inflammation & sinuses", "Atelectasis; Pulmonary oedema, congestion & ARDS"]
  },
  {
    n: 5, label: "Week 5", dates: "June 29 – July 3",
    haem: ["Bleeding disorders: Disorders of platelets", "Acquired coagulation disorders: ITP", "Acute Lymphoblastic Leukaemia", "Acute Myeloid Leukaemia"],
    chem: ["Nutrition — Vitamins, Micronutrient metabolism & disorders"],
    morb_tue: ["Respiratory Pathology: Pulmonary embolism", "Pulmonary hypertension"],
    mcb: ["Emerging viral infections ×2", "Ortho/Paramyxoviruses", "Rabies", "Reoviruses", "Upper & lower respiratory tract infections"],
    pharm: ["Antimalarials ×2 sessions", "Drugs for Ischaemic heart disease", "Antiarrhythmic agents"],
    morb_fri: ["Male Reproductive System: Urethritis & genital infections", "Testes — maldescent, torsion, male infertility"]
  },
  {
    n: 6, label: "Week 6", dates: "July 6–10",
    haem: ["Complement system: classical & alternate pathways", "Overview & management of haematologic malignancies", "Tumour Immunology", "Crossmatching & Coombs tests"],
    chem: ["Toxicology, Heavy metal poisoning & Therapeutic drug monitoring"],
    morb_tue: ["Male Reproductive System: Prostate — prostatitis, hyperplasia, carcinoma", "Bladder outlet obstruction"],
    mcb: ["Practical (Microbiology lab)"],
    pharm: ["Drugs for Cardiac failure", "Contraceptives, Drugs for fertility & erectile dysfunction", "Thyroid gland and drugs", "Parathyroid gland & Calcium balance"],
    morb_fri: ["Vascular Pathology: Atherosclerosis & systemic pathology", "Aneurysm; Thrombophlebitis & phlebothrombus"]
  },
  {
    n: 7, label: "Week 7", dates: "July 13–17",
    haem: ["G6PD deficiency", "Tumour lysis syndrome & complications of chemotherapy", "Anaemia of Chronic Disease", "Iron Overload"],
    chem: ["Pathogenesis & Investigations of kidney disorders"],
    morb_tue: ["Vascular Pathology: Venae cavae obstruction syndromes", "Varicose veins & Lymphoedema"],
    mcb: ["Practical (Microbiology lab)"],
    pharm: ["Insulin", "Oral antidiabetic agents", "Pharmacogenetics", "Pharmacogenomics"],
    morb_fri: ["Cardiac Pathology: Heart pathology overview", "Ischaemic heart disease; Rheumatic fever & heart disease"]
  },
  {
    n: 8, label: "Week 8", dates: "July 20–24",
    haem: ["Autologous & Allogeneic HSCT ×2", "Complications of blood transfusion reaction", "Cytogenetics & molecular diagnostic methods"],
    chem: ["Clinical Chemistry in Pregnancy & Prenatal diagnosis", "Inborn errors of metabolism & Newborn screening"],
    morb_tue: ["Cardiac Pathology: Valvular degeneration; Infective endocarditis", "Cardiomyopathies; Myocarditis & specific heart muscle disease"],
    mcb: ["Urinary tract infection", "Healthcare-associated infection", "Antimicrobial stewardship", "Bone & joint infection", "Sexually transmitted infections ×2", "CNS infections ×2"],
    pharm: ["Heavy metals", "Drug overdose, poisons & antidotes", "Poisonous stings & snake envenomation", "Anticoagulants"],
    morb_fri: ["Cardiac Pathology: Pericardial disease; Neoplasms of the heart", "Congenital heart disease"]
  },
  {
    n: 9, label: "Week 9", dates: "July 27–31",
    haem: ["Acquired bleeding disorder: DIC", "Immune Response: Cellular & Humoral", "Hyperimmune malarial syndrome", "Immunization"],
    chem: ["Body fluids (CSF, Pleural & ascitic fluids) & Investigations"],
    morb_tue: ["Musculoskeletal: Joints — Gout, Osteoarthritis, Rheumatoid Arthritis", "Soft tissue tumours — Fibromatosis, Rhabdomyosarcoma, Synovial sarcoma etc."],
    mcb: ["GI tract infections ×2", "Infection prevention & control ×2", "Systemic mycoses", "Protozoa"],
    pharm: ["Pharmacoepidemiology", "Pharmacoeconomics", "Clinical trials & evaluation of new drugs", "Antifungal agents"],
    morb_fri: ["Musculoskeletal: Bone — Osteomyelitis, Osteomalacia", "Paget's disease & other bone pathology"]
  },
  {
    n: 10, label: "Week 10", dates: "Aug 3–7",
    haem: ["Haematologic Emergencies I", "Iron deficiency anaemia", "Quality Control in Haematology", "Hypersensitivity Reaction"],
    chem: ["Genetics & DNA-based technology in Clinical biochemistry"],
    morb_tue: ["Endocrine Pathology: Pituitary gland — hypofunction & tumours", "Thyroid — hypo/hyperthyroidism, goitres, thyroiditis, tumours"],
    mcb: ["Practical (Microbiology lab)"],
    pharm: ["Peptic Ulcer & GERD treatment", "Drugs for palliative care", "Cytokines & anticytokine therapy", "Nematodes, Cestodes & Trematodes treatment"],
    morb_fri: ["Endocrine: Parathyroid — hyperplasia, adenomas, hypofunction", "Pancreas — Diabetes mellitus & islet tumours; Adrenal cortex & medulla"]
  },
  {
    n: 11, label: "Week 11", dates: "Aug 10–14",
    haem: ["Inherited Thrombophilias", "Acquired Thrombophilias", "Venous Thromboembolism", "Antithrombotic therapy"],
    chem: ["Paediatric Clinical Chemistry", "Geriatric Clinical Chemistry"],
    morb_tue: ["CNS Pathology: Congenital malformations; Trauma & cerebral oedema", "Cerebrovascular accidents — haemorrhagic, infarctive & others"],
    mcb: ["Clinical scenarios & revision (Microbiology)"],
    pharm: ["Vitamins, Iron & Trace elements", "Vaccines & Immunisation", "Drugs for emergency care", "Drugs for dyslipidemias"],
    morb_fri: ["CNS Pathology: Meningitis; Degenerative diseases", "CNS Tumours — classification & key types"]
  },
  {
    n: 12, label: "Week 12 — TARGET COMPLETE", dates: "Aug 17–21", deadline: true,
    haem: ["Overview of Plasma Cell Dyscrasia", "Antiphospholipid syndrome", "Haematological Reference values & Absolute Indices", "Haematologic Emergencies II"],
    chem: ["Point-of-care testing I"],
    morb_tue: ["GI Pathology: Oesophagus — anomalies, oesophagitis, achalasia, varices, tumours", "Stomach — infections, peptic ulcer, typhoid, malabsorption, neoplasms"],
    mcb: ["REVISION — all Microbiology topics"],
    pharm: ["REVISION — all Pharmacology topics"],
    morb_fri: ["GI Pathology: Appendix — inflammation & tumours; Peritoneal disease", "Liver Pathology — overview & key conditions"]
  }
];
