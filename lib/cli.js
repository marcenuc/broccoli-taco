#!/usr/bin/env node

process.title = 'broccoli-site';

var fs = require('fs');
var program = require('commander');
var RSVP = require('rsvp');
var ncp = require('ncp');
ncp.limit = 1;

var broccoli = require('broccoli');
var Watcher = require('./watcher');

module.exports = function () {
  var actionPerformed = false;

  program
    .version(JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8')).version)
    .usage('[options] <command> [<args ...>]');

  program.command('serve')
    .description('start a broccoli server')
    .option('--port <port>', 'the port to bind to [4200]', 4200)
    .option('--host <host>', 'the host to bind to [localhost]', 'localhost')
    .option('--live-reload-port <port>', 'the port to start LiveReload on [35729]', 35729)
    .action(function(options) {
      actionPerformed = true;
      var builder = getBuilder();
      options.watcher = new Watcher(builder, {verbose: true});
      broccoli.server.serve(builder, options);
    });

  program.command('build <target>')
    .description('output files to target directory')
    .action(function(outputDir) {
      actionPerformed = true;
      var builder = getBuilder();
      builder.build().then(function (hash) {
        try {
          fs.mkdirSync(outputDir);
        } catch (err) {
          if (err.code !== 'EEXIST') throw err;
          console.error('Error: Directory "' + outputDir + '" already exists. Refusing to overwrite files.');
          process.exit(1);
        }
        var dir = hash.directory;
        return RSVP.denodeify(ncp)(dir, outputDir, {
          clobber: false
        , stopOnErr: true
        , dereference: true
        });
      }).finally(function () {
        builder.cleanup();
      }).then(function () {
        process.exit(0);
      }).catch(function (err) {
        // Should show file and line/col if present
        if (err.file) console.error('File: ' + err.file);
        console.error(err.stack);
        console.error('\nBuild failed');
        process.exit(1);
      });
    });

  program.parse(process.argv);
  if(!actionPerformed) {
    program.outputHelp();
    process.exit(1);
  }
};

function getBuilder () {
  var tree = broccoli.loadBrocfile();
  return new broccoli.Builder(tree);
}