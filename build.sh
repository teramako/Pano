#!/bin/sh

if [ -z "$1" ];then
  echo abort.
  exit 1
fi

XPI=$1

if [ -f $XPI ]; then
  rm $XPI;
fi

zip $XPI -r chrome modules install.rdf chrome.manifest license.txt defaults README.md changelog-ja.md

echo ""
echo "Created: ${XPI}"

