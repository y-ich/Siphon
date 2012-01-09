util = require 'util'
exec = (require 'child_process').exec

FILENAME = 'siphon' # write your game title.
FILES = [
  'samples.coffee',
  'flick_keys.coffee',
  'siphon.coffee',
  # write sourcecodes here.
]

outputErr = (err, stdout, stderr) ->
  throw err if err
  if stdout or stderr
    console.log "#{stdout} #{stderr}"

task 'compile', "compile and minify #{FILENAME}.", (options) ->
  if FILES.length is 1
    exec "coffee -c #{FILENAME}.js #{FILES[0]}", outputErr
  else
    exec "coffee -cj #{FILENAME} #{FILES.join ' '}", outputErr
  exec "uglifyjs #{FILENAME}.js > #{FILENAME}.min.js", outputErr

task 'push', 'push repository to github', (options) ->
  exec 'git push origin gh-pages', outputErr
