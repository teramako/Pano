#!/bin/sh

VERSION=0.1
XPI=pano-${VERSION}.xpi

if [ -f $XPI ]; then
  rm $XPI;
fi

zip $XPI -r chrome modules install.rdf chrome.manifest

