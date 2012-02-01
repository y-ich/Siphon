(function () {
  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }
  
  function arrayContains(arr, item) {
    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === item) {
          return true;
        }
      }
      return false;
    }
    return arr.indexOf(item) != -1;
  }
  
  function getTokenAt(editor, cur) {
    var token = editor.getTokenAt(cur);
		if (cur.ch == token.start + 1 && token.string.charAt(0) == '.') {
			token.end = token.start;
			token.string = '.';
      token.className = "property";
		}
    else if (/^\.[\w$_]*$/.test(token.string)) {
      token.className = "property";
			token.start++;
			token.string = token.string.replace(/\./, '');
    }
    return token;
	}

  CodeMirror.coffeescriptHint = function(editor) {
    // Find the token at the cursor
    var cur = editor.getCursor(), token = getTokenAt(editor, cur), tprop = token;
    // If it's not a 'word-style' token, ignore the token.
		if (!/^[\w$_]*$/.test(token.string)) {
      token = tprop = {start: cur.ch, end: cur.ch, string: "", state: token.state,
                       className: token.string == "." ? "property" : null};
    }
    // If it is a property, find out what it is a property of.
    while (tprop.className == "property") {
      tprop = getTokenAt(editor, {line: cur.line, ch: tprop.start});
			if (tprop.string != ".") return;
      tprop = getTokenAt(editor, {line: cur.line, ch: tprop.start});
      if (!context) var context = [];
      context.push(tprop);
    }
    return {list: getCompletions(token, context),
            from: {line: cur.line, ch: token.start},
            to: {line: cur.line, ch: token.end}};
  }

  var stringProps = ("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
                     "toUpperCase toLowerCase split concat match replace search").split(" ");
  var arrayProps = ("length concat join splice push pop shift unshift slice reverse sort indexOf " +
                    "lastIndexOf every some filter forEach map reduce reduceRight ").split(" ");
  var funcProps = "prototype apply call bind".split(" ");
  var keywords = ("and break catch class continue delete do else extends false finally for " +
                  "if in instanceof isnt new no not null of off on or return switch then this throw true try typeof until void while with yes").split(" ");

  function getCompletions(token, context) {
    var found = [], start = token.string;
    function maybeAdd(str) {
      if (str.indexOf(start) == 0 && !arrayContains(found, str)) found.push(str);
    }
    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(stringProps, maybeAdd);
      else if (obj instanceof Array) forEach(arrayProps, maybeAdd);
      else if (obj instanceof Function) forEach(funcProps, maybeAdd);
      for (var name in obj) maybeAdd(name);
    }

    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;
      if (obj.className == "variable")
        base = window[obj.string];
      else if (obj.className == "string")
        base = "";
      else if (obj.className == "atom")
        base = 1;
      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    }
    else {
      // If not, just look in the window object and any local scope
      // (reading into JS mode internals to get at the local variables)
      for (var v = token.state.localVars; v; v = v.next) maybeAdd(v.name);
      gatherCompletions(window);
      forEach(keywords, maybeAdd);
    }
    return found;
  }
})();
