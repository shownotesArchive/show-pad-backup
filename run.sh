#!/bin/sh

if [ ! -f config.json ]; then
  cp config.json.template config.json
  echo please insert your values into config.json before running.
  exit 1
fi

npm install .
node main.js
