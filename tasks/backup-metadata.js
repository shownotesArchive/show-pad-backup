var async = require('async')
  , fs    = require('fs')
  , path  = require('path')
  , showpadapi = require('../show-pad-api.js')

exports.name = "metadata";
exports.requiredConfig =
  [
    "showpad:host"
  , "showpad:port"
  , "showpad:apikey"
  ];

var config, dest, logger;

exports.execute = function (_config, _dest, _logger, cb)
{
  config = _config;
  dest = _dest;
  logger = _logger;

  async.series(
    [
      initShowpadApi,
      backupUsers,
      backupGroups,
      backupDocs
    ],
    cb
  );
}

function initShowpadApi(cb)
{
  var url = "http://" + config.showpad.host + ":" + config.showpad.port;
  showpadapi.init(url, config.showpad.apikey);
  cb();
}

function backupUsers(cb)
{
  backupEntities("users", cb);
}

function backupGroups(cb)
{
  backupEntities("groups", cb);
}

function backupDocs(cb)
{
  backupEntities("docs", cb);
}

function backupEntities(name, cb)
{
  async.waterfall(
    [
      // get the data
      function (cb)
      {
        showpadapi.get(name, cb);
      },
      // save to disk
      function (data, cb)
      {
        var file = path.join(dest, "bak-" + name + ".json");
        fs.writeFile(file, JSON.stringify(data),
          function (err)
          {
            if(err)
              cb(err);
            else
              cb(null, data.length);
          }
        )
      }
    ],
    function (err, count)
    {
      if(err)
        logger.error("There was an error while backing up %s: %s", name, err);
      else
        logger.info("Backed up %s %s", count, name);

      cb(err);
    }
  )
}
