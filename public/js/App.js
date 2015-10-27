﻿/* global Office */
// Common app functionality
import * as forcejs from 'forcejs';
import * as lightning from 'lightning-out-es6';

'use strict';

let clearLoginLink = document.getElementById('clearLogin')

export let _settings = {};

export let saveSetting = (name, value) => {
	debugger;
	_settings.set(name, value);
	_settings.saveAsync();
};

export let clearLogin = () => {
	_settings.remove("forceOAuth");
	_settings.saveAsync();
};

// Common initialization function (to be called from each page)
export let initialize = (settings) => {
	lightning.init({"targetElementId": "lightning", "loApp": "c:HouseExplorerLOApp"});
	_settings = settings;
	if (_settings.get("forceOAuth") != undefined) {
		//localStorage.setItem("forceOAuth", _settings.get("forceOAuth"));
		lightning.setupLightning(createComponent, JSON.parse(_settings.get("forceOAuth")));
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
			useSessionStore:true
		}
	);
	forcejs.login()
	.then(() => {
		saveSetting("forceOAuth", JSON.stringify(forcejs.getOAuthResult()));
		lightning.setupLightning(createComponent, forcejs.getOAuthResult());
	});
};

clearLoginLink.addEventListener("click", clearLogin);
