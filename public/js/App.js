/* global Office */
// Common app functionality
import * as forcejs from './force';
import * as lightning from './lightning-config';

'use strict';

let clearLoginLink = document.getElementById('clearLogin')

let oauth = {};
export let _settings = {};

export let saveSetting = (name, value) => {
	debugger;
	_settings.set(name, value);
	_settings.saveAsync();
};

var clearLogin = () => {
	_settings.remove("oauth");
	_settings.saveAsync();
};

// Common initialization function (to be called from each page)
export let initialize = (settings) => {
	console.log("app.initialize 2");
	_settings = settings;
	if (_settings.get("oauth") != undefined) {
		oauth = _settings.get("oauth");
		lightningConfig.setupLightning(createComponent, JSON.parse(oauth.forceOAuth));
	} else {
		forceLogin();
	}
};

export let getMessageData = () => {
	return Office.cast.item.toItemRead(Office.context.mailbox.item);
};

export let getSenderData = () => {
	var item = getMessageData();
	var from;
	if (item.itemType === Office.MailboxEnums.ItemType.Message) {
		from = Office.cast.item.toMessageRead(item).from;
	} else if (item.itemType === Office.MailboxEnums.ItemType.Appointment) {
		from = Office.cast.item.toAppointmentRead(item).organizer;
	}
	return from;
};

export let createComponent = () => {
	var from = getSenderData();
	lightning.createComponent("c:HouseTab", 
		{ contactName: from.emailAddress  }, "lightning",
		function(cmp) {
			// Here we have access to the lightning component we are using
			console.log("Component created");
		}
	);
};

export let forceLogin = key => {
	forcejs.init({ 
			appId:"3MVG9SemV5D80oBfwImbjmCUOooxcQA5IOWhAPpgu5tZTe09L944U1N9rqfHev_RHMAu5BMPvkG7_nKbpV8M2",
			oauthCallbackURL:"https://realestate-interest-test.herokuapp.com/AppRead/oauthcallback",
			tokenStore:oauth
		}
	).then(() => forcejs.login())
	.then(() => {
		saveSetting("oauth", oauth);
		lightning.setupLightning(createComponent, JSON.parse(oauth.forceOAuth));
	});
	//forceInit({instanceUrl:"https://d10-dev-ed.salesforce.com" });
	//force.login(function(success) {
		//saveSetting("oauth", oauth);

		//setupLightning(app.createComponent);
	//});	
};

clearLoginLink.addEventListener("click", clearLogin);
