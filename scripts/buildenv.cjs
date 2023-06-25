#!/usr/bin/env node
/**
@licence
    Copyright (c) 2023 Alan Chandler, all rights reserved

    This file is part of Dragmove.

    Dragmove is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Dragmove is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Dragmove.  If not, see <http://www.gnu.org/licenses/>.
*/
(function() {
  'use strict';
  const concat = require('concat');
  const path = require('path');
  const root = path.resolve(__dirname,'..');
  const rollup = require('rollup');
  const  {nodeResolve}  = require('@rollup/plugin-node-resolve');
  const sourcemaps =require('rollup-plugin-sourcemaps');
  const updatePromise = import('../server/common/update.js');
  

  const inputOptions = {
    input: [
      'node_modules/lit-element/lit-element.js',
      'node_modules/lit/html.js',
      'node_modules/lit/async-directive.js',
      'node_modules/lit/directive.js',
      'node_modules/lit/directives/if-defined.js',
      'node_modules/lit/directives/cache.js',
      'node_modules/lit/directives/class-map.js',
      'node_modules/lit/directives/guard.js',
      'node_modules/lit/directives/live.js',
      'node_modules/lit/directives/repeat.js',
      'node_modules/lit/directives/style-map.js',
      'node_modules/lit/directives/template-content.js',
      'node_modules/lit/directives/unsafe-html.js',
      'node_modules/lit/directives/until.js',
      'node_modules/@akc42/app-utils/app-keys.js',
      'node_modules/@akc42/app-utils/csv.js',
      'node_modules/@akc42/app-utils/debug.js',
      'node_modules/@akc42/app-utils/dom-host.js',
      'node_modules/@akc42/app-utils/switch-path.js'
    ],
    plugins: [nodeResolve(), sourcemaps()]
  };
  const outputOptions = {
    dir: 'libs',
    format: 'esm',
    sourcemap: true
  };

  async function build(enviros) {

    //rollup libraries client needs
    const bundle = await rollup.rollup(inputOptions);
    await bundle.write(outputOptions);

  }

  build(enviros).then(() => {
    process.exit(0);
  }).catch(err => {
    // eslint-disable-next-line no-console
    console.warn('Build Env Error ' + err.message);
    process.exit(1);
  });
})();
