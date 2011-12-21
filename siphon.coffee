# Siphon: CoffeeScript promgramming environment for iPad
# author: ICHIKAWA, Yuji
# Copyright (C) 2011 safari-park

#
# parameters
#

# editor object
editor = null
jsviewer = null
clipboard = null
jssnippet = ''

#
# utility functions
#

# returns a string with the first character capitalized.
capitalize = (word) -> word.substring(0, 1).toUpperCase() + word.substring(1)

#
# code snippets
#

# changes page to 'runpage' if the program uses 'canvas' and evals it.
run = ->
  document.location = '#runpage' if /canvas/.test jsviewer.getValue()
  try
    eval jsviewer.getValue()
  catch error
    alert error.message

evalCS = (str) ->
    try
      jssnippet = CoffeeScript.compile str, bare : on
      result = eval jssnippet
      $('#error').text('done.')
      return result
    catch error
      $('#error').text(error.message)


# utility for resetSelect
fileOptions = ->
  result = []
  for i in [0...localStorage.length]
    e = document.createElement('option')
    e.appendChild(document.createTextNode(localStorage.key(i)))
    result.push e
  result

# utility for resetSelects
resetSelect = (id) ->
  selector = '#' + id
  $(selector).empty()
  option = document.createElement('option')
  option.appendChild(document.createTextNode(capitalize id + '...'))
  option.value = ''
  option.disabled = true
  $(selector).append option
  fileOptions().forEach (e) -> $(selector).append e

# makes "Open..." and "Delete..." select menu.
resetSelects = ->
  resetSelect 'open'
  resetSelect 'delete'

# dispatch for saveas
clickSaveas = ->
  currentFile = prompt 'filename:'
  return if not currentFile?
  localStorage.setItem(currentFile, editor.getValue())
  resetSelects()

iOSKeyboardHeight = 307

layoutEditor = ->
  restHeight = window.innerHeight -
    $('.ui-header').outerHeight(true) -
    $('#error').outerHeight(true) -
    ($(editor.element).outerHeight(true) - $(editor.element).height())
  if $('#keyboard-on')[0].checked
    $('#keys').css('display', 'block')
    keybackHeight = iOSKeyboardHeight + $('#keys').outerHeight(true)
  else
    keybackHeight = iOSKeyboardHeight
    $('#keys').css('display', 'none')
  restHeight -= keybackHeight
  $('#keyback').height(keybackHeight + 'px')
  restHeight = Math.max(restHeight, 12)
  editor.setHeight restHeight + 'px'
  jsElement = jsviewer.getWrapperElement()
  jsviewer.setHeight (window.innerHeight -
    $('.ui-header').outerHeight(true) -
    ($(jsElement).outerHeight(true) - $(jsElement).height())) + 'px'

keyCodes =
  'Control' : 17
  'Alt' : 18
  'Meta' : 91
  'Left' : 37
  'Right' : 39
  'Up' : 38
  'Home' : 36
  'PageUp' : 33
  'U+0009' : 9 # tab
  'Down' : 40
  'End' : 35
  'PageDown' : 34
  'Shift' : 16

KeyboardEvent.DOM_KEY_LOCATION_STANDARD = 0

# emulates keyboard event.
# Since many properties of KeyboardEvent are read only and can not be set,
# mobile property is added instead.
fireKeyEvent = (type, keyIdentifier, keyCode, charCode) ->
  e = document.createEvent 'KeyboardEvent'
  e.initKeyboardEvent type, true, true, window, keyIdentifier,
    KeyboardEvent.DOM_KEY_LOCATION_STANDARD, ''
  # There is no getModifiersState method in webkit, so you have no way to know the content of modifiersList. So I use '' in the last argument.
  e.mobile =
    keyCode : keyCode
    charCode : charCode
  editor.getInputField().dispatchEvent(e)

pos2xy = (str, pos) ->
  lines = str.split('\n')
  head = 0
  for y in [0...lines.length]
    if head <= pos <= head + lines[y].length
      return {x: pos - head, y: y}
    head += lines[y].length + 1 # +1 is for '\n'.
  error = new Error()
  error.name = 'overposition'
  error.message = 'pos is larger than str.'
  throw error

xy2pos = (str, xy) ->
  lines = str.split('\n')
  return str.length unless 0 <= xy.y < lines.length
  pos = 0
  pos += lines[y].length + 1 for y in [0...xy.y]
  return pos + Math.min(xy.x, lines[y].length)

TextEvent.DOM_INPUT_METHOD_KEYBOARD = 1
TextEvent.DOM_INPUT_METHOD_PASTE = 2

fireTextEvent = (str, method = TextEvent.DOM_INPUT_METHOD_KEYBOARD) ->
  e = document.createEvent 'TextEvent'
  e.initTextEvent 'textInput', true, true, window, str,
    TextEvent.DOM_INPUT_METHOD_KEYBOARD
  editor.getInputField().dispatchEvent(e)

#
# global variables
#

# keyname associated with current code in "edit" textarea
currentFile = null

# key sound
# tunes perfomance by keep pausing during no sound.
keySound =
  source : new Audio 'sounds/click.aiff'
  enable : true
  play : ->
    return if not @enable
    @source.play()
    keySound.timer = setTimeout(
      ->
        keySound.source.pause()
        try
          keySound.source.currentTime = 0
        catch e
      , 30)

# keySound.source.load() # no effect due to carreer limitation.

#
# software key with upper flick
#
# usage:
#  1. prepare keys in an HTML file like the below
#    <div title="+">+
#        <div title="-">-</div>
#    </div>
#    "title" property is used for output at key release.
#    The child element is a second key, so basically invisible.
#    you need to setup such things with layout in CSS.
#  2. create instances of KeyFSM.
#     Lazy assignment may be good.
#  3. call touchStart, touchMove, and touchEnd in corresponding
#     EventListeners respectively.
#
# parameters:
#  KeyFSM.holdTime: hold time to activate subkey
#
# implementation:
#  Using MVC pattern, KeyFSM is Model, DOM is V, and KeyState is C.
#  KeyState uses "Choosing Method."
#  KeyFSM uses Observer pattern.
#  There is a single controller using four instances of KeyState.
#  So updating method for each key is one kind. that is kind of restriction.

# model class
class KeyFSM
  constructor : (@state, @observer, @holdTime) ->

  setState : (state) ->
    @state = state
    @changed()

  subkey : -> @observer.childNodes[1] ? null

  changed : -> @state.update(@observer, @subkey())

  clearTimer : ->
    clearTimeout @timer if @timer?
    @timer = null

  touchStart : (@startX, @startY) ->
    # setTimeout (-> keySound.play()), 0
    # sound performance trick implemented in keySound class is unstable.
    setTimeout (-> keySound.source.play()), 0
    @setState keyActive
    if @subkey()?
      @timer = setTimeout (=> @setState keySubActive), @holdTime
    fireKeyEvent 'keydown', @observer.id, @keyCode(), 0

  touchMove : (event) ->
    touchPoint = event.targetTouches[0]
    moveX = touchPoint.pageX - @startX
    moveY = touchPoint.pageY - @startY
    @state.touchMove this, moveX, moveY

  touchEnd : ->
    @state.touchEnd this
    fireKeyEvent 'keyup', @observer.id, @keyCode(), 0

  keyCode: ->
    if @observer.id? then keyCodes[@observer.id]
    else if @observer.title? then @observer.title.charCodeAt(0)
    else 0

# controller class to instantiate each state of a key.
class KeyState
  constructor : ->

  update : (main, sub) ->

  touchMove : (fsm, moveX, moveY) ->

  touchEnd : (fsm) ->

  inRange : (moveX, moveY) ->
    keySize = $('.key').width()
    -keySize < moveX < keySize and -2 * keySize < moveY < keySize

# inactive state
keyInactive = new KeyState()

keyInactive.update = (main, sub) -> sub.style.display = 'none' if sub?

# active state
keyActive = new KeyState()

keyActive.update = (main, sub) -> main.style.backgroundColor = '#a0a0a0'

keyActive.touchMove = (fsm, moveX, moveY) ->
  flickLength = 30
  if fsm.subkey()? and moveY < -flickLength and -flickLength < moveX < flickLength
    fsm.clearTimer()
    fsm.setState keySubActive
  else if not @inRange(moveX, moveY)
    fsm.clearTimer()
    fsm.setState keyInactive

keyActive.touchEnd = (fsm) ->
  fsm.clearTimer()
  if fsm.observer.title?
    code = fsm.observer.title.charCodeAt(0)
    fireTextEvent fsm.observer.title
    fireKeyEvent 'keypress', code, code
  fsm.setState keyInactive

# subkey active state
keySubActive = new KeyState()

keySubActive.update = (main, sub) ->
  $(sub).css 'color', '#fff'
  $(sub).css 'background-image',
    '-webkit-gradient(linear, left top, left bottom, from(rgb(65,134,245)), to(rgb(25,79,220)))'
  sub.style.display = 'block'

keySubActive.touchMove = (fsm, moveX, moveY) ->
  fsm.setState keySubInactive unless @inRange(moveX, moveY)


keySubActive.touchEnd = (fsm) ->
  if fsm.subkey().title? and fsm.subkey().title isnt ''
    c = fsm.subkey().title.charCodeAt(0)
    fireTextEvent fsm.subkey().title
    fireKeyEvent 'keypress', c, c
  fsm.setState keyInactive

# subkey inactive state
keySubInactive = new KeyState()

keySubInactive.update = (main, sub) ->
  $(sub).css 'color', '#000'
  $(sub).css 'background-image',
    '-webkit-gradient(linear, left top, left bottom, from(#EEEEF0), to(#D2D2D8))'

keySubInactive.touchMove = (fsm, moveX, moveY) ->
  fsm.setState keySubActive if @inRange(moveX, moveY)

keySubInactive.touchEnd = (fsm) -> fsm.setState keyInactive

#
# Application cache dispatches
#
appCache = window.applicationCache
#appCache.addEventListener 'checking', ->
appCache.addEventListener 'noupdate', ->
  console.log 'Manifest has no change.'
#appCache.addEventListener 'downloading', ->
#appCache.addEventListener 'progress', ->
appCache.addEventListener 'cached', ->
  alert 'Conguatulation! You can use Siphon offline.'
appCache.addEventListener 'updateready', ->
  if confirm 'New version was downloaded. Do you want to update?'
    appCache.swapCache()
    location.reload()
appCache.addEventListener 'obsolete', ->
  alert 'Sorry for inconvenience. Siphon moved to http://y-ich.github.com/Siphon/ on 2011/12/13.'
appCache.addEventListener 'error', ->
  console.log 'Application cache error.'
  # error occurs when calling update() offline.

$(document).ready ->
  try
    appCache.update() if navigator.onLine
  catch e
    console.log e

  # jQuery Mobile setting
  $('#editorpage').addBackBtn = false # no back button on top page.

  editor = CodeMirror $('#editor')[0],
    value :  "#Select a line below by tapping the line and pressing cntrl + l.\n#And press cntrl + r to run the line and see the result.\n1 + 1"
    matchBrackets: true
    mode : 'coffeescript'
    onChange : -> editor.compile()
    onKeyEvent : (instance, e) ->
      e.mobile ?= {}
      e.mobile.metaKey = $('#Meta')[0].model? and
        $('#Meta')[0].model.state is keyActive
      e.mobile.ctrlKey = $('#Control')[0].model? and
        $('#Control')[0].model.state is keyActive
      e.mobile.altKey = $('#Alt')[0].model? and
        $('#Alt')[0].model.state is keyActive
      e.mobile.shiftKey = $('#Shift')[0].model? and
        $('#Shift')[0].model.state is keyActive
      if e.mobile.metaKey
        switch e.keyCode
          when 88 # 'X'.charCodeAt(0)
            if e.type is 'keydown'
              clipboard = editor.getSelection()
              editor.replaceSelection('')
            e.stop()
            return true
          when 67 # 'C'.charCodeAt(0)
            if e.type is 'keydown'
              clipboard = editor.getSelection()
            e.stop()
            return true
          when 86 # 'V'.charCodeAt(0)
            if e.type is 'keydown' and clipboard? and clipboard isnt ''
              fireTextEvent clipboard, TextEvent.DOM_INPUT_METHOD_PASTE
            e.stop()
            return true
      if e.ctrlKey or e.mobile.ctrlKey
        switch e.keyCode
          when 76 # 'L'.charCodeAt(0)
            if e.type is 'keydown'
              line = editor.getCursor().line
              editor.setSelection {line : line, ch : 0},
                {line : line, ch : editor.getLine(line).length}
            e.stop()
            return true
          when 82 # 'R'.charCodeAt(0)
            if e.type is 'keydown'
              clipboard = editor.getSelection()
              result = evalCS(clipboard)
              editor.replaceSelection result.toString() if result?
            e.stop()
            return true
      return false

  # In order to improve unexpected scroll during inputting on iPad.
  editor.bodyTop = 0
  ta = editor.getInputField()
  ta.addEventListener 'mousedown', ->
    editor.bodyTop = document.body.scrollTop
  ta.addEventListener 'focus', ->
    window.scrollTo 0, editor.bodyTop

  editor.element = editor.getWrapperElement()
  editor.setHeight = (str) ->
    this.getScrollerElement().style.height = str
    this.refresh()
  editor.compile = ->
    try
      jsviewer.setValue CoffeeScript.compile @getValue(), bare : on
      $('#error').text('')
    catch error
      $('#error').text(error.message)

  parent = $('#compiled').parent()[0]
  $('#compiled').remove()
  jsviewer = CodeMirror parent, {mode : 'javascript', readOnly : true}
  jsviewer.setHeight = (str) ->
    this.getScrollerElement().style.height = str
    this.refresh()
  $('textarea', jsviewer.getWrapperElement()).attr 'disabled', 'true'

  if /iPad/.test(navigator.userAgent)
    $('#keyboard-on')[0].checked = true
  else
    # for desktop safari or chrome
    $('#editorpage').live 'pageshow', (event, ui) -> editor.refresh()
    $('#compiledpage').live 'pageshow', (event, ui) -> jsviewer.refresh()

  $('#keyback').css('display', 'block')
  # keyback is not showed until layout for the beauty.
  layoutEditor()
  # problem
  #  When debug console is enabled on iPad, just after loading,
  #  1. the debug console is not showed
  #  2. the innnerHeight is as if it misses debug console.
  #  3. so the edit area is larger than intention.
  #  4. the position of soft key buttons is higher than intention.

  document.body.onresize = layoutEditor

  # prevents native soft keyboard to slip down when button was released.
  $('.key.main').mousedown (event) -> event.preventDefault()

  #
  # HTML soft keyboard
  #
  $('.key.main').bind 'touchstart', (event) ->
    touchPoint = event.originalEvent.targetTouches[0]

    # lazy initialization
    this.model ?= new KeyFSM keyInactive, this, 400 #milli seconds
    this.model.touchStart touchPoint.pageX, touchPoint.pageY

  $('.key.main').bind 'touchmove', (event) ->
    this.model.touchMove event.originalEvent
    event.preventDefault()
    # Because page scroll are enabled at debug mode, page scroll are disabled on buttons

  $('.key.main').bind 'touchend', (event) -> this.model.touchEnd()

  $('.run').click -> run()

  #
  # menu bar
  #
  $('#new').click ->
    editor.setValue('')
    currentFile = null

  $('#save').click ->
    if not currentFile? or currentFile is ''
      clickSaveas()
    else
      localStorage.setItem(currentFile, editor.getValue())
      alert '"' + currentFile + '" was saved.'

  $('#saveas').click clickSaveas

  $('#about').click ->
    alert 'Siphon\nCoffeeScript Programming Environment\nVersion 0.4.4\nCopyright (C) 2011 ICHIKAWA, Yuji All Rights Reserved.'

  resetSelects() # "Open...", and "Delete..." menus

  $('#open').change ->
    currentFile = $('#open')[0].value
    if currentFile? and currentFile isnt ''
      editor.setValue localStorage[$('#open')[0].value]
    $('#open')[0].selectedIndex = 0 # index = 0 means "Open..."
    $('#open').selectmenu('refresh')

  $('#delete').change ->
    if confirm 'Do you want to delete "' + $('#delete')[0].value +
        '"? (Current file is "' + currentFile + '".)'
      localStorage.removeItem $('#delete')[0].value
      resetSelects()
    $('#delete')[0].selectedIndex = 0 # index = 0 means "Delete..."
    $('#delete').selectmenu('refresh')

  $('#import').change ->
    if confirm 'Do you want to import "' + $('#import')[0].value + '"?'
      ###
      # appendTo of script element doesn't work.
      html = '<script type="text/javascript" src="' + $('#import')[0].value + '"></script>'
      $(html).appendTo('head')
      ###
      script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = $('#import')[0].value
      document.head.appendChild(script)
    $('#import')[0].selectedIndex = 0 # index = 0 means "Import..."
    $('#import').selectmenu('refresh')

  $('#keyboard-on').change layoutEditor

  $('#key-sound').change ->
    keySound.enable = if this.checked then true else false

  $('#smart-indent').change ->
    editor.setOption 'tabMode', if this.checked then 'smart' else 'classic'

  $('#codemirror').change ->
  editor.compile()
