all: plugin.js

.PHONY: plugin.js

plugin.js: plugin.ts tsconfig.json
	tsc
