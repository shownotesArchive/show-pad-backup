var http = require('http')

var url, apikey;

exports.init = function (_url, _apikey)
{
  url = _url;
  apikey = _apikey;

  if(url.lastIndexOf('/') != url.length - 1)
    url += '/';
  if(url.lastIndexOf('api/1/') != url.length - 6)
    url += 'api/1/';
}

exports.get = function (endpoint, entity, cb)
{
  if(entity instanceof Function)
  {
    cb = entity;
    entity = null;
  }

  var reqUrl = url + endpoint;
  if(entity)
    reqUrl += "/" + entity;
  reqUrl += "?apikey=" + apikey;

  http.get(reqUrl,
    function(res)
    {
      var body = "";

      res.on('data', function (chunk)
      {
        body += chunk;
      });

      res.on('end', function()
      {
        if(res.statusCode == 200)
        {
          cb(null, JSON.parse(body).data);
        }
        else
        {
          cb(res.statusCode);
        }
      });
    }
  );
}
