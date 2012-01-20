# flick_keys: keyboard extension
# author: ICHIKAWA, Yuji
# Copyright (C) 2011 ICHIKAWA, Yuji

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
  e.override =
    keyCode : keyCode
    charCode : charCode

  document.activeElement.dispatchEvent(e)


TextEvent.DOM_INPUT_METHOD_KEYBOARD = 1
TextEvent.DOM_INPUT_METHOD_PASTE = 2

fireTextEvent = (str, method = TextEvent.DOM_INPUT_METHOD_KEYBOARD) ->
  e = document.createEvent 'TextEvent'
  e.initTextEvent 'textInput', true, true, window, str,
    TextEvent.DOM_INPUT_METHOD_KEYBOARD
  document.activeElement.dispatchEvent(e)

initKeys = ->
  # prevents native soft keyboard to slip down when button was released.
  # You may not need this hack when using CodeMirror.
  $('.key.main').mousedown (event) -> event.preventDefault()

  $('.key.main').live 'touchstart', (event) ->
    touchPoint = event.originalEvent.targetTouches[0]
    # lazy initialization
    @model ?= new KeyFSM keyInactive, this, 400 #milli seconds
    @model.touchStart touchPoint.pageX, touchPoint.pageY

  $('.key.main').live 'touchmove', (event) ->
    @model.touchMove event.originalEvent
    event.preventDefault()
    # Because page scroll are enabled at debug mode, page scroll are disabled on buttons

  $('.key.main').live 'touchend', (event) -> @model.touchEnd()


