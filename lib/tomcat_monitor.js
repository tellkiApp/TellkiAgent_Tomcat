/**
 * This script was developed by Guberni and is part of Tellki's Monitoring Solution
 *
 * July, 2015
 * 
 * Version 1.0
 *
 * DEPENDENCIES:
 *		jmxterm (http://wiki.cyclopsgroup.org/jmxterm/)
 *
 * DESCRIPTION: Monitor Tomcat metrics
 *
 * SYNTAX: node tomcat_monitor.js <METRIC_STATE> <JMX_HOST> <JMX_PORT> <TYPE> <FILTER> <USERNAME> <PASSWORD>
 * 
 * EXAMPLE: node "tomcat_monitor.js" "XXXXX" "localhost" "1099" "username" "password"
 *
 * README:
 *		<METRIC_STATE> is generated internally by Tellki and it's only used by Tellki default monitors (1 - metric is on ; 0 - metric is off).
 *		<JMX_HOST> hostname or ip where Tomcat JMX is listening
 *		<JMX_PORT> port where Tomcat JMX is listening
 *		<TYPE> Type of monitor to execute
 *		<FILTER> Tomcat object filter
 *		<USERNAME> Tomcat JMX auth username
 *		<PASSWORD> Tomcat JMX auth password
 */

var exec = require('child_process').exec;
var fs = require('fs');

/**
 * Metrics.
 */
var metrics = [];

// Context
metrics.push({ id: '2555:Cache Access:4', 			   state: false, object: 'context', pattern: 'Catalina:context=(.*),host=localhost,type=Cache', 	key: 'accessCount', mbeans: [] });
metrics.push({ id: '2556:Cache Hits:4', 			   state: false, object: 'context', pattern: 'Catalina:context=(.*),host=localhost,type=Cache', 	key: 'hitsCount', mbeans: [] });
metrics.push({ id: '2557:Cache Size:4', 			   state: false, object: 'context', pattern: 'Catalina:context=(.*),host=localhost,type=Cache', 	key: 'cacheSize', mbeans: [] });
metrics.push({ id: '2558:Process Expires Frequency:4', state: false, object: 'context', pattern: 'Catalina:context=(.*),host=localhost,type=Manager', 	key: 'processExpiresFrequency', mbeans: [] });
metrics.push({ id: '2559:Processing Time:4', 		   state: false, object: 'context', pattern: 'Catalina:context=(.*),host=localhost,type=Manager', 	key: 'processingTime', mbeans: [] });

// Connector
metrics.push({ id: '2560:Max Threads:4', 		  state: false, object: 'connector', pattern: 'Catalina:name=\"(.*)\",type=ThreadPool', 			key: 'maxThreads', mbeans: [] });
metrics.push({ id: '2561:Current Thread Count:4', state: false, object: 'connector', pattern: 'Catalina:name=\"(.*)\",type=ThreadPool', 			key: 'currentThreadCount', mbeans: [] });
metrics.push({ id: '2562:Current Threads Busy:4', state: false, object: 'connector', pattern: 'Catalina:name=\"(.*)\",type=ThreadPool', 			key: 'currentThreadsBusy', mbeans: [] });
metrics.push({ id: '2563:Bytes Sent:4',			  state: false, object: 'connector', pattern: 'Catalina:name=\"(.*)\",type=GlobalRequestProcessor', key: 'bytesSent', mbeans: [] });
metrics.push({ id: '2564:Bytes Received:4', 	  state: false, object: 'connector', pattern: 'Catalina:name=\"(.*)\",type=GlobalRequestProcessor', key: 'bytesReceived', mbeans: [] });
metrics.push({ id: '2565:Error Count:4', 		  state: false, object: 'connector', pattern: 'Catalina:name=\"(.*)\",type=GlobalRequestProcessor', key: 'errorCount', mbeans: [] });
metrics.push({ id: '2566:Request Count:4', 		  state: false, object: 'connector', pattern: 'Catalina:name=\"(.*)\",type=GlobalRequestProcessor', key: 'requestCount', mbeans: [] });
metrics.push({ id: '2567:Max Time:4', 			  state: false, object: 'connector', pattern: 'Catalina:name=\"(.*)\",type=GlobalRequestProcessor', key: 'maxTime', mbeans: [] });
metrics.push({ id: '2568:Processing Time:4', 	  state: false, object: 'connector', pattern: 'Catalina:name=\"(.*)\",type=GlobalRequestProcessor', key: 'processingTime', mbeans: [] });

// WebModule
metrics.push({ id: '2569:JSP Count:4', 			state: false, object: 'webmodule', pattern: 'Catalina:J2EEApplication=none,J2EEServer=none,WebModule=(.*),name=jsp,type=JspMonitor', key: 'jspCount', mbeans: [] });
metrics.push({ id: '2570:JSP Reload Count:4', 	state: false, object: 'webmodule', pattern: 'Catalina:J2EEApplication=none,J2EEServer=none,WebModule=(.*),name=jsp,type=JspMonitor', key: 'jspReloadCount', mbeans: [] });
metrics.push({ id: '2571:JSP Unload Count:4', 	state: false, object: 'webmodule', pattern: 'Catalina:J2EEApplication=none,J2EEServer=none,WebModule=(.*),name=jsp,type=JspMonitor', key: 'jspUnloadCount', mbeans: [] });



var ExecTemplates = {
	CmdBeans : "echo beans | java -jar jmxterm.jar -l {HOSTNAME}:{PORT} -v silent -n",
	CmdBeansAuth : "echo beans | java -jar jmxterm.jar -l {HOSTNAME}:{PORT} -v silent -n -u {USERNAME} -p {PASSWORD}",
	
	Cmd : "java -jar jmxterm.jar -l {HOSTNAME}:{PORT} -n -i {FILE}",
	CmdAuth : "java -jar jmxterm.jar -l {HOSTNAME}:{PORT} -n -u {USERNAME} -p {PASSWORD} -i {FILE}",
	
	CmdGet : "get -b {MBEAN}\n"
};

/**
 * Entry point
 */
(function() {
	try
	{
		monitorInput(process.argv.slice(2));
	}
	catch (err)
	{	
		if (err instanceof InvalidParametersNumberError)
		{
			console.log(err.message);
			process.exit(err.code);
		}
		else
		{
			console.log(err.message);
			process.exit(1);
		}
	}
}).call(this)


/**
 * Verify number of passed arguments into the script.
 */
function monitorInput(args)
{
	if (args.length != 7)
	{
		throw new InvalidParametersNumberError();
	}		

	monitorInputProcess(args);
}


/*
* Process the passed arguments and send them to monitor execution (monitorICMP)
* Receive: arguments to be processed
*/
function monitorInputProcess(args)
{
	var cleanArgs = [];
	for (var k = 0; k < args.length; k++)
		cleanArgs.push(args[k].replace(/\"/g, ''));

  	//<METRIC_STATE>
  	var tokens = args[0].replace('"', '').split(',');

	//<HOST> 
	var hostname = args[1];
	
	//<PORT>
	var port = args[2];

	//<TYPE>
	var type = args[3];

	// <FILTER>
	var filter = cleanArgs[4] === 0 ? [] : cleanArgs[4].split(';');

	// <USERNAME>
	var username = cleanArgs[5];
	username = (username === '') ? null : username;

	// <PASSWORD>
	var password = cleanArgs[6];
	password = (password === '') ? null : password;
	 
	// Handle metric state.
	type = mapType(type);
  	for (var i = 0, j = 0; i < metrics.length; i++)
  	{
  		if (metrics[i].object === type)
  		{
    		metrics[i].state = (tokens[j] === '1');
    		j++;
  		}
  	}

	// Create snmp target object.
	var request = new Object();
	request.hostname = hostname;
	request.port = port;
	request.type = type;
	request.filter = filter;
	request.username = username;
	request.password = password;

	// Call monitor.
	monitor(request);
}

/**
 * Map integer type to object.
 */
function mapType(type)
{
	if (type === '1')
		return 'context';
	else if (type === '2')
		return 'connector';
	else if (type === '3')
		return 'webmodule';

	return null;
}

// ### MAIN

/**
 * Retrieve metrics information
 */
function monitor(request)
{
	var cmd = createExecCmdBeans(request);

	exec(cmd, { timeout: 20000 }, function (error, stdout, stderr) {

		if (error !== undefined && error !== null && error !== '')
		{
			console.log(error);
			errorHandler(new MetricNotFoundError());
		}

		var lines = stdout.trim().split('\n');

		for (var j = 0; j < metrics.length; j++)
		{
			var metric = metrics[j];

			if (metric.object === request.type && metric.state)
			{
				for (var i = 0; i < lines.length; i++)
				{
					var line = lines[i];
					var result = line.match(metric.pattern);

					if (result !== null)
					{
						var mbean = line.trim() + ' ' + metric.key;
						metric.mbeans.push(mbean);
					}
				}
			}
		}

		var getCmds = '';

		for (var i = 0; i < metrics.length; i++)
		{
			var metric = metrics[i];
			
			for (var j = 0; j < metric.mbeans.length; j++)
			{
				var mbean = metric.mbeans[j];
				var cmd = ExecTemplates.CmdGet;
				cmd = cmd.replace(/{MBEAN}/g, mbean);
				getCmds += cmd;
			}
		}

		execCmd(getCmds, request);
	});
}

/**
 * Execute jmxterm command.
 */
function execCmd(getCmds, request)
{
	var filename = 'cmds.' + (Math.floor(Math.random() * 1e9));

	fs.writeFile(filename, getCmds, function(err) {
    	if (err)
		{
			console.log(err);
			errorHandler(new MetricNotFoundError());
		}

    	var cmd = createExecCmd(filename, request);
		exec(cmd, { timeout: 20000 }, function (error, stdout, stderr) {
			fs.unlink(filename, function(){});

			if (error !== undefined && error !== null && error !== '')
			{
				console.log(error);
				errorHandler(new MetricNotFoundError());
			}

			parseOutput(stdout.trim(), stderr.trim(), request);
		});
	}); 
}

/**
 * Parse jmxterm output.
 */
function parseOutput(values, mbeans, request)
{
	values = values.replace(/\r/g, '');
	mbeans = mbeans.replace(/\r/g, '');
	
	values = values.split('\n');
	mbeans = mbeans.split('\n');
	mbeans.shift();

	// Remove empty elements.
	for (var i = 0; i < values.length; i++)
	{
		if (values[i] === '')
		{
			values.splice(i, 1); // Remove.
			i--;
		}
	}

	// Check if the count of values an mbeans match.
	if (values.length !== mbeans.length)
	{
		errorHandler(new MetricNotFoundError());
	}

	// Pair values with mbeans.
	var data = [];
	for (var i = 0; i < mbeans.length; i++)
	{
		// Clean value.
		values[i] = values[i].replace(';', '');
		values[i] = values[i].replace(' = ', ' ');
		var tokens = values[i].split(' ');
		var key = tokens[0];
		values[i]  = tokens[1];
		
		// Clean mbeans.
		mbeans[i] = mbeans[i].replace('#mbean = ', '');
		mbeans[i] = mbeans[i].substring(0, mbeans[i].length - 1);
		mbeans[i] = mbeans[i].trim();

		// Match values with metrics.
		var metric = null;
		var object = null;

		for (var j = 0; j < metrics.length; j++)
		{
			var res = mbeans[i].match(metrics[j].pattern);
			if (res != null && metrics[j].key === key)
			{
				metric = metrics[j];
				if (metric.object !== null)
					object = res[1];
				break;
			}
		}

		if (metric === null)
		{
			errorHandler(new MetricNotFoundError());
		}

		if (match(object, request.filter))
		{
			data.push({
				value: values[i],
				id: metric.id,
				object: object
			});
		}
	}

	output(data);
}

/**
 * Match a value against a list of strings.
 */
function match(matchValue, matchList)
{
  if (matchList.length === 0 || matchValue === null)
    return true;
  
  for (var i = 0; i < matchList.length; i++)
  {
    var match = matchList[i];
    
    if (matchValue.trim().toLowerCase().indexOf(match.trim().toLowerCase()) !== -1)
    {
      return true;
    }
  }
  
  return false;
}

/**
 * Create jmxterm command to get all beans.
 */
function createExecCmdBeans(request)
{
	var cmdKey = 'CmdBeans' + (request.username === null ? '' : 'Auth');
	var cmd = ExecTemplates[cmdKey];

	cmd = cmd.replace(/{HOSTNAME}/g, request.hostname);
	cmd = cmd.replace(/{PORT}/g, request.port);
	cmd = cmd.replace(/{USERNAME}/g, request.username);
	cmd = cmd.replace(/{PASSWORD}/g, request.password);

	return cmd;
}

/**
 * Create jmxterm command to get values.
 */
function createExecCmd(file, request)
{
	var cmdKey = 'Cmd' + (request.username === null ? '' : 'Auth');
	var cmd = ExecTemplates[cmdKey];

	cmd = cmd.replace(/{HOSTNAME}/g, request.hostname);
	cmd = cmd.replace(/{PORT}/g, request.port);
	cmd = cmd.replace(/{USERNAME}/g, request.username);
	cmd = cmd.replace(/{PASSWORD}/g, request.password);
	cmd = cmd.replace(/{FILE}/g, file);

	return cmd;
}

// ### OUTPUT

/**
 * Send metrics to console
 * Receive: metrics list to output
 */
function output(metrics)
{
	var out = "";
	
	for (var i in metrics)
	{
		var metric = metrics[i];
		
		out += metric.id;
		out += "|";
		out += metric.value;
		out += "|";
		out += metric.object === null ? '' : metric.object;
		out += "|";
			
		if (i < metrics.length - 1)
		{
			out += "\n";
		}
	}
	
	console.log(out);
}

// ### ERROR HANDLER

/**
 * Used to handle errors of async functions
 * Receive: Error/Exception
 */
function errorHandler(err)
{
if (err instanceof MetricNotFoundError)
	{
		console.log(err.message);
		process.exit(err.code);
	}
	else
	{
		console.log(err.message);
		process.exit(1);
	}
}

// ### EXCEPTIONS

// InvalidParametersNumberError
function InvalidParametersNumberError() {
    this.name = "InvalidParametersNumberError";
    this.message = "Wrong number of parameters.";
	this.code = 3;
}
InvalidParametersNumberError.prototype = Object.create(Error.prototype);
InvalidParametersNumberError.prototype.constructor = InvalidParametersNumberError;

// MetricNotFoundError
function MetricNotFoundError() {
    this.name = "MetricNotFoundError";
    this.message = "";
	this.code = 8;
}
MetricNotFoundError.prototype = Object.create(Error.prototype);
MetricNotFoundError.prototype.constructor = MetricNotFoundError;
