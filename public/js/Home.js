/* global $ */
/// <reference path="App.js" />
// global app
import * as app from './App';

'use strict';

// The Office initialize function must be run each time a new page is loaded
Office.initialize = function (reason) {
    $(document).ready(function () {
		app._settings = Office.context.roamingSettings;
        app.initialize();
    });
};

function clearLogin() {
	app.clearLogin();
};

function addActivity() {

};
