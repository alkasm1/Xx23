window.B=32;
window.LMAX=12;

const indexToChar={1:"ا",2:"ب",3:"ت",4:"ث",5:"ج",6:"ح",7:"خ",8:"د",9:"ذ",10:"ر",11:"ز",12:"س",13:"ش",14:"ص",15:"ض",16:"ط",17:"ظ",18:"ع",19:"غ",20:"ف",21:"ق",22:"ك",23:"ل",24:"م",25:"ن",26:"ه",27:"و",28:"ي",29:"ء"};
const charToIndex={};
for(let k in indexToChar)charToIndex[indexToChar[k]]=+k;

window.indexToChar=indexToChar;
window.charToIndex=charToIndex;

const vm=new ALM_VM();
const alm=new ALM_Interpreter(vm);

fetch("alm_core.alm")
.then(r=>r.text())
.then(t=>alm.load(t));

/* UI */

document.getElementById("btnEncode").onclick=async()=>{

  const f=document.getElementById("docInput").files[0];
  if(!f)return alert("file");

  const text=await f.text();

  const blocks=text.split(" ");

  const canvas=document.getElementById("canvas");
  canvas.width=1024;
  canvas.height=1024;

  const ctx=canvas.getContext("2d");
  const img=ctx.createImageData(1024,1024);

  let p=0;

  for(const b of blocks){
    let C=vm.run("WORD_TO_CODE",b);

    for(let i=0;i<8;i++){
      const v=Number((C>>(BigInt(i*8)))&255n);
      img.data[p++]=255-v;
      img.data[p++]=255-v;
      img.data[p++]=255-v;
      img.data[p++]=255;
    }
  }

  ctx.putImageData(img,0,0);
};

document.getElementById("btnDecode").onclick=async()=>{

  const f=document.getElementById("imageInput").files[0];
  if(!f)return;

  const img=new Image();
  img.src=URL.createObjectURL(f);

  await new Promise(r=>img.onload=r);

  const canvas=document.getElementById("canvas");
  const ctx=canvas.getContext("2d");

  ctx.drawImage(img,0,0);

  const data=ctx.getImageData(0,0,1024,1024).data;

  let out="";
  let i=0;

  while(i<data.length){

    let C=0n;

    for(let j=0;j<8;j++){
      const v=255-data[i++];
      C|=BigInt(v)<<(BigInt(j*8));
    }

    out+=vm.run("CODE_TO_WORD",(C).toString())+" ";
  }

  document.getElementById("outputText").textContent=out;
};
