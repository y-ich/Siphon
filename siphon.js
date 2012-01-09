(function() {
  var KeyFSM, KeyState, appCache, appCacheUpdate, capitalize, cheatViewer, clickSaveas, clipboard, currentFile, evalCS, fileOptions, fireKeyEvent, fireTextEvent, formatForSave, initCheatViewer, initMarkupEditor, initScriptEditor, jssnippet, keyActive, keyCodes, keyInactive, keySound, keySubActive, keySubInactive, layoutEditor, markupEditor, max, menuBar, onKeyEventforiPad, pos2xy, resetSelect, resetSelects, sampleOptions, samples, scriptEditor, settingMenu, softKeyboard, xy2pos;

  keySound = {
    source: new Audio('sounds/click.aiff'),
    enable: true,
    play: function() {
      if (!this.enable) return;
      this.source.play();
      return keySound.timer = setTimeout(function() {
        keySound.source.pause();
        try {
          return keySound.source.currentTime = 0;
        } catch (e) {

        }
      }, 30);
    }
  };

  KeyFSM = (function() {

    function KeyFSM(state, observer, holdTime) {
      this.state = state;
      this.observer = observer;
      this.holdTime = holdTime;
    }

    KeyFSM.prototype.setState = function(state) {
      this.state = state;
      return this.changed();
    };

    KeyFSM.prototype.subkey = function() {
      var _ref;
      return (_ref = this.observer.childNodes[1]) != null ? _ref : null;
    };

    KeyFSM.prototype.changed = function() {
      return this.state.update(this.observer, this.subkey());
    };

    KeyFSM.prototype.clearTimer = function() {
      if (this.timer != null) clearTimeout(this.timer);
      return this.timer = null;
    };

    KeyFSM.prototype.touchStart = function(startX, startY) {
      var _this = this;
      this.startX = startX;
      this.startY = startY;
      setTimeout((function() {
        return keySound.source.play();
      }), 0);
      this.setState(keyActive);
      if (this.subkey() != null) {
        this.timer = setTimeout((function() {
          return _this.setState(keySubActive);
        }), this.holdTime);
      }
      return fireKeyEvent('keydown', this.observer.id, this.keyCode(), 0);
    };

    KeyFSM.prototype.touchMove = function(event) {
      var moveX, moveY, touchPoint;
      touchPoint = event.targetTouches[0];
      moveX = touchPoint.pageX - this.startX;
      moveY = touchPoint.pageY - this.startY;
      return this.state.touchMove(this, moveX, moveY);
    };

    KeyFSM.prototype.touchEnd = function() {
      this.state.touchEnd(this);
      return fireKeyEvent('keyup', this.observer.id, this.keyCode(), 0);
    };

    KeyFSM.prototype.keyCode = function() {
      if (this.observer.id != null) {
        return keyCodes[this.observer.id];
      } else if (this.observer.title != null) {
        return this.observer.title.charCodeAt(0);
      } else {
        return 0;
      }
    };

    return KeyFSM;

  })();

  KeyState = (function() {

    function KeyState() {}

    KeyState.prototype.update = function(main, sub) {};

    KeyState.prototype.touchMove = function(fsm, moveX, moveY) {};

    KeyState.prototype.touchEnd = function(fsm) {};

    KeyState.prototype.inRange = function(moveX, moveY) {
      var keySize;
      keySize = $('.key').width();
      return (-keySize < moveX && moveX < keySize) && (-2 * keySize < moveY && moveY < keySize);
    };

    return KeyState;

  })();

  keyInactive = new KeyState();

  keyInactive.update = function(main, sub) {
    if (sub != null) return sub.style.display = 'none';
  };

  keyActive = new KeyState();

  keyActive.update = function(main, sub) {
    return main.style.backgroundColor = '#a0a0a0';
  };

  keyActive.touchMove = function(fsm, moveX, moveY) {
    var flickLength;
    flickLength = 30;
    if ((fsm.subkey() != null) && moveY < -flickLength && (-flickLength < moveX && moveX < flickLength)) {
      fsm.clearTimer();
      return fsm.setState(keySubActive);
    } else if (!this.inRange(moveX, moveY)) {
      fsm.clearTimer();
      return fsm.setState(keyInactive);
    }
  };

  keyActive.touchEnd = function(fsm) {
    var code;
    fsm.clearTimer();
    if (fsm.observer.title != null) {
      code = fsm.observer.title.charCodeAt(0);
      fireTextEvent(fsm.observer.title);
      fireKeyEvent('keypress', code, code);
    }
    return fsm.setState(keyInactive);
  };

  keySubActive = new KeyState();

  keySubActive.update = function(main, sub) {
    $(sub).css('color', '#fff');
    $(sub).css('background-image', '-webkit-gradient(linear, left top, left bottom, from(rgb(65,134,245)), to(rgb(25,79,220)))');
    return sub.style.display = 'block';
  };

  keySubActive.touchMove = function(fsm, moveX, moveY) {
    if (!this.inRange(moveX, moveY)) return fsm.setState(keySubInactive);
  };

  keySubActive.touchEnd = function(fsm) {
    var c;
    if ((fsm.subkey().title != null) && fsm.subkey().title !== '') {
      c = fsm.subkey().title.charCodeAt(0);
      fireTextEvent(fsm.subkey().title);
      fireKeyEvent('keypress', c, c);
    }
    return fsm.setState(keyInactive);
  };

  keySubInactive = new KeyState();

  keySubInactive.update = function(main, sub) {
    $(sub).css('color', '#000');
    return $(sub).css('background-image', '-webkit-gradient(linear, left top, left bottom, from(#EEEEF0), to(#D2D2D8))');
  };

  keySubInactive.touchMove = function(fsm, moveX, moveY) {
    if (this.inRange(moveX, moveY)) return fsm.setState(keySubActive);
  };

  keySubInactive.touchEnd = function(fsm) {
    return fsm.setState(keyInactive);
  };

  samples = {
    underscore: {
      script: "# A sample for Underscore.js\n# PLEASE import Underscore.js before letting it run!\nif not _?\n  alert 'PLEASE import Underscore.js!'\n  return\n\n# Project Euler, Problem 1\n# If we list all the natural numbers below 10 that are multiples of 3 or 5, we get 3, 5, 6 and 9. The sum of these multiples is 23.\n# Find the sum of all the multiples of 3 or 5 below 1000.\n\nn = 1000\nunion = _.union (x for x in [3...n] by 3), (x for x in [5...n] by 5)\nsum = (list) ->\n  _(list).reduce ((acc, num) -> acc + num), 0\nwindow.siphon.log 'answer = ' + sum union\n\n# Derived problem\n# Solve the above problem using some formula to reduce amount of computations.\n\n\n# Project Euler, Problem 2\n# Each new term in the Fibonacci sequence is generated by adding the previous two terms. By starting with 1 and 2, the first 10 terms will be:\n#         1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ...\n# Find the sum of all the even-valued terms in the sequence which do not exceed four million.\n\nfibonacci = _.memoize (n) ->\n  if n <= 2 then n else fibonacci(n - 2) + fibonacci(n - 1)\n\nacc = 0\ni = 1\nuntil fibonacci(i) > 4000000\n  acc += fibonacci(i) if fibonacci(i) % 2 == 0\n  i++\nwindow.siphon.log 'answer = ' + acc",
      markup: ''
    },
    processing: {
      script: "# A sample for Processing.js\n# PLEASE import Processing.js before letting it run!\n# This sample is based on http://dry.ly/2011/02/21/coffeescript--processingjs--crazy-delicious/\nif not Processing?\n  alert 'PLEASE import Processing.js!'\n  return\n\ndraw = (p5) -> # p5 is a contraction of processing\n  p5.setup = ->\n    p5.size $('#application').width(), $('#application').height()\n    p5.background 0\n\n  p5.draw = ->\n    # noise() needs an \"offset\" argument\n    # we'll tie it to the frame count\n    x_off = p5.frameCount * 0.0005\n\n    # we want y's offset to increase at the same rate\n    # but be different (20 is arbitrary)\n    y_off = x_off + 20\n\n    # use noise(), the offset, and our sketch's dimensions\n    # to get a \"random\" position for our \"brush\"\n    x = p5.noise(x_off) * p5.width\n    y = p5.noise(y_off) * p5.height\n\n    # color our brush (red with 15% opacity)\n    p5.stroke(255, 0, 0, 15)\n\n    # draw at brush's current location (set above)\n    p5.point(x, y)\n\nprocessing = new Processing($('#canvas')[0], draw)\n$('#exitbutton').bind 'click', ->\n  window.siphon.log 'terminate'\n  processing.exit()",
      markup: "<button id=\"exitbutton\">terminate drawing</button>\n<canvas id=\"canvas\"></canvas>"
    },
    raphael: {
      script: "# A sample for Raphaël\n# PLEASE import Raphaël before letting it run!\n# This sample is based on http://raphaeljs.com/playground.html\nif not Raphael?\n  alert 'PLEASE import Raphaël!'\n  return\n\npaper = Raphael($('#application')[0], 640, 480)\npaper.circle(320, 240, 60).animate\n    fill : '#223fa3'\n    stroke : '#000'\n    'stroke-width' : 80\n    'stroke-opacity' : 0.5\n  , 2000",
      markup: ''
    },
    dygraphs: {
      script: "# A sample for dygraphs\n# PLEASE import \"dygraphs\" before letting it run!\n# This sample is based on http://dygraphs.com/tests/demo.html\nif not Dygraph?\n  alert 'PLEASE import \"dygraphs\"!'\n  return\n\ngraph = new Dygraph document.getElementById(\"dygraph\"),\n  ->\n    zp = (x) -> if (x < 10) then \"0\"+x else x\n    r = \"date,parabola,line,another line,sine wave\\n\";\n    for i in [1..31]\n      r += \"200610\" + zp(i)\n      r += \",\" + 10*(i*(31-i))\n      r += \",\" + 10*(8*i)\n      r += \",\" + 10*(250 - 8*i)\n      r += \",\" + 10*(125 + 125 * Math.sin(0.3*i))\n      r += \"\\n\";\n    r\n  ,\n    labelsDiv : document.getElementById('status')\n    labelsSeparateLines : true\n    labelsKMB : true\n    legend : 'always'\n    colors : ['rgb(51,204,204)'\n              'rgb(255,100,100)'\n              '#00DD55'\n              'rgba(50,50,200,0.4)']\n    width : 640\n    height : 480\n    title : 'Interesting Shapes'\n    xlabel : 'Date'\n    ylabel : 'Count'\n    axisLineColor : 'white'\n    drawXGrid : false",
      markup: "<font size=-1>(Mouse over to highlight individual values. Click and drag to zoom. Double-click to zoom out.)</font><br/>\n<table>\n  <tr>\n    <td>\n      <div id=\"dygraph\"></div>\n    </td>\n    <td valign=top>\n      <div id=\"status\" style=\"width:200px; font-size:0.8em; padding-top:5px;\"></div>\n    </td>\n  </tr>\n</table>"
    }
  };

  window.siphon = {};

  window.siphon.log = function(obj) {
    return $('#console').html($('#console').html() + obj + '\n');
  };

  scriptEditor = null;

  cheatViewer = null;

  markupEditor = null;

  clipboard = null;

  jssnippet = '';

  capitalize = function(word) {
    return word.substring(0, 1).toUpperCase() + word.substring(1);
  };

  max = function(l) {
    return Math.max.apply(null, l);
  };

  evalCS = function(str) {
    var result;
    try {
      jssnippet = CoffeeScript.compile(str, {
        bare: true
      });
      result = eval(jssnippet);
      $('#error').text('done.');
      return result;
    } catch (error) {
      return $('#error').text(error.message);
    }
  };

  fileOptions = function() {
    var e, i, result, _ref;
    result = [];
    for (i = 0, _ref = localStorage.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
      e = document.createElement('option');
      e.appendChild(document.createTextNode(localStorage.key(i)));
      result.push(e);
    }
    return result;
  };

  sampleOptions = function() {
    var e, key, result, value;
    result = [];
    for (key in samples) {
      value = samples[key];
      if (!(localStorage[key] != null)) {
        e = document.createElement('option');
        e.appendChild(document.createTextNode(key));
        result.push(e);
      }
    }
    return result;
  };

  resetSelect = function(id, sample) {
    var option, selector;
    if (sample == null) sample = false;
    selector = '#' + id;
    $(selector).empty();
    option = document.createElement('option');
    option.appendChild(document.createTextNode(capitalize(id + '...')));
    option.value = '';
    option.disabled = true;
    $(selector).append(option);
    fileOptions().forEach(function(e) {
      return $(selector).append(e);
    });
    if (sample) {
      option = document.createElement('option');
      option.appendChild(document.createTextNode('samples'));
      option.value = '';
      option.disabled = true;
      return sampleOptions().forEach(function(e) {
        return $(selector).append(e);
      });
    }
  };

  resetSelects = function() {
    resetSelect('open', true);
    return resetSelect('delete');
  };

  formatForSave = function() {
    var data;
    data = {
      script: scriptEditor.getValue(),
      markup: markupEditor.getValue()
    };
    return JSON.stringify(data);
  };

  clickSaveas = function() {
    var currentFile;
    currentFile = prompt('filename:');
    if (!(currentFile != null)) return;
    localStorage.setItem(currentFile, formatForSave());
    return resetSelects();
  };

  layoutEditor = function() {
    var restHeight;
    restHeight = window.innerHeight - max($.makeArray($('div[data-role="header"]').map(function() {
      return $(this).outerHeight(true);
    }))) - ($(scriptEditor.element).outerHeight(true) - $(scriptEditor.element).height()) - $('#backofkeyboard').height();
    if ($('#keyboard-on')[0].checked) restHeight -= $('#keys').outerHeight(true);
    markupEditor.setHeight(restHeight + 'px');
    restHeight -= $('#error').outerHeight(true);
    scriptEditor.setHeight(restHeight + 'px');
    restHeight = window.innerHeight - max($.makeArray($('div[data-role="header"]').map(function() {
      return $(this).outerHeight(true);
    }))) - ($('#application').outerHeight(true) - $('#application').height()) - $('#console').outerHeight(true);
    return $('#application').height(restHeight + 'px');
  };

  keyCodes = {
    'Control': 17,
    'Alt': 18,
    'Meta': 91,
    'Left': 37,
    'Right': 39,
    'Up': 38,
    'Home': 36,
    'PageUp': 33,
    'U+0009': 9,
    'Down': 40,
    'End': 35,
    'PageDown': 34,
    'Shift': 16
  };

  KeyboardEvent.DOM_KEY_LOCATION_STANDARD = 0;

  fireKeyEvent = function(type, keyIdentifier, keyCode, charCode) {
    var e;
    e = document.createEvent('KeyboardEvent');
    e.initKeyboardEvent(type, true, true, window, keyIdentifier, KeyboardEvent.DOM_KEY_LOCATION_STANDARD, '');
    e.mobile = {
      keyCode: keyCode,
      charCode: charCode
    };
    return document.activeElement.dispatchEvent(e);
  };

  pos2xy = function(str, pos) {
    var error, head, lines, y, _ref;
    lines = str.split('\n');
    head = 0;
    for (y = 0, _ref = lines.length; 0 <= _ref ? y < _ref : y > _ref; 0 <= _ref ? y++ : y--) {
      if ((head <= pos && pos <= head + lines[y].length)) {
        return {
          x: pos - head,
          y: y
        };
      }
      head += lines[y].length + 1;
    }
    error = new Error();
    error.name = 'overposition';
    error.message = 'pos is larger than str.';
    throw error;
  };

  xy2pos = function(str, xy) {
    var lines, pos, y, _ref, _ref2;
    lines = str.split('\n');
    if (!((0 <= (_ref = xy.y) && _ref < lines.length))) return str.length;
    pos = 0;
    for (y = 0, _ref2 = xy.y; 0 <= _ref2 ? y < _ref2 : y > _ref2; 0 <= _ref2 ? y++ : y--) {
      pos += lines[y].length + 1;
    }
    return pos + Math.min(xy.x, lines[y].length);
  };

  TextEvent.DOM_INPUT_METHOD_KEYBOARD = 1;

  TextEvent.DOM_INPUT_METHOD_PASTE = 2;

  fireTextEvent = function(str, method) {
    var e;
    if (method == null) method = TextEvent.DOM_INPUT_METHOD_KEYBOARD;
    e = document.createEvent('TextEvent');
    e.initTextEvent('textInput', true, true, window, str, TextEvent.DOM_INPUT_METHOD_KEYBOARD);
    return document.activeElement.dispatchEvent(e);
  };

  currentFile = null;

  appCache = window.applicationCache;

  appCache.addEventListener('noupdate', function() {
    return console.log('Manifest has no change.');
  });

  appCache.addEventListener('cached', function() {
    return alert('Conguatulation! You can use Siphon offline.');
  });

  appCache.addEventListener('updateready', function() {
    if (confirm('New version was downloaded. Do you want to update?')) {
      appCache.swapCache();
      return location.reload();
    }
  });

  appCache.addEventListener('obsolete', function() {
    return alert('Sorry for inconvenience. Siphon moved to http://y-ich.github.com/Siphon/ on 2011/12/13.');
  });

  appCache.addEventListener('error', function() {
    return console.log('Application cache error.');
  });

  appCacheUpdate = function() {
    try {
      if (navigator.onLine) return appCache.update();
    } catch (e) {
      return console.log(e);
    }
  };

  initScriptEditor = function() {
    var ta;
    scriptEditor = CodeMirror($('#scripteditor')[0], {
      value: '# "do-it" feature\n# Select a line below by tapping the line and pressing cntrl + l.\n# And press cntrl + r to run the line and see the result.\n1 + 1\n\n# Console feature\n# A message will appear on the console pane in runpage.\nwindow.siphon.log \'Hello, world.\'',
      matchBrackets: true,
      mode: 'coffeescript',
      lineNumbers: true,
      onChange: function() {
        return scriptEditor.compile();
      },
      onKeyEvent: onKeyEventforiPad
    });
    scriptEditor.bodyTop = 0;
    ta = scriptEditor.getInputField();
    ta.addEventListener('mousedown', function() {
      return scriptEditor.bodyTop = document.body.scrollTop;
    });
    ta.addEventListener('focus', function() {
      return window.scrollTo(0, scriptEditor.bodyTop);
    });
    scriptEditor.element = scriptEditor.getWrapperElement();
    scriptEditor.setHeight = function(str) {
      this.getScrollerElement().style.height = str;
      return this.refresh();
    };
    scriptEditor.compile = function() {
      var result;
      try {
        result = CoffeeScript.compile(this.getValue());
        $('#error').text('');
        return result;
      } catch (error) {
        $('#error').text(error.message);
        return '';
      }
    };
    return scriptEditor.compile();
  };

  initCheatViewer = function() {
    var parent;
    parent = $('#cheat').parent()[0];
    $('#cheat').remove();
    cheatViewer = CodeMirror(parent, {
      mode: 'coffeescript',
      readOnly: true,
      value: '# CoffeeScript Cheat Sheet\n# based on "The Little Book on CoffeeScript".\n\n# A comment\n\n###\nA multiline comment\n###\n\n# No need to declare a variable. Just assign into it.\nmyVariable = "test"\n\n# To export a variable out of the code,\n# make a property in a global object.\nexports = this\nexports.myVariable = "foo-bar"\n\n# "->", called "arrow", means start of function definition.\nfunc = -> "bar"\n\n# INDENTED lines are recognized as a block.\nfunc  ->\n  # An extra line\n  "bar"\n\n# variables in parentheses before the arrow are arguments.\ntimes = (a, b) -> a * b\n\n# equations in parentheses give default values\n# if an argument is omitted when invoking.\ntimes = (a = 1, b = 2) -> a * b\n\n# Variable arguments. nums should be an array.\nsum = (nums...) ->\n  result = 0\n  nums.forEach (n) -> result += n\n  result\n\n# function name + argument(s) is function invocation.\n# parentheses are optional unless no argument.\nalert("Howdy!")\nalert inspect("Howdy!")\n\n# \'=>\', called "fat arrow", also means start of function definition,\n# except that "this" in the fucntion body indicates local context\n# of the function definition.\nthis.clickHandler = -> alert "clicked"\nelement.addEventListener "click", (e) => this.clickHandler(e)\n\n# Object literals. Braces are optional.\nobject1 = {one : 1, two : 2}\nobject2 = one : 1, two : 2\nobject3 =\n  one : 1\n  two : 2\n\n# Array literals. Brackets are mandatory.\narray1 = [1, 2, 3]\narray2 = [\n  1\n  2\n  3\n]\n\n# Conditional expression\nif true == true\n  "We\'re ok"\nif true != true then "Panic"\nif 1 > 0 then "Ok" else "Y2K!"\nalert "It\'s cold!" if heat %lt; 5\n\n# negate operator\nif not true then "Panic"\n\n# unless\nunless true\n  "Panic"\n\n# is/isnt statement\nif true is 1\n  "Type coercion fail!"\nif true isnt true\n  alert "Opposite day!"\n\n# String interpolation.\n# You can embed a value of a variable into a String.\nfavourite_color = "Blue. No, yel..."\nquestion = "Bridgekeeper: What... is your favourite color?\n            Galahad: #{favourite_color}\n            Bridgekeeper: Wrong!\n            "\n# Loops in an array\nprisoners = ["Roger", "Roderick", "Brian"]\nfor name in prisoners\n  alert "Release #{name}"\nfor name, i in ["Roger the pickpocket", "Roderick the robber"]\n  alert "#{i} - Release #{name}"\nrelease prisoner for prisoner in prisoners\nrelease prisoner for prisoner in prisoners when prisoner[0] is "R"\n\n# Loops in an object\nnames = sam: seaborn, donna: moss\nalert("#{first} #{last}") for first, last of names\n\n# "while", the only low-level loop.\nnum = 6\nminstrel = while num -= 1\n  num + " Brave Sir Robin ran away"\n\n# loop is while true\nloop\n  return if comfirm(\'Are you sure?\')\n\n# until is while not\n\n# Arrays\nrange = [1..5] # [1,2,3,4,5]\n\nfirstTwo = ["one", "two", "three"][0..1]\nmy_ = "my string"[0..2]\n\n# Multiple assignments\nnumbers = [0..9]\nnumbers[3..5] = [-3, -4, -5]\n\n# existence in an array.\nwords = ["rattled", "roudy", "rebbles", "ranks"]\nalert "Stop wagging me" if "ranks" in words\n\n# Aliases\n@saviour = true # this.saviour = true\n\nUser::first = -> @records[0] # User.prototype.first = this.record[0]\n\n# existential operators\npraise if brian?\n\nvelocity = southern ? 40\n\n# undefined or null check of return value.\nblackKnight.getLegs()?.kick()\n\n# undefined or null check of function itself.\nblackKnight.getLegs().kick?()\n\n# Class\nclass Animal\n  @find : (name) = -> # class variable(property)\n    # implementation\n\n  price : 5 # instance variable(property)\n\n  constructor : (@name) ->\n  # Instance variable "name" is declared automatically\n  # and the argument would be assigned automatically.\n\n  sell : =>\n    alert "Give me #{@price} shillings!"\n    # using \'=>\' means "this" in body is binded to current instance even if the property is passed as function.\n\nanimal = new Animal\n$("#sell").click(animal.sell)\n\n# Inheritance\nclass Parrot extends Animal\n  constructor : ->\n    super("Parrot")\n    # super is the function of the super class named as same.'
    });
    return $('textarea', cheatViewer.getWrapperElement()).attr('disabled', 'true');
  };

  initMarkupEditor = function() {
    var parent;
    parent = $('#markupeditor').parent()[0];
    $('#markupeditor').remove();
    markupEditor = CodeMirror(parent, {
      value: '<!-- The HTML snippet here will be injected into the content of Run page when executing the script -->\n<div style="width: 100px; height: 100px; border-radius: 50%; background: -webkit-radial-gradient(30% 30%, white, black);"></div>\n<canvas id="canvas" style="margin: 10px; width: 300px; height: 150px; border: 1px solid green;"></canvas>\n<svg id="svg" style="margin: 10px; width: 300px; height: 150px; border: 1px solid blue;"></svg>',
      matchBrackets: true,
      mode: {
        name: 'xml',
        htmlMode: true
      },
      lineNumbers: true,
      onKeyEvent: onKeyEventforiPad
    });
    return markupEditor.setHeight = function(str) {
      this.getScrollerElement().style.height = str;
      return this.refresh();
    };
  };

  onKeyEventforiPad = function(instance, e) {
    var line, result;
    if (e.mobile == null) e.mobile = {};
    e.mobile.metaKey = ($('#Meta')[0].model != null) && $('#Meta')[0].model.state === keyActive;
    e.mobile.ctrlKey = ($('#Control')[0].model != null) && $('#Control')[0].model.state === keyActive;
    e.mobile.altKey = ($('#Alt')[0].model != null) && $('#Alt')[0].model.state === keyActive;
    e.mobile.shiftKey = ($('#Shift')[0].model != null) && $('#Shift')[0].model.state === keyActive;
    if (e.mobile.metaKey) {
      switch (e.keyCode) {
        case 88:
          if (e.type === 'keydown') {
            clipboard = scriptEditor.getSelection();
            scriptEditor.replaceSelection('');
          }
          e.stop();
          return true;
        case 67:
          if (e.type === 'keydown') clipboard = scriptEditor.getSelection();
          e.stop();
          return true;
        case 86:
          if (e.type === 'keydown' && (clipboard != null) && clipboard !== '') {
            fireTextEvent(clipboard, TextEvent.DOM_INPUT_METHOD_PASTE);
          }
          e.stop();
          return true;
      }
    }
    if (e.ctrlKey || e.mobile.ctrlKey) {
      switch (e.keyCode) {
        case 76:
          if (e.type === 'keydown') {
            line = scriptEditor.getCursor().line;
            scriptEditor.setSelection({
              line: line,
              ch: 0
            }, {
              line: line,
              ch: scriptEditor.getLine(line).length
            });
          }
          e.stop();
          return true;
        case 82:
          if (e.type === 'keydown') {
            clipboard = scriptEditor.getSelection();
            result = evalCS(clipboard);
            if (result != null) scriptEditor.replaceSelection(result.toString());
          }
          e.stop();
          return true;
      }
    }
    return false;
  };

  softKeyboard = function() {
    $('.key.main').bind('touchstart', function(event) {
      var touchPoint;
      touchPoint = event.originalEvent.targetTouches[0];
      if (this.model == null) this.model = new KeyFSM(keyInactive, this, 400);
      return this.model.touchStart(touchPoint.pageX, touchPoint.pageY);
    });
    $('.key.main').bind('touchmove', function(event) {
      this.model.touchMove(event.originalEvent);
      return event.preventDefault();
    });
    return $('.key.main').bind('touchend', function(event) {
      return this.model.touchEnd();
    });
  };

  menuBar = function() {
    $('#new').click(function() {
      scriptEditor.setValue('');
      return currentFile = null;
    });
    $('#save').click(function() {
      if (!(currentFile != null) || currentFile === '') {
        return clickSaveas();
      } else {
        localStorage.setItem(currentFile, formatForSave());
        return alert('"' + currentFile + '" was saved.');
      }
    });
    $('#saveas').click(clickSaveas);
    $('#about').click(function() {
      return alert('Siphon\nCoffeeScript Programming Environment\nVersion 0.6.2\nCopyright (C) 2011 ICHIKAWA, Yuji All Rights Reserved.');
    });
    resetSelects();
    $('#open').change(function() {
      var data;
      currentFile = $('#open')[0].value;
      if ((currentFile != null) && currentFile !== '') {
        if (localStorage[currentFile] != null) {
          try {
            data = JSON.parse(localStorage[currentFile]);
            if (data.script != null) scriptEditor.setValue(data.script);
            if (data.markup != null) markupEditor.setValue(data.markup);
          } catch (e) {
            scriptEditor.setValue(localStorage[$('#open')[0].value]);
            markupEditor.setValue('');
          }
        } else {
          try {
            data = samples[currentFile];
            if (data.script != null) scriptEditor.setValue(data.script);
            if (data.markup != null) markupEditor.setValue(data.markup);
          } catch (e) {
            console.log(e.message);
          }
        }
      }
      $('#open')[0].selectedIndex = 0;
      return $('#open').selectmenu('refresh');
    });
    $('#delete').change(function() {
      if (confirm('Do you want to delete "' + $('#delete')[0].value + '"? (Current file is "' + currentFile + '".)')) {
        localStorage.removeItem($('#delete')[0].value);
        resetSelects();
      }
      $('#delete')[0].selectedIndex = 0;
      return $('#delete').selectmenu('refresh');
    });
    return $('#import').change(function() {
      var script;
      if (confirm('Do you want to import "' + $('#import')[0].value + '"?')) {
        /*
              # appendTo of script element doesn't work.
              html = '<script type="text/javascript" src="' + $('#import')[0].value + '"></script>'
              $(html).appendTo('head')
        */
        script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = $('#import')[0].value;
        document.head.appendChild(script);
      }
      $('#import')[0].selectedIndex = 0;
      return $('#import').selectmenu('refresh');
    });
  };

  settingMenu = function() {
    $('#keyboard-on').change(layoutEditor);
    return $('#key-sound').change(function() {
      return keySound.enable = this.checked ? true : false;
    });
  };

  $(document).ready(function() {
    appCacheUpdate();
    $('#scriptpage').addBackBtn = false;
    $('.key.main').mousedown(function(event) {
      return event.preventDefault();
    });
    $('div[data-role="page"].editorpage').bind('pageshow', function() {
      if ($('#keyboard-on')[0].checked) {
        return $('#keys').css('display', 'block');
      } else {
        return $('#keys').css('display', 'none');
      }
    });
    $('div[data-role="page"]:not(.editorpage)').bind('pageshow', function() {
      return $('#keys').css('display', 'none');
    });
    $('#runpage').bind('pagebeforeshow', function() {
      return $('#application').html(markupEditor.getValue());
    });
    $('#runpage').bind('pageshow', function() {
      try {
        return eval(scriptEditor.compile());
      } catch (error) {
        return window.siphon.log("<p style=\"color:red;\">" + error.message + "</p>");
      }
    });
    initScriptEditor();
    initMarkupEditor();
    if (/iPad/.test(navigator.userAgent)) {
      $('#keyboard-on')[0].checked = true;
      $('#keys').css('display', 'block');
    } else {
      $('#scriptpage').bind('pageshow', function() {
        scriptEditor.refresh();
        return cheatViewer.refresh();
      });
      $('#markuppage').bind('pageshow', function() {
        return markupEditor.refresh();
      });
    }
    layoutEditor();
    initCheatViewer();
    softKeyboard();
    menuBar();
    settingMenu();
    return $('#error').text("What's New (12/29/2011): Sample codes for libraries are available from open menu.");
  });

}).call(this);
