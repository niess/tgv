MIN :=

SCRIPTS := site/js/tgv$(MIN).js

COFFEE := coffee
MINIFY := google-closure-compiler
RENDER := google-chrome --disable-web-security --user-data-dir=$(PWD)/.chrome


.PHONY: init


all: $(SCRIPTS)

site/js/%.js: src/%.coffee
	@mkdir -p site/js
	@echo "COFFEE $<"
	@$(COFFEE) -o site/js -c $<

site/js/%.min.js: site/js/%.js
	@echo "MINIFY $<"
	@$(MINIFY) --js $< --js_output_file $@
	@rm -f $<

clean:
	@rm -rf $(SCRIPTS)

render:
	$(RENDER) $(PWD)/site/index.html &

init:
	@echo "setting .git/hooks"
	@find .git/hooks -type l -exec rm {} \;
	@find .githooks -type f -exec ln -sf ../../{} .git/hooks/ \;
