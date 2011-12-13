
VERSION = $(shell sed -n 's,^.*<em:version>\(.*\)</em:version>.*$$,\1,p' install.rdf)
TARGET = pano-toolbar-${VERSION}.xpi
DIRS = content locale skin
FILES = install.rdf bootstrap.js chrome.manifest
CONTENTS = $(shell find ${DIRS} ! -name ".*")

clean:
	-rm ${TARGET}

${TARGET}: ${FILES} ${CONTENTS}
	@if [ -f ${TARGET} ];then rm ${TARGET}; fi
	zip $@ -r ${FILES} ${CONTENTS}
	@echo created $@

.xpi: ${TARGET}
	@ls -l pano-toolbar.xpi

xpi: .xpi

install: xpi
	-/cygdrive/d/usr/Firefox/firefox.exe ${TARGET}

# vim: set noet:
