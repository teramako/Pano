#!/bin/sh

VERSION=0.4
XPI=pano-${VERSION}.xpi

if [ -f $XPI ]; then
  rm $XPI;
fi

zip $XPI -r chrome modules install.rdf chrome.manifest license.txt README.md changelog-ja.md

echo ""
echo "Created: ${XPI}"

