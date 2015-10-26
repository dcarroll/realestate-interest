/* global Office */
// Common app functionality
import * as forcejs from 'forcejs';

'use strict';

let app = {};

export let saveSetting = (name, value) => {
	app._settings.set(name, value);
	app._settings.saveAsync();
};

export let clearLogin = () => {
	app._settings.remove("oauth");
	app._settings.saveAsync();
};

// Common initialization function (to be called from each page)
export let initialize = () => {
	console.log("app.initialize 2");
	forceLogin();
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
	$Lightning.createComponent("c:HouseTab", 
		{ contactName: from.emailAddress  }, "lightning",
		function(cmp) {
			// Here we have access to the lightning component we are using
			console.log("Component created");
		}
	);
};

export let forceLogin = key => {
	forcejs.init({ appId:"3MVG9SemV5D80oBfwImbjmCUOooxcQA5IOWhAPpgu5tZTe09L944U1N9rqfHev_RHMAu5BMPvkG7_nKbpV8M2" }).login();
	forceInit({instanceUrl:"https://d10-dev-ed.salesforce.com" });
	force.login(function(success) {
		force.getOauth();
		setupLightning(app.createComponent);
	});	
};

