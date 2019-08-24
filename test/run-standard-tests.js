#!/usr/bin/env node

/**
 * Module dependencies
 */

var TestRunner = require('waterline-adapter-tests');
var packageMD = require('../package.json');
var Adapter = require('../');


// Log an intro message.
console.log('Testing `' + packageMD.name + '`, a Sails/Waterline adapter.');
console.log('Running `waterline-adapter-tests` against '+packageMD.waterlineAdapter.interfaces.length+' interface(s) and '+packageMD.waterlineAdapter.features.length+' feature(s)...');
console.log('|   Interfaces:       '+(packageMD.waterlineAdapter.interfaces.join(', ')||'n/a')+'');
console.log('|   Extra features:   '+(packageMD.waterlineAdapter.features.join(', ')||'n/a')+'');
console.log();
console.log('> More info about building Waterline adapters:');
console.log('> https://sailsjs.com/docs/concepts/extending-sails/adapters/custom-adapters');


// Ensure a `url` was specified.
// (https://sailsjs.com/config/datastores#?the-connection-url)
if (!process.env.WATERLINE_ADAPTER_TESTS_URL) {
  console.error();
  console.error('-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-');
  console.error('Cannot run tests: No database connection `url` specified.');
  console.error();
  console.error('Tip: You can use an environment variable to configure this.');
  console.error('For example:');
  console.error('```');
  console.error('    WATERLINE_ADAPTER_TESTS_URL=root@localhost:3306/testdb npm test');
  console.error('```');
  console.error('-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-');
  process.exit(1);
}//-•


// Use the `waterline-adapter-tests` module to
// run mocha tests against the specified interfaces
// of the currently-implemented Waterline adapter API.
new TestRunner({

  // Load the adapter module.
  adapter: Adapter,

  // Adapter config to use for tests.
  config: {
    url: process.env.WATERLINE_ADAPTER_TESTS_URL
  },

  // The set of adapter interface layers & specific features to test against.
  interfaces: packageMD.waterlineAdapter.interfaces,
  features: packageMD.waterlineAdapter.features,

});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//
// Most databases implement 'semantic' and 'queryable' interface layers.
//
// For full interface reference, see:
// https://sailsjs.com/docs/concepts/extending-sails/adapters/custom-adapters
//
// Some features are polyfilled if omitted; allowing optimizations at the adapter
// level for databases that support the feature.  For example, if you don't implement
// a `join` method, it will be polyfilled for you by Waterline core (using the same
// "polypopulate" that it uses for cross-datastore joins.)  For more on that, talk
// to an adapter maintainer @ https://sailsjs.com/support.
//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

