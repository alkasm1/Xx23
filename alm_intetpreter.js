class ALM_Interpreter {
  constructor(vm){
    this.vm = vm;
    this.programs = {};
  }

  load(text){
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    let current = null;
    let currentName = null;

    for (const line of lines){

      if(line.startsWith("PROGRAM")){
        currentName = line.split(" ")[1];
        current = [];
        this.programs[currentName] = current;
        continue;
      }

      if(line === "END"){
        current = null;
        currentName = null;
        continue;
      }

      if(current){
        current.push(this.parse(line));
      }
    }

    // تحميل البرامج داخل VM
    for (const k in this.programs){
      this.vm.loadProgram(k, this.programs[k]);
    }
  }

  parse(line){
    const p = line.split(" ");

    switch(p[0]){
      case "RESET_ACC": return ["RESET_ACC"];
      case "NEXT_POSITION": return ["NEXT_POSITION"];
      case "PUSH_CHAR_INDEX": return ["PUSH_CHAR_INDEX"];
      case "MOD_BASE": return ["MOD_BASE"];
      case "DIV_BASE": return ["DIV_BASE"];
      case "APPEND_CHAR": return ["APPEND_CHAR"];
      case "RETURN_ACC": return ["RETURN_ACC"];
      case "RETURN_STR": return ["RETURN_STR"];
      case "FOR_EACH_CHAR": return ["FOR_EACH_CHAR", []];
      case "FOR_I": return ["FOR_I", Number(p[1]), []];
      default: return ["NOP"];
    }
  }

  run(name, input){
    return this.vm.run(name, input);
  }
}
