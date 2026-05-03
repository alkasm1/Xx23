class ALM_VM {
  constructor(){
    this.programs = {};
    this.vars = {};
  }

  reset(){
    this.vars = {};
  }

  loadProgram(name, ins){
    this.programs[name]=ins;
  }

  run(name,input){
    const p=this.programs[name];
    if(!p) throw new Error("missing program");

    this.reset();

    this.vars.input=input;
    this.vars.pos=0;
    this.vars.acc=0n;
    this.vars.str="";
    this.vars.tmp=0n;

    let ip=0;

    while(ip<p.length){
      const op=p[ip][0];

      switch(op){

        case "RESET_ACC":
          this.vars.acc=0n;
          this.vars.pos=0;
          break;

        case "FOR_EACH_CHAR":{
          const body=p[ip][1];
          let c=0;

          for(let i=input.length-1;i>=0 && c<12;i--,c++){
            this.vars.ch=input[i];
            for(const b of body)this.exec(b);
          }
          break;
        }

        case "RESET_STR":
          this.vars.str="";
          this.vars.tmp=BigInt(input);
          break;

        case "FOR_I":{
          const n=p[ip][1];
          const body=p[ip][2];
          for(let i=0;i<n;i++){
            for(const b of body)this.exec(b);
          }
          break;
        }

        case "RETURN_ACC": return this.vars.acc;
        case "RETURN_STR": return this.vars.str;
      }

      ip++;
    }
  }

  exec(ins){
    const B=32n;

    switch(ins[0]){

      case "PUSH_CHAR_INDEX":{
        const idx=window.charToIndex[this.vars.ch]||0;
        this.vars.acc+=BigInt(idx)*(B**BigInt(this.vars.pos));
        break;
      }

      case "NEXT_POSITION":
        this.vars.pos++;
        break;

      case "MOD_BASE":
        this.vars.mod=Number(this.vars.tmp%B);
        break;

      case "DIV_BASE":
        this.vars.tmp=this.vars.tmp/B;
        break;

      case "APPEND_CHAR":
        if(this.vars.mod){
          this.vars.str=window.indexToChar[this.vars.mod]+this.vars.str;
        }
        break;
    }
  }
}
