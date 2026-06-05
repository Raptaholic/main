/* ============================================================
   NOVU PEPTIDES — PRODUCT DATA
   Price rule: base <= 500 → +150 | base > 500 → +300
   ============================================================ */

const BRAND_CFG = {
  'Dezel Labs':        { color:'#e74c3c', light:'#fdecea' },
  'DNA PRO':           { color:'#d4a017', light:'#fdf8e1' },
  'GV':                { color:'#27ae60', light:'#eafaf1' },
  'ZPHC':              { color:'#2980b9', light:'#eaf4fb' },
  'Lawless Labs':      { color:'#8e44ad', light:'#f5eef8' },
  'Pharma Grade':      { color:'#16a085', light:'#e8f8f5' },
  'Peptide Sciences':  { color:'#00b4aa', light:'#e0faf9' },
  'Unisarm Labs':      { color:'#d35400', light:'#fdf0e7' },
  'Pharmacom Labs':    { color:'#c0392b', light:'#fdedec' },
  'Cambridge Research':{ color:'#1a6fa3', light:'#eaf3fb' },
  'Applied Nutrition': { color:'#e67e22', light:'#fef5e7' },
  'Revive MD':         { color:'#2471a3', light:'#eaf4fb' },
  'Supplement Needs':  { color:'#1abc9c', light:'#e8f8f5' },
  'Biolab':            { color:'#7d3c98', light:'#f4ecf7' },
  'Novu Peptides':     { color:'#00b4aa', light:'#e0faf9' },
};

const CAT_CFG = {
  injectables: { label:'Injectables',        icon:'💉', grad:'linear-gradient(135deg,#1c0800,#3a1200)' },
  orals:       { label:'Oral Compounds',     icon:'💊', grad:'linear-gradient(135deg,#001a08,#003810)' },
  peptides:    { label:'Peptides & GLP-1',   icon:'⚗️', grad:'linear-gradient(135deg,#00192e,#003355)' },
  sarms:       { label:'SARMs',              icon:'🔬', grad:'linear-gradient(135deg,#0d0020,#200040)' },
  hgh:         { label:'HGH & Hormones',     icon:'📈', grad:'linear-gradient(135deg,#1a1000,#332200)' },
  pct:         { label:'PCT & Anti-Estrogen',icon:'🛡️', grad:'linear-gradient(135deg,#1a0005,#30000e)' },
  fatloss:     { label:'Fat Loss',           icon:'🔥', grad:'linear-gradient(135deg,#1a0800,#331500)' },
  nutrition:   { label:'Sports Nutrition',   icon:'💪', grad:'linear-gradient(135deg,#001830,#003060)' },
  vitamins:    { label:'Vitamins & Health',  icon:'🌿', grad:'linear-gradient(135deg,#001505,#002e0f)' },
  accessories: { label:'Accessories',        icon:'🔧', grad:'linear-gradient(135deg,#111,#2a2a2a)' },
};

/* p(base) — compute final AED price */
const p = b => b <= 500 ? b + 150 : b + 300;

/* PRODUCTS array
   { id, name, brand, cat, form, abbr, price, tags[] } */
const PRODUCTS = [

  /* ── DEZEL LABS — INJECTABLES ── */
  {id:1,  name:'Test Enanthate 300mg/ml',       brand:'Dezel Labs', cat:'injectables', form:'10ml Vial',   abbr:'TEST-E',    price:p(120), tags:['testosterone','enanthate']},
  {id:2,  name:'Test Propionate 100mg/ml',      brand:'Dezel Labs', cat:'injectables', form:'10ml Vial',   abbr:'TEST-P',    price:p(85),  tags:['testosterone','propionate']},
  {id:3,  name:'Tren Enanthate 200mg/ml',       brand:'Dezel Labs', cat:'injectables', form:'10ml Vial',   abbr:'TREN-E',    price:p(250), tags:['trenbolone','enanthate']},
  {id:4,  name:'Tren Acetate 100mg/ml',         brand:'Dezel Labs', cat:'injectables', form:'10ml Vial',   abbr:'TREN-A',    price:p(210), tags:['trenbolone','acetate']},
  {id:5,  name:'Masteron Enanthate 200mg',      brand:'Dezel Labs', cat:'injectables', form:'10ml Vial',   abbr:'MAST-E',    price:p(290), tags:['masteron','drostanolone']},
  {id:6,  name:'Deca 300 Nandrolone',           brand:'Dezel Labs', cat:'injectables', form:'10ml Vial',   abbr:'DECA',      price:p(165), tags:['nandrolone','deca']},
  {id:7,  name:'NPP 100mg/ml',                  brand:'Dezel Labs', cat:'injectables', form:'10ml Vial',   abbr:'NPP',       price:p(145), tags:['nandrolone','phenylpropionate']},
  {id:8,  name:'Primobolan 100mg/ml',           brand:'Dezel Labs', cat:'injectables', form:'10ml Vial',   abbr:'PRIMO',     price:p(375), tags:['primobolan','metenolone']},
  {id:9,  name:'MENT 100mg/ml',                 brand:'Dezel Labs', cat:'injectables', form:'10ml Vial',   abbr:'MENT',      price:p(400), tags:['trestolone','ment']},
  {id:10, name:'Winstrol 100mg/ml',             brand:'Dezel Labs', cat:'injectables', form:'10ml Vial',   abbr:'WINST',     price:p(175), tags:['winstrol','stanozolol']},
  {id:11, name:'Parabolan 100mg/ml',            brand:'Dezel Labs', cat:'injectables', form:'50ml Vial',   abbr:'PARA',      price:p(225), tags:['trenbolone','hexahydrobenzylcarbonate']},
  {id:12, name:'Danabol 100mg/ml (Dbol)',       brand:'Dezel Labs', cat:'injectables', form:'20ml Drops',  abbr:'DBOL',      price:p(140), tags:['dianabol','methandienone']},
  {id:13, name:'Superdrol 100mg/ml',            brand:'Dezel Labs', cat:'injectables', form:'20ml Drops',  abbr:'SDROL',     price:p(275), tags:['superdrol','methasterone']},
  {id:14, name:'Androlic 100mg/ml',             brand:'Dezel Labs', cat:'injectables', form:'20ml Drops',  abbr:'ANDRO',     price:p(165), tags:['anadrol','oxymetholone']},
  {id:15, name:'Stanozolol 100mg/ml',           brand:'Dezel Labs', cat:'injectables', form:'20ml Drops',  abbr:'STANO',     price:p(165), tags:['winstrol','stanozolol']},
  {id:16, name:'Turinabol Drops',               brand:'Dezel Labs', cat:'injectables', form:'20ml Drops',  abbr:'TBOL',      price:p(220), tags:['turinabol','chlorodehydromethyltestosterone']},
  {id:17, name:'Metren 50 (Trenbolone)',         brand:'Dezel Labs', cat:'injectables', form:'20ml Drops',  abbr:'TREN',      price:p(300), tags:['trenbolone']},
  {id:18, name:'Anavar 25mg/ml',               brand:'Dezel Labs', cat:'injectables', form:'20ml Drops',  abbr:'ANAV',      price:p(320), tags:['anavar','oxandrolone']},
  {id:19, name:'Haldotest 25mg/ml',            brand:'Dezel Labs', cat:'injectables', form:'20ml Drops',  abbr:'HALDO',     price:p(430), tags:['halotestin','fluoxymesterone']},
  {id:20, name:'Test Methyl 100mg/ml',         brand:'Dezel Labs', cat:'injectables', form:'20ml Drops',  abbr:'TEST',      price:p(150), tags:['testosterone','methylated']},
  {id:21, name:'Proviron 100mg/ml',            brand:'Dezel Labs', cat:'injectables', form:'20ml Drops',  abbr:'PROVI',     price:p(220), tags:['proviron','mesterolone']},

  /* ── DNA PRO — PRO SERIES INJECTABLES ── */
  {id:22, name:'PRO-BOLD Boldenone 250mg/ml',  brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'EQ',       price:p(165), tags:['boldenone','equipoise']},
  {id:23, name:'PRO-SUST Testosterone Mix',    brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'SUST',     price:p(135), tags:['sustanon','testosterone']},
  {id:24, name:'PRO-CYP Testosterone Cyp',    brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'TEST-C',   price:p(125), tags:['testosterone','cypionate']},
  {id:25, name:'PRO-DECA Nandrolone 300',     brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'DECA',     price:p(165), tags:['nandrolone','deca']},
  {id:26, name:'PRO-TEST SUS Suspension',     brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'T-SUS',    price:p(150), tags:['testosterone','suspension']},
  {id:27, name:'PRO-ENAN Testosterone Enan',  brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'TEST-E',   price:p(125), tags:['testosterone','enanthate']},
  {id:28, name:'PRO-MAST Masteron Prop',      brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'MAST-P',   price:p(180), tags:['masteron','drostanolone']},
  {id:29, name:'PRO-TREN 100 Trenbolone Ace', brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'TREN-A',   price:p(180), tags:['trenbolone','acetate']},
  {id:30, name:'PRO-NPP Nandrolone Phenylprop',brand:'DNA PRO',cat:'injectables', form:'10ml Vial', abbr:'NPP',      price:p(125), tags:['nandrolone','phenylpropionate']},
  {id:31, name:'PRO-PRIMO Methenolone Enan',  brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'PRIMO',    price:p(225), tags:['primobolan','metenolone']},
  {id:32, name:'PRO-TREN 200 Trenbolone Enan',brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'TREN-E',   price:p(230), tags:['trenbolone','enanthate']},
  {id:33, name:'PRO-PROP Testosterone Prop',  brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'TEST-P',   price:p(100), tags:['testosterone','propionate']},
  {id:34, name:'PRO-STAN Stanozolol Susp',    brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'WINST',    price:p(150), tags:['winstrol','stanozolol']},
  {id:35, name:'DNA PRO MAST-E 200mg',        brand:'DNA PRO', cat:'injectables', form:'1 Vial',    abbr:'MAST-E',   price:p(230), tags:['masteron','enanthate']},
  {id:36, name:'DNA PRO Mast Propionate 100', brand:'DNA PRO', cat:'injectables', form:'10ml Vial', abbr:'MAST-P',   price:p(180), tags:['masteron','drostanolone']},

  /* ── GV — INJECTABLES ── */
  {id:37, name:'GV Test Depot 250 (Enan)',    brand:'GV', cat:'injectables', form:'10ml Vial', abbr:'TEST-E', price:p(80),  tags:['testosterone','enanthate']},
  {id:38, name:'GV Cypionex 250 (Cyp)',       brand:'GV', cat:'injectables', form:'10ml Vial', abbr:'TEST-C', price:p(80),  tags:['testosterone','cypionate']},
  {id:39, name:'GV Test Propionate 100',      brand:'GV', cat:'injectables', form:'10ml Vial', abbr:'TEST-P', price:p(65),  tags:['testosterone','propionate']},
  {id:40, name:'GV Equipoise 250 (Bold)',     brand:'GV', cat:'injectables', form:'10ml Vial', abbr:'EQ',     price:p(125), tags:['boldenone','equipoise']},
  {id:41, name:'GV Tren Ace 100',             brand:'GV', cat:'injectables', form:'10ml Vial', abbr:'TREN-A', price:p(145), tags:['trenbolone','acetate']},
  {id:42, name:'GV Deca Durabolin 250',       brand:'GV', cat:'injectables', form:'10ml Vial', abbr:'DECA',   price:p(125), tags:['nandrolone','deca']},
  {id:43, name:'GV Sustanon 250 Test Mix',    brand:'GV', cat:'injectables', form:'10ml Vial', abbr:'SUST',   price:p(85),  tags:['sustanon','testosterone']},
  {id:44, name:'GV Stanozolol Winstrol Vial', brand:'GV', cat:'injectables', form:'10ml Vial', abbr:'WINST',  price:p(125), tags:['winstrol','stanozolol']},
  {id:45, name:'GV Test Propionate 100 Vials',brand:'GV', cat:'injectables', form:'100 Vials', abbr:'TEST-P', price:p(65),  tags:['testosterone','propionate']},
  {id:46, name:'GV Test Depot 250 Vials',     brand:'GV', cat:'injectables', form:'250 Vials', abbr:'TEST-E', price:p(80),  tags:['testosterone','enanthate']},
  {id:47, name:'GV Tren Ace 100 Vials',       brand:'GV', cat:'injectables', form:'100 Vials', abbr:'TREN-A', price:p(145), tags:['trenbolone','acetate']},

  /* ── ZPHC — INJECTABLES ── */
  {id:48, name:'ZPHC Test Enanthate 250',     brand:'ZPHC', cat:'injectables', form:'10ml Vial', abbr:'TEST-E', price:p(130), tags:['testosterone','enanthate']},
  {id:49, name:'ZPHC Test Cypionate 250',     brand:'ZPHC', cat:'injectables', form:'10ml Vial', abbr:'TEST-C', price:p(130), tags:['testosterone','cypionate']},
  {id:50, name:'ZPHC Sustanon 250',           brand:'ZPHC', cat:'injectables', form:'10ml Vial', abbr:'SUST',   price:p(140), tags:['sustanon','testosterone']},
  {id:51, name:'ZPHC Nandrolone Decanoate',   brand:'ZPHC', cat:'injectables', form:'10ml Vial', abbr:'DECA',   price:p(145), tags:['nandrolone','deca']},
  {id:52, name:'ZPHC Trenbolone Enanthate',   brand:'ZPHC', cat:'injectables', form:'10ml Vial', abbr:'TREN-E', price:p(165), tags:['trenbolone','enanthate']},
  {id:53, name:'ZPHC Boldenone Undecylenate', brand:'ZPHC', cat:'injectables', form:'10ml Vial', abbr:'EQ',     price:p(145), tags:['boldenone','equipoise']},
  {id:54, name:'ZPHC Masteron Enanthate 200', brand:'ZPHC', cat:'injectables', form:'10ml Vial', abbr:'MAST-E', price:p(195), tags:['masteron','drostanolone']},
  {id:55, name:'ZPHC Primobolan Enanthate',   brand:'ZPHC', cat:'injectables', form:'10ml Vial', abbr:'PRIMO',  price:p(235), tags:['primobolan','metenolone']},

  /* ── PHARMACOM LABS — INJECTABLES ── */
  {id:56, name:'Pharma Test E 300',           brand:'Pharmacom Labs', cat:'injectables', form:'10ml Vial', abbr:'TEST-E', price:p(145), tags:['testosterone','enanthate']},
  {id:57, name:'Pharma Test C 250',           brand:'Pharmacom Labs', cat:'injectables', form:'10ml Vial', abbr:'TEST-C', price:p(145), tags:['testosterone','cypionate']},
  {id:58, name:'Pharma Sust 300',             brand:'Pharmacom Labs', cat:'injectables', form:'10ml Vial', abbr:'SUST',   price:p(155), tags:['sustanon','testosterone']},
  {id:59, name:'Pharma Nan D 300',            brand:'Pharmacom Labs', cat:'injectables', form:'10ml Vial', abbr:'DECA',   price:p(170), tags:['nandrolone','deca']},
  {id:60, name:'Pharma Tren E 200',           brand:'Pharmacom Labs', cat:'injectables', form:'10ml Vial', abbr:'TREN-E', price:p(200), tags:['trenbolone','enanthate']},
  {id:61, name:'Pharma Tren A 100',           brand:'Pharmacom Labs', cat:'injectables', form:'10ml Vial', abbr:'TREN-A', price:p(190), tags:['trenbolone','acetate']},
  {id:62, name:'Pharma Bold 300',             brand:'Pharmacom Labs', cat:'injectables', form:'10ml Vial', abbr:'EQ',     price:p(165), tags:['boldenone','equipoise']},
  {id:63, name:'Pharma Mast E 200',           brand:'Pharmacom Labs', cat:'injectables', form:'10ml Vial', abbr:'MAST-E', price:p(195), tags:['masteron','drostanolone']},
  {id:64, name:'Pharma Primo E 100',          brand:'Pharmacom Labs', cat:'injectables', form:'10ml Vial', abbr:'PRIMO',  price:p(235), tags:['primobolan','metenolone']},

  /* ── DNA PRO — ORAL COMPOUNDS ── */
  {id:65, name:'DNA PRO Clomid 50mg',         brand:'DNA PRO', cat:'orals', form:'50 Tabs',  abbr:'CLOMID',  price:p(110), tags:['clomid','clomiphene','pct']},
  {id:66, name:'DNA PRO Proviron 25mg',        brand:'DNA PRO', cat:'orals', form:'50 Tabs',  abbr:'PROVI',   price:p(120), tags:['proviron','mesterolone']},
  {id:67, name:'DNA PRO Dianabol 10mg',        brand:'DNA PRO', cat:'orals', form:'100 Tabs', abbr:'DBOL',    price:p(65),  tags:['dianabol','methandienone']},
  {id:68, name:'DNA PRO Primosolan 25mg',      brand:'DNA PRO', cat:'orals', form:'50 Tabs',  abbr:'PRIMO',   price:p(220), tags:['primobolan','metenolone']},
  {id:69, name:'DNA PRO Anadrol 50mg',         brand:'DNA PRO', cat:'orals', form:'100 Tabs', abbr:'ADROL',   price:p(130), tags:['anadrol','oxymetholone']},
  {id:70, name:'DNA PRO Winstrol 10mg',        brand:'DNA PRO', cat:'orals', form:'100 Tabs', abbr:'WINST',   price:p(65),  tags:['winstrol','stanozolol']},
  {id:71, name:'DNA PRO T4 100 Tablets',       brand:'DNA PRO', cat:'orals', form:'100 Tabs', abbr:'T4',      price:p(65),  tags:['thyroid','t4','thyroxine']},
  {id:72, name:'DNA PRO Anavar 10mg',          brand:'DNA PRO', cat:'orals', form:'100 Tabs', abbr:'ANAV',    price:p(180), tags:['anavar','oxandrolone']},
  {id:73, name:'DNA PRO Turinabol 10mg',       brand:'DNA PRO', cat:'orals', form:'100 Tabs', abbr:'TBOL',    price:p(165), tags:['turinabol','tbol']},

  /* ── ZPHC — ORAL COMPOUNDS ── */
  {id:74, name:'ZPHC Anavar 10mg',            brand:'ZPHC', cat:'orals', form:'100 Tabs', abbr:'ANAV',   price:p(200), tags:['anavar','oxandrolone']},
  {id:75, name:'ZPHC Dianabol 10mg',          brand:'ZPHC', cat:'orals', form:'100 Tabs', abbr:'DBOL',   price:p(80),  tags:['dianabol','methandienone']},
  {id:76, name:'ZPHC Winstrol 10mg',          brand:'ZPHC', cat:'orals', form:'100 Tabs', abbr:'WINST',  price:p(90),  tags:['winstrol','stanozolol']},
  {id:77, name:'ZPHC Anadrol 50mg',           brand:'ZPHC', cat:'orals', form:'50 Tabs',  abbr:'ADROL',  price:p(130), tags:['anadrol','oxymetholone']},
  {id:78, name:'ZPHC Turinabol 10mg',         brand:'ZPHC', cat:'orals', form:'100 Tabs', abbr:'TBOL',   price:p(100), tags:['turinabol','tbol']},
  {id:79, name:'ZPHC Proviron 25mg',          brand:'ZPHC', cat:'orals', form:'50 Tabs',  abbr:'PROVI',  price:p(110), tags:['proviron','mesterolone']},

  /* ── PHARMACOM LABS — ORAL COMPOUNDS ── */
  {id:80, name:'Pharma Anavar 10mg',          brand:'Pharmacom Labs', cat:'orals', form:'100 Tabs', abbr:'ANAV',  price:p(210), tags:['anavar','oxandrolone']},
  {id:81, name:'Pharma Winstrol 10mg',        brand:'Pharmacom Labs', cat:'orals', form:'100 Tabs', abbr:'WINST', price:p(95),  tags:['winstrol','stanozolol']},
  {id:82, name:'Pharma Dianabol 10mg',        brand:'Pharmacom Labs', cat:'orals', form:'100 Tabs', abbr:'DBOL',  price:p(85),  tags:['dianabol','methandienone']},
  {id:83, name:'Pharma Anadrol 50mg',         brand:'Pharmacom Labs', cat:'orals', form:'50 Tabs',  abbr:'ADROL', price:p(135), tags:['anadrol','oxymetholone']},
  {id:84, name:'Pharma Primo Tabs 25mg',      brand:'Pharmacom Labs', cat:'orals', form:'50 Tabs',  abbr:'PRIMO', price:p(230), tags:['primobolan','metenolone']},

  /* ── DEZEL LABS — FAT LOSS (oral/drops) ── */
  {id:85, name:'Clen 200 20ml 200mcg/ml',     brand:'Dezel Labs', cat:'fatloss', form:'20ml Drops', abbr:'CLEN',   price:p(125), tags:['clenbuterol','fat burner']},
  {id:86, name:'T3-Thyro 100mcg/ml 20ml',     brand:'Dezel Labs', cat:'fatloss', form:'20ml Drops', abbr:'T3',     price:p(35),  tags:['t3','liothyronine','thyroid']},

  /* ── PCT & ANTI-ESTROGEN ── */
  {id:87, name:'ANASTRAZOLO Arimidex 1mg',    brand:'DNA PRO',  cat:'pct', form:'100 Tabs', abbr:'ARIM',   price:p(175), tags:['anastrozole','arimidex','aromatase inhibitor']},
  {id:88, name:'Pro T3 Liothyronine 25mcg',   brand:'DNA PRO',  cat:'pct', form:'90 Tabs',  abbr:'T3',     price:p(65),  tags:['t3','liothyronine','thyroid']},
  {id:89, name:'ZPHC Anastrozole 1mg',        brand:'ZPHC',     cat:'pct', form:'50 Tabs',  abbr:'ARIM',   price:p(120), tags:['anastrozole','ai']},
  {id:90, name:'ZPHC Clomid 50mg',            brand:'ZPHC',     cat:'pct', form:'50 Tabs',  abbr:'CLOMID', price:p(110), tags:['clomid','clomiphene','pct']},
  {id:91, name:'ZPHC Nolvadex 20mg',          brand:'ZPHC',     cat:'pct', form:'50 Tabs',  abbr:'NOLVA',  price:p(110), tags:['nolvadex','tamoxifen','pct']},
  {id:92, name:'ZPHC Letrozole 2.5mg',        brand:'ZPHC',     cat:'pct', form:'50 Tabs',  abbr:'LETRO',  price:p(130), tags:['letrozole','ai']},
  {id:93, name:'ZPHC Cabergoline 0.25mg',     brand:'ZPHC',     cat:'pct', form:'20 Tabs',  abbr:'CABER',  price:p(150), tags:['cabergoline','prolactin','pct']},
  {id:94, name:'ZPHC HCG 5000IU',             brand:'ZPHC',     cat:'pct', form:'1 Vial',   abbr:'HCG',    price:p(185), tags:['hcg','hormone','pct']},
  {id:95, name:'ZPHC Aromasin 25mg',          brand:'ZPHC',     cat:'pct', form:'50 Tabs',  abbr:'AROM',   price:p(130), tags:['exemestane','aromasin','ai']},
  {id:96, name:'DNA PRO Clomid 50mg',         brand:'DNA PRO',  cat:'pct', form:'50 Tabs',  abbr:'CLOMID', price:p(110), tags:['clomid','pct']},

  /* ── GV — HGH ── */
  {id:97,  name:'GV Somatropin 10IU x10 (HGH)', brand:'GV', cat:'hgh', form:'10 Vials', abbr:'HGH',  price:p(650), tags:['hgh','somatropin','growth hormone']},
  {id:98,  name:'GV Somatropin 16IU x10 (HGH)', brand:'GV', cat:'hgh', form:'10 Vials', abbr:'HGH',  price:p(800), tags:['hgh','somatropin','growth hormone']},

  /* ── PHARMACOM LABS — HGH ── */
  {id:99,  name:'Pharma HGH 100IU Kit',       brand:'Pharmacom Labs', cat:'hgh', form:'10x10IU',  abbr:'HGH',  price:p(680), tags:['hgh','somatropin']},
  {id:100, name:'Pharma HGH 200IU Kit',       brand:'Pharmacom Labs', cat:'hgh', form:'20x10IU',  abbr:'HGH',  price:p(1100),tags:['hgh','somatropin']},

  /* ── PHARMA GRADE — HGH ── */
  {id:101, name:'Pharma Grade HGH 100IU Kit', brand:'Pharma Grade', cat:'hgh', form:'10x10IU', abbr:'HGH', price:p(680), tags:['hgh','somatropin']},

  /* ── GV — PEPTIDES ── */
  {id:102, name:'GV AOD 9604 5mg + Bac Water', brand:'GV', cat:'peptides', form:'5mg Vial',   abbr:'AOD',    price:p(490), tags:['aod9604','fat loss peptide']},
  {id:103, name:'GV AOD 9604 2mg x3',          brand:'GV', cat:'peptides', form:'3x2mg Vials', abbr:'AOD',    price:p(240), tags:['aod9604','fat loss']},
  {id:104, name:'GV Thymalin 20mg + Bac Water',brand:'GV', cat:'peptides', form:'20mg Vial',   abbr:'THYM',   price:p(675), tags:['thymalin','immune']},
  {id:105, name:'GV 5-Amino-1MQ 10mg x3',      brand:'GV', cat:'peptides', form:'3 Vials',     abbr:'5A1MQ',  price:p(490), tags:['amino','nad+']},
  {id:106, name:'GV Thymosin Alpha-1 5mg x3',  brand:'GV', cat:'peptides', form:'3x5mg Vials', abbr:'TA-1',   price:p(675), tags:['thymosin','immune']},
  {id:107, name:'GV Tesamorelin 2mg',           brand:'GV', cat:'peptides', form:'2mg + BW',    abbr:'TESA',   price:p(250), tags:['tesamorelin','ghrh']},
  {id:108, name:'GV TB-500 5mg x3',             brand:'GV', cat:'peptides', form:'3x5mg Vials', abbr:'TB-500', price:p(350), tags:['tb500','thymosin beta-4']},
  {id:109, name:'GV Sermorelin 2mg',            brand:'GV', cat:'peptides', form:'2mg + BW',    abbr:'SERM',   price:p(350), tags:['sermorelin','ghrh']},
  {id:110, name:'GV Semaglutide 2mg x3',        brand:'GV', cat:'peptides', form:'3x2mg Vials', abbr:'SEMA',   price:p(450), tags:['semaglutide','ozempic','glp-1']},

  /* ── DNA PRO — PEPTIDES ── */
  {id:111, name:'DNA PRO BPC-157 15mg (5mgx3)', brand:'DNA PRO', cat:'peptides', form:'3x5mg Vials', abbr:'BPC-157', price:p(250), tags:['bpc157','healing']},
  {id:112, name:'DNA PRO CJC-1295 no DAC',      brand:'DNA PRO', cat:'peptides', form:'2mg + BW',    abbr:'CJC',     price:p(600), tags:['cjc1295','ghrh']},
  {id:113, name:'DNA PRO HGH Frag 176-191',      brand:'DNA PRO', cat:'peptides', form:'5x5mg Vials', abbr:'FRAG',    price:p(600), tags:['hgh fragment','fat loss']},
  {id:114, name:'DNA PRO IGF-LR3 1000mcg x3',   brand:'DNA PRO', cat:'peptides', form:'3 Vials',     abbr:'IGF',     price:p(550), tags:['igf-lr3','igf','growth']},
  {id:115, name:'DNA PRO Melanotan II 50mg x3',  brand:'DNA PRO', cat:'peptides', form:'3x2ml Vials', abbr:'MT-2',    price:p(350), tags:['melanotan','tanning','mt2']},

  /* ── LAWLESS LABS / BIOLAB — PEPTIDES & MISC ── */
  {id:116, name:'5-Amino 1MQ Capsules',         brand:'Lawless Labs', cat:'peptides', form:'Capsules',   abbr:'5A1MQ',  price:p(225), tags:['amino','nad+','methylquinolinium']},
  {id:117, name:'5-Amino 1MQ Drops',            brand:'Lawless Labs', cat:'peptides', form:'Oral Drops', abbr:'5A1MQ',  price:p(250), tags:['amino','nad+']},
  {id:118, name:'5-Amino-1MQ 50mg 30 caps',     brand:'Biolab',       cat:'peptides', form:'30 Caps',    abbr:'5A1MQ',  price:p(845), tags:['amino','nad+']},
  {id:119, name:'Acetyl GLP-1+GIP 10mg',        brand:'Biolab',       cat:'peptides', form:'10mg Vial',  abbr:'GLP-1',  price:p(1050),tags:['glp-1','mounjaro','tirzepatide']},
  {id:120, name:'Acetyl GLP-1+GIP Pen 5mg',     brand:'Biolab',       cat:'peptides', form:'5mg Pen',    abbr:'GLP-1',  price:p(810), tags:['glp-1','mounjaro','pen']},
  {id:121, name:'Adamax 10mg',                  brand:'Biolab',       cat:'peptides', form:'10mg Vial',  abbr:'ADMAX',  price:p(350), tags:['adamax','nootropic']},
  {id:122, name:'Adamax Spray 10mg/10ml',        brand:'Biolab',       cat:'peptides', form:'10ml Spray', abbr:'ADMAX',  price:p(275), tags:['adamax','nasal spray']},
  {id:123, name:'AICAR 250mg (80mg/vial x5)',    brand:'Novu Peptides',cat:'peptides', form:'5 Vials',    abbr:'AICAR',  price:p(400), tags:['aicar','endurance','ampk']},
  {id:124, name:'191 Aminoacids Sequence 100iu', brand:'Novu Peptides',cat:'hgh',     form:'100iu',       abbr:'HGH',    price:p(1325),tags:['hgh','growth hormone','191aa']},
  {id:125, name:'AC-262 Accadrine 20mg',         brand:'Lawless Labs', cat:'sarms',   form:'Drops 20mg',  abbr:'AC-262', price:p(170), tags:['ac262','sarm']},
  {id:126, name:'AC-262 536 10mg 60 caps',       brand:'Lawless Labs', cat:'sarms',   form:'60 Caps',     abbr:'AC-262', price:p(360), tags:['ac262','sarm']},
  {id:127, name:'AC-262 Accadrine 60 caps',      brand:'Lawless Labs', cat:'sarms',   form:'60 Caps',     abbr:'AC-262', price:p(150), tags:['ac262','sarm']},

  /* ── PEPTIDE SCIENCES — PEPTIDES ── */
  {id:128, name:'BPC-157 5mg',                  brand:'Peptide Sciences', cat:'peptides', form:'5mg Vial',  abbr:'BPC-157', price:p(140), tags:['bpc157','healing','peptide']},
  {id:129, name:'BPC-157 10mg',                 brand:'Peptide Sciences', cat:'peptides', form:'10mg Vial', abbr:'BPC-157', price:p(240), tags:['bpc157','healing']},
  {id:130, name:'TB-500 5mg',                   brand:'Peptide Sciences', cat:'peptides', form:'5mg Vial',  abbr:'TB-500',  price:p(160), tags:['tb500','thymosin beta-4']},
  {id:131, name:'CJC-1295 No DAC 2mg',          brand:'Peptide Sciences', cat:'peptides', form:'2mg Vial',  abbr:'CJC',     price:p(110), tags:['cjc1295','ghrh']},
  {id:132, name:'Ipamorelin 5mg',               brand:'Peptide Sciences', cat:'peptides', form:'5mg Vial',  abbr:'IPA',     price:p(130), tags:['ipamorelin','ghrp']},
  {id:133, name:'PT-141 Bremelanotide 10mg',    brand:'Peptide Sciences', cat:'peptides', form:'10mg Vial', abbr:'PT-141',  price:p(175), tags:['pt141','sexual','melanocortin']},
  {id:134, name:'Selank 5mg',                   brand:'Peptide Sciences', cat:'peptides', form:'5mg Vial',  abbr:'SELANK',  price:p(170), tags:['selank','nootropic','anxiety']},
  {id:135, name:'Epithalon 10mg',               brand:'Peptide Sciences', cat:'peptides', form:'10mg Vial', abbr:'EPITH',   price:p(195), tags:['epithalon','longevity']},
  {id:136, name:'GHK-Cu 200mg',                 brand:'Peptide Sciences', cat:'peptides', form:'200mg',     abbr:'GHK-Cu',  price:p(140), tags:['ghkcu','copper peptide','anti-aging']},
  {id:137, name:'AOD-9604 5mg',                 brand:'Peptide Sciences', cat:'peptides', form:'5mg Vial',  abbr:'AOD',     price:p(145), tags:['aod9604','fat loss']},
  {id:138, name:'HGH Fragment 176-191 5mg',     brand:'Peptide Sciences', cat:'peptides', form:'5mg Vial',  abbr:'FRAG',    price:p(145), tags:['hgh fragment','fat loss']},
  {id:139, name:'GHRP-2 5mg',                   brand:'Peptide Sciences', cat:'peptides', form:'5mg Vial',  abbr:'GHRP-2',  price:p(110), tags:['ghrp2','ghrp','secretagogue']},
  {id:140, name:'GHRP-6 5mg',                   brand:'Peptide Sciences', cat:'peptides', form:'5mg Vial',  abbr:'GHRP-6',  price:p(110), tags:['ghrp6','ghrp','secretagogue']},
  {id:141, name:'Melanotan II 10mg',            brand:'Peptide Sciences', cat:'peptides', form:'10mg Vial', abbr:'MT-2',    price:p(175), tags:['melanotan','tanning','mt2']},
  {id:142, name:'Thymosin Alpha-1 5mg',         brand:'Peptide Sciences', cat:'peptides', form:'5mg Vial',  abbr:'TA-1',    price:p(265), tags:['thymosin','immune']},
  {id:143, name:'Semax 30mg',                   brand:'Peptide Sciences', cat:'peptides', form:'30mg',      abbr:'SEMAX',   price:p(200), tags:['semax','nootropic','cns']},
  {id:144, name:'Sermorelin 2mg',               brand:'Peptide Sciences', cat:'peptides', form:'2mg Vial',  abbr:'SERM',    price:p(130), tags:['sermorelin','ghrh']},
  {id:145, name:'Hexarelin 2mg',                brand:'Peptide Sciences', cat:'peptides', form:'2mg Vial',  abbr:'HEXA',    price:p(120), tags:['hexarelin','ghrp']},

  /* ── CAMBRIDGE RESEARCH — PEPTIDES & SARMS ── */
  {id:146, name:'Cambridge BPC-157 5mg',        brand:'Cambridge Research', cat:'peptides', form:'5mg Vial', abbr:'BPC-157', price:p(165), tags:['bpc157','healing']},
  {id:147, name:'Cambridge TB-500 5mg',         brand:'Cambridge Research', cat:'peptides', form:'5mg Vial', abbr:'TB-500',  price:p(185), tags:['tb500']},
  {id:148, name:'Cambridge RAD-140',            brand:'Cambridge Research', cat:'sarms',    form:'50 Caps',  abbr:'RAD-140', price:p(215), tags:['rad140','testolone','sarm']},
  {id:149, name:'Cambridge LGD-4033',           brand:'Cambridge Research', cat:'sarms',    form:'50 Caps',  abbr:'LGD',     price:p(205), tags:['lgd4033','ligandrol','sarm']},
  {id:150, name:'Cambridge MK-677',             brand:'Cambridge Research', cat:'sarms',    form:'50 Caps',  abbr:'MK-677',  price:p(225), tags:['mk677','ibutamoren','sarm']},

  /* ── PHARMA GRADE — PEPTIDES ── */
  {id:151, name:'Pharma Grade BPC-157 5mg',     brand:'Pharma Grade', cat:'peptides', form:'5mg Vial',  abbr:'BPC-157', price:p(155), tags:['bpc157','healing']},
  {id:152, name:'Pharma Grade TB-500 5mg',      brand:'Pharma Grade', cat:'peptides', form:'5mg Vial',  abbr:'TB-500',  price:p(185), tags:['tb500']},
  {id:153, name:'Pharma Grade Semaglutide 5mg', brand:'Pharma Grade', cat:'peptides', form:'5mg Vial',  abbr:'SEMA',    price:p(320), tags:['semaglutide','ozempic','glp-1']},
  {id:154, name:'Pharma Grade Tirzepatide 10mg',brand:'Pharma Grade', cat:'peptides', form:'10mg Vial', abbr:'TIRZ',    price:p(420), tags:['tirzepatide','mounjaro','glp-1']},
  {id:155, name:'Pharma Grade HGH Fragment',    brand:'Pharma Grade', cat:'peptides', form:'5mg Vial',  abbr:'FRAG',    price:p(155), tags:['hgh fragment','fat loss']},

  /* ── LAWLESS LABS — SARMs ── */
  {id:156, name:'RAD-140 Testolone',            brand:'Lawless Labs', cat:'sarms', form:'50 Caps 10mg', abbr:'RAD-140', price:p(225), tags:['rad140','testolone','sarm']},
  {id:157, name:'LGD-4033 Ligandrol',           brand:'Lawless Labs', cat:'sarms', form:'50 Caps 10mg', abbr:'LGD',     price:p(225), tags:['lgd4033','ligandrol','sarm']},
  {id:158, name:'MK-677 Ibutamoren',            brand:'Lawless Labs', cat:'sarms', form:'50 Caps 25mg', abbr:'MK-677',  price:p(245), tags:['mk677','ibutamoren','secretagogue']},
  {id:159, name:'Ostarine MK-2866',             brand:'Lawless Labs', cat:'sarms', form:'50 Caps 25mg', abbr:'OSTA',    price:p(199), tags:['ostarine','mk2866','sarm']},
  {id:160, name:'Cardarine GW-501516',          brand:'Lawless Labs', cat:'sarms', form:'50 Caps 20mg', abbr:'GW',      price:p(215), tags:['cardarine','gw501516','endurance']},
  {id:161, name:'YK-11',                        brand:'Lawless Labs', cat:'sarms', form:'50 Caps 10mg', abbr:'YK-11',   price:p(245), tags:['yk11','myostatin','sarm']},
  {id:162, name:'SR9009 Stenabolic',            brand:'Lawless Labs', cat:'sarms', form:'50 Caps 20mg', abbr:'SR9009',  price:p(225), tags:['sr9009','stenabolic','endurance']},
  {id:163, name:'S4 Andarine',                  brand:'Lawless Labs', cat:'sarms', form:'50 Caps 25mg', abbr:'S-4',     price:p(215), tags:['andarine','s4','sarm']},
  {id:164, name:'S-23',                         brand:'Lawless Labs', cat:'sarms', form:'50 Caps 10mg', abbr:'S-23',    price:p(235), tags:['s23','sarm']},

  /* ── UNISARM LABS — SARMs ── */
  {id:165, name:'Unisarm RAD-140 10mg',         brand:'Unisarm Labs', cat:'sarms', form:'60 Caps', abbr:'RAD-140', price:p(215), tags:['rad140','testolone','sarm']},
  {id:166, name:'Unisarm LGD-4033 10mg',        brand:'Unisarm Labs', cat:'sarms', form:'60 Caps', abbr:'LGD',     price:p(205), tags:['lgd4033','ligandrol','sarm']},
  {id:167, name:'Unisarm MK-677 25mg',          brand:'Unisarm Labs', cat:'sarms', form:'60 Caps', abbr:'MK-677',  price:p(225), tags:['mk677','ibutamoren']},
  {id:168, name:'Unisarm Ostarine 25mg',        brand:'Unisarm Labs', cat:'sarms', form:'60 Caps', abbr:'OSTA',    price:p(195), tags:['ostarine','mk2866','sarm']},
  {id:169, name:'Unisarm Cardarine 20mg',       brand:'Unisarm Labs', cat:'sarms', form:'60 Caps', abbr:'GW',      price:p(205), tags:['cardarine','endurance']},
  {id:170, name:'Unisarm YK-11 10mg',           brand:'Unisarm Labs', cat:'sarms', form:'60 Caps', abbr:'YK-11',   price:p(235), tags:['yk11','sarm']},
  {id:171, name:'Unisarm SR9009 20mg',          brand:'Unisarm Labs', cat:'sarms', form:'60 Caps', abbr:'SR9009',  price:p(225), tags:['sr9009','endurance']},

  /* ── APPLIED NUTRITION — SPORTS NUTRITION ── */
  {id:172, name:'ISO-XP Whey Protein 1kg',      brand:'Applied Nutrition', cat:'nutrition', form:'1kg',     abbr:'ISO-XP',   price:p(135), tags:['protein','whey','isolate']},
  {id:173, name:'Critical Whey 2kg',            brand:'Applied Nutrition', cat:'nutrition', form:'2kg',     abbr:'WHEY',     price:p(199), tags:['protein','whey']},
  {id:174, name:'100% Casein 1.8kg',            brand:'Applied Nutrition', cat:'nutrition', form:'1.8kg',   abbr:'CASEIN',   price:p(155), tags:['casein','slow protein']},
  {id:175, name:'Diet Whey 1kg',                brand:'Applied Nutrition', cat:'nutrition', form:'1kg',     abbr:'D-WHEY',   price:p(119), tags:['diet whey','lean protein']},
  {id:176, name:'ABE Pre-Workout 375g',         brand:'Applied Nutrition', cat:'nutrition', form:'375g',    abbr:'ABE',      price:p(129), tags:['pre-workout','energy','abe']},
  {id:177, name:'ABE Pre-Workout Gel 60ml',     brand:'Applied Nutrition', cat:'nutrition', form:'60ml Gel',abbr:'ABE GEL',  price:p(10),  tags:['pre-workout','energy','gel']},
  {id:178, name:'ABE Pre-Workout Shots 60ml',   brand:'Applied Nutrition', cat:'nutrition', form:'60ml',    abbr:'ABE SHOT', price:p(10),  tags:['pre-workout','shot','energy']},
  {id:179, name:'BCAA Amino-Hydrate 450g',      brand:'Applied Nutrition', cat:'nutrition', form:'450g',    abbr:'BCAA',     price:p(127), tags:['bcaa','amino acids','recovery']},
  {id:180, name:'Citrulline Malate 2:1 300g',   brand:'Applied Nutrition', cat:'nutrition', form:'300g',    abbr:'CIT-MAL',  price:p(52),  tags:['citrulline','pump','amino']},
  {id:181, name:'AAKG Arginine Powder 150g',    brand:'Applied Nutrition', cat:'nutrition', form:'150g',    abbr:'AAKG',     price:p(104), tags:['arginine','aakg','nitric oxide']},
  {id:182, name:'Acetyl L-Carnitine 150g',      brand:'Applied Nutrition', cat:'nutrition', form:'150g',    abbr:'ALCAR',    price:p(95),  tags:['l-carnitine','fat burning']},
  {id:183, name:'L-Glutamine Powder',           brand:'Applied Nutrition', cat:'nutrition', form:'250g',    abbr:'GLUT',     price:p(58),  tags:['glutamine','recovery']},
  {id:184, name:'CLA + L-Carnitine + Green Tea',brand:'Applied Nutrition', cat:'nutrition', form:'100 Caps',abbr:'CLA',      price:p(70),  tags:['cla','fat burner','carnitine']},
  {id:185, name:'Brain Fuel 60 Capsules',       brand:'Applied Nutrition', cat:'nutrition', form:'60 Caps', abbr:'BRAIN',    price:p(92),  tags:['nootropic','focus','brain']},
  {id:186, name:'Calcium & Magnesium',          brand:'Applied Nutrition', cat:'vitamins',  form:'90 Tabs', abbr:'CAL-MAG',  price:p(77),  tags:['calcium','magnesium','mineral']},
  {id:187, name:'Berberine 1000mg',             brand:'Applied Nutrition', cat:'vitamins',  form:'90 Caps', abbr:'BERB',     price:p(150), tags:['berberine','glucose','metabolic']},
  {id:188, name:'Citrus Bergamot 1200mg',       brand:'Applied Nutrition', cat:'vitamins',  form:'60 Caps', abbr:'BERG',     price:p(179), tags:['bergamot','cholesterol','cardiovascular']},
  {id:189, name:'Milk Thistle',                 brand:'Applied Nutrition', cat:'vitamins',  form:'60 Caps', abbr:'MILK-T',   price:p(55),  tags:['milk thistle','liver','detox']},

  /* ── REVIVE MD — VITAMINS & HEALTH ── */
  {id:190, name:'Revive Glutamine 300g',         brand:'Revive MD', cat:'nutrition', form:'300g',    abbr:'GLUT',    price:p(153), tags:['glutamine','gut health','recovery']},
  {id:191, name:'Revive Essential Vitamin Pack', brand:'Revive MD', cat:'vitamins',  form:'Pack',    abbr:'VIT PKG', price:p(315), tags:['vitamins','multivitamin','health pack']},
  {id:192, name:'Revive Multi Vitamin',          brand:'Revive MD', cat:'vitamins',  form:'120 Caps',abbr:'MULTI-V', price:p(200), tags:['multivitamin','vitamins']},
  {id:193, name:'Revive Multi Minerals',         brand:'Revive MD', cat:'vitamins',  form:'120 Caps',abbr:'MULTI-M', price:p(200), tags:['minerals','multiminerals']},
  {id:194, name:'Revive B-Complex',              brand:'Revive MD', cat:'vitamins',  form:'60 Caps', abbr:'B-CMPLX', price:p(112), tags:['b vitamins','energy','b complex']},
  {id:195, name:'Revive Vitamin C 60 Caps',      brand:'Revive MD', cat:'vitamins',  form:'60 Caps', abbr:'VIT-C',   price:p(153), tags:['vitamin c','immune','antioxidant']},
  {id:196, name:'Revive Vitamin K2 + D3',        brand:'Revive MD', cat:'vitamins',  form:'60 Caps', abbr:'K2-D3',   price:p(199), tags:['vitamin d','vitamin k','bone health']},
  {id:197, name:'Revive Omega 3 130 Caps',       brand:'Revive MD', cat:'vitamins',  form:'130 Caps',abbr:'OMEGA-3', price:p(189), tags:['omega 3','fish oil','cardiovascular']},
  {id:198, name:'Revive Yohimbine',              brand:'Revive MD', cat:'fatloss',   form:'60 Caps', abbr:'YOHIMB',  price:p(180), tags:['yohimbine','fat burner','thermogenic']},
  {id:199, name:'Revive Adrenacore',             brand:'Revive MD', cat:'vitamins',  form:'60 Caps', abbr:'ADREN',   price:p(200), tags:['adrenal','cortisol','stress']},
  {id:200, name:'Revive Cortisol Support',       brand:'Revive MD', cat:'vitamins',  form:'60 Caps', abbr:'CORT',    price:p(245), tags:['cortisol','stress','adaptogen']},
  {id:201, name:'Revive Collagen 260g',          brand:'Revive MD', cat:'vitamins',  form:'260g',    abbr:'COLL',    price:p(299), tags:['collagen','joints','skin']},
  {id:202, name:'Revive Fiber 312g',             brand:'Revive MD', cat:'vitamins',  form:'312g',    abbr:'FIBER',   price:p(189), tags:['fiber','gut health','digestion']},
  {id:203, name:'Revive Daily Greens 600g',      brand:'Revive MD', cat:'vitamins',  form:'600g',    abbr:'GREENS',  price:p(258), tags:['greens','superfoods','alkalizing']},
  {id:204, name:'Revive Daily Greens 180 Caps',  brand:'Revive MD', cat:'vitamins',  form:'180 Caps',abbr:'GREENS',  price:p(258), tags:['greens','superfoods']},
  {id:205, name:'Revive Magnesium Glycinate',    brand:'Revive MD', cat:'vitamins',  form:'180 Caps',abbr:'MAG-G',   price:p(153), tags:['magnesium','sleep','recovery']},
  {id:206, name:'Revive Digest Aid',             brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'DIGEST',  price:p(200), tags:['digestion','enzymes','gut health']},
  {id:207, name:'Revive Turmeric+',              brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'TURM',    price:p(279), tags:['turmeric','anti-inflammatory','curcumin']},
  {id:208, name:'Revive Kidney Support',         brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'KIDNEY',  price:p(224), tags:['kidney','organ support','detox']},
  {id:209, name:'Revive Liver Support',          brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'LIVER',   price:p(257), tags:['liver','organ support','on-cycle support']},
  {id:210, name:'Revive Thyroid Support',        brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'THYROID', price:p(210), tags:['thyroid','metabolism','hormones']},
  {id:211, name:'Revive Lipid',                  brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'LIPID',   price:p(279), tags:['cholesterol','cardiovascular','lipids']},
  {id:212, name:'Revive Ashwagandha',            brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'ASHWA',   price:p(159), tags:['ashwagandha','adaptogen','stress']},
  {id:213, name:'Revive OPTI Zinc',              brand:'Revive MD', cat:'vitamins',  form:'60 Caps', abbr:'ZINC',    price:p(153), tags:['zinc','testosterone','immune']},
  {id:214, name:'Revive Prostate Support',       brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'PROST',   price:p(279), tags:['prostate','saw palmetto','mens health']},
  {id:215, name:'Revive Calm+',                  brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'CALM',    price:p(199), tags:['calm','anxiety','relaxation']},
  {id:216, name:'Revive GI+ 165g',               brand:'Revive MD', cat:'vitamins',  form:'165g',    abbr:'GI+',     price:p(299), tags:['gut health','gi','probiotics']},
  {id:217, name:'Revive Inositol',               brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'INOSITOL',price:p(189), tags:['inositol','mood','insulin']},
  {id:218, name:'Revive Heart',                  brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'HEART',   price:p(300), tags:['heart','cardiovascular','coq10']},
  {id:219, name:'Revive Men\'s Health',          brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'MEN',     price:p(258), tags:['mens health','testosterone','vitality']},
  {id:220, name:'Revive Women\'s Health',        brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'WOMEN',   price:p(210), tags:['womens health','hormonal','balance']},
  {id:221, name:'Revive Bergamot',               brand:'Revive MD', cat:'vitamins',  form:'60 Caps', abbr:'BERG',    price:p(189), tags:['bergamot','cholesterol']},
  {id:222, name:'Revive Zinc Carnosine 120 Cap', brand:'Revive MD', cat:'vitamins',  form:'120 Caps',abbr:'ZN-CARN', price:p(153), tags:['zinc','stomach','gut lining']},
  {id:223, name:'Revive Sleep 312g Choc',        brand:'Revive MD', cat:'vitamins',  form:'312g',    abbr:'SLEEP',   price:p(225), tags:['sleep','melatonin','recovery']},
  {id:224, name:'Revive Suntheanine',            brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'THEAN',   price:p(190), tags:['l-theanine','calm','focus']},
  {id:225, name:'Revive Betaine HCL',            brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'BETAINE', price:p(153), tags:['betaine','digestion','hcl']},
  {id:226, name:'Revive Joint Support',          brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'JOINTS',  price:p(245), tags:['joints','glucosamine','collagen']},
  {id:227, name:'Revive Glucose',                brand:'Revive MD', cat:'vitamins',  form:'90 Caps', abbr:'GLUC',    price:p(279), tags:['glucose','berberine','blood sugar']},

  /* ── SUPPLEMENT NEEDS ── */
  {id:228, name:'Electrolyte Powder',           brand:'Supplement Needs', cat:'nutrition', form:'400g',    abbr:'ELECTRO',  price:p(130), tags:['electrolytes','hydration','sports']},
  {id:229, name:'Cream of Rice',                brand:'Supplement Needs', cat:'nutrition', form:'1kg',     abbr:'C.O.R',    price:p(225), tags:['carbohydrates','cream of rice','carbs']},
  {id:230, name:'Creatine Monohydrate',         brand:'Supplement Needs', cat:'nutrition', form:'500g',    abbr:'CREAT',    price:p(165), tags:['creatine','strength','power']},
  {id:231, name:'Glutamine Powder',             brand:'Supplement Needs', cat:'nutrition', form:'500g',    abbr:'GLUT',     price:p(113), tags:['glutamine','recovery','gut']},
  {id:232, name:'Immuno Pro+',                  brand:'Supplement Needs', cat:'vitamins',  form:'90 Caps', abbr:'IMMUNO',   price:p(231), tags:['immune','zinc','vitamin c']},
  {id:233, name:'Heart Stack',                  brand:'Supplement Needs', cat:'vitamins',  form:'90 Caps', abbr:'HEART',    price:p(285), tags:['heart','cardiovascular','coq10']},

  /* ── ALPHA GPC ── */
  {id:234, name:'Alpha GPC 300mg 60 Caps',      brand:'Novu Peptides', cat:'vitamins', form:'60 Caps', abbr:'α-GPC', price:p(180), tags:['alpha gpc','nootropic','choline','cognitive']},

  /* ── ACCESSORIES ── */
  {id:235, name:'0.5ml Insulin Syringe',        brand:'Novu Peptides', cat:'accessories', form:'Each',    abbr:'SYR',  price:p(1),   tags:['syringe','needle','injection']},
  {id:236, name:'1ml Insulin Syringe',          brand:'Novu Peptides', cat:'accessories', form:'Each',    abbr:'SYR',  price:p(1),   tags:['syringe','needle','injection']},
  {id:237, name:'Bacteriostatic Water 10ml',    brand:'Novu Peptides', cat:'accessories', form:'10ml',    abbr:'BAC W',price:p(25),  tags:['bacteriostatic water','reconstitution']},
  {id:238, name:'Sterile Water 2ml',            brand:'Novu Peptides', cat:'accessories', form:'2ml',     abbr:'STER W',price:p(15), tags:['sterile water','reconstitution']},
];
