(function() {
  var KeyFSM, KeyState, appCache, appCacheUpdate, capitalize, clickSaveas, clipboard, currentFile, editor, evalCS, fileOptions, fireKeyEvent, fireTextEvent, iOSKeyboardHeight, initEditor, initViewer, jssnippet, jsviewer, keyActive, keyCodes, keyInactive, keySound, keySubActive, keySubInactive, layoutEditor, menuBar, navigationBar, onKeyEventforiPad, pos2xy, resetSelect, resetSelects, run, settingMenu, softKeyboard, xy2pos;

  editor = null;

  jsviewer = null;

  clipboard = null;

  jssnippet = '';

  capitalize = function(word) {
    return word.substring(0, 1).toUpperCase() + word.substring(1);
  };

  run = function() {
    if (/canvas/.test(jsviewer.getValue())) document.location = '#runpage';
    try {
      return eval(jsviewer.getValue());
    } catch (error) {
      return alert(error.message);
    }
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

  resetSelect = function(id) {
    var option, selector;
    selector = '#' + id;
    $(selector).empty();
    option = document.createElement('option');
    option.appendChild(document.createTextNode(capitalize(id + '...')));
    option.value = '';
    option.disabled = true;
    $(selector).append(option);
    return fileOptions().forEach(function(e) {
      return $(selector).append(e);
    });
  };

  resetSelects = function() {
    resetSelect('open');
    return resetSelect('delete');
  };

  clickSaveas = function() {
    var currentFile;
    currentFile = prompt('filename:');
    if (!(currentFile != null)) return;
    localStorage.setItem(currentFile, editor.getValue());
    return resetSelects();
  };

  iOSKeyboardHeight = 307;

  layoutEditor = function() {
    var jsElement, keybackHeight, restHeight;
    restHeight = window.innerHeight - $('.ui-header').outerHeight(true) - $('#error').outerHeight(true) - ($(editor.element).outerHeight(true) - $(editor.element).height());
    if ($('#keyboard-on')[0].checked) {
      $('#keys').css('display', 'block');
      keybackHeight = iOSKeyboardHeight + $('#keys').outerHeight(true);
    } else {
      keybackHeight = iOSKeyboardHeight;
      $('#keys').css('display', 'none');
    }
    restHeight -= keybackHeight;
    $('#keyback').height(keybackHeight + 'px');
    restHeight = Math.max(restHeight, 12);
    editor.setHeight(restHeight + 'px');
    jsElement = jsviewer.getWrapperElement();
    return jsviewer.setHeight((window.innerHeight - $('.ui-header').outerHeight(true) - ($(jsElement).outerHeight(true) - $(jsElement).height())) + 'px');
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

  initEditor = function() {
    var ta;
    editor = CodeMirror($('#editor')[0], {
      value: "#Select a line below by tapping the line and pressing cntrl + l.\n#And press cntrl + r to run the line and see the result.\n1 + 1",
      matchBrackets: true,
      mode: 'coffeescript',
      lineNumbers: true,
      onChange: function() {
        return editor.compile();
      },
      onKeyEvent: onKeyEventforiPad
    });
    editor.bodyTop = 0;
    ta = editor.getInputField();
    ta.addEventListener('mousedown', function() {
      return editor.bodyTop = document.body.scrollTop;
    });
    ta.addEventListener('focus', function() {
      return window.scrollTo(0, editor.bodyTop);
    });
    editor.element = editor.getWrapperElement();
    editor.setHeight = function(str) {
      this.getScrollerElement().style.height = str;
      return this.refresh();
    };
    return editor.compile = function() {
      try {
        jsviewer.setValue(CoffeeScript.compile(this.getValue(), {
          bare: true
        }));
        return $('#error').text('');
      } catch (error) {
        return $('#error').text(error.message);
      }
    };
  };

  initViewer = function() {
    var parent;
    parent = $('#compiled').parent()[0];
    $('#compiled').remove();
    jsviewer = CodeMirror(parent, {
      mode: 'javascript',
      readOnly: true
    });
    jsviewer.setHeight = function(str) {
      this.getScrollerElement().style.height = str;
      return this.refresh();
    };
    return $('textarea', jsviewer.getWrapperElement()).attr('disabled', 'true');
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
            clipboard = editor.getSelection();
            editor.replaceSelection('');
          }
          e.stop();
          return true;
        case 67:
          if (e.type === 'keydown') clipboard = editor.getSelection();
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
            line = editor.getCursor().line;
            editor.setSelection({
              line: line,
              ch: 0
            }, {
              line: line,
              ch: editor.getLine(line).length
            });
          }
          e.stop();
          return true;
        case 82:
          if (e.type === 'keydown') {
            clipboard = editor.getSelection();
            result = evalCS(clipboard);
            if (result != null) editor.replaceSelection(result.toString());
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
      editor.setValue('');
      return currentFile = null;
    });
    $('#save').click(function() {
      if (!(currentFile != null) || currentFile === '') {
        return clickSaveas();
      } else {
        localStorage.setItem(currentFile, editor.getValue());
        return alert('"' + currentFile + '" was saved.');
      }
    });
    $('#saveas').click(clickSaveas);
    $('#about').click(function() {
      return alert('Siphon\nCoffeeScript Programming Environment\nVersion 0.5.3\nCopyright (C) 2011 ICHIKAWA, Yuji All Rights Reserved.');
    });
    resetSelects();
    $('#open').change(function() {
      currentFile = $('#open')[0].value;
      if ((currentFile != null) && currentFile !== '') {
        editor.setValue(localStorage[$('#open')[0].value]);
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

  navigationBar = function() {
    return $('.run').click(function() {
      return run();
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
    $('#editorpage').addBackBtn = false;
    $('.key.main').mousedown(function(event) {
      return event.preventDefault();
    });
    initEditor();
    initViewer();
    if (/iPad/.test(navigator.userAgent)) {
      $('#keyboard-on')[0].checked = true;
    } else {
      $('#editorpage').live('pageshow', function(event, ui) {
        return editor.refresh();
      });
      $('#compiledpage').live('pageshow', function(event, ui) {
        return jsviewer.refresh();
      });
    }
    $('#keyback').css('display', 'block');
    layoutEditor();
    document.body.onresize = layoutEditor;
    softKeyboard();
    navigationBar();
    menuBar();
    settingMenu();
    return editor.compile();
  });

}).call(this);
