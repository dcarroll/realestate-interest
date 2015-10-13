﻿/**
 * ForceJS - REST toolkit for Salesforce.com
 * Version: 0.1
 *
 * Cut-down version with a few changes to expose the oauth bits, and to remove the REST call support
 */
var force = (function () {

    // The login url
    var loginUrl = 'https://login.salesforce.com',

    // The instance url, needed until pattern for my domains, etc. is determined
    instanceUrl = null,

    // The Connected App client Id
    appId,

    // The force.com API version to use. Default can be overriden in login()
    apiVersion = 'v34.0',

    // Keep track of OAuth data (mainly access_token and refresh_token)
    oauth,

    // Only required when using REST APIs in an app hosted on your own server to avoid cross domain policy issues
    proxyURL,

    // By default we store fbtoken in sessionStorage. This can be overridden in init()
    tokenStore = {},

    // if page URL is http://localhost:3000/myapp/index.html, context is /myapp
    context = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")),

    // if page URL is http://localhost:3000/myapp/index.html, baseURL is http://localhost:3000/myapp
    baseURL = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + context,

    // Added callbackUrl to account for changes
    callbackUrl = '/oauthcallback.html',

    // if page URL is http://localhost:3000/myapp/index.html, oauthRedirectURL is http://localhost:3000/myapp/oauthcallback.html
    oauthRedirectURL = baseURL + callbackUrl,

    // Because the OAuth login spans multiple processes, we need to keep the login success and error handlers as a variables
    // inside the module instead of keeping them local within the login function.
    loginSuccessHandler,
    loginErrorHandler,

    // Used in loginWindow_exitHandler (Cordova only) to identify if the InAppBrowser window is closing because the OAuth process completed or because the use closed it manually without completing the OAuth process
    loginProcessed,

    // Indicates if the app is running inside Cordova
    runningInCordova;


    document.addEventListener("deviceready", function () {
        runningInCordova = true;
    }, false);

    /**
     * Initialize ForceJS
     * @param params
     *  appId (required)
     *  apiVersion (optional)
     *  proxyURL (optional)
     */
    function init(params) {
        if (params.appId) {
            appId = params.appId;
        }
        if (params.loginUrl) {
            loginUrl = params.loginUrl;
        }
        if (params.instanceUrl) {
            instanceUrl = params.instanceUrl;
        }
        if (params.callbackUrl) {
            callbackUrl = params.callbackUrl;
            oauthRedirectURL = baseURL + callbackUrl;
        }
        if (params.accessToken) {
            oauth = {access_token: params.accessToken};
            oauth.instance_url = params.instanceURL || location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');
            oauth.refresh_token = params.refreshToken;
        }
        apiVersion = params.apiVersion || apiVersion;
        tokenStore = params.tokenStore || tokenStore;
        oauthRedirectURL = params.oauthRedirectURL || oauthRedirectURL;
        proxyURL = params.proxyURL || proxyURL;

        // Load previously saved token
        if (tokenStore['forceOAuth']) {
			oauth = app._settings.get("oauth");
            oauth = JSON.parse(tokenStore['forceOAuth']);
        }
    }

    /**
     * Login to Salesforce using OAuth. If running in a Browser, the OAuth workflow happens in a a popup window.
     * If running in Cordova container, it happens using the In-App Browser. Don't forget to install the In-App Browser
     * plugin in your Cordova project: cordova plugins add org.apache.cordova.inappbrowser.
     * @param success - function to call back when login succeeds
     * @param error - function to call back when login fails
     */
    function login(success, error) {

        var loginWindow,
            startTime;

        if (!appId) {
            throw 'appId parameter not set in init()';
        }

        loginSuccessHandler = success || loginSuccessHandler;
        loginErrorHandler = error || loginErrorHandler;

        loginProcessed = true;

        // Inappbrowser load start handler: Used when running in Cordova only
        function loginWindow_loadStartHandler(event) {
            var url = event.url;
            if (url.indexOf("access_token=") > 0 || url.indexOf("error=") > 0) {
                loginProcessed = true;
                // When we get the access token fast, the login window (inappbrowser) is still opening with animation
                // in the Cordova app, and trying to close it while it's animating generates an exception. Wait a little...
                var timeout = 700 - (new Date().getTime() - startTime);
                setTimeout(function () {
                    loginWindow.close();
                    oauthCallback(url);
                }, timeout > 0 ? timeout : 0);
            }
        }

        function loginWindow_loadStopHandler(event) {
            // Hack to fix UI of OAuth dialog on iPhone 4 and 5. Untested on other platforms.
            loginWindow.insertCSS({code:"#left_side{width:300px;} #content {width:240px;}"});
        }

        // Inappbrowser exit handler: Used when running in Cordova only
        function loginWindow_exitHandler() {
            // Handle the situation where the user closes the login window manually before completing the login process
            if (!loginProcessed && loginErrorHandler) {
                loginErrorHandler({error: 'user_cancelled', error_description: 'User cancelled login process', error_reason: "user_cancelled"});
            }
            loginWindow.removeEventListener('loadstart', loginWindow_loadStartHandler);
            loginWindow.removeEventListener('loadstop', loginWindow_loadStopHandler);
            loginWindow.removeEventListener('exit', loginWindow_exitHandler);
            loginWindow = null;
        }

        startTime = new Date().getTime();
		var left = (screen.width/2)-(486/2);
		var top = (screen.height/2)-(734/2);
		oauth = app._settings.get("oauth");
		if (oauth === undefined) {
			oauth = {};
		}
		if (oauth.access_token === undefined) {
	        loginWindow = window.open(loginUrl + '/services/oauth2/authorize?client_id=' + appId + '&redirect_uri=' + oauthRedirectURL +
	            '&response_type=token&display=popup', '_blank', 'location=no, width=476, height=734, resizeable=no, top=' + top + ', left=' + left);
	
	        // If the app is running in Cordova, listen to URL changes in the InAppBrowser until we get a URL with an access_token or an error
	        if (runningInCordova) {
	            loginWindow.addEventListener('loadstart', loginWindow_loadStartHandler);
	            loginWindow.addEventListener('loadstop', loginWindow_loadStopHandler);
	            loginWindow.addEventListener('exit', loginWindow_exitHandler);
	        }
		} else {
			            if (loginSuccessHandler) loginSuccessHandler();
		}
        // Note: if the app is running in the browser the loginWindow dialog will call back by invoking the
        // oauthCallback() function. See oauthcallback.html for details.
    }

    /**
     * Called internally either by oauthcallback.html (when the app is running the browser) or by the loginWindow loadstart event
     * handler defined in the login() function (when the app is running in the Cordova/PhoneGap container).
     * @param url - The oauthRedictURL called by Salesforce at the end of the OAuth workflow. Includes the access_token in the querystring
     */
    function oauthCallback(url) {

        // Parse the OAuth data received from Salesforce
        var queryString,
            obj;

        if (url.indexOf("access_token=") > 0) {
            queryString = url.substr(url.indexOf('#') + 1);
            obj = parseQueryString(queryString);
            obj.instanceUrl = instanceUrl || obj.instance_url;
            oauth = obj;
            tokenStore['forceOAuth'] = JSON.stringify(oauth);
			app.saveSetting("oauth", oauth);
            if (loginSuccessHandler) loginSuccessHandler();
        } else if (url.indexOf("error=") > 0) {
            queryString = decodeURIComponent(url.substring(url.indexOf('?') + 1));
            obj = parseQueryString(queryString);
            if (loginErrorHandler) loginErrorHandler(obj);
        } else {
            if (loginErrorHandler) loginErrorHandler({status: 'access_denied'});
        }
    }

    /**
     * Check the login status
     * @returns {boolean}
     */
    function isLoggedIn() {
        return (oauth && oauth.access_token) ? true : false;
    }

    /**
     * Lets you make any Salesforce REST API request.
     * @param obj - Request configuration object. Can include:
     *  method:  HTTP method: GET, POST, etc. Optional - Default is 'GET'
     *  path:    path in to the Salesforce endpoint - Required
     *  params:  queryString parameters as a map - Optional
     *  data:  JSON object to send in the request body - Optional
     * @param success - function to call back when request succeeds - Optional
     * @param error - function to call back when request fails - Optional
     */
    function request(obj, success, error) {

        if (!oauth || (!oauth.access_token && !oauth.refresh_token)) {
            if (error) {
                error('No access token. Login and try again.');
            }
            return;
        }

        var method = obj.method || 'GET',
            xhr = new XMLHttpRequest(),
            url = proxyURL ? proxyURL : oauth.instance_url;

        // dev friendly API: Remove trailing '/' if any so url + path concat always works
        if (url.slice(-1) === '/') {
            url = url.slice(0, -1);
        }

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
                    if (success) success(xhr.responseText ? JSON.parse(xhr.responseText) : undefined);
                } else if (xhr.status === 401) {
                    refreshToken(
                        function () {
                            // Try again with the new token
                            request(obj, success, error);
                        },
                        function () {
                            console.error(xhr.responseText);
                            var error = xhr.responseText ? JSON.parse(xhr.responseText) : {message: 'An error has occurred'};
                            if (error) error(error);
                        }
                    );
                } else {
                    console.error(xhr.responseText);
                    var errorObj = xhr.responseText ? JSON.parse(xhr.responseText) : {message: 'An error has occurred'};
                    if (error) error(errorObj);
                }
            }
        };


        xhr.open(method, url, true);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Authorization", "Bearer " + oauth.access_token);
        if (obj.contentType) {
            xhr.setRequestHeader("Content-Type", obj.contentType);
        }
        if (proxyURL) {
            xhr.setRequestHeader("Target-URL", oauth.instance_url);
        }
        xhr.send(obj.data ? JSON.stringify(obj.data) : undefined);
    }

    function refreshToken(success, error) {
        var oauthPlugin = cordova.require("com.salesforce.plugin.oauth");
        if (oauthPlugin) {
            refreshTokenWithPlugin(oauthPlugin, success, error);
        } else {
            refreshTokenWithHTTPRequest(success, error);
        }
    }

    function refreshTokenWithPlugin(oauthPlugin, success, error) {

        oauthPlugin.authenticate(
            function(response) {
                oauth.access_token = response.accessToken;
                tokenStore['forceOAuth'] = JSON.stringify(oauth);
				app.saveSetting("oauth", oauth);
				Office.context.document.settings.set('oauth', oauth);
                if (success) success();
            },
            function() {
                console.error('Error refreshing oauth access token using the oauth plugin');
                if (error) error();
            });
    }

    function refreshTokenWithHTTPRequest(success, error) {

        if (!oauth.refresh_token) {
            console.error('ERROR: refresh token does not exist');
            if (error) error();
            return;
        }

        var xhr = new XMLHttpRequest(),

            params = {
                'grant_type': 'refresh_token',
                'refresh_token': oauth.refresh_token,
                'client_id': appId
            };

        var url = proxyURL ? proxyURL : loginUrl;

        url = url + '/services/oauth2/token?' + toQueryString(params);

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Token refreshed');
                    var res = JSON.parse(xhr.responseText);
                    oauth.access_token = res.access_token;
                    tokenStore['forceOAuth'] = JSON.stringify(oauth);
                    if (success) success();
                } else {
                    console.log('Error while trying to refresh token');
                    console.log(xhr.responseText);
                    if (error) error();
                }
            }
        };

        xhr.open('POST', url, true);
        if (proxyURL) {
            xhr.setRequestHeader("Target-URL", loginUrl);
        }
        xhr.send();
    }

    /**
     * Discard the OAuth access_token. Use this function to test the refresh token workflow.
     */
    function discardToken() {
        delete oauth.access_token;
        tokenStore['forceOAuth'] = JSON.stringify(oauth);
		app.saveSetting("oauth", oauth);
    }

    function parseQueryString(queryString) {
        var qs = decodeURIComponent(queryString),
            obj = {},
            params = qs.split('&');
        params.forEach(function (param) {
            var splitter = param.split('=');
            obj[splitter[0]] = splitter[1];
        });
        return obj;
    }

    function toQueryString(obj) {
        var parts = [];
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
            }
        }
        return parts.join("&");
    }

    function invalidateToken() {
        oauth.access_token = undefined;
    }

    // Needed to expose to Lightning Out!
    function getOauth() {
        return oauth;
    }

    // The public API
    return {
        init: init,
        login: login,
        isLoggedIn: isLoggedIn,
        request: request,
        discardToken: discardToken,
        oauthCallback: oauthCallback,
        invalidateToken: invalidateToken,
        getOauth: getOauth // Needed to expose to Lightning Out!
    };

}());
