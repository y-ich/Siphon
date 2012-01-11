TARGET	= siphon

$(TARGET).min.js: $(TARGET).js
	uglifyjs $< > $@

$(TARGET).js: samples.coffee flick_keys.coffee siphon.coffee
	coffee -cj $(TARGET) $^

push:
	git push origin gh-pages
