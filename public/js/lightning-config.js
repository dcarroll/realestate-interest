import * as lightningOut from 'lightning-out-es6';

// Config vars area
// vars are loApp - name of the lightning out app
// targetElementId - Id of the element in which to render the app
let lightningOutConfig;

export let init = (config) => {
	if (!config) {
		throw new ReferenceError("Missing config for 'init' function.", "lightning-config.js", 9);
	} else if (!config.loApp) {
		throw new ReferenceError("Missing lightning out application paramater (loApp).", "lightning-config.js", 9);
	} else if (!config.targetElementId) {
		throw new ReferenceError("Missing target element id paramater (targetElementId).", "lightning-config.js", 9);
	} else {
		lightningOutConfig = config;
	}
}

let _lightningReady = false;

export let createComponent = (type, attributes, locator, callback) => {
	if (lightningOutConfig) {
		lightningOut.createComponent(type, attributes, locator, callback);
	} else {
		throw new ReferenceError("Missing config for lightning out.", "lightning-config.js", 25);
	}
};

export let setupLightning = (callback, oauth) => {
	if (lightningOutConfig) {
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
	} else {
		throw new ReferenceError("Missing config for lightning out.", "lightning-config.js", 32);
	}
}

