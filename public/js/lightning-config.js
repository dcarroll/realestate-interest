function forceInit() {
	force.init(config);
};

var config = { 
	appId: "3MVG9SemV5D80oBfwImbjmCUOooxcQA5IOWhAPpgu5tZTe09L944U1N9rqfHev_RHMAu5BMPvkG7_nKbpV8M2", 
	loApp: "c:HouseExplorerLOApp" 
}; 

var _lightningReady = false;

function setupLightning(callback) {
	var appName = config.loApp;
	var oauth = force.getOauth();
    if (!oauth) {
        alert("Please login to Salesforce.com first!");
        return;
    }

	if (_lightningReady) {
		if (typeof callback === "function") {
			callback();
		}
	} else {
	    // Transform the URL for Lightning
		var url = document.createElement('a');
		url.href = oauth.instanceUrl;
		var host = url.hostname;
		var mydomain = host.split(".")[0];
	    url = url.protocol + "//" + mydomain +  ".lightning.force.com"; // oauth.instanceUrl.replace("my.salesforce", "lightning.force");
		console.log("Instance url: " + url);
	    $Lightning.use(appName, 
	        function() {
				_lightningReady = true;
				document.getElementById("lightning").style.display = "";
				if (typeof callback === "function") {
					callback();
				}
	        }, url, oauth.access_token);
	}
}

