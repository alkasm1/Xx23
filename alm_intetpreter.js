class ALM_Interpreter {
  constructor(vm){
    this.vm=vm;
    this.programs={};
  }

  load(text){
    const lines=text.split("\n");
    let cur=null;

    for(const l of lines){
      const line=l.trim();

      if(line.startsWith("PROGRAM")){
        cur=[];
        this.programs[line.split(" ")[1]]=cur;
        continue;
      }

      if(line==="END") continue;

      if(cur){
        if(line==="RESET_ACC")cur.push(["RESET_ACC"]);
        if(line==="RESET_STR")cur.push(["RESET_STR"]);
        if(line==="RETURN_ACC")cur.push(["RETURN_ACC"]);
        if(line==="RETURN_STR")cur.push(["RETURN_STR"]);
        if(line==="NEXT_POSITION")cur.push(["NEXT_POSITION"]);
        if(line==="PUSH_CHAR_INDEX")cur.push(["PUSH_CHAR_INDEX"]);
        if(line==="MOD_BASE")cur.push(["MOD_BASE"]);
        if(line==="DIV_BASE")cur.push(["DIV_BASE"]);
        if(line==="APPEND_CHAR")cur.push(["APPEND_CHAR"]);
        if(line.startsWith("FOR_I"))cur.push(["FOR_I",12,[]]);
        if(line.startsWith("FOR_EACH_CHAR"))cur.push(["FOR_EACH_CHAR",[]]);
      }
    }

    for(const k in this.programs){
      this.vm.loadProgram(k,this.programs[k]);
    }
  }
}
