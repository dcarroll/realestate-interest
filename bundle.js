(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global Office */
// Common app functionality

"use strict";

var app = (function () {
	'use strict';

	var app = {};

	app.saveSetting = function (name, value) {
		app._settings.set(name, value);
		app._settings.saveAsync();
	};

	app.clearLogin = function () {
		app._settings.remove("oauth");
		app._settings.saveAsync();
	};

	// Common initialization function (to be called from each page)
	app.initialize = function () {
		console.log("app.initialize 2");
		app.forceLogin();
	};

	app.getMessageData = function () {
		return Office.cast.item.toItemRead(Office.context.mailbox.item);
	};

	app.getSenderData = function () {
		var item = app.getMessageData();
		var from;
		if (item.itemType === Office.MailboxEnums.ItemType.Message) {
			from = Office.cast.item.toMessageRead(item).from;
		} else if (item.itemType === Office.MailboxEnums.ItemType.Appointment) {
			from = Office.cast.item.toAppointmentRead(item).organizer;
		}
		return from;
	};

	app.createComponent = function () {
		var from = app.getSenderData();
		$Lightning.createComponent("c:HouseTab", { contactName: from.emailAddress }, "lightning", function (cmp) {
			// Here we have access to the lightning component we are using
			console.log("Component created");
		});
	};

	app.forceLogin = function (key) {
		forceInit({ instanceUrl: "https://d10-dev-ed.salesforce.com" });
		force.login(function (success) {
			force.getOauth();
			setupLightning(app.createComponent);
		});
	};

	return app;
})();

},{}]},{},[1]);
