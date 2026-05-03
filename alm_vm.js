/****************************************************
 * ALM VM v2 (Improved + Consistent)
 ****************************************************/

class ALM_VM {
  constructor() {
    this.stack = [];
    this.vars = {};
    this.programs = {};
  }

  reset(){
    this.stack = [];
    this.vars = {};
  }

  loadProgram(name, instructions){
    this.programs[name] = instructions;
  }

  run(name, input){
    const prog = this.programs[name];
    if(!prog) throw new Error("Program not found: " + name);

    this.reset();

    this.vars.input = input;
    this.vars.pos = 0;
    this.vars.acc = 0n;
    this.vars.str = "";
    this.vars.tmp = 0n;

    let ip = 0;

    while(ip < prog.length){
      const ins = prog[ip];
      const op = ins[0];

      switch(op){

        case "RESET_ACC":
          this.vars.acc = 0n;
          this.vars.pos = 0;
          break;

        case "FOR_EACH_CHAR":{
          const body = ins[1];
          const input = this.vars.input;

          let count = 0;

          for(let i=input.length-1; i>=0 && count<LMAX; i--, count++){

            const ch = input[i];

            // تجاهل أي حرف غير مدعوم
            if(!charToIndex[ch]) continue;

            this.vars.ch = ch;

            for(const inner of body){
              this.exec(inner);
            }
          }
          break;
        }

        case "RESET_STR":
          this.vars.str = "";
          this.vars.tmp = BigInt(this.vars.input);
          break;

        case "FOR_I":{
          const count = ins[1];
          const body = ins[2];

          for(let i=0;i<count;i++){
            for(const inner of body){
              this.exec(inner);
            }
          }
          break;
        }

        case "RETURN_ACC":
          return this.vars.acc;

        case "RETURN_STR":
          return this.vars.str;

        default:
          throw new Error("Unknown op: " + op);
      }

      ip++;
    }
  }

  exec(ins){
    const op = ins[0];

    const BASE = BigInt(B);

    switch(op){

      case "PUSH_CHAR_INDEX":{
        const idx = charToIndex[this.vars.ch] || 0;
        this.vars.acc += BigInt(idx) * (BASE ** BigInt(this.vars.pos));
        break;
      }

      case "NEXT_POSITION":
        this.vars.pos++;
        break;

      case "MOD_BASE":
        this.vars.mod = Number(this.vars.tmp % BASE);
        break;

      case "DIV_BASE":
        this.vars.tmp = this.vars.tmp / BASE;
        break;

      case "APPEND_CHAR":
        if(this.vars.mod){
          this.vars.str = indexToChar[this.vars.mod] + this.vars.str;
        }
        break;
    }
  }
}
