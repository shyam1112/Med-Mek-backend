import MedicineCatalog from '../models/MedicineCatalog';

const CATALOG_DATA = [
  // ── Analgesic / Pain Relief ────────────────────────────────────────────────
  { name: 'Calpol 500', genericName: 'Paracetamol', category: 'Analgesic', manufacturer: 'GSK', dosageForm: 'Tablet', strength: '500mg', gstPercentage: 5, suggestedMRP: 32 },
  { name: 'Dolo 650', genericName: 'Paracetamol', category: 'Analgesic', manufacturer: 'Micro Labs', dosageForm: 'Tablet', strength: '650mg', gstPercentage: 5, suggestedMRP: 30 },
  { name: 'Crocin 500', genericName: 'Paracetamol', category: 'Analgesic', manufacturer: 'GSK', dosageForm: 'Tablet', strength: '500mg', gstPercentage: 5, suggestedMRP: 28 },
  { name: 'Combiflam', genericName: 'Ibuprofen + Paracetamol', category: 'Analgesic', manufacturer: 'Sanofi', dosageForm: 'Tablet', strength: '400mg/325mg', gstPercentage: 12, suggestedMRP: 42 },
  { name: 'Brufen 400', genericName: 'Ibuprofen', category: 'Analgesic', manufacturer: 'Abbott', dosageForm: 'Tablet', strength: '400mg', gstPercentage: 12, suggestedMRP: 35 },
  { name: 'Voveran 50', genericName: 'Diclofenac', category: 'Analgesic', manufacturer: 'Novartis', dosageForm: 'Tablet', strength: '50mg', gstPercentage: 12, suggestedMRP: 48 },
  { name: 'Zerodol P', genericName: 'Aceclofenac + Paracetamol', category: 'Analgesic', manufacturer: 'Ipca', dosageForm: 'Tablet', strength: '100mg/325mg', gstPercentage: 12, suggestedMRP: 62 },
  { name: 'Ultracet', genericName: 'Tramadol + Paracetamol', category: 'Analgesic', manufacturer: 'Janssen', dosageForm: 'Tablet', strength: '37.5mg/325mg', gstPercentage: 12, suggestedMRP: 95 },
  { name: 'Meftal Spas', genericName: 'Mefenamic Acid + Dicyclomine', category: 'Analgesic', manufacturer: 'Blue Cross', dosageForm: 'Tablet', strength: '250mg/10mg', gstPercentage: 12, suggestedMRP: 85 },
  { name: 'Nimulid 100', genericName: 'Nimesulide', category: 'Analgesic', manufacturer: 'Panacea Biotec', dosageForm: 'Tablet', strength: '100mg', gstPercentage: 12, suggestedMRP: 38 },
  { name: 'Etorica 60', genericName: 'Etoricoxib', category: 'Analgesic', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '60mg', gstPercentage: 12, suggestedMRP: 110 },
  { name: 'Volini Gel', genericName: 'Diclofenac + Methyl Salicylate', category: 'Analgesic', manufacturer: 'Sun Pharma', dosageForm: 'Gel', strength: '1%', gstPercentage: 12, suggestedMRP: 145 },

  // ── Antibiotic ────────────────────────────────────────────────────────────
  { name: 'Augmentin 625', genericName: 'Amoxicillin + Clavulanate', category: 'Antibiotic', manufacturer: 'GSK', dosageForm: 'Tablet', strength: '500mg/125mg', gstPercentage: 12, suggestedMRP: 220 },
  { name: 'Azithral 500', genericName: 'Azithromycin', category: 'Antibiotic', manufacturer: 'Alembic', dosageForm: 'Tablet', strength: '500mg', gstPercentage: 12, suggestedMRP: 68 },
  { name: 'Zithromax 500', genericName: 'Azithromycin', category: 'Antibiotic', manufacturer: 'Pfizer', dosageForm: 'Tablet', strength: '500mg', gstPercentage: 12, suggestedMRP: 75 },
  { name: 'Ciprobid 500', genericName: 'Ciprofloxacin', category: 'Antibiotic', manufacturer: 'Cadila', dosageForm: 'Tablet', strength: '500mg', gstPercentage: 12, suggestedMRP: 55 },
  { name: 'Cifran 500', genericName: 'Ciprofloxacin', category: 'Antibiotic', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '500mg', gstPercentage: 12, suggestedMRP: 52 },
  { name: 'Moxikind CV 625', genericName: 'Amoxicillin + Clavulanate', category: 'Antibiotic', manufacturer: 'Mankind', dosageForm: 'Tablet', strength: '500mg/125mg', gstPercentage: 12, suggestedMRP: 185 },
  { name: 'Pan D', genericName: 'Pantoprazole + Domperidone', category: 'Antibiotic', manufacturer: 'Alkem', dosageForm: 'Capsule', strength: '40mg/10mg', gstPercentage: 12, suggestedMRP: 110 },
  { name: 'Clavam 625', genericName: 'Amoxicillin + Clavulanate', category: 'Antibiotic', manufacturer: 'Alkem', dosageForm: 'Tablet', strength: '500mg/125mg', gstPercentage: 12, suggestedMRP: 195 },
  { name: 'Oflomac 200', genericName: 'Ofloxacin', category: 'Antibiotic', manufacturer: 'Macleods', dosageForm: 'Tablet', strength: '200mg', gstPercentage: 12, suggestedMRP: 48 },
  { name: 'Taxim O 200', genericName: 'Cefixime', category: 'Antibiotic', manufacturer: 'Alkem', dosageForm: 'Tablet', strength: '200mg', gstPercentage: 12, suggestedMRP: 140 },
  { name: 'Suprax 200', genericName: 'Cefixime', category: 'Antibiotic', manufacturer: 'Lupin', dosageForm: 'Tablet', strength: '200mg', gstPercentage: 12, suggestedMRP: 135 },
  { name: 'Metrogyl 400', genericName: 'Metronidazole', category: 'Antibiotic', manufacturer: 'J.B. Chemicals', dosageForm: 'Tablet', strength: '400mg', gstPercentage: 12, suggestedMRP: 38 },
  { name: 'Doxycycline 100', genericName: 'Doxycycline', category: 'Antibiotic', manufacturer: 'Cipla', dosageForm: 'Capsule', strength: '100mg', gstPercentage: 12, suggestedMRP: 52 },
  { name: 'Monocef 1g Inj', genericName: 'Ceftriaxone', category: 'Antibiotic', manufacturer: 'Aristo', dosageForm: 'Injection', strength: '1g', gstPercentage: 12, suggestedMRP: 95 },
  { name: 'Levoflox 500', genericName: 'Levofloxacin', category: 'Antibiotic', manufacturer: 'Dr. Reddy\'s', dosageForm: 'Tablet', strength: '500mg', gstPercentage: 12, suggestedMRP: 115 },

  // ── Antacid / Gastrointestinal ─────────────────────────────────────────────
  { name: 'Pan 40', genericName: 'Pantoprazole', category: 'Antacid', manufacturer: 'Alkem', dosageForm: 'Tablet', strength: '40mg', gstPercentage: 12, suggestedMRP: 88 },
  { name: 'Omez 20', genericName: 'Omeprazole', category: 'Antacid', manufacturer: 'Dr. Reddy\'s', dosageForm: 'Capsule', strength: '20mg', gstPercentage: 12, suggestedMRP: 62 },
  { name: 'Nexpro 40', genericName: 'Esomeprazole', category: 'Antacid', manufacturer: 'Torrent', dosageForm: 'Tablet', strength: '40mg', gstPercentage: 12, suggestedMRP: 108 },
  { name: 'Razo 20', genericName: 'Rabeprazole', category: 'Antacid', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '20mg', gstPercentage: 12, suggestedMRP: 95 },
  { name: 'Rantac 150', genericName: 'Ranitidine', category: 'Antacid', manufacturer: 'J.B. Chemicals', dosageForm: 'Tablet', strength: '150mg', gstPercentage: 12, suggestedMRP: 45 },
  { name: 'Gelusil MPS', genericName: 'Aluminium Hydroxide + Magnesium Hydroxide', category: 'Antacid', manufacturer: 'Pfizer', dosageForm: 'Tablet', strength: 'MPS', gstPercentage: 12, suggestedMRP: 58 },
  { name: 'Digene', genericName: 'Aluminium Hydroxide + Magnesium Hydroxide', category: 'Antacid', manufacturer: 'Abbott', dosageForm: 'Syrup', strength: '200ml', gstPercentage: 12, suggestedMRP: 125 },
  { name: 'Cremaffin Plus', genericName: 'Liquid Paraffin + Milk of Magnesia', category: 'Gastrointestinal', manufacturer: 'Abbott', dosageForm: 'Syrup', strength: '225ml', gstPercentage: 12, suggestedMRP: 155 },
  { name: 'Dulcoflex', genericName: 'Bisacodyl', category: 'Gastrointestinal', manufacturer: 'Sanofi', dosageForm: 'Tablet', strength: '5mg', gstPercentage: 12, suggestedMRP: 42 },
  { name: 'Domstal 10', genericName: 'Domperidone', category: 'Gastrointestinal', manufacturer: 'Torrent', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 35 },
  { name: 'Ondansetron 4', genericName: 'Ondansetron', category: 'Gastrointestinal', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '4mg', gstPercentage: 12, suggestedMRP: 45 },
  { name: 'Norflox TZ', genericName: 'Norfloxacin + Tinidazole', category: 'Gastrointestinal', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '400mg/600mg', gstPercentage: 12, suggestedMRP: 78 },
  { name: 'Imodium', genericName: 'Loperamide', category: 'Gastrointestinal', manufacturer: 'J&J', dosageForm: 'Capsule', strength: '2mg', gstPercentage: 12, suggestedMRP: 55 },
  { name: 'Librax', genericName: 'Chlordiazepoxide + Clidinium', category: 'Gastrointestinal', manufacturer: 'Roche', dosageForm: 'Tablet', strength: '5mg/2.5mg', gstPercentage: 12, suggestedMRP: 72 },
  { name: 'Nexpro RD 20', genericName: 'Esomeprazole + Domperidone', category: 'Antacid', manufacturer: 'Torrent', dosageForm: 'Capsule', strength: '20mg/30mg', gstPercentage: 12, suggestedMRP: 98 },

  // ── Antihistamine ──────────────────────────────────────────────────────────
  { name: 'Alerid 10', genericName: 'Cetirizine', category: 'Antihistamine', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 28 },
  { name: 'Okacet 10', genericName: 'Cetirizine', category: 'Antihistamine', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 30 },
  { name: 'Levocet 5', genericName: 'Levocetirizine', category: 'Antihistamine', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '5mg', gstPercentage: 12, suggestedMRP: 42 },
  { name: 'Allegra 120', genericName: 'Fexofenadine', category: 'Antihistamine', manufacturer: 'Sanofi', dosageForm: 'Tablet', strength: '120mg', gstPercentage: 12, suggestedMRP: 148 },
  { name: 'Atarax 25', genericName: 'Hydroxyzine', category: 'Antihistamine', manufacturer: 'UCB', dosageForm: 'Tablet', strength: '25mg', gstPercentage: 12, suggestedMRP: 56 },
  { name: 'Phenergan 25', genericName: 'Promethazine', category: 'Antihistamine', manufacturer: 'Sanofi', dosageForm: 'Tablet', strength: '25mg', gstPercentage: 12, suggestedMRP: 48 },
  { name: 'Montair LC', genericName: 'Montelukast + Levocetirizine', category: 'Antihistamine', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '10mg/5mg', gstPercentage: 12, suggestedMRP: 145 },
  { name: 'Montek LC', genericName: 'Montelukast + Levocetirizine', category: 'Antihistamine', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '10mg/5mg', gstPercentage: 12, suggestedMRP: 138 },

  // ── Cardiovascular ─────────────────────────────────────────────────────────
  { name: 'Ecosprin 75', genericName: 'Aspirin', category: 'Cardiovascular', manufacturer: 'USV', dosageForm: 'Tablet', strength: '75mg', gstPercentage: 5, suggestedMRP: 22 },
  { name: 'Ecosprin 150', genericName: 'Aspirin', category: 'Cardiovascular', manufacturer: 'USV', dosageForm: 'Tablet', strength: '150mg', gstPercentage: 5, suggestedMRP: 28 },
  { name: 'Atorlip 10', genericName: 'Atorvastatin', category: 'Cardiovascular', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 85 },
  { name: 'Atorlip 20', genericName: 'Atorvastatin', category: 'Cardiovascular', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '20mg', gstPercentage: 12, suggestedMRP: 115 },
  { name: 'Rosuvast 10', genericName: 'Rosuvastatin', category: 'Cardiovascular', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 95 },
  { name: 'Clopitab 75', genericName: 'Clopidogrel', category: 'Cardiovascular', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '75mg', gstPercentage: 12, suggestedMRP: 78 },
  { name: 'Plavix 75', genericName: 'Clopidogrel', category: 'Cardiovascular', manufacturer: 'Sanofi', dosageForm: 'Tablet', strength: '75mg', gstPercentage: 12, suggestedMRP: 185 },
  { name: 'Amlokind 5', genericName: 'Amlodipine', category: 'Cardiovascular', manufacturer: 'Mankind', dosageForm: 'Tablet', strength: '5mg', gstPercentage: 12, suggestedMRP: 35 },
  { name: 'Amlopin 5', genericName: 'Amlodipine', category: 'Cardiovascular', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '5mg', gstPercentage: 12, suggestedMRP: 38 },
  { name: 'Telma 40', genericName: 'Telmisartan', category: 'Cardiovascular', manufacturer: 'Glenmark', dosageForm: 'Tablet', strength: '40mg', gstPercentage: 12, suggestedMRP: 92 },
  { name: 'Telma 80', genericName: 'Telmisartan', category: 'Cardiovascular', manufacturer: 'Glenmark', dosageForm: 'Tablet', strength: '80mg', gstPercentage: 12, suggestedMRP: 135 },
  { name: 'Repace 50', genericName: 'Losartan', category: 'Cardiovascular', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '50mg', gstPercentage: 12, suggestedMRP: 72 },
  { name: 'Concor 2.5', genericName: 'Bisoprolol', category: 'Cardiovascular', manufacturer: 'Merck', dosageForm: 'Tablet', strength: '2.5mg', gstPercentage: 12, suggestedMRP: 88 },
  { name: 'Metpure XL 25', genericName: 'Metoprolol Succinate', category: 'Cardiovascular', manufacturer: 'Emcure', dosageForm: 'Tablet', strength: '25mg', gstPercentage: 12, suggestedMRP: 68 },
  { name: 'Cardace 5', genericName: 'Ramipril', category: 'Cardiovascular', manufacturer: 'Sanofi', dosageForm: 'Tablet', strength: '5mg', gstPercentage: 12, suggestedMRP: 95 },
  { name: 'Envas 5', genericName: 'Enalapril', category: 'Cardiovascular', manufacturer: 'Cadila', dosageForm: 'Tablet', strength: '5mg', gstPercentage: 12, suggestedMRP: 58 },
  { name: 'Furosemide 40', genericName: 'Furosemide', category: 'Cardiovascular', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '40mg', gstPercentage: 12, suggestedMRP: 32 },
  { name: 'Digoxin 0.25', genericName: 'Digoxin', category: 'Cardiovascular', manufacturer: 'GSK', dosageForm: 'Tablet', strength: '0.25mg', gstPercentage: 5, suggestedMRP: 28 },

  // ── Diabetes ──────────────────────────────────────────────────────────────
  { name: 'Glycomet 500', genericName: 'Metformin', category: 'Diabetes', manufacturer: 'USV', dosageForm: 'Tablet', strength: '500mg', gstPercentage: 5, suggestedMRP: 38 },
  { name: 'Glycomet 1000', genericName: 'Metformin', category: 'Diabetes', manufacturer: 'USV', dosageForm: 'Tablet', strength: '1000mg', gstPercentage: 5, suggestedMRP: 68 },
  { name: 'Gluformin 500', genericName: 'Metformin', category: 'Diabetes', manufacturer: 'Glenmark', dosageForm: 'Tablet', strength: '500mg', gstPercentage: 5, suggestedMRP: 35 },
  { name: 'Zoryl M1', genericName: 'Glimepiride + Metformin', category: 'Diabetes', manufacturer: 'Intas', dosageForm: 'Tablet', strength: '1mg/500mg', gstPercentage: 12, suggestedMRP: 85 },
  { name: 'Amaryl 2', genericName: 'Glimepiride', category: 'Diabetes', manufacturer: 'Sanofi', dosageForm: 'Tablet', strength: '2mg', gstPercentage: 12, suggestedMRP: 95 },
  { name: 'Diabend 5', genericName: 'Glibenclamide', category: 'Diabetes', manufacturer: 'Lupin', dosageForm: 'Tablet', strength: '5mg', gstPercentage: 12, suggestedMRP: 42 },
  { name: 'Januvia 100', genericName: 'Sitagliptin', category: 'Diabetes', manufacturer: 'MSD', dosageForm: 'Tablet', strength: '100mg', gstPercentage: 12, suggestedMRP: 282 },
  { name: 'Galvumet 50/1000', genericName: 'Vildagliptin + Metformin', category: 'Diabetes', manufacturer: 'Novartis', dosageForm: 'Tablet', strength: '50mg/1000mg', gstPercentage: 12, suggestedMRP: 215 },
  { name: 'Forxiga 10', genericName: 'Dapagliflozin', category: 'Diabetes', manufacturer: 'AstraZeneca', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 248 },
  { name: 'Jardiance 10', genericName: 'Empagliflozin', category: 'Diabetes', manufacturer: 'Boehringer', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 268 },
  { name: 'Insulin Actrapid', genericName: 'Regular Human Insulin', category: 'Diabetes', manufacturer: 'Novo Nordisk', dosageForm: 'Injection', strength: '100 IU/ml', gstPercentage: 0, suggestedMRP: 142 },
  { name: 'Wosulin 30/70', genericName: 'Insulin (30/70 Mix)', category: 'Diabetes', manufacturer: 'Wockhardt', dosageForm: 'Injection', strength: '100 IU/ml', gstPercentage: 0, suggestedMRP: 135 },
  { name: 'Pioglitazone 15', genericName: 'Pioglitazone', category: 'Diabetes', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '15mg', gstPercentage: 12, suggestedMRP: 68 },

  // ── Respiratory ───────────────────────────────────────────────────────────
  { name: 'Asthalin Inhaler', genericName: 'Salbutamol', category: 'Respiratory', manufacturer: 'Cipla', dosageForm: 'Inhaler', strength: '100mcg/dose', gstPercentage: 12, suggestedMRP: 145 },
  { name: 'Seroflo 250', genericName: 'Salmeterol + Fluticasone', category: 'Respiratory', manufacturer: 'Cipla', dosageForm: 'Inhaler', strength: '250mcg', gstPercentage: 12, suggestedMRP: 385 },
  { name: 'Tiova Inhaler', genericName: 'Tiotropium', category: 'Respiratory', manufacturer: 'Cipla', dosageForm: 'Inhaler', strength: '18mcg', gstPercentage: 12, suggestedMRP: 425 },
  { name: 'Deriphyllin', genericName: 'Theophylline + Etofylline', category: 'Respiratory', manufacturer: 'Cadila', dosageForm: 'Tablet', strength: '84mg/23mg', gstPercentage: 12, suggestedMRP: 52 },
  { name: 'Ascoril LS', genericName: 'Levosalbutamol + Ambroxol', category: 'Respiratory', manufacturer: 'Glenmark', dosageForm: 'Syrup', strength: '100ml', gstPercentage: 12, suggestedMRP: 115 },
  { name: 'Alex Syrup', genericName: 'Chlorpheniramine + Dextromethorphan', category: 'Respiratory', manufacturer: 'Glenmark', dosageForm: 'Syrup', strength: '100ml', gstPercentage: 12, suggestedMRP: 92 },
  { name: 'Benadryl Cough', genericName: 'Diphenhydramine + Ammonium Chloride', category: 'Respiratory', manufacturer: 'Pfizer', dosageForm: 'Syrup', strength: '100ml', gstPercentage: 12, suggestedMRP: 98 },
  { name: 'Grilinctus', genericName: 'Bromhexine', category: 'Respiratory', manufacturer: 'German Remedies', dosageForm: 'Syrup', strength: '100ml', gstPercentage: 12, suggestedMRP: 88 },
  { name: 'Sinarest', genericName: 'Paracetamol + Chlorpheniramine + Phenylephrine', category: 'Respiratory', manufacturer: 'Centaur', dosageForm: 'Tablet', strength: '325mg', gstPercentage: 12, suggestedMRP: 42 },
  { name: 'Coscopin', genericName: 'Noscapine', category: 'Respiratory', manufacturer: 'Nicholas Piramal', dosageForm: 'Tablet', strength: '15mg', gstPercentage: 12, suggestedMRP: 38 },

  // ── Thyroid ───────────────────────────────────────────────────────────────
  { name: 'Thyronorm 25', genericName: 'Levothyroxine', category: 'Hormones', manufacturer: 'Abbott', dosageForm: 'Tablet', strength: '25mcg', gstPercentage: 5, suggestedMRP: 42 },
  { name: 'Thyronorm 50', genericName: 'Levothyroxine', category: 'Hormones', manufacturer: 'Abbott', dosageForm: 'Tablet', strength: '50mcg', gstPercentage: 5, suggestedMRP: 52 },
  { name: 'Thyronorm 100', genericName: 'Levothyroxine', category: 'Hormones', manufacturer: 'Abbott', dosageForm: 'Tablet', strength: '100mcg', gstPercentage: 5, suggestedMRP: 78 },
  { name: 'Eltroxin 50', genericName: 'Levothyroxine', category: 'Hormones', manufacturer: 'GSK', dosageForm: 'Tablet', strength: '50mcg', gstPercentage: 5, suggestedMRP: 48 },
  { name: 'Neomercazole 5', genericName: 'Carbimazole', category: 'Hormones', manufacturer: 'Roche', dosageForm: 'Tablet', strength: '5mg', gstPercentage: 12, suggestedMRP: 58 },

  // ── Vitamins / Nutritional ─────────────────────────────────────────────────
  { name: 'Becosules', genericName: 'B-Complex Vitamins', category: 'Vitamins', manufacturer: 'Pfizer', dosageForm: 'Capsule', strength: 'Multi', gstPercentage: 18, suggestedMRP: 85 },
  { name: 'Supradyn', genericName: 'Multivitamin + Minerals', category: 'Vitamins', manufacturer: 'Bayer', dosageForm: 'Tablet', strength: 'Multi', gstPercentage: 18, suggestedMRP: 195 },
  { name: 'Revital H', genericName: 'Multivitamin + Minerals', category: 'Vitamins', manufacturer: 'Ranbaxy', dosageForm: 'Capsule', strength: 'Multi', gstPercentage: 18, suggestedMRP: 225 },
  { name: 'Limcee 500', genericName: 'Vitamin C', category: 'Vitamins', manufacturer: 'Abbott', dosageForm: 'Chewable Tablet', strength: '500mg', gstPercentage: 18, suggestedMRP: 45 },
  { name: 'Shelcal 500', genericName: 'Calcium Carbonate + Vitamin D3', category: 'Vitamins', manufacturer: 'Torrent', dosageForm: 'Tablet', strength: '500mg', gstPercentage: 18, suggestedMRP: 85 },
  { name: 'Calcirol Sachet', genericName: 'Cholecalciferol (Vitamin D3)', category: 'Vitamins', manufacturer: 'Cadila', dosageForm: 'Sachet', strength: '60000 IU', gstPercentage: 12, suggestedMRP: 42 },
  { name: 'Neurobion Forte', genericName: 'Vitamin B1+B6+B12', category: 'Vitamins', manufacturer: 'Merck', dosageForm: 'Tablet', strength: 'Forte', gstPercentage: 18, suggestedMRP: 72 },
  { name: 'Methylcobalamin 500', genericName: 'Methylcobalamin (Vitamin B12)', category: 'Vitamins', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '500mcg', gstPercentage: 18, suggestedMRP: 55 },
  { name: 'Zincovit', genericName: 'Zinc + Multivitamins', category: 'Vitamins', manufacturer: 'Apex', dosageForm: 'Tablet', strength: 'Multi', gstPercentage: 18, suggestedMRP: 115 },
  { name: 'Evion 400', genericName: 'Vitamin E', category: 'Vitamins', manufacturer: 'Merck', dosageForm: 'Capsule', strength: '400mg', gstPercentage: 18, suggestedMRP: 65 },
  { name: 'Iron Folic Acid', genericName: 'Ferrous Sulphate + Folic Acid', category: 'Nutritional', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '200mg/0.5mg', gstPercentage: 5, suggestedMRP: 28 },
  { name: 'Dexorange Syrup', genericName: 'Iron + Vitamins', category: 'Nutritional', manufacturer: 'Franco-Indian', dosageForm: 'Syrup', strength: '100ml', gstPercentage: 18, suggestedMRP: 118 },
  { name: 'Pregnacare', genericName: 'Prenatal Vitamins', category: 'Vitamins', manufacturer: 'Vitabiotics', dosageForm: 'Tablet', strength: 'Multi', gstPercentage: 18, suggestedMRP: 285 },

  // ── Psychiatric / Neurological ─────────────────────────────────────────────
  { name: 'Nexito 10', genericName: 'Escitalopram', category: 'Psychiatric', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 125 },
  { name: 'Rexipra 10', genericName: 'Escitalopram', category: 'Psychiatric', manufacturer: 'Intas', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 118 },
  { name: 'Prozac 20', genericName: 'Fluoxetine', category: 'Psychiatric', manufacturer: 'Lilly', dosageForm: 'Capsule', strength: '20mg', gstPercentage: 12, suggestedMRP: 145 },
  { name: 'Lonazep 0.5', genericName: 'Clonazepam', category: 'Psychiatric', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '0.5mg', gstPercentage: 12, suggestedMRP: 48 },
  { name: 'Restyl 0.25', genericName: 'Alprazolam', category: 'Psychiatric', manufacturer: 'Roche India', dosageForm: 'Tablet', strength: '0.25mg', gstPercentage: 12, suggestedMRP: 38 },
  { name: 'Zosert 50', genericName: 'Sertraline', category: 'Psychiatric', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '50mg', gstPercentage: 12, suggestedMRP: 105 },
  { name: 'Tetanus Toxoid Inj', genericName: 'Tetanus Toxoid', category: 'Psychiatric', manufacturer: 'Serum Institute', dosageForm: 'Injection', strength: '0.5ml', gstPercentage: 0, suggestedMRP: 18 },
  { name: 'Eptoin 100', genericName: 'Phenytoin', category: 'Psychiatric', manufacturer: 'Abbott', dosageForm: 'Tablet', strength: '100mg', gstPercentage: 5, suggestedMRP: 42 },
  { name: 'Tegrital 200', genericName: 'Carbamazepine', category: 'Psychiatric', manufacturer: 'Novartis', dosageForm: 'Tablet', strength: '200mg', gstPercentage: 5, suggestedMRP: 55 },
  { name: 'Gardenal 60', genericName: 'Phenobarbitone', category: 'Psychiatric', manufacturer: 'Sanofi', dosageForm: 'Tablet', strength: '60mg', gstPercentage: 5, suggestedMRP: 32 },

  // ── Antifungal ────────────────────────────────────────────────────────────
  { name: 'Fluconazole 150', genericName: 'Fluconazole', category: 'Antifungal', manufacturer: 'Cipla', dosageForm: 'Capsule', strength: '150mg', gstPercentage: 12, suggestedMRP: 38 },
  { name: 'Terbicip 250', genericName: 'Terbinafine', category: 'Antifungal', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '250mg', gstPercentage: 12, suggestedMRP: 115 },
  { name: 'Nizral 2% Cream', genericName: 'Ketoconazole', category: 'Antifungal', manufacturer: 'J&J', dosageForm: 'Cream', strength: '2%', gstPercentage: 12, suggestedMRP: 128 },
  { name: 'Candid B Cream', genericName: 'Clotrimazole + Betamethasone', category: 'Antifungal', manufacturer: 'Glenmark', dosageForm: 'Cream', strength: '1%/0.025%', gstPercentage: 12, suggestedMRP: 88 },
  { name: 'Fungicip Cream', genericName: 'Clotrimazole', category: 'Antifungal', manufacturer: 'Cipla', dosageForm: 'Cream', strength: '1%', gstPercentage: 12, suggestedMRP: 72 },

  // ── Dermatology ───────────────────────────────────────────────────────────
  { name: 'Betadine Ointment', genericName: 'Povidone Iodine', category: 'Dermatology', manufacturer: 'Win-Medicare', dosageForm: 'Ointment', strength: '5%', gstPercentage: 12, suggestedMRP: 68 },
  { name: 'Soframycin Cream', genericName: 'Framycetin', category: 'Dermatology', manufacturer: 'Sanofi', dosageForm: 'Cream', strength: '1%', gstPercentage: 12, suggestedMRP: 85 },
  { name: 'Fucidin Cream', genericName: 'Fusidic Acid', category: 'Dermatology', manufacturer: 'Leo', dosageForm: 'Cream', strength: '2%', gstPercentage: 12, suggestedMRP: 145 },
  { name: 'Lobate GM Cream', genericName: 'Clobetasol + Gentamicin + Miconazole', category: 'Dermatology', manufacturer: 'Cadila', dosageForm: 'Cream', strength: '0.05%', gstPercentage: 12, suggestedMRP: 98 },
  { name: 'Momate Cream', genericName: 'Mometasone', category: 'Dermatology', manufacturer: 'Glenmark', dosageForm: 'Cream', strength: '0.1%', gstPercentage: 12, suggestedMRP: 112 },
  { name: 'Calamine Lotion', genericName: 'Calamine', category: 'Dermatology', manufacturer: 'Piramal', dosageForm: 'Lotion', strength: '100ml', gstPercentage: 12, suggestedMRP: 65 },
  { name: 'Burnol', genericName: 'Framycetin + Cetrimide', category: 'Dermatology', manufacturer: 'German Remedies', dosageForm: 'Cream', strength: '25g', gstPercentage: 12, suggestedMRP: 55 },
  { name: 'Betnovate N Cream', genericName: 'Betamethasone + Neomycin', category: 'Dermatology', manufacturer: 'GSK', dosageForm: 'Cream', strength: '0.1%', gstPercentage: 12, suggestedMRP: 95 },
  { name: 'Acne Aid Soap', genericName: 'Triclosan', category: 'Dermatology', manufacturer: 'Stiefel', dosageForm: 'Soap', strength: '0.3%', gstPercentage: 18, suggestedMRP: 135 },

  // ── Eye / Ear ─────────────────────────────────────────────────────────────
  { name: 'Moxiflox Eye Drops', genericName: 'Moxifloxacin', category: 'Eye/Ear', manufacturer: 'Alcon', dosageForm: 'Eye Drops', strength: '0.5%', gstPercentage: 12, suggestedMRP: 125 },
  { name: 'Vigamox Eye Drops', genericName: 'Moxifloxacin', category: 'Eye/Ear', manufacturer: 'Alcon', dosageForm: 'Eye Drops', strength: '0.5%', gstPercentage: 12, suggestedMRP: 142 },
  { name: 'Ciprofloxacin Eye Drops', genericName: 'Ciprofloxacin', category: 'Eye/Ear', manufacturer: 'Cipla', dosageForm: 'Eye Drops', strength: '0.3%', gstPercentage: 12, suggestedMRP: 48 },
  { name: 'Betnesol Eye Drops', genericName: 'Betamethasone', category: 'Eye/Ear', manufacturer: 'GSK', dosageForm: 'Eye Drops', strength: '0.1%', gstPercentage: 12, suggestedMRP: 68 },
  { name: 'Xylometazoline Nasal', genericName: 'Xylometazoline', category: 'ENT', manufacturer: 'Cipla', dosageForm: 'Nasal Drops', strength: '0.1%', gstPercentage: 12, suggestedMRP: 45 },
  { name: 'Otrivin Nasal Spray', genericName: 'Xylometazoline', category: 'ENT', manufacturer: 'Novartis', dosageForm: 'Nasal Spray', strength: '0.1%', gstPercentage: 12, suggestedMRP: 88 },
  { name: 'Candid Ear Drops', genericName: 'Clotrimazole', category: 'Eye/Ear', manufacturer: 'Glenmark', dosageForm: 'Ear Drops', strength: '1%', gstPercentage: 12, suggestedMRP: 55 },
  { name: 'Sofradex Ear Drops', genericName: 'Framycetin + Dexamethasone', category: 'Eye/Ear', manufacturer: 'Sanofi', dosageForm: 'Ear Drops', strength: '3mg/0.5mg', gstPercentage: 12, suggestedMRP: 78 },

  // ── Orthopedic / Musculoskeletal ───────────────────────────────────────────
  { name: 'Flexon MR', genericName: 'Ibuprofen + Paracetamol + Chlorzoxazone', category: 'Orthopedic', manufacturer: 'Aristo', dosageForm: 'Tablet', strength: '400mg/325mg/250mg', gstPercentage: 12, suggestedMRP: 72 },
  { name: 'Myospaz Forte', genericName: 'Chlorzoxazone + Diclofenac + Paracetamol', category: 'Orthopedic', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: 'Forte', gstPercentage: 12, suggestedMRP: 88 },
  { name: 'Tizanidine 2', genericName: 'Tizanidine', category: 'Orthopedic', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '2mg', gstPercentage: 12, suggestedMRP: 48 },
  { name: 'Calcigard 10', genericName: 'Nifedipine', category: 'Cardiovascular', manufacturer: 'Torrent', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 38 },
  { name: 'Move Spray', genericName: 'Diclofenac + Methyl Salicylate', category: 'Orthopedic', manufacturer: 'Reckitt', dosageForm: 'Spray', strength: '115g', gstPercentage: 12, suggestedMRP: 185 },
  { name: 'Ostocalcium Syrup', genericName: 'Calcium + Vitamin D3 + Phosphorus', category: 'Orthopedic', manufacturer: 'Pfizer', dosageForm: 'Syrup', strength: '200ml', gstPercentage: 18, suggestedMRP: 145 },

  // ── Pediatric ─────────────────────────────────────────────────────────────
  { name: 'Calpol Syrup', genericName: 'Paracetamol', category: 'Pediatric', manufacturer: 'GSK', dosageForm: 'Syrup', strength: '120mg/5ml', gstPercentage: 5, suggestedMRP: 52 },
  { name: 'Crocin Syrup', genericName: 'Paracetamol', category: 'Pediatric', manufacturer: 'GSK', dosageForm: 'Syrup', strength: '120mg/5ml', gstPercentage: 5, suggestedMRP: 48 },
  { name: 'Meftal P Syrup', genericName: 'Mefenamic Acid', category: 'Pediatric', manufacturer: 'Blue Cross', dosageForm: 'Syrup', strength: '100mg/5ml', gstPercentage: 12, suggestedMRP: 75 },
  { name: 'Zincovit Syrup', genericName: 'Zinc + Vitamins', category: 'Pediatric', manufacturer: 'Apex', dosageForm: 'Syrup', strength: '200ml', gstPercentage: 18, suggestedMRP: 128 },
  { name: 'ORS Sachet', genericName: 'Oral Rehydration Salts', category: 'Pediatric', manufacturer: 'Cipla', dosageForm: 'Sachet', strength: '21.8g', gstPercentage: 0, suggestedMRP: 12 },
  { name: 'Perinorm Drops', genericName: 'Metoclopramide', category: 'Pediatric', manufacturer: 'Pfizer', dosageForm: 'Drops', strength: '15ml', gstPercentage: 12, suggestedMRP: 38 },

  // ── Antiviral ─────────────────────────────────────────────────────────────
  { name: 'Acivir 400', genericName: 'Acyclovir', category: 'Antiviral', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '400mg', gstPercentage: 12, suggestedMRP: 68 },
  { name: 'Famtrex 250', genericName: 'Famciclovir', category: 'Antiviral', manufacturer: 'Cipla', dosageForm: 'Tablet', strength: '250mg', gstPercentage: 12, suggestedMRP: 185 },
  { name: 'Oseltamivir 75', genericName: 'Oseltamivir (Tamiflu)', category: 'Antiviral', manufacturer: 'Roche', dosageForm: 'Capsule', strength: '75mg', gstPercentage: 12, suggestedMRP: 320 },

  // ── Surgical / First Aid ───────────────────────────────────────────────────
  { name: 'Betadine Solution', genericName: 'Povidone Iodine', category: 'Surgical', manufacturer: 'Win-Medicare', dosageForm: 'Solution', strength: '10%', gstPercentage: 12, suggestedMRP: 95 },
  { name: 'Savlon Antiseptic', genericName: 'Chlorhexidine + Cetrimide', category: 'Surgical', manufacturer: 'J&J', dosageForm: 'Liquid', strength: '500ml', gstPercentage: 18, suggestedMRP: 245 },
  { name: 'Hydrogen Peroxide 3%', genericName: 'Hydrogen Peroxide', category: 'Surgical', manufacturer: 'Cadila', dosageForm: 'Solution', strength: '3%', gstPercentage: 12, suggestedMRP: 42 },
  { name: 'Spirit', genericName: 'Isopropyl Alcohol', category: 'Surgical', manufacturer: 'Local', dosageForm: 'Solution', strength: '70%', gstPercentage: 18, suggestedMRP: 35 },
  { name: 'Micropore Tape', genericName: 'Surgical Tape', category: 'Surgical', manufacturer: '3M', dosageForm: 'Tape', strength: '1.25cm x 9m', gstPercentage: 12, suggestedMRP: 68 },

  // ── Women Health / Hormones ───────────────────────────────────────────────
  { name: 'Primolut N', genericName: 'Norethisterone', category: 'Hormones', manufacturer: 'Bayer', dosageForm: 'Tablet', strength: '5mg', gstPercentage: 12, suggestedMRP: 85 },
  { name: 'Duphaston 10', genericName: 'Dydrogesterone', category: 'Hormones', manufacturer: 'Abbott', dosageForm: 'Tablet', strength: '10mg', gstPercentage: 12, suggestedMRP: 242 },
  { name: 'Yasmin', genericName: 'Ethinylestradiol + Drospirenone', category: 'Hormones', manufacturer: 'Bayer', dosageForm: 'Tablet', strength: '0.03mg/3mg', gstPercentage: 12, suggestedMRP: 368 },
  { name: 'Folvite 5', genericName: 'Folic Acid', category: 'Vitamins', manufacturer: 'Pfizer', dosageForm: 'Tablet', strength: '5mg', gstPercentage: 5, suggestedMRP: 28 },
  { name: 'Progesterone 200', genericName: 'Progesterone', category: 'Hormones', manufacturer: 'Sun Pharma', dosageForm: 'Capsule', strength: '200mg', gstPercentage: 12, suggestedMRP: 115 },

  // ── Urological ────────────────────────────────────────────────────────────
  { name: 'Tamsulosin 0.4', genericName: 'Tamsulosin', category: 'Orthopedic', manufacturer: 'Cipla', dosageForm: 'Capsule', strength: '0.4mg', gstPercentage: 12, suggestedMRP: 88 },
  { name: 'Urimax 0.4', genericName: 'Tamsulosin', category: 'Other', manufacturer: 'Cipla', dosageForm: 'Capsule', strength: '0.4mg', gstPercentage: 12, suggestedMRP: 92 },
  { name: 'Nitrofurantoin 100', genericName: 'Nitrofurantoin', category: 'Antibiotic', manufacturer: 'Sun Pharma', dosageForm: 'Tablet', strength: '100mg', gstPercentage: 12, suggestedMRP: 72 },
  { name: 'Pyridium 200', genericName: 'Phenazopyridine', category: 'Other', manufacturer: 'Warner Chilcott', dosageForm: 'Tablet', strength: '200mg', gstPercentage: 12, suggestedMRP: 55 },

  // ── OTC / Miscellaneous ───────────────────────────────────────────────────
  { name: 'Strepsils', genericName: 'Amylmetacresol + Dichlorobenzyl Alcohol', category: 'ENT', manufacturer: 'Reckitt', dosageForm: 'Lozenge', strength: '0.6mg/1.2mg', gstPercentage: 18, suggestedMRP: 78 },
  { name: 'Disprin', genericName: 'Aspirin', category: 'Analgesic', manufacturer: 'Reckitt', dosageForm: 'Tablet', strength: '350mg', gstPercentage: 12, suggestedMRP: 22 },
  { name: 'Vicks Inhaler', genericName: 'Menthol + Camphor', category: 'Respiratory', manufacturer: 'P&G', dosageForm: 'Inhaler', strength: '0.5ml', gstPercentage: 18, suggestedMRP: 38 },
  { name: 'Eno Sachet', genericName: 'Sodium Bicarbonate + Citric Acid', category: 'Antacid', manufacturer: 'GSK', dosageForm: 'Sachet', strength: '5g', gstPercentage: 18, suggestedMRP: 12 },
  { name: 'Woodward Gripe Water', genericName: 'Sodium Bicarbonate + Dill Oil', category: 'Pediatric', manufacturer: 'Woodward', dosageForm: 'Liquid', strength: '130ml', gstPercentage: 18, suggestedMRP: 85 },
  { name: 'Moov Cream', genericName: 'Diclofenac + Methyl Salicylate', category: 'Analgesic', manufacturer: 'Reckitt', dosageForm: 'Cream', strength: '30g', gstPercentage: 12, suggestedMRP: 118 },
];

export const seedMedicineCatalog = async (): Promise<void> => {
  const count = await MedicineCatalog.countDocuments();
  if (count > 0) return;

  await MedicineCatalog.insertMany(CATALOG_DATA);
  console.log(`✓ Medicine catalog seeded → ${CATALOG_DATA.length} medicines loaded`);
};
