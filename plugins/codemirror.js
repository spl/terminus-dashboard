function Codemirror(text, format){
  this.textdom = text;
  this.mode = format;
  if(this.jsonldCheck(format)) this.mode = 'javascript';
}

/*
txtar    : editor is attached to textar
mode     : format for highlighting, ex: json, html etc.
editable : readOnly false/ nocursor is special value in code editor to set readonly true */
Codemirror.prototype.colorizeTextArea = function(mode){
  //initize auto complete
  /*CodeMirror.commands.autocomplete = function(cm) {
    cm.showHint({hint: CodeMirror.hint.anyword});
  }*/
  // initialise code editor on text area
  var editor = CodeMirror.fromTextArea(this.textdom, {
    mode                : this.mode,
    firstLineNumber     : 1,
    lineNumbers         : false,
    lineWrapping        : true,
    smartIndent         : true,
    indentWithTabs      : true,
    newlineAndIndent    : true,
    styleActiveLine     : { nonEmpty: true },
    matchBrackets       : true,
    matchTags           : { bothTags: true },
    findMatchingBrackets: true,
    extraKeys           : { "Ctrl-J": "toMatchingTag", "Ctrl-F": "find", "Tab": "autocomplete" },
    refresh             : true
   });

   /*set editor size according to screens*/
   switch(mode){
     case 'query':
       editor.setSize('1200', '150');
     break;
     case 'schema':
       editor.setSize('1200', '1550');
     break;
     case 'document':
      editor.setSize('1200', '250');
     break;
   } // swithc(mode)

   editor.defaultCharWidth('20px');
   editor.setOption("theme", 'duotone-light');

   //cm.push(editor.getWrapperElement());

   return editor;
} // colorizeTextArea()


// updateTextArea(): highlights new changes on editor
Codemirror.prototype.updateTextArea = function(editor){
  editor.save();
  setTimeout(function() {
      editor.refresh();
  },1);
  // save changes of code mirror editor
  editor.on('change', function(){
    editor.save();
  });
} //updateTextArea()

/*
colorizePre() to colorise pre tags (read only mode)
text (string)    : The document to run through the highlighter.
mode (mode spec) : format to highlight color
output (DOM node): The tokens will be converted to spans as in an editor,
                   and inserted into the node (through innerHTML).*/
Codemirror.prototype.colorizePre = function(){
  CodeMirror.runMode(this.textdom.innerText, this.mode, this.textdom);
  //this.textdom.setOption("theme", 'ambiance');
  this.textdom.setAttribute('class', 'cm-s-default terminus-wrap-text');
  return this.textdom;
} // colorizePre()

Codemirror.prototype.jsonldCheck = function(format){
  if(format == 'jsonld') return true;
}
