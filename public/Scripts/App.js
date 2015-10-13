function forceInit() {
	force.init(config);
};

var config = { 
	appId: "3MVG9SemV5D80oBfwImbjmCUOou.4aPypic3uXz3JXxQq1EKb23HFxjXYt96T9WlOAu.gYwjUCWUvFXj_h4_d", 
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
	    var url = "https://d10-dev-ed.lightning.force.com"; // oauth.instanceUrl.replace("my.salesforce", "lightning.force");

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

