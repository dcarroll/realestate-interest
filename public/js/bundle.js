(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * ForceJS - REST toolkit for Salesforce.com
 * Author: Christophe Coenraets @ccoenraets
 * Version: 0.7.2
 */
"use strict";

Object.defineProperty(exports, '__esModule', {
    value: true
});
var // The login URL for the OAuth process
// To override default, pass loginURL in init(props)
loginURL = 'https://login.salesforce.com',

// The Connected App client Id. Default app id provided - Not for production use.
// This application supports http://localhost:8200/oauthcallback.html as a valid callback URL
// To override default, pass appId in init(props)
appId = '3MVG9fMtCkV6eLheIEZplMqWfnGlf3Y.BcWdOf1qytXo9zxgbsrUbS.ExHTgUPJeb3jZeT8NYhc.hMyznKU92',

// The force.com API version to use.
// To override default, pass apiVersion in init(props)
apiVersion = 'v35.0',

// Keep track of OAuth data (access_token, refresh_token, and instance_url)
oauth = undefined,

// By default we store fbtoken in sessionStorage. This can be overridden in init()
tokenStore = {},

// if page URL is http://localhost:3000/myapp/index.html, context is /myapp
context = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")),

// if page URL is http://localhost:3000/myapp/index.html, serverURL is http://localhost:3000
serverURL = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : ''),

// if page URL is http://localhost:3000/myapp/index.html, baseURL is http://localhost:3000/myapp
baseURL = serverURL + context,

// Only required when using REST APIs in an app hosted on your own server to avoid cross domain policy issues
// To override default, pass proxyURL in init(props)
proxyURL = baseURL,

// if page URL is http://localhost:3000/myapp/index.html, oauthCallbackURL is http://localhost:3000/myapp/oauthcallback.html
// To override default, pass oauthCallbackURL in init(props)
oauthCallbackURL = baseURL + '/oauthcallback.html',

// Reference to the Salesforce OAuth plugin
oauthPlugin = undefined,

// Whether or not to use a CORS proxy. Defaults to false if app running in Cordova, in a VF page,
// or using the Salesforce console. Can be overriden in init()
useProxy = window.cordova || window.SfdcApp || window.sforce ? false : true;

/*
 * Determines the request base URL.
 */
var getRequestBaseURL = function getRequestBaseURL() {

    var url = undefined;

    if (useProxy) {
        url = proxyURL;
    } else if (oauth.instance_url) {
        url = oauth.instance_url;
    } else {
        url = serverURL;
    }

    // dev friendly API: Remove trailing '/' if any so url + path concat always works
    if (url.slice(-1) === '/') {
        url = url.slice(0, -1);
    }

    return url;
};

var parseQueryString = function parseQueryString(queryString) {
    var qs = decodeURIComponent(queryString),
        obj = {},
        params = qs.split('&');
    params.forEach(function (param) {
        var splitter = param.split('=');
        obj[splitter[0]] = splitter[1];
    });
    return obj;
};

var toQueryString = function toQueryString(obj) {
    var parts = [],
        i = undefined;
    for (i in obj) {
        if (obj.hasOwnProperty(i)) {
            parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
        }
    }
    return parts.join("&");
};

var refreshTokenWithPlugin = function refreshTokenWithPlugin() {

    return new Promise(function (resolve, reject) {
        oauthPlugin.authenticate(function (response) {
            oauth.access_token = response.accessToken;
            tokenStore.forceOAuth = JSON.stringify(oauth);
            resolve();
        }, function () {
            console.error('Error refreshing oauth access token using the oauth plugin');
            reject();
        });
    });
};

var refreshTokenWithHTTPRequest = function refreshTokenWithHTTPRequest() {
    return new Promise(function (resolve, reject) {

        if (!oauth.refresh_token) {
            console.log('ERROR: refresh token does not exist');
            reject();
            return;
        }

        var xhr = new XMLHttpRequest(),
            params = {
            'grant_type': 'refresh_token',
            'refresh_token': oauth.refresh_token,
            'client_id': appId
        },
            url = useProxy ? proxyURL : loginURL;

        url = url + '/services/oauth2/token?' + toQueryString(params);

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Token refreshed');
                    var res = JSON.parse(xhr.responseText);
                    oauth.access_token = res.access_token;
                    tokenStore.forceOAuth = JSON.stringify(oauth);
                    resolve();
                } else {
                    console.log('Error while trying to refresh token: ' + xhr.responseText);
                    reject();
                }
            }
        };

        xhr.open('POST', url, true);
        if (!useProxy) {
            xhr.setRequestHeader("Target-URL", loginURL);
        }
        xhr.send();
    });
};

var refreshToken = function refreshToken() {
    if (oauthPlugin) {
        return refreshTokenWithPlugin(oauthPlugin);
    } else {
        return refreshTokenWithHTTPRequest();
    }
};

var joinPaths = function joinPaths(path1, path2) {
    if (path1.charAt(path1.length - 1) !== '/') path1 = path1 + "/";
    if (path2.charAt(0) === '/') path2 = path2.substr(1);
    return path1 + path2;
};

/**
 * Initialize ForceJS
 * @param params
 *  appId (optional)
 *  loginURL (optional)
 *  proxyURL (optional)
 *  oauthCallbackURL (optional)
 *  apiVersion (optional)
 *  accessToken (optional)
 *  instanceURL (optional)
 *  refreshToken (optional)
 */
var init = function init(params) {

    if (params) {
        appId = params.appId || appId;
        apiVersion = params.apiVersion || apiVersion;
        loginURL = params.loginURL || loginURL;
        oauthCallbackURL = params.oauthCallbackURL || oauthCallbackURL;
        proxyURL = params.proxyURL || proxyURL;
        useProxy = params.useProxy === undefined ? useProxy : params.useProxy;

        if (params.accessToken) {
            if (!oauth) oauth = {};
            oauth.access_token = params.accessToken;
        }

        if (params.instanceURL) {
            if (!oauth) oauth = {};
            oauth.instance_url = params.instanceURL;
        }

        if (params.refreshToken) {
            if (!oauth) oauth = {};
            oauth.refresh_token = params.refreshToken;
        }
    }

    console.log("useProxy: " + useProxy);
};

exports.init = init;
/**
 * Discard the OAuth access_token. Use this function to test the refresh token workflow.
 */
var discardToken = function discardToken() {
    delete oauth.access_token;
    tokenStore.forceOAuth = JSON.stringify(oauth);
};

exports.discardToken = discardToken;
/**
 * Login to Salesforce using OAuth. If running in a Browser, the OAuth workflow happens in a a popup window.
 * If running in Cordova container, it happens using the Mobile SDK 2.3+ Oauth Plugin
 */
var login = function login() {
    if (window.cordova) {
        return loginWithPlugin();
    } else {
        return loginWithBrowser();
    }
};

exports.login = login;
var loginWithPlugin = function loginWithPlugin() {
    return new Promise(function (resolve, reject) {
        document.addEventListener("deviceready", function () {
            oauthPlugin = cordova.require("com.salesforce.plugin.oauth");
            if (!oauthPlugin) {
                console.error('Salesforce Mobile SDK OAuth plugin not available');
                reject('Salesforce Mobile SDK OAuth plugin not available');
                return;
            }
            oauthPlugin.getAuthCredentials(function (creds) {
                // Initialize ForceJS
                init({
                    accessToken: creds.accessToken,
                    instanceURL: creds.instanceUrl,
                    refreshToken: creds.refreshToken
                });
                resolve();
            }, function (error) {
                console.log(error);
                reject(error);
            });
        }, false);
    });
};

exports.loginWithPlugin = loginWithPlugin;
var loginWithBrowser = function loginWithBrowser() {
    return new Promise(function (resolve, reject) {

        console.log('loginURL: ' + loginURL);
        console.log('oauthCallbackURL: ' + oauthCallbackURL);

        var loginWindowURL = loginURL + '/services/oauth2/authorize?client_id=' + appId + '&redirect_uri=' + oauthCallbackURL + '&response_type=token';

        document.addEventListener("oauthCallback", function (event) {

            // Parse the OAuth data received from Salesforce
            var url = event.detail,
                queryString = undefined,
                obj = undefined;

            if (url.indexOf("access_token=") > 0) {
                queryString = url.substr(url.indexOf('#') + 1);
                obj = parseQueryString(queryString);
                oauth = obj;
                tokenStore.forceOAuth = JSON.stringify(oauth);
                resolve();
            } else if (url.indexOf("error=") > 0) {
                queryString = decodeURIComponent(url.substring(url.indexOf('?') + 1));
                obj = parseQueryString(queryString);
                reject(obj);
            } else {
                reject({ status: 'access_denied' });
            }
        });

        window.open(loginWindowURL, '_blank', 'location=no');
    });
};

exports.loginWithBrowser = loginWithBrowser;
/**
 * Gets the user's ID (if logged in)
 * @returns {string} | undefined
 */
var getUserId = function getUserId() {
    return typeof oauth !== 'undefined' ? oauth.id.split('/').pop() : undefined;
};

exports.getUserId = getUserId;
/**
 * Get the OAuth data returned by the Salesforce login process
 */
var getOAuthResult = function getOAuthResult() {
    return oauth;
};

exports.getOAuthResult = getOAuthResult;
/**
 * Check the login status
 * @returns {boolean}
 */
var isAuthenticated = function isAuthenticated() {
    return oauth && oauth.access_token ? true : false;
};

exports.isAuthenticated = isAuthenticated;
/**
 * Lets you make any Salesforce REST API request.
 * @param obj - Request configuration object. Can include:
 *  method:  HTTP method: GET, POST, etc. Optional - Default is 'GET'
 *  path:    path in to the Salesforce endpoint - Required
 *  params:  queryString parameters as a map - Optional
 *  data:  JSON object to send in the request body - Optional
 */
var request = function request(obj) {
    return new Promise(function (resolve, reject) {

        console.log(oauth);

        if (!oauth || !oauth.access_token && !oauth.refresh_token) {
            reject('No access token. Please login and try again.');
            return;
        }

        var method = obj.method || 'GET',
            xhr = new XMLHttpRequest(),
            url = getRequestBaseURL();

        // dev friendly API: Add leading '/' if missing so url + path concat always works
        if (obj.path.charAt(0) !== '/') {
            obj.path = '/' + obj.path;
        }

        url = url + obj.path;

        if (obj.params) {
            url += '?' + toQueryString(obj.params);
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status > 199 && xhr.status < 300) {
                    resolve(xhr.responseText ? JSON.parse(xhr.responseText) : undefined);
                } else if (xhr.status === 401 && oauth.refresh_token) {
                    refreshToken()
                    // Try again with the new token
                    .then(function () {
                        return request(obj).then(function (data) {
                            return resolve(data);
                        })['catch'](function (error) {
                            return reject(error);
                        });
                    })['catch'](function () {
                        console.error(xhr.responseText);
                        var error = xhr.responseText ? JSON.parse(xhr.responseText) : { message: 'Server error while refreshing token' };
                        reject(error);
                    });
                } else {
                    var error = xhr.responseText ? JSON.parse(xhr.responseText) : { message: 'Server error while executing request' };
                    reject(error);
                }
            }
        };

        xhr.open(method, url, true);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Authorization", "Bearer " + oauth.access_token);
        if (obj.contentType) {
            xhr.setRequestHeader("Content-Type", obj.contentType);
        }
        if (useProxy) {
            xhr.setRequestHeader("Target-URL", oauth.instance_url);
        }
        xhr.send(obj.data ? JSON.stringify(obj.data) : undefined);
    });
};

exports.request = request;
/**
 * Convenience function to execute a SOQL query
 * @param soql
 */
var query = function query(soql) {
    return request({
        path: '/services/data/' + apiVersion + '/query',
        params: { q: soql }
    });
};

exports.query = query;
/**
 * Convenience function to retrieve a single record based on its Id
 * @param objectName
 * @param id
 * @param fields
 */
var retrieve = function retrieve(objectName, id, fields) {
    return request({
        path: '/services/data/' + apiVersion + '/sobjects/' + objectName + '/' + id,
        params: fields ? { fields: fields } : undefined
    });
};

exports.retrieve = retrieve;
/**
 * Convenience function to retrieve picklist values from a SalesForce Field
 * @param objectName
 */
var getPickListValues = function getPickListValues(objectName) {
    return request({
        path: '/services/data/' + apiVersion + '/sobjects/' + objectName + '/describe'
    });
};

exports.getPickListValues = getPickListValues;
/**
 * Convenience function to create a new record
 * @param objectName
 * @param data
 */
var create = function create(objectName, data) {
    return request({
        method: 'POST',
        contentType: 'application/json',
        path: '/services/data/' + apiVersion + '/sobjects/' + objectName + '/',
        data: data
    });
};

exports.create = create;
/**
 * Convenience function to update a record. You can either pass the sobject returned by retrieve or query or a simple JavaScript object.
 * @param objectName
 * @param data The object to update. Must include the Id field.
 */
var update = function update(objectName, data) {

    var id = data.Id || data.id,
        fields = JSON.parse(JSON.stringify(data));

    delete fields.attributes;
    delete fields.Id;
    delete fields.id;

    return request({
        method: 'POST',
        contentType: 'application/json',
        path: '/services/data/' + apiVersion + '/sobjects/' + objectName + '/' + id,
        params: { '_HttpMethod': 'PATCH' },
        data: fields
    });
};

exports.update = update;
/**
 * Convenience function to delete a record
 * @param objectName
 * @param id
 */
var del = function del(objectName, id) {
    return request({
        method: 'DELETE',
        path: '/services/data/' + apiVersion + '/sobjects/' + objectName + '/' + id
    });
};

exports.del = del;
/**
 * Convenience function to upsert a record
 * @param objectName
 * @param externalIdField
 * @param externalId
 * @param data
 */
var upsert = function upsert(objectName, externalIdField, externalId, data) {
    return request({
        method: 'PATCH',
        contentType: 'application/json',
        path: '/services/data/' + apiVersion + '/sobjects/' + objectName + '/' + externalIdField + '/' + externalId,
        data: data
    });
};

exports.upsert = upsert;
/**
 * Convenience function to invoke APEX REST endpoints
 * @param pathOrParams
 */
var apexrest = function apexrest(pathOrParams) {

    var params = undefined;

    if (pathOrParams.substring) {
        params = { path: pathOrParams };
    } else {
        params = pathOrParams;

        if (params.path.charAt(0) !== "/") {
            params.path = "/" + params.path;
        }

        if (params.path.substr(0, 18) !== "/services/apexrest") {
            params.path = "/services/apexrest" + params.path;
        }
    }

    return request(params);
};

exports.apexrest = apexrest;
/**
 * Convenience function to invoke the Chatter API
 * @param pathOrParams
 */
var chatter = function chatter(pathOrParams) {

    var basePath = "/services/data/" + apiVersion + "/chatter";
    var params = undefined;

    if (pathOrParams && pathOrParams.substring) {
        params = { path: joinPaths(basePath, pathOrParams) };
    } else if (pathOrParams && pathOrParams.path) {
        params = pathOrParams;
        params.path = joinPaths(basePath, pathOrParams.path);
    } else {
        return new Promise(function (resolve, reject) {
            return reject("You must specify a path for the request");
        });
    }

    return request(params);
};
exports.chatter = chatter;

},{}],2:[function(require,module,exports){
/* global $Lightning */
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
var _applicationTag;

var _pendingReadyRequests = [],
    _ready = false;

var use = function use(applicationTag, callback, lightningEndPointURI, authToken) {
	if (_applicationTag && _applicationTag !== applicationTag) {
		throw new Error("Lightning.use() already invoked with application: " + _applicationTag);
	}

	if (!_applicationTag) {
		_applicationTag = applicationTag;
		_pendingReadyRequests = [];
		_ready = false;

		var parts = applicationTag.split(":");
		var url = (lightningEndPointURI || "") + "/" + parts[0] + "/" + parts[1] + ".app?aura.format=JSON&aura.formatAdapter=LIGHTNING_OUT";

		var xhr = new XMLHttpRequest();

		xhr.onreadystatechange = function () {
			if (xhr.readyState == 4 && xhr.status == 200) {
				var config = JSON.parse(xhr.responseText);
				var auraInitConfig = config.auraInitConfig;

				addScripts(config.scripts, function () {
					$A.initConfig(auraInitConfig, true);
					lightningLoaded();
				});

				var styles = config.styles;
				for (var n = 0; n < styles.length; n++) {
					addStyle(styles[n]);
				}
			}
		};

		xhr.open("GET", url, true);

		if (authToken) {
			xhr.withCredentials = true;
			xhr.setRequestHeader("Authorization", authToken);
		}

		xhr.send();
	}

	ready(function () {
		// Request labels
		$A.enqueueAction($A.get("c.aura://ComponentController.loadLabels"));
	});

	if (callback) {
		ready(callback);
	}
};

exports.use = use;
var ready = function ready(callback) {
	if (_ready) {
		$A.run(callback);
	} else {
		_pendingReadyRequests.push(callback);
	}
};

var createComponent = function createComponent(type, attributes, locator, callback) {
	// Check to see if we know about the component - enforce aura:dependency
	// is used to avoid silent performance killer
	var unknownComponent;
	try {
		unknownComponent = $A.componentService.getDef(type) === undefined;
	} catch (e) {
		if ("Unknown component: markup://" + type === e.message) {
			unknownComponent = true;
		} else {
			throw e;
		}
	}

	if (unknownComponent) {
		throw new Error("No component definiton for " + type + " in the client registry - add <aura:dependency resource=\"" + type + "\"/> to " + _applicationTag + ".");
	} else {
		$A.run(function () {
			var config = {
				componentDef: "markup://" + type,
				attributes: {
					values: attributes
				}
			};

			$A.createComponent(type, attributes, function (component, status, statusMessage) {
				var error = null;

				var stringLocator = $A.util.isString(locator);
				var hostEl = stringLocator ? document.getElementById(locator) : locator;

				if (!hostEl) {
					error = "Invalid locator specified - " + (stringLocator ? "no element found in the DOM with id=" + locator : "locator element not provided");
				} else if (status !== "SUCCESS") {
					error = statusMessage;
				}

				if (error) {
					throw new Error(error);
				}

				$A.render(component, hostEl);
				$A.afterRender(component);

				if (callback) {
					callback(component);
				}
			});
		});
	}
};

exports.createComponent = createComponent;
var addScripts = function addScripts(urls, onload) {
	var url = urls[0];
	urls = urls.slice(1);

	var script = document.createElement("SCRIPT");
	script.type = "text/javascript";
	script.src = url;

	if (urls.length > 0) {
		script.onload = function () {
			addScripts(urls, onload);
		};
	} else {
		script.onload = onload;
	}

	var head = document.getElementsByTagName("HEAD")[0];
	head.appendChild(script);
};

var addStyle = function addStyle(url) {
	var link = document.createElement("LINK");
	link.href = url;
	link.type = "text/css";
	link.rel = "stylesheet";

	var head = document.getElementsByTagName("HEAD")[0];
	head.appendChild(link);
};

var printMsg = function printMsg() {
	console.log("This is a message from the demo package");
};

exports.printMsg = printMsg;
var lightningLoaded = function lightningLoaded() {
	_ready = true;

	// DCHASMAN TODO Add auraErrorMessage UI - figure out a better way to
	// handle this!
	if (!document.getElementById("auraErrorMessage")) {
		var div = document.createElement("DIV");
		div.id = "auraErrorMessage";
		document.body.appendChild(div);
	}

	for (var n = 0; n < _pendingReadyRequests.length; n++) {
		_pendingReadyRequests[n]();
	}
};
exports.lightningLoaded = lightningLoaded;

},{}],3:[function(require,module,exports){
/* global Office */
// Common app functionality
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _forcejs = require('forcejs');

var forcejs = _interopRequireWildcard(_forcejs);

var _lightningConfig = require('./lightning-config');

var lightning = _interopRequireWildcard(_lightningConfig);

'use strict';

var clearLoginLink = document.getElementById('clearLogin');

var _settings = {};

exports._settings = _settings;
var saveSetting = function saveSetting(name, value) {
	debugger;
	_settings.set(name, value);
	_settings.saveAsync();
};

exports.saveSetting = saveSetting;
var clearLogin = function clearLogin() {
	_settings.remove("forceOAuth");
	_settings.saveAsync();
};

exports.clearLogin = clearLogin;
// Common initialization function (to be called from each page)
var initialize = function initialize(settings) {
	lightning.init();
	exports._settings = _settings = settings;
	if (_settings.get("forceOAuth") != undefined) {
		//localStorage.setItem("forceOAuth", _settings.get("forceOAuth"));
		lightning.setupLightning(createComponent, JSON.parse(_settings.get("forceOAuth")));
	} else {
		forceLogin();
	}
};

exports.initialize = initialize;
var getMessageData = function getMessageData() {
	return Office.cast.item.toItemRead(Office.context.mailbox.item);
};

exports.getMessageData = getMessageData;
var getSenderData = function getSenderData() {
	var item = getMessageData();
	var from;
	if (item.itemType === Office.MailboxEnums.ItemType.Message) {
		from = Office.cast.item.toMessageRead(item).from;
	} else if (item.itemType === Office.MailboxEnums.ItemType.Appointment) {
		from = Office.cast.item.toAppointmentRead(item).organizer;
	}
	return from;
};

exports.getSenderData = getSenderData;
var createComponent = function createComponent() {
	var from = getSenderData();
	lightning.createComponent("c:HouseTab", { contactName: from.emailAddress }, "lightning", function (cmp) {
		// Here we have access to the lightning component we are using
		console.log("Component created");
	});
};

exports.createComponent = createComponent;
var forceLogin = function forceLogin(key) {
	forcejs.init({
		appId: "3MVG9SemV5D80oBfwImbjmCUOooxcQA5IOWhAPpgu5tZTe09L944U1N9rqfHev_RHMAu5BMPvkG7_nKbpV8M2",
		oauthCallbackURL: "https://realestate-interest-test.herokuapp.com/AppRead/oauthcallback",
		useSessionStore: true
	});
	forcejs.login().then(function () {
		saveSetting("forceOAuth", JSON.stringify(forcejs.getOAuthResult()));
		lightning.setupLightning(createComponent, forcejs.getOAuthResult());
	});
};

exports.forceLogin = forceLogin;
clearLoginLink.addEventListener("click", clearLogin);

},{"./lightning-config":5,"forcejs":1}],4:[function(require,module,exports){
/* global $ */
/// <reference path="App.js" />
// global app
'use strict';

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _App = require('./App');

var app = _interopRequireWildcard(_App);

'use strict';

// The Office initialize function must be run each time a new page is loaded
Office.initialize = function (reason) {
    $(document).ready(function () {
        //app._settings = Office.context.roamingSettings;
        app.initialize(Office.context.roamingSettings);
    });
};

function clearLogin() {
    app.clearLogin();
};

function addActivity() {};

},{"./App":3}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _lightningOutEs6 = require('lightning-out-es6');

var lightningOut = _interopRequireWildcard(_lightningOutEs6);

// Config vars area
var lightningOutConfig = {
	loApp: loApp,
	targetElementId: targetElementId
};

var init = function init(config) {
	if (!config) {
		throw new ReferenceError("Missing config for 'init' function.", "lightning-config.js", 9);
	} else if (!config.loApp) {
		throw new ReferenceError("Missing lightning out application paramater (loApp).", "lightning-config.js", 9);
	} else if (!config.targetElementId) {
		throw new ReferenceError("Missing target element id paramater (targetElementId).", "lightning-config.js", 9);
	} else {
		lightningOutConfig = config;
	}
};

exports.init = init;
var _lightningReady = false;

var createComponent = function createComponent(type, attributes, locator, callback) {
	if (lightningOutConfig) {
		lightningOut.createComponent(type, attributes, locator, callback);
	} else {
		throw new ReferenceError("Missing config for lightning out.", "lightning-config.js", 25);
	}
};

exports.createComponent = createComponent;
var setupLightning = function setupLightning(callback, oauth) {
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
			var url = anchor.protocol + "//" + mydomain + ".lightning.force.com";
			lightningOut.use(appName, function () {
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
};
exports.setupLightning = setupLightning;

},{"lightning-out-es6":2}]},{},[5,3,4]);
