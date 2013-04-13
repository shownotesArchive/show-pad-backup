var nconf  = require('nconf')
    fs     = require('fs')
    async  = require('async')
    log4js = require('log4js')
    path   = require('path')

var mainLogger = log4js.getLogger("main");

var tasks = {}

async.series(
  [
    loadConfig,
    loadTasks,
    executeTasks
  ]
);

function loadConfig(cb)
{
  mainLogger.info("Loading config..");
  nconf.file({ file: 'config.json' });
  cb();
}

function loadTasks(cb)
{
  mainLogger.info("Loading tasks..");
  var loaderLogger = log4js.getLogger("taskLoader");
  var sharedConfig = nconf.get("shared");

  fs.readdir('./tasks',
    function (err, files)
    {
      if(err)
      {
        loaderLogger.error("Could not load tasks: " + err);
        return cb(err);
      }

      loaderLogger.info("Found %s tasks!", files.length);
      async.each(files,
        function (file, cb)
        {
          var task = require('./tasks/' + file);
          var taskname = task.name;
          var taskconfig = getTaskConfig(taskname);

          if(nconf.get("backup:tasks").indexOf(taskname) == -1)
          {
            loaderLogger.warn("Ignoring task '%s'", taskname);
            return cb();
          }

          async.reject(task.requiredConfig,
            function (key, cb)
            {
              var taskVal = nconf.get("tasks:" + taskname + ":" + key);
              var sharedVal = nconf.get("shared:" + key);
              var isValid = isValidConfig(taskVal) || isValidConfig(sharedVal);
              cb(isValid);
            },
            function (results)
            {
              var validConfig = results.length == 0;

              if(validConfig)
              {
                tasks[taskname] = task;
                loaderLogger.info("Task '%s' successfully loaded", taskname);
              }
              else
              {
                loaderLogger.error(
                  "The following config-entries for task '%s' were not found: %s",
                  taskname,
                  results.join(', ')
                );
              }

              cb(validConfig ? null : "missing-config");
            }
          );
        }, cb);
    }
  );
}

function isValidConfig(val)
{
  return (val && val.length != 0);
}

function executeTasks(cb)
{
  mainLogger.info("Executing %s tasks..", Object.keys(tasks).length);
  var executeLogger = log4js.getLogger("taskExecutor");
  var mainDestination = path.resolve(nconf.get("backup:destination"), "backup-" + Date.now());
  createDirIfNotExists(mainDestination);

  async.eachSeries(Object.keys(tasks),
    function (taskname, cb)
    {
      var task = tasks[taskname];
      var config = getTaskConfig(taskname);
      var destination = path.join(mainDestination, taskname);
      var taskLogger = log4js.getLogger(taskname);

      createDirIfNotExists(destination);

      executeLogger.info("Executing Task '%s'..", taskname);
      task.execute(config, destination, taskLogger,
        function (err)
        {
          if(!err)
            executeLogger.info("Task '%s' was executed successfully!", taskname);
          else
            executeLogger.error("Task '%s' failed to execute: %s", taskname, err);

          cb();
        });
    },
    function ()
    {
      executeLogger.info("All tasks executed.");
      cb();
    }
  )
}

function getTaskConfig(taskname)
{
  var config = nconf.get("tasks:" + taskname);
  var sharedConfig = nconf.get("shared");
  for (var attr in sharedConfig)
    config[attr] = sharedConfig[attr];
  return config;
}

function createDirIfNotExists(dir)
{
  mainLogger.debug("Creating dir:", dir);
  if (!fs.existsSync(dir))
    fs.mkdir(dir);
}
