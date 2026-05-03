/****************************************************
 * ALM ENGINE + SETTINGS
 ****************************************************/

const B = 32;
const LMAX = 12;
const SIZE = 1024;
const HEADER = 24;
const NL = "\uE000"; // newline token

const HEADER_CRC_OFFSET = 8;
const HEADER_RESERVED_OFFSET = 12;

/****************************************************
 * CHAR TABLE
 ****************************************************/

const indexToChar = {
  1:"ا",2:"ب",3:"ت",4:"ث",5:"ج",6:"ح",7:"خ",8:"د",9:"ذ",
  10:"ر",11:"ز",12:"س",13:"ش",14:"ص",15:"ض",16:"ط",
  17:"ظ",18:"ع",19:"غ",20:"ف",21:"ق",22:"ك",23:"ل",
  24:"م",25:"ن",26:"ه",27:"و",28:"ي",29:"ء"
};

const charToIndex = {};
for (let k in indexToChar) charToIndex[indexToChar[k]] = Number(k);

/****************************************************
 * VM + ALM
 ****************************************************/

const vm = new ALM_VM();
const alm = new ALM_Interpreter(vm);

fetch("alm_core.alm")
  .then(r => r.text())
  .then(t => alm.load(t));

/****************************************************
 * NORMALIZE + CLEAN
 ****************************************************/

function normalizeArabic(text){
  return text
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function cleanText(text){
  text = normalizeArabic(text);

  let out = "";

  for (const ch of text){

    if (ch === "\n"){
      out += ` ${NL} `;
    }

    else if (ch === " " || ch === "\t"){
      out += " ";
    }

    else if (charToIndex[ch]){
      out += ch;
    }

    else if (/[0-9A-Za-z.,!?;:()\-]/.test(ch)){
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
 * EXTRACT TEXT (DOCX + PDF)
 ****************************************************/

async function extractText(file){
  const name = file.name.toLowerCase();

  if(name.endsWith(".docx")){
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file("word/document.xml").async("string");

    const paragraphs = xml.split("</w:p>");
    let text = "";

    for (const p of paragraphs) {
      const matches = p.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (matches) {
        const line = matches.map(t => t.replace(/<[^>]+>/g, "")).join("");
        text += line + "\n";
      }
    }

    return text;
  }

  if(name.endsWith(".pdf")){
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: buf}).promise;

    let text = "";

    for(let i=1;i<=pdf.numPages;i++){
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const items = content.items;

      items.sort((a,b)=>{
        const dy = Math.abs(a.transform[5]-b.transform[5]);
        if(dy>5) return b.transform[5]-a.transform[5];
        return a.transform[4]-b.transform[4];
      });

      let line = "";
      let lastY = null;

      for(const item of items){
        const y = item.transform[5];

        if(lastY !== null && Math.abs(y-lastY)>5){
          line += "\n";
        }

        line += item.str + " ";
        lastY = y;
      }

      text += line + "\n";
    }

    return text;
  }

  throw new Error("نوع غير مدعوم");
}

/****************************************************
 * DRAW / READ
 ****************************************************/

function drawByte(buf, p, byte){
  const gray = 255 - (byte & 255);
  const i = p * 4;
  buf[i]=gray;buf[i+1]=gray;buf[i+2]=gray;buf[i+3]=255;
}

function readByte(data, p){
  return 255 - data[p*4];
}

/****************************************************
 * UI
 ****************************************************/

const btnEncode = document.getElementById("btnEncode");
const btnDecode = document.getElementById("btnDecode");
const outputText = document.getElementById("outputText");

let lastDecodedText = "";

/****************************************************
 * ENCODE
 ****************************************************/

btnEncode.onclick = async () => {

  const file = document.getElementById("docInput").files[0];
  if(!file) return alert("اختر ملف");

  let text = await extractText(file);
  text = cleanText(text);

  const key = BigInt(document.getElementById("userKey").value || 0);

  const words = text.split(" ");
  const blocks = [];

  for (const w of words){
    for(let i=0;i<w.length;i+=LMAX){
      blocks.push(w.slice(i,i+LMAX));
    }
  }

  const canvas = document.getElementById("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(SIZE, SIZE);
  const buf = img.data;

  for(let i=0;i<buf.length;i+=4){
    buf[i]=255;buf[i+1]=255;buf[i+2]=255;buf[i+3]=255;
  }

  let count = BigInt(blocks.length);
  for(let i=0;i<8;i++){
    drawByte(buf,i, Number((count>>BigInt(8*i))&0xFFn));
  }

  const crc = crc32(text);
  for(let i=0;i<4;i++){
    drawByte(buf,HEADER_CRC_OFFSET+i,(crc>>(8*i))&0xFF);
  }

  let ptr = HEADER;

  for(const b of blocks){
    let C = alm.run("WORD_TO_CODE", b) ^ key;

    for(let j=0;j<8;j++){
      drawByte(buf,ptr++, Number((C>>BigInt(8*j))&0xFFn));
    }
  }

  ctx.putImageData(img,0,0);
};

/****************************************************
 * DECODE
 ****************************************************/

btnDecode.onclick = async () => {

  const file = document.getElementById("imageInput").files[0];
  if(!file) return alert("اختر صورة");

  const key = BigInt(document.getElementById("userKey").value || 0);

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise(r=>img.onload=r);

  const canvas = document.getElementById("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img,0,0);

  const data = ctx.getImageData(0,0,SIZE,SIZE).data;

  let count = 0n;
  for(let i=0;i<8;i++){
    count |= BigInt(readByte(data,i)) << BigInt(8*i);
  }

  const blocks = [];
  let ptr = HEADER;

  for(let i=0;i<Number(count);i++){
    let C=0n;

    for(let j=0;j<8;j++){
      C |= BigInt(readByte(data,ptr++)) << BigInt(8*j);
    }

    const w = alm.run("CODE_TO_WORD", (C ^ key).toString());
    if(w) blocks.push(w);
  }

  let text = blocks.join(" ");
  text = text.replace(new RegExp(NL,"g"), "\n");

  lastDecodedText = text;
  outputText.textContent = text;
};
