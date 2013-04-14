var async = require('async')
  , fs    = require('fs')
  , path  = require('path')
  , showpadapi = require('../show-pad-api.js')

exports.name = "docdata";
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

  var url = "http://" + config.showpad.host + ":" + config.showpad.port;
  showpadapi.init(url, config.showpad.apikey);
  backupDocs(cb);
}


function backupDocs(cb)
{
  async.waterfall(
    [
      // get the data
      function (cb)
      {
        showpadapi.get("doctexts", cb);
      },
      // save to disk
      function (data, cb)
      {
        async.forEach(data,
          function (doc, cb)
          {
            if(doc.error)
            {
              logger.error("Could not backup doc '%s': %s", doc.name, doc.error)
            }
            else
            {
              var file = path.join(dest, "bak-" + doc.name + ".json");
              fs.writeFile(file, JSON.stringify(doc),
                function (err)
                {
                  if(err)
                    cb(err);
                  else
                    cb(null, data.length);
                }
              );
            }
          },
          function (err)
          {
            if(err)
              cb(err);
            else
              cb(null, data.length);
          }
        );
      }
    ],
    function (err, count)
    {
      if(err)
        logger.error("There was an error while backing up the document-texts: %s", err);
      else
        logger.info("Backed up %s document-texts", count);

      cb(err);
    }
  )
}
