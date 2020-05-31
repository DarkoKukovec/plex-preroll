# Plex Preroll

This script will generate up to 5 preroll videos based on the recently added movies. If you run it regulary, it will always keep the prerolls up to date

## Prerequisites

* node.js
* ffmpeg

## Installation

```bash
npm install
```

## Running

```bash
npm start
```

## Plex setup

In your plex server settings, in the "Extra" options, you can enter a comma separated list of paths to the prerolls. Plex will play a random one before each media.

## TODO

* [ ] Maybe tweak the length to 10s
* [ ] Maybe add a slow zoom in movie poster animation
* [ ] Add sounds