function forceInit() {
	force.init(config);
};

var config = { 
	appId: "3MVG9SemV5D80oBfwImbjmCUOooxcQA5IOWhAPpgu5tZTe09L944U1N9rqfHev_RHMAu5BMPvkG7_nKbpV8M2", 
	loApp: "c:HouseExplorerLOApp",
	targetElementId: "lightning"
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
		var anchor = document.createElement('a');
		anchor.href = oauth.instanceUrl;
		var mydomain = anchor.hostname.split(".")[0];
	    var url = anchor.protocol + "//" + mydomain +  ".lightning.force.com"; 
	    $Lightning.use(appName, 
	        function() {
				_lightningReady = true;
				document.getElementById(targetElementId).style.display = "";
				if (typeof callback === "function") {
					callback();
				}
	        }, url, oauth.access_token);
	}
}

