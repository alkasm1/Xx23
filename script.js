/****************************************************
 * ALM ENGINE + CORE SETTINGS
 ****************************************************/

const B = 32;
const LMAX = 12;
const SIZE = 1024;
const HEADER = 24;

const HEADER_CRC_OFFSET = 8;
const HEADER_RESERVED_OFFSET = 12;

/****************************************************
 * CHAR TABLE
 ****************************************************/

const indexToChar = {
  1: "ا", 2: "ب", 3: "ت", 4: "ث", 5: "ج", 6: "ح", 7: "خ", 8: "د", 9: "ذ",
  10: "ر", 11: "ز", 12: "س", 13: "ش", 14: "ص", 15: "ض", 16: "ط",
  17: "ظ", 18: "ع", 19: "غ", 20: "ف", 21: "ق", 22: "ك", 23: "ل",
  24: "م", 25: "ن", 26: "ه", 27: "و", 28: "ي", 29: "ء"
};

const charToIndex = {};
for (let k in indexToChar) charToIndex[indexToChar[k]] = Number(k);

/****************************************************
 * NORMALIZE + CLEAN (WITH SAFE NEWLINE TOKEN)
 ****************************************************/
function normalizeArabic(text) {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function cleanText(text) {
  text = normalizeArabic(text);

  let out = "";
  for (const ch of text) {

    if (ch === "\n") {
      out += " ␤ ";   // ← رمز سطر آمن
    }

    else if (ch === " " || ch === "\t") {
      out += " ";
    }

    else if (charToIndex[ch]) {
      out += ch;
    }
  }

  return out.replace(/\s+/g, " ").trim();
}

/****************************************************
 * CRC32
 ****************************************************/
function crc32(str) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      t[i] = c >>> 0;
    }
    return t;
  })());

  const bytes = new TextEncoder().encode(str);
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/****************************************************
 * FILE EXTRACTION — KEEP NEWLINES
 ****************************************************/
async function extractText(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file("word/document.xml").async("string");
    return xml.replace(/<[^>]+>/g, "\n");
  }

  if (name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const line = content.items.map(i => i.str).join(" ");
      text += line + "\n";
    }
    return text;
  }

  throw new Error("نوع غير مدعوم");
}

/****************************************************
 * ALM CORE FUNCTIONS (ORIGINAL — DO NOT CHANGE)
 ****************************************************/
function wordToCode(w) {
  let C = 0n;
  let pos = 0;

  for (let i = w.length - 1; i >= 0 && pos < LMAX; i--) {
    const idx = charToIndex[w[i]] || 0;
    C += BigInt(idx) * (BigInt(B) ** BigInt(pos));
    pos++;
  }
  return C;
}

function codeToWord(C) {
  let out = "";
  for (let i = 0; i < LMAX; i++) {
    const d = Number(C % BigInt(B));
    C /= BigInt(B);
    if (d) out = indexToChar[d] + out;
  }
  return out;
}

/****************************************************
 * DRAW
 ****************************************************/
function drawByte(buf, p, byte) {
  const gray = 255 - (byte & 255);
  const i = p * 4;
  buf[i] = gray;
  buf[i + 1] = gray;
  buf[i + 2] = gray;
  buf[i + 3] = 255;
}

function readByte(data, p) {
  return 255 - data[p * 4];
}

/****************************************************
 * ALM SIGNATURE (رأفت عمر)
 ****************************************************/
const SIGNATURE_TEXT = "رأفت عمر";
const SIGNATURE_CODE = wordToCode(cleanText(SIGNATURE_TEXT));

function drawSignature(buf) {
  for (let i = 0; i < 12; i++) {
    const b = Number((SIGNATURE_CODE >> BigInt(8 * i)) & 0xFFn);
    drawByte(buf, HEADER_RESERVED_OFFSET + i, b);
  }
}

/****************************************************
 * UI ELEMENTS
 ****************************************************/
const btnEncode = document.getElementById("btnEncode");
const btnDecode = document.getElementById("btnDecode");
const btnSaveImage = document.getElementById("btnSaveImage");
const btnExport = document.getElementById("btnExport");

const statusEncode = document.getElementById("statusEncode");
const statusDecode = document.getElementById("statusDecode");
const outputText = document.getElementById("outputText");

const progressBox = document.getElementById("progressBox");
const progressBar = document.getElementById("progressBar");

const fileSizeSpan = document.getElementById("fileSize");
const blockCountSpan = document.getElementById("blockCount");

const tabEncode = document.getElementById("tabEncode");
const tabDecode = document.getElementById("tabDecode");
const cardEncode = document.getElementById("cardEncode");
const cardDecode = document.getElementById("cardDecode");

const btnAdvancedToggle = document.getElementById("btnAdvancedToggle");
const advancedBox = document.getElementById("advancedBox");

let lastDecodedText = "";

/****************************************************
 * HELPERS
 ****************************************************/
function setProgress(p) {
  progressBox.style.display = "block";
  progressBar.style.width = p + "%";
  if (p >= 100) {
    setTimeout(() => { progressBox.style.display = "none"; }, 600);
  }
}

function setStatusEncode(msg) {
  statusEncode.innerHTML = "<b>الحالة:</b> " + msg;
}

function setStatusDecode(msg) {
  statusDecode.innerHTML = "<b>الحالة:</b> " + msg;
}

/****************************************************
 * TABS
 ****************************************************/
tabEncode.onclick = () => {
  tabEncode.classList.add("active");
  tabDecode.classList.remove("active");
  cardEncode.style.display = "block";
  cardDecode.style.display = "none";
};

tabDecode.onclick = () => {
  tabDecode.classList.add("active");
  tabEncode.classList.remove("active");
  cardEncode.style.display = "none";
  cardDecode.style.display = "block";
};

/****************************************************
 * ADVANCED TOGGLE
 ****************************************************/
btnAdvancedToggle.onclick = () => {
  advancedBox.style.display = (advancedBox.style.display === "none" || !advancedBox.style.display)
    ? "block" : "none";
};

/****************************************************
 * ENCODE (ORIGINAL + SAFE NEWLINES)
 ****************************************************/
btnEncode.onclick = async () => {
  try {
    const fileInput = document.getElementById("docInput");
    const file = fileInput.files[0];
    if (!file) {
      alert("اختر ملف Word أو PDF أولاً");
      return;
    }

    setStatusEncode("جاري قراءة الملف...");
    setProgress(10);

    let text = await extractText(file);
    text = cleanText(text);

    if (!text) {
      setStatusEncode("لم يتم العثور على نص صالح بعد التنظيف.");
      return;
    }

    const key = BigInt(document.getElementById("userKey").value || 0);
    const mode = document.getElementById("mode").value;

    const words = text.split(" ");
    const blocks = [];

    for (const w of words) {
      for (let i = 0; i < w.length; i += LMAX) {
        blocks.push(w.slice(i, i + LMAX));
      }
    }

    fileSizeSpan.text
