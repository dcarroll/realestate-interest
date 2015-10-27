import * as lightningOut from './lightning-out-es6';

// Config vars area
let config = { 
	appId: "3MVG9SemV5D80oBfwImbjmCUOooxcQA5IOWhAPpgu5tZTe09L944U1N9rqfHev_RHMAu5BMPvkG7_nKbpV8M2", 
	loApp: "c:HouseExplorerLOApp",
	targetElementId: "lightning"
}; 

let _lightningReady = false;

export let createComponent = (type, attributes, locator, callback) => {
	lightningOut.createComponent(type, attributes, locator, callback);
};

export let setupLightning = (callback, oauth) => {
	var appName = config.loApp;
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
		anchor.href = oauth.instance_url;
		var mydomain = anchor.hostname.split(".")[0];
	    var url = anchor.protocol + "//" + mydomain +  ".lightning.force.com"; 
	    lightningOut.use(appName, 
	        function() {
				_lightningReady = true;
				document.getElementById(config.targetElementId).style.display = "";
				if (typeof callback === "function") {
					callback();
				}
	        }, url, oauth.access_token);
	}
}

