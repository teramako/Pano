
TOP = $(shell pwd)
NAME = pano
VERSION = $(shell sed -n 's,^.*<em:version>\(.*\)</em:version>.*$$,\1,p' $(TOP)/install.rdf)

DATE = $(shell date +%Y%m%d)

XPI_NAME = $(NAME)-$(VERSION)-$(DATE).xpi


all: xpi;

help:
	@echo "$(NAME) $(VERSION) $(DATE) build"
	@echo
	@echo "  make help      - display this help"
	@echo "  make xpi       - build an XPI ($(XPI_NAME))"
	@echo "  make clean     - remove pano-*.xpi"
	@echo

clean:
	rm $(TOP)/pano-*.xpi

xpi:
	@echo "build $(XPI_NAME)"
	$(TOP)/build.sh $(XPI_NAME)

# vim: noet:
